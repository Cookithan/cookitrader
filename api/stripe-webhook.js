/* ════════════════════════════════════════════════════
   POST /api/stripe-webhook
   ────────────────────────────────────────────────────
   Endpoint Vercel Serverless qui reçoit les webhooks Stripe pour
   créditer les cafés ☕ dans Supabase quand un paiement est complété.

   Stripe envoie l'event `checkout.session.completed` avec metadata
   { userCode, cafes }. On vérifie la signature, on lit metadata, on
   ajoute les cafés au compte de l'utilisateur via le service-role key.

   Env vars Vercel requises :
     - STRIPE_SECRET_KEY        : sk_live_... ou sk_test_...
     - STRIPE_WEBHOOK_SECRET    : whsec_...  (récupéré via Stripe CLI ou
                                  Dashboard > Webhooks > Signing secret)
     - VITE_SUPABASE_URL        : URL Supabase (déjà présente côté client)
     - SUPABASE_SERVICE_ROLE_KEY: clé service-role (NE JAMAIS l'exposer côté
                                  client — bypass des RLS)

   ⚠️ Idempotence : on insère un row dans `payment_log` (ou skip si
   l'event_id est déjà traité) pour ne pas créditer 2 fois le même
   paiement si Stripe retry. SQL à exécuter une fois côté Supabase :

     create table if not exists payment_log (
       stripe_event_id text primary key,
       user_code text not null,
       cafes integer not null,
       processed_at timestamptz default now()
     );
═══════════════════════════════════════════════════════ */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

/* Vercel par défaut parse le body en JSON. Pour Stripe, il faut le RAW
   body afin de vérifier la signature. On désactive le parsing auto. */
export const config = {
  api: { bodyParser: false },
};

/* Helper pour lire le body raw en stream (Vercel Node runtime). */
async function readRawBody(req){
  const chunks = [];
  for await (const chunk of req){
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res){
  if(req.method !== 'POST'){
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method not allowed');
  }

  const stripeKey    = process.env.STRIPE_SECRET_KEY;
  const webhookSec   = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl  = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseSrv  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if(!stripeKey || !webhookSec || !supabaseUrl || !supabaseSrv){
    // eslint-disable-next-line no-console
    console.error('[stripe-webhook] missing env vars');
    return res.status(500).end('Server not configured');
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
  const sig    = req.headers['stripe-signature'];

  let event;
  try{
    const raw = await readRawBody(req);
    event = stripe.webhooks.constructEvent(raw, sig, webhookSec);
  }catch(err){
    // eslint-disable-next-line no-console
    console.error('[stripe-webhook] signature verification failed:', err.message);
    return res.status(400).end(`Webhook Error: ${err.message}`);
  }

  if(event.type !== 'checkout.session.completed'){
    /* Tout autre event ignoré silencieusement (on a besoin uniquement
       de la complétion de checkout). 200 OK pour éviter retry. */
    return res.status(200).end('Ignored');
  }

  const session   = event.data.object;
  const meta      = session.metadata || {};
  const userCode  = meta.userCode;
  const cafes     = Number(meta.cafes);
  const eventId   = event.id;

  if(!userCode || !Number.isFinite(cafes) || cafes <= 0){
    // eslint-disable-next-line no-console
    console.warn('[stripe-webhook] metadata invalide:', meta);
    return res.status(200).end('Bad metadata, skipping');
  }

  /* Anti-exploit mode TEST : si event.livemode === false (= clé sk_test
     côté serveur), on ne crédite QUE les userCodes whitelistés via env
     var Vercel STRIPE_TEST_ALLOWED_USERCODES (CSV format "ABC-DEF,XYZ-123").
     Sinon n'importe qui pourrait utiliser une carte test (4242…) pour
     déclencher des crédits gratuits. À retirer (ou env var vide) quand
     on bascule en LIVE — event.livemode sera true et la branche skipped. */
  if(!event.livemode){
    const allowedRaw = process.env.STRIPE_TEST_ALLOWED_USERCODES || '';
    const allowed = allowedRaw.split(',').map(s => s.trim()).filter(Boolean);
    if(!allowed.includes(userCode)){
      // eslint-disable-next-line no-console
      console.log('[stripe-webhook] test mode: userCode not whitelisted, skipping credit', userCode);
      return res.status(200).end('Test mode: userCode not whitelisted, no credit');
    }
  }

  const supabase = createClient(supabaseUrl, supabaseSrv, {
    auth: { persistSession: false },
  });

  try{
    /* Idempotence : on tente d'insérer un row dans payment_log avec
       stripe_event_id en PK. Si l'insert échoue avec conflict, c'est
       un retry → on skip silencieusement. */
    const { error: logErr } = await supabase
      .from('payment_log')
      .insert({ stripe_event_id: eventId, user_code: userCode, cafes });
    if(logErr){
      if(logErr.code === '23505'){   /* duplicate PK */
        return res.status(200).end('Already processed');
      }
      // eslint-disable-next-line no-console
      console.error('[stripe-webhook] payment_log insert error:', logErr);
      return res.status(500).end('Logging failed');
    }

    /* Crédit atomique via RPC SQL : `update users set cafes = cafes + X`
       en une seule transaction. Évite la race condition read-modify-write
       si plusieurs webhooks arrivent en parallèle.
       (Le client peut quand même écraser via upsert non-atomique côté
       JS — mitigé en pausant l'upsert client 60s après retour Stripe.) */
    const { error: rpcErr } = await supabase.rpc('increment_cafes', {
      p_user_code: userCode,
      p_amount:    cafes,
    });
    if(rpcErr){
      /* Fallback read-modify-write si la RPC n'existe pas encore */
      // eslint-disable-next-line no-console
      console.warn('[stripe-webhook] RPC increment_cafes failed, fallback:', rpcErr.message);
      const { data: user, error: readErr } = await supabase
        .from('users')
        .select('cafes')
        .eq('user_code', userCode)
        .maybeSingle();
      if(readErr || !user){
        // eslint-disable-next-line no-console
        console.error('[stripe-webhook] user not found:', userCode, readErr);
        return res.status(500).end('User not found');
      }
      const newCafes = (Number(user.cafes) || 0) + cafes;
      const { error: updErr } = await supabase
        .from('users')
        .update({ cafes: newCafes })
        .eq('user_code', userCode);
      if(updErr){
        // eslint-disable-next-line no-console
        console.error('[stripe-webhook] update error:', updErr);
        return res.status(500).end('Update failed');
      }
    }

    return res.status(200).end('OK');
  }catch(err){
    // eslint-disable-next-line no-console
    console.error('[stripe-webhook] handler error:', err);
    return res.status(500).end('Internal error');
  }
}
