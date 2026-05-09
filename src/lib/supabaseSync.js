import { supabase, isSupabaseEnabled } from './supabase';
import { notifySupabaseError } from './supabaseError';
import { createInboxMessage } from './inbox.js';
import { isAdminName, notInLeaderboard } from '../utils/admin.js';

/* ════════════════════════════════════════════════════
   supabaseSync — opérations sur la table public.users
   ────────────────────────────────────────────────────
   Fonctions typées par opération. Toutes retournent en mode dégradé
   si !isSupabaseEnabled() (env vars manquantes en local ou prod).
═══════════════════════════════════════════════════════ */

/* Upsert le profil (crée si n'existe pas, sinon met à jour). On utilise
   `onConflict: 'user_code'` pour matcher par user_code (unique).
   Ça remplace `createUserProfile` du brief : un seul call gère les
   deux cas (1re fois et synchros suivantes). */
async function getMyId(myUserCode){
  const { data, error } = await supabase
    .from('users').select('id').eq('user_code', myUserCode).single();
  if(error) return null;
  return data?.id ?? null;
}

/* @deprecated — remplacé par sendFriendRequest (BRIEF_DEMANDES_AMIS).
   Conservé pour rétro-compat le temps que toute l'UI bascule.
   Ajoute friendCode directement (status='accepted', skip le flow demande). */
export async function addFriend(myUserCode, friendCode){
  if(!isSupabaseEnabled()) return { ok:false, error:'Hors ligne' };
  try{
    const { data: friend, error: lookupErr } = await supabase
      .from('users')
      .select('id, user_code, user_name, user_avatar, level, total_earned, cookies, last_active')
      .eq('user_code', friendCode)
      .maybeSingle();
    if(lookupErr){ notifySupabaseError(); return { ok:false, error:'Erreur réseau' }; }
    if(!friend)   return { ok:false, error:"Ce code n'existe pas." };

    const myId = await getMyId(myUserCode);
    if(!myId) return { ok:false, error:'Profil non trouvé.' };

    const { error: insertErr } = await supabase
      .from('friendships')
      .insert({ user_id: myId, friend_code: friendCode });
    if(insertErr){
      if(insertErr.code === '23505') return { ok:false, error:'Déjà dans ta liste' };
      return { ok:false, error: insertErr.message || 'Erreur' };
    }
    return { ok:true, friend };
  }catch(e){
    notifySupabaseError();
    return { ok:false, error:'Erreur réseau' };
  }
}

/* Retourne la liste des profils amis (status='accepted' uniquement —
   les demandes pending sont gérées via getReceivedFriendRequests). */
export async function getFriends(myUserCode){
  if(!isSupabaseEnabled()) return [];
  try{
    const myId = await getMyId(myUserCode);
    if(!myId) return [];
    const { data: links, error: linksErr } = await supabase
      .from('friendships').select('friend_code').eq('user_id', myId).eq('status','accepted');
    if(linksErr || !links || links.length === 0) return [];
    const codes = links.map(l => l.friend_code);
    const { data: profiles, error } = await supabase
      .from('users')
      .select('user_code, user_name, user_avatar, level, total_earned, cookies, streak, last_active, earned_achievements, active_title')
      .in('user_code', codes);
    if(error){ notifySupabaseError(); return []; }
    return profiles || [];
  }catch{ notifySupabaseError(); return []; }
}

/* Top N des joueurs par total_earned décroissant.
   Le compte technique "Admin" est exclu du classement public
   (filtre case-insensitive via ilike). */
export async function getLeaderboard(limit = 50){
  if(!isSupabaseEnabled()) return [];
  try{
    const { data, error } = await notInLeaderboard(
      supabase
        .from('users')
        .select('user_code, user_name, user_avatar, level, total_earned, streak, last_active, earned_achievements, active_title')
    )
      .order('total_earned', { ascending:false })
      .limit(limit);
    if(error){
      // eslint-disable-next-line no-console
      console.warn('[supabase] getLeaderboard error:', error);
      notifySupabaseError();
      return [];
    }
    return data || [];
  }catch{ notifySupabaseError(); return []; }
}

/* Mon rang (1-based) parmi les joueurs publics : compte les profils
   ayant un total_earned strictement supérieur, +1. Admin exclu du
   compte (cohérent avec getLeaderboard). */
export async function getMyRank(myUserCode){
  if(!isSupabaseEnabled()) return null;
  try{
    const { data: me } = await supabase
      .from('users').select('total_earned, user_name').eq('user_code', myUserCode).single();
    if(!me) return null;
    /* Si je suis Admin moi-même, je suis hors classement → null */
    if(isAdminName(me.user_name)) return null;
    const { count, error } = await notInLeaderboard(
      supabase
        .from('users')
        .select('*', { count:'exact', head:true })
    )
      .gt('total_earned', me.total_earned);
    if(error) return null;
    return (count ?? 0) + 1;
  }catch{ return null; }
}

/* Compte total des joueurs publics (Admin + NON_RANKED_NAMES exclus). */
export async function getTotalPlayers(){
  if(!isSupabaseEnabled()) return null;
  try{
    const { count, error } = await notInLeaderboard(
      supabase
        .from('users')
        .select('*', { count:'exact', head:true })
    );
    if(error) return null;
    return count ?? 0;
  }catch{ return null; }
}

/* Supprime mon profil entier + toutes les amitiés associées (côté
   user_id via le ON DELETE CASCADE de la FK, mais aussi côté
   friend_code chez les autres utilisateurs qui m'avaient ajouté).
   Utilisé lors du "Réinitialiser ma progression" pour ne pas laisser
   de profils orphelins dans le classement.

   ⚠️ Dépend d'une policy RLS DELETE sur public.users :
     create policy "Anyone can delete own profile"
       on public.users for delete using (true);
   Sans cette policy, RLS bloque silencieusement (0 rows affected) et
   le profil reste — ancien bug fantôme dans le classement. */
export async function deleteMyProfile(myUserCode){
  if(!isSupabaseEnabled() || !myUserCode) return false;
  try{
    /* 1. Retire tous les liens où je suis "friend_code" chez d'autres
          (le cascade FK ne couvre que user_id côté Supabase) */
    await supabase.from('friendships').delete().eq('friend_code', myUserCode);
    /* 2. Supprime le profil — le cascade FK retire les friendships
          où je suis user_id automatiquement */
    const { error } = await supabase.from('users').delete().eq('user_code', myUserCode);
    if(error){ notifySupabaseError(); return false; }
    return true;
  }catch{ notifySupabaseError(); return false; }
}

/* Retire un ami de ma liste. Retourne true si OK. */
export async function removeFriend(myUserCode, friendCode){
  if(!isSupabaseEnabled()) return false;
  try{
    const myId = await getMyId(myUserCode);
    if(!myId) return false;
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('user_id', myId)
      .eq('friend_code', friendCode);
    return !error;
  }catch{ return false; }
}

/* ════════════════════════════════════════════════════
   DEMANDES D'AMIS bilatérales (BRIEF_DEMANDES_AMIS)
   ────────────────────────────────────────────────────
   Une amitié naît en `pending` (demande), passe en `accepted` à
   l'acceptation. À l'acceptation on crée la relation INVERSE en
   accepted pour que `getFriends` marche des 2 côtés.

   À chaque envoi/acceptation, on dépose un message dans l'inbox du
   destinataire (BRIEF_INBOX) — best effort, pas bloquant si l'inbox
   plante (le flow d'amitié reste prioritaire).

   Anti-spam :
     · MAX_PENDING : 50 demandes en attente (côté envoyeur)
     · COOLDOWN_MS : 30s entre 2 demandes vers le MÊME code (cache mémoire,
       reset au refresh — acceptable pour CookiMiner)
═══════════════════════════════════════════════════════ */

const FRIEND_REQUEST_LIMITS = {
  MAX_PENDING: 50,
  COOLDOWN_MS: 30 * 1000,
};
const lastRequestSent = {}; // friendCode -> timestamp ms

export async function sendFriendRequest(myUserCode, friendCode){
  if(!isSupabaseEnabled()) return { error:'Hors ligne' };

  if(!friendCode || !/^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(friendCode)){
    return { error:'Format invalide (ex: B4R-1ST)' };
  }
  if(friendCode === myUserCode){
    return { error:"C'est ton propre code 😄" };
  }

  /* Cooldown 30s vers le même code */
  const elapsed = Date.now() - (lastRequestSent[friendCode] ?? 0);
  if(elapsed < FRIEND_REQUEST_LIMITS.COOLDOWN_MS){
    const remaining = Math.ceil((FRIEND_REQUEST_LIMITS.COOLDOWN_MS - elapsed) / 1000);
    return { error:`Attends ${remaining}s avant de réessayer` };
  }

  try{
    /* 1. Le code cible existe ? */
    const { data: friend, error: lookupErr } = await supabase
      .from('users')
      .select('id, user_code, user_name, user_avatar, level')
      .eq('user_code', friendCode)
      .maybeSingle();
    if(lookupErr){ notifySupabaseError(); return { error:'Erreur réseau' }; }
    if(!friend)   return { error:"Ce code n'existe pas" };

    /* 2. Mon profil */
    const { data: me } = await supabase
      .from('users')
      .select('id, user_name, level')
      .eq('user_code', myUserCode)
      .maybeSingle();
    if(!me) return { error:'Profil non trouvé' };

    /* 3. Pas déjà une relation (pending ou accepted) ? */
    const { data: existing } = await supabase
      .from('friendships')
      .select('id, status')
      .eq('user_id', me.id)
      .eq('friend_code', friendCode)
      .maybeSingle();
    if(existing){
      if(existing.status === 'accepted') return { error:'Déjà dans tes amis' };
      if(existing.status === 'pending')  return { error:'Demande déjà envoyée' };
    }

    /* 4. Limite 50 pending */
    const { count: pendingCount } = await supabase
      .from('friendships')
      .select('*', { count:'exact', head:true })
      .eq('user_id', me.id)
      .eq('status', 'pending');
    if((pendingCount ?? 0) >= FRIEND_REQUEST_LIMITS.MAX_PENDING){
      return { error:'Trop de demandes en attente (max 50)' };
    }

    /* 5. Insert pending */
    const { error: insertErr } = await supabase
      .from('friendships')
      .insert({ user_id: me.id, friend_code: friendCode, status: 'pending' });
    if(insertErr){
      if(insertErr.code === '23505') return { error:'Demande déjà envoyée' };
      return { error: insertErr.message || 'Erreur' };
    }

    lastRequestSent[friendCode] = Date.now();

    /* 6. Inbox côté destinataire — best effort, non bloquant */
    const senderName = me.user_name || 'Quelqu\'un';
    createInboxMessage(
      friendCode,
      'friend_request',
      `📬 Demande d'ami de ${senderName}`,
      `${senderName} (Niveau ${me.level ?? 1}) veut être ton ami. Va dans Mon profil pour répondre.`,
      null,
    ).catch(() => {});

    return { success:true, friend };
  }catch(e){
    notifySupabaseError();
    return { error:'Erreur réseau' };
  }
}

/* Demandes REÇUES (autres → moi, status='pending'). */
export async function getReceivedFriendRequests(myUserCode){
  if(!isSupabaseEnabled() || !myUserCode) return [];
  try{
    const { data: requests, error } = await supabase
      .from('friendships')
      .select('id, user_id, added_at')
      .eq('friend_code', myUserCode)
      .eq('status', 'pending')
      .order('added_at', { ascending:false });
    if(error || !requests || requests.length === 0) return [];

    const userIds = requests.map(r => r.user_id);
    const { data: senders } = await supabase
      .from('users')
      .select('id, user_code, user_name, user_avatar, level')
      .in('id', userIds);
    const senderMap = {};
    (senders || []).forEach(s => { senderMap[s.id] = s; });

    return requests
      .map(r => ({
        request_id: r.id,
        added_at: r.added_at,
        ...senderMap[r.user_id],
      }))
      .filter(r => r.user_code); // expéditeur supprimé entre-temps
  }catch{ return []; }
}

/* Demandes ENVOYÉES par moi (info, pas annulables). */
export async function getSentFriendRequests(myUserCode){
  if(!isSupabaseEnabled() || !myUserCode) return [];
  try{
    const myId = await getMyId(myUserCode);
    if(!myId) return [];
    const { data } = await supabase
      .from('friendships')
      .select('id, friend_code, added_at')
      .eq('user_id', myId)
      .eq('status', 'pending');
    return data || [];
  }catch{ return []; }
}

/* Accepter une demande reçue : passe la pending en accepted, crée
   la relation inverse (moi → expéditeur) en accepted, dépose un
   inbox `friend_accepted` chez l'expéditeur. */
export async function acceptFriendRequest(myUserCode, requestId){
  if(!isSupabaseEnabled()) return { error:'Hors ligne' };
  try{
    const { data: request } = await supabase
      .from('friendships')
      .select('id, user_id, friend_code')
      .eq('id', requestId)
      .eq('status', 'pending')
      .maybeSingle();
    if(!request) return { error:'Demande introuvable' };
    if(request.friend_code !== myUserCode) return { error:'Pas autorisé' };

    const { data: sender } = await supabase
      .from('users')
      .select('user_code, user_name')
      .eq('id', request.user_id)
      .maybeSingle();
    if(!sender) return { error:'Expéditeur introuvable' };

    const { data: me } = await supabase
      .from('users')
      .select('id, user_name, level')
      .eq('user_code', myUserCode)
      .maybeSingle();
    if(!me) return { error:'Mon profil introuvable' };

    /* Marque la demande acceptée. ⚠️ En Supabase v2, un UPDATE bloqué par
       RLS USING renvoie 0 rows + error=null silencieusement → la ligne
       reste pending pour toujours et le sender ne voit jamais l'ami.
       On force `.select()` puis on vérifie la longueur pour détecter
       ce cas et remonter une erreur explicite plutôt que faux-success. */
    const { data: updRows, error: updErr } = await supabase
      .from('friendships')
      .update({ status:'accepted' })
      .eq('id', requestId)
      .select();
    if(updErr){
      console.warn('[acceptFriendRequest] update error:', updErr);
      notifySupabaseError();
      return { error:'Erreur réseau' };
    }
    if(!updRows || updRows.length === 0){
      console.warn('[acceptFriendRequest] 0 rows updated → policy UPDATE manquante sur friendships ?');
      return { error:"Impossible d'accepter (policy SQL manquante)" };
    }

    /* Crée la relation inverse (moi → lui) en accepted, ou met à jour
       si une demande de moi vers lui existait déjà en pending. */
    const { data: existing } = await supabase
      .from('friendships')
      .select('id, status')
      .eq('user_id', me.id)
      .eq('friend_code', sender.user_code)
      .maybeSingle();
    if(!existing){
      const { error: insErr } = await supabase.from('friendships').insert({
        user_id: me.id,
        friend_code: sender.user_code,
        status: 'accepted',
      });
      if(insErr){
        console.warn('[acceptFriendRequest] insert reverse error:', insErr);
        /* On ne fail pas la fonction : l'amitié côté expéditeur est OK,
           celle côté moi sera ré-essayée au prochain accept. */
      }
    } else if(existing.status === 'pending'){
      const { data: revRows, error: revUpdErr } = await supabase
        .from('friendships')
        .update({ status:'accepted' })
        .eq('id', existing.id)
        .select();
      if(revUpdErr){
        console.warn('[acceptFriendRequest] update reverse error:', revUpdErr);
      } else if(!revRows || revRows.length === 0){
        console.warn('[acceptFriendRequest] reverse update 0 rows — RLS UPDATE policy ?');
      }
    }

    /* Inbox côté expéditeur — best effort */
    const myName = me.user_name || 'Quelqu\'un';
    createInboxMessage(
      sender.user_code,
      'friend_accepted',
      `🎉 ${myName} a accepté ta demande`,
      `Vous êtes maintenant amis. Tu peux retrouver ${myName} dans tes amis.`,
      null,
    ).catch(() => {});

    return { success:true, friendName: sender.user_name || sender.user_code };
  }catch{
    notifySupabaseError();
    return { error:'Erreur réseau' };
  }
}

/* Refuser une demande = la supprimer (silencieux côté expéditeur). */
export async function declineFriendRequest(myUserCode, requestId){
  if(!isSupabaseEnabled()) return { error:'Hors ligne' };
  try{
    const { data: request } = await supabase
      .from('friendships')
      .select('id, friend_code')
      .eq('id', requestId)
      .eq('status', 'pending')
      .maybeSingle();
    if(!request) return { error:'Demande introuvable' };
    if(request.friend_code !== myUserCode) return { error:'Pas autorisé' };

    await supabase.from('friendships').delete().eq('id', requestId);
    return { success:true };
  }catch{
    notifySupabaseError();
    return { error:'Erreur réseau' };
  }
}

/* Détecte les amis devenus accepted depuis la dernière connexion.
   knownFriendCodes : array des codes amis stocké en localStorage. */
export async function getNewlyAcceptedFriends(myUserCode, knownFriendCodes = []){
  const current = await getFriends(myUserCode);
  const known = new Set(knownFriendCodes || []);
  return current.filter(f => !known.has(f.user_code));
}

/* ════════════════════════════════════════════════════
   RÉACTIONS EMOJI (BRIEF_REACTIONS)
   ────────────────────────────────────────────────────
   Petit signe d'amitié envoyé depuis le profil d'un ami : un emoji
   parmi 4 (👏 ☕ 🔥 🍪) atterrit dans l'inbox du destinataire.

   Anti-spam :
     - Cooldown 1h par paire (senderCode → recipientCode), cache mémoire.
       Reset au refresh — acceptable pour CookiMiner.
     - Whitelist stricte côté client (en plus du check côté DB qui
       n'existe pas, mais createInboxMessage limite déjà type='reaction').
═══════════════════════════════════════════════════════ */

const ALLOWED_REACTIONS = ['👏', '☕', '🔥', '🍪'];
const REACTION_COOLDOWN_MS = 60 * 60 * 1000;
const lastReactionSent = {};

export async function sendReaction(senderCode, recipientCode, emoji){
  if(!isSupabaseEnabled()) return { error:'Hors ligne' };
  if(!ALLOWED_REACTIONS.includes(emoji)) return { error:'Emoji non autorisé' };
  if(!senderCode || !recipientCode) return { error:'Code manquant' };
  if(senderCode === recipientCode) return { error:'Pas à toi-même 😄' };

  const cacheKey = `${senderCode}->${recipientCode}`;
  const elapsed = Date.now() - (lastReactionSent[cacheKey] ?? 0);
  if(elapsed < REACTION_COOLDOWN_MS){
    const remaining = Math.ceil((REACTION_COOLDOWN_MS - elapsed) / 60000);
    return { error:`Attends ${remaining} min avant de re-réagir` };
  }

  try{
    /* Récupère le nom du sender pour personnaliser le message inbox */
    const { data: sender } = await supabase
      .from('users')
      .select('user_name')
      .eq('user_code', senderCode)
      .maybeSingle();
    const senderName = sender?.user_name || 'Un ami';

    /* Insère le message inbox côté destinataire — best effort */
    const { error: insertErr } = await supabase.from('inbox_messages').insert({
      user_code: recipientCode,
      type: 'reaction',
      title: `${emoji} Réaction de ${senderName}`,
      body:  `${senderName} t'a envoyé un ${emoji} sur ton profil.`,
      payload: JSON.stringify({ emoji, senderCode }),
    });
    if(insertErr){
      notifySupabaseError();
      return { error:'Erreur réseau' };
    }

    lastReactionSent[cacheKey] = Date.now();
    return { success:true };
  }catch{
    notifySupabaseError();
    return { error:'Erreur réseau' };
  }
}

/* ════════════════════════════════════════════════════
   PROFIL PUBLIC (BRIEF_PROFIL_VISIBLE)
   ────────────────────────────────────────────────────
   Récupère le profil enrichi d'un user_code (utilisé pour la modale
   UserProfileModal — vue d'un ami ou du top 1 du classement).

   Inclut :
     · toutes les colonnes de public.users
     · cookies_rank : rang dans le classement Cookies (Admin exclu pour
       cohérence avec getLeaderboard/getMyRank). null si l'utilisateur
       consulté est Admin.
     · market_rank / market_shares / market_value : tentés via les tables
       market_portfolio + market_state. Si elles n'existent pas (le brief
       marché online n'est pas encore appliqué), tout reste à 0/null —
       try/catch silencieux.
═══════════════════════════════════════════════════════ */
export async function getPublicProfile(userCode){
  if(!isSupabaseEnabled() || !userCode) return null;
  try{
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_code', userCode)
      .maybeSingle();
    if(error || !user) return null;

    /* Rang Cookies — Admin exclu, cohérent avec le reste du fichier.
       Si l'utilisateur consulté est Admin lui-même → null (hors classement). */
    let cookiesRank = null;
    const isAdmin = isAdminName(user.user_name);
    if(!isAdmin){
      const { count } = await notInLeaderboard(
        supabase
          .from('users')
          .select('*', { count:'exact', head:true })
      )
        .gt('total_earned', user.total_earned ?? 0);
      cookiesRank = (count ?? 0) + 1;
    }

    /* Rang Marché — best effort, ignore si tables absentes */
    let marketRank   = null;
    let marketShares = 0;
    let marketValue  = 0;
    try{
      const { data: portfolio } = await supabase
        .from('market_portfolio')
        .select('shares')
        .eq('user_code', userCode)
        .maybeSingle();
      if(portfolio && portfolio.shares > 0){
        marketShares = portfolio.shares;
        const { data: state } = await supabase
          .from('market_state')
          .select('current_price')
          .eq('id', 1)
          .maybeSingle();
        if(state){
          marketValue = Math.floor(parseFloat(state.current_price) * portfolio.shares);
        }
        const { count: marketCount } = await supabase
          .from('market_portfolio')
          .select('*', { count:'exact', head:true })
          .gt('shares', portfolio.shares);
        marketRank = (marketCount ?? 0) + 1;
      }
    }catch{ /* tables marché non créées encore — silencieux */ }

    return {
      ...user,
      cookies_rank: cookiesRank,
      market_rank:  marketRank,
      market_shares: marketShares,
      market_value:  marketValue,
    };
  }catch{
    notifySupabaseError();
    return null;
  }
}

/* ════════════════════════════════════════════════════
   CADEAUX ENTRE AMIS (BRIEF_CADEAUX_AMIS)
   ────────────────────────────────────────────────────
   Le sender paye 50 🍪 OU 1 ☕ depuis son solde, le destinataire
   reçoit la même somme via un message inbox `type='gift'`.
   Le crédit côté destinataire est appliqué par handleApplyReward
   (App.jsx) à la 1re ouverture du message — InboxModal garantit
   l'unicité via is_processed.

   Anti-spam : MAX_PER_DAY=3 cadeaux/24h tous types confondus.
   La table `gifts_sent` sert uniquement de log pour ce comptage.

   sendGift vérifie 4 conditions avant insert :
     1. Type valide (cookies | cf)
     2. < MAX_PER_DAY cadeaux envoyés sur les dernières 24h
     3. Solde suffisant (passé en arg par le client)
     4. Le destinataire est bien dans mes amis status='accepted'
═══════════════════════════════════════════════════════ */

export const GIFT_CONFIG = {
  COOKIES_AMOUNT: 50,
  CF_AMOUNT: 1,
  MAX_PER_DAY: 3,
};

export const GIFT_TYPES = {
  cookies: { type:'cookies', amount:50, icon:'🍪', label:'50 cookies' },
  cf:      { type:'cf',      amount:1,  icon:'☕', label:'1 café'    },
};

/* Compte les cadeaux envoyés par senderCode dans les 24 dernières heures. */
export async function getGiftsSentToday(senderCode){
  if(!isSupabaseEnabled() || !senderCode) return 0;
  try{
    const since = new Date(Date.now() - 24*3600*1000).toISOString();
    const { count, error } = await supabase
      .from('gifts_sent')
      .select('*', { count:'exact', head:true })
      .eq('sender_code', senderCode)
      .gte('sent_at', since);
    if(error){ console.warn('[gifts] getGiftsSentToday error:', error); return 0; }
    return count ?? 0;
  }catch{ return 0; }
}

/* Envoie un cadeau à un ami. currentBalance = { cookies, cf } (côté client).
   Retourne { success, gift } ou { error }. Ne débite PAS le solde local —
   c'est au caller (App.jsx) de le faire après un success. */
export async function sendGift(senderCode, recipientCode, giftType, currentBalance = {}){
  if(!isSupabaseEnabled()) return { error:'Hors ligne' };

  const gift = GIFT_TYPES[giftType];
  if(!gift) return { error:'Type de cadeau invalide' };
  if(!senderCode || !recipientCode) return { error:'Code manquant' };
  if(senderCode === recipientCode) return { error:'Pas à toi-même' };

  try{
    /* 1. Limite 3/jour */
    const todayCount = await getGiftsSentToday(senderCode);
    if(todayCount >= GIFT_CONFIG.MAX_PER_DAY){
      return { error:`Limite atteinte (${GIFT_CONFIG.MAX_PER_DAY} cadeaux/jour)` };
    }

    /* 2. Solde suffisant (vérif côté client — la valeur est passée en arg) */
    if(gift.type === 'cookies' && (currentBalance.cookies ?? 0) < gift.amount){
      return { error:`Pas assez de cookies (besoin ${gift.amount})` };
    }
    if(gift.type === 'cf' && (currentBalance.cf ?? 0) < gift.amount){
      return { error:`Pas assez de cafés (besoin ${gift.amount})` };
    }

    /* 3. Mon profil + check amitié acceptée */
    const { data: me } = await supabase
      .from('users')
      .select('id, user_name')
      .eq('user_code', senderCode)
      .maybeSingle();
    if(!me) return { error:'Profil introuvable' };

    const { data: friendship } = await supabase
      .from('friendships')
      .select('id')
      .eq('user_id', me.id)
      .eq('friend_code', recipientCode)
      .eq('status', 'accepted')
      .maybeSingle();
    if(!friendship) return { error:"Pas dans tes amis" };

    /* 4. Log dans gifts_sent (pour le comptage anti-spam) */
    const { error: logErr } = await supabase.from('gifts_sent').insert({
      sender_code: senderCode,
      recipient_code: recipientCode,
      type: gift.type,
      amount: gift.amount,
    });
    if(logErr){
      console.warn('[gifts] insert log error:', logErr);
      notifySupabaseError();
      return { error:'Erreur réseau' };
    }

    /* 5. Inbox côté destinataire — payload typé pour handleApplyReward */
    const senderName = me.user_name || 'Un ami';
    await createInboxMessage(
      recipientCode,
      'gift',
      `🎁 ${senderName} t'a offert ${gift.amount} ${gift.icon} !`,
      `Ouvre ce message pour récupérer ton cadeau.`,
      { type: gift.type, amount: gift.amount, senderCode, senderName },
    );

    return { success:true, gift };
  }catch(e){
    notifySupabaseError();
    return { error:'Erreur réseau' };
  }
}

/* ════════════════════════════════════════════════════
   RESTAURATION DE PROFIL (BRIEF_RESTAURATION — version complète)
   ────────────────────────────────────────────────────
   Depuis l'ajout des colonnes `cafes`, `xp`, `unlocked`,
   `name_change_count`, `earned_achievements`, `active_theme` (08/05/2026),
   la restauration ramène TOUT ce qui compte : currency premium, XP en
   cours, items premium débloqués (thèmes/avatars/musiques/skins…),
   compteur de renames payants, succès gagnés, thème actif.

   Restent NON syncés (perdus au changement d'appareil) :
     · clickRecord (vanity)
     · activeBanner / activeSkin / activeRoue (re-sélectionnables depuis
       les items débloqués via Settings)
     · completedEvents (les events sont time-limited, peu d'impact)
     · marketRealized, lastCheckin, lastQuiz, seenHints, knownFriendCodes
═══════════════════════════════════════════════════════ */
export async function restoreProfile(userCode, pin = ''){
  if(!isSupabaseEnabled()) return { error:'Hors ligne' };
  if(!userCode || !/^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(userCode)){
    return { error:'Format invalide (ex : B4R-1ST)' };
  }

  try{
    /* 1. Profil principal */
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_code', userCode)
      .maybeSingle();
    if(error){ notifySupabaseError(); return { error:'Erreur réseau' }; }
    if(!user) return { error:"Ce code n'existe pas" };

    /* 2. Validation du PIN (sécurité). Si le profil a un PIN défini en
       base, l'input doit matcher exactement. Si le profil n'a PAS de
       PIN (legacy / pas encore syncé), on rejette aussi pour éviter
       qu'un compte non-protégé soit restaurable par un tiers — le
       propriétaire ré-ouvre l'app sur l'appareil source pour push
       son PIN, puis ré-essaie. */
    const serverPin = (user.restore_pin || '').trim();
    if(!serverPin){
      return { error:"Aucun PIN défini sur ce compte. Ouvre l'app sur l'appareil d'origine pour générer le PIN, puis réessaie." };
    }
    if(!pin || !/^\d{4}$/.test(pin)){
      return { error:'PIN requis (4 chiffres)' };
    }
    if(pin !== serverPin){
      return { error:'PIN incorrect' };
    }

    const splitCsv = (raw) => (raw || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    /* 3. Unlocked complet (priorité à la nouvelle colonne `unlocked`).
          Fallback `badges` pour les profils écrits avant la migration. */
    const unlocked = (user.unlocked && user.unlocked.length)
      ? splitCsv(user.unlocked)
      : splitCsv(user.badges);

    /* 4. Achievements gagnés (comma-separated d'IDs) */
    const earnedAchievements = splitCsv(user.earned_achievements);

    /* 5. Amitiés acceptées (best-effort, ne bloque pas la restauration) */
    let friendCodes = [];
    try{
      const { data: links } = await supabase
        .from('friendships')
        .select('friend_code')
        .eq('user_id', user.id)
        .eq('status', 'accepted');
      friendCodes = (links || []).map(l => l.friend_code).filter(Boolean);
    }catch{ /* table absente / RLS */ }

    /* 6. Portfolio marché (best-effort) */
    let portfolio = null;
    try{
      const { data: p } = await supabase
        .from('market_portfolio')
        .select('shares, invested_total')
        .eq('user_code', userCode)
        .maybeSingle();
      if(p) portfolio = { shares: Number(p.shares) || 0, invested: Number(p.invested_total) || 0 };
    }catch{ /* table absente */ }

    return {
      success:true,
      data:{
        userCode:           user.user_code,
        userName:           user.user_name || '',
        userAvatar:         user.user_avatar ?? '0',
        userBio:            user.user_bio || '',
        level:              Number(user.level) || 1,
        xp:                 Number(user.xp) || 0,
        cookies:            Number(user.cookies) || 0,
        cafes:              Number(user.cafes) || 0,
        totalEarned:        Number(user.total_earned) || 0,
        streak:             Number(user.streak) || 0,
        unlocked,
        earnedAchievements,
        nameChangeCount:    Number(user.name_change_count) || 0,
        activeTheme:        user.active_theme || '',
        restorePin:         serverPin,
        joinDate:           user.join_date || null,
        friendCodes,
        portfolio,
      },
    };
  }catch(e){
    console.warn('[restoreProfile] error:', e);
    notifySupabaseError();
    return { error:'Erreur réseau' };
  }
}

/* ════════════════════════════════════════════════════
   STATS GLOBALES COMMUNAUTÉ (BRIEF_A_PROPOS phase 2)
   ────────────────────────────────────────────────────
   Snapshot temps réel de la communauté affiché dans la modale
   "À propos". 4 stats côté UI :
     · userCount             — nb de joueurs (Admin exclu, cohérent avec
                               le reste du fichier)
     · totalCookiesEarned    — somme des total_earned
     · friendshipsCount      — nb d'amitiés acceptées /2 (bilatéral)
     · transactionsCount     — nb de transactions $CKM (table optionnelle)

   Tout est best-effort : si une table n'existe pas → 0, pas de crash.
═══════════════════════════════════════════════════════ */
export async function getGlobalCommunityStats(){
  if(!isSupabaseEnabled()) return null;
  try{
    const [userCountR, sumR, friendsR, txR] = await Promise.all([
      notInLeaderboard(
        supabase
          .from('users')
          .select('*', { count:'exact', head:true })
      ),
      notInLeaderboard(
        supabase
          .from('users')
          .select('total_earned')
      ),
      supabase
        .from('friendships')
        .select('*', { count:'exact', head:true })
        .eq('status', 'accepted'),
      supabase
        .from('market_transactions')
        .select('*', { count:'exact', head:true })
        .then(r => r, () => ({ count:0 })),
    ]);

    const totalCookiesEarned = (sumR?.data ?? []).reduce(
      (acc, u) => acc + (Number(u.total_earned) || 0),
      0,
    );

    return {
      userCount:           userCountR?.count ?? 0,
      totalCookiesEarned,
      /* Chaque amitié acceptée existe en double (A→B + B→A) → /2 pour
         afficher le nb réel de paires d'amis. */
      friendshipsCount:    Math.floor((friendsR?.count ?? 0) / 2),
      transactionsCount:   txR?.count ?? 0,
    };
  }catch(e){
    console.warn('[stats] getGlobalCommunityStats error:', e);
    return null;
  }
}

export async function upsertProfile(p){
  if(!isSupabaseEnabled()) return { ok:false, reason:'disabled' };
  try{
    const { data, error } = await supabase
      .from('users')
      .upsert({
        user_code:    p.userCode,
        user_name:    p.userName,
        user_avatar:  String(p.userAvatar ?? '0'),
        level:        p.level,
        total_earned: p.totalEarned,
        cookies:      p.coins,
        streak:       p.streak,
        user_bio:     p.userBio || '',
        /* Badges (BRIEF — visibilité cross-device) : liste d'IDs séparés
           par virgule (badges classiques REWARDS + badges secrets). */
        badges:       (p.badgeIds || []).join(','),
        /* Restauration complète (BRIEF_RESTAURATION v2) : 6 colonnes
           ajoutées le 08/05/2026 pour pouvoir tout restaurer sur un
           autre appareil. Les champs facultatifs sont défensifs (??)
           car les anciens callers ne les passent pas forcément. */
        cafes:                p.cafes ?? 0,
        xp:                   p.xp ?? 0,
        unlocked:             (p.unlocked || []).join(','),
        name_change_count:    p.nameChangeCount ?? 0,
        earned_achievements:  (p.earnedAchievements || []).join(','),
        active_theme:         p.activeTheme || '',
        /* Titre couleur actif (data/titles.js) — sync pour qu'il
           apparaisse aussi sur le pseudo dans les classements / amis /
           profil consultés par d'autres joueurs. */
        active_title:         p.activeTitle || '',
        /* PIN de restauration (sécurité) — 4 chiffres requis pour
           restaurer le compte sur un autre appareil. */
        restore_pin:          p.restorePin || '',
        last_active:  new Date().toISOString(),
      }, { onConflict: 'user_code' })
      .select()
      .single();
    if(error){
      // eslint-disable-next-line no-console
      console.warn('[supabase] upsertProfile error:', error);
      notifySupabaseError();
      return { ok:false, reason:'error', error };
    }
    return { ok:true, data };
  }catch(e){
    // eslint-disable-next-line no-console
    console.warn('[supabase] upsertProfile threw:', e);
    notifySupabaseError();
    return { ok:false, reason:'exception', error:e };
  }
}
