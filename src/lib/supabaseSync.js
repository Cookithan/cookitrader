import { supabase, isSupabaseEnabled } from './supabase';

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

/* Ajoute friendCode à mes amis. Vérifie d'abord que le code existe.
   Retourne :
   - { ok:true, friend:{...} } si OK
   - { ok:false, error:'...' } sinon (code inexistant, déjà ami, …) */
export async function addFriend(myUserCode, friendCode){
  if(!isSupabaseEnabled()) return { ok:false, error:'Hors ligne' };
  try{
    const { data: friend, error: lookupErr } = await supabase
      .from('users')
      .select('id, user_code, user_name, user_avatar, level, total_earned, cookies, last_active')
      .eq('user_code', friendCode)
      .maybeSingle();
    if(lookupErr) return { ok:false, error:'Erreur réseau' };
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
    return { ok:false, error:'Erreur réseau' };
  }
}

/* Retourne la liste des profils amis (snapshot des données serveur). */
export async function getFriends(myUserCode){
  if(!isSupabaseEnabled()) return [];
  try{
    const myId = await getMyId(myUserCode);
    if(!myId) return [];
    const { data: links, error: linksErr } = await supabase
      .from('friendships').select('friend_code').eq('user_id', myId);
    if(linksErr || !links || links.length === 0) return [];
    const codes = links.map(l => l.friend_code);
    const { data: profiles, error } = await supabase
      .from('users')
      .select('user_code, user_name, user_avatar, level, total_earned, cookies, streak, last_active')
      .in('user_code', codes);
    if(error) return [];
    return profiles || [];
  }catch{ return []; }
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
        last_active:  new Date().toISOString(),
      }, { onConflict: 'user_code' })
      .select()
      .single();
    if(error){
      // eslint-disable-next-line no-console
      console.warn('[supabase] upsertProfile error:', error);
      return { ok:false, reason:'error', error };
    }
    return { ok:true, data };
  }catch(e){
    // eslint-disable-next-line no-console
    console.warn('[supabase] upsertProfile threw:', e);
    return { ok:false, reason:'exception', error:e };
  }
}
