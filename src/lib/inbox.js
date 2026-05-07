import { supabase, isSupabaseEnabled } from './supabase.js';

/* ════════════════════════════════════════════════════
   inbox.js — boîte de réception centralisée (BRIEF_INBOX)
   ────────────────────────────────────────────────────
   Toutes les notifications "user-to-user" ou "system-to-user" du
   joueur transitent par la table `public.inbox_messages` :
     · friend_request · friend_accepted
     · gift · tournament_reward · referral_reward
     · reaction · system

   Conventions :
     - `payload` est stocké en TEXT (JSON sérialisé) en DB.
       getInboxMessages() le parse et renvoie un objet JS, ou null.
     - `is_processed=true` signifie que la récompense (cookies/CF)
       a déjà été créditée — empêche le double-crédit si le joueur
       rouvre le message.
     - Suppression auto après 30 jours via cleanupOldMessages(),
       appelée à chaque ouverture de la modale.

   Toutes les fonctions sont safe-no-op si Supabase est OFF
   (mode local uniquement).
═══════════════════════════════════════════════════════ */

const MESSAGE_TTL_DAYS = 30;
const TTL_MS = MESSAGE_TTL_DAYS * 24 * 3600 * 1000;

function parsePayload(raw){
  if(!raw) return null;
  try { return JSON.parse(raw); }
  catch { return null; }
}

/* Récupère tous les messages (non expirés), parsés. */
export async function getInboxMessages(userCode){
  if(!isSupabaseEnabled() || !userCode) return [];
  const since = new Date(Date.now() - TTL_MS).toISOString();
  const { data, error } = await supabase
    .from('inbox_messages')
    .select('*')
    .eq('user_code', userCode)
    .gte('created_at', since)
    .order('created_at', { ascending: false });
  if(error){
    console.warn('getInboxMessages error:', error);
    return [];
  }
  return (data ?? []).map(m => ({ ...m, payload: parsePayload(m.payload) }));
}

/* Compte les messages non lus (rapide, head-only). */
export async function getUnreadInboxCount(userCode){
  if(!isSupabaseEnabled() || !userCode) return 0;
  const since = new Date(Date.now() - TTL_MS).toISOString();
  const { count, error } = await supabase
    .from('inbox_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_code', userCode)
    .eq('is_read', false)
    .gte('created_at', since);
  if(error){
    console.warn('getUnreadInboxCount error:', error);
    return 0;
  }
  return count ?? 0;
}

export async function markAsRead(messageId){
  if(!isSupabaseEnabled() || !messageId) return;
  await supabase.from('inbox_messages').update({ is_read: true }).eq('id', messageId);
}

export async function markAllAsRead(userCode){
  if(!isSupabaseEnabled() || !userCode) return;
  await supabase
    .from('inbox_messages')
    .update({ is_read: true })
    .eq('user_code', userCode)
    .eq('is_read', false);
}

export async function deleteMessage(messageId){
  if(!isSupabaseEnabled() || !messageId) return;
  await supabase.from('inbox_messages').delete().eq('id', messageId);
}

/* Suppression auto > 30 jours. À appeler à l'ouverture de l'inbox. */
export async function cleanupOldMessages(userCode){
  if(!isSupabaseEnabled() || !userCode) return;
  const cutoff = new Date(Date.now() - TTL_MS).toISOString();
  await supabase
    .from('inbox_messages')
    .delete()
    .eq('user_code', userCode)
    .lt('created_at', cutoff);
}

/* Crée un message (helper utilisé par les autres briefs :
   parrainage, tournoi, cadeaux, réactions, système). */
export async function createInboxMessage(userCode, type, title, body, payload = null){
  if(!isSupabaseEnabled() || !userCode) return;
  await supabase.from('inbox_messages').insert({
    user_code: userCode,
    type,
    title,
    body,
    payload: payload ? JSON.stringify(payload) : null,
  });
}

/* Marque un message comme processed (= récompense créditée).
   Implique aussi is_read=true pour rester cohérent. */
export async function markAsProcessed(messageId){
  if(!isSupabaseEnabled() || !messageId) return;
  await supabase
    .from('inbox_messages')
    .update({ is_processed: true, is_read: true })
    .eq('id', messageId);
}
