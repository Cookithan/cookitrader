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
