/* ════════════════════════════════════════════════════
   POST /api/create-checkout-session
   ────────────────────────────────────────────────────
   Endpoint Vercel Serverless qui crée une session Stripe Checkout pour
   l'achat d'un bundle de cafés ☕.

   Body (JSON) attendu :
     { userCode: string, bundleId: 'cf10' | 'cf50' | 'cf200' }

   Réponse :
     { url: string }       → URL de redirection Stripe Checkout
     { error: string }     → erreur (400/500)

   Env vars Vercel requises :
     - STRIPE_SECRET_KEY     : sk_live_... ou sk_test_...
     - VITE_PUBLIC_APP_URL   : ex https://cookitrader.vercel.app (pour
                                construire les URLs de retour). Si absente,
                                on utilise le Host header.

   Côté client : on stocke le userCode en metadata pour que le webhook
   sache à qui créditer. JAMAIS le montant ni le bundleId directement
   en argument client — on revérifie côté serveur via BUNDLES.
═══════════════════════════════════════════════════════ */

import Stripe from 'stripe';

/* Source de vérité côté serveur — le client envoie un id, on lit le
   prix/cafes ici. Empêche un client malicieux d'envoyer { cafes: 1e9 }. */
const BUNDLES = {
  cf10:  { cafes: 10,  amountCents: 99,   name: '10 cafés ☕' },
  cf50:  { cafes: 50,  amountCents: 399,  name: '50 cafés ☕' },
  cf200: { cafes: 200, amountCents: 999,  name: '200 cafés ☕' },
};

export default async function handler(req, res){
  if(req.method !== 'POST'){
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if(!stripeKey){
    return res.status(500).json({ error: 'STRIPE_SECRET_KEY not configured' });
  }

  let body = req.body;
  if(typeof body === 'string'){
    try{ body = JSON.parse(body); }catch{ body = {}; }
  }
  body = body || {};
  const { userCode, bundleId } = body;

  if(!userCode || typeof userCode !== 'string' || !/^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(userCode)){
    return res.status(400).json({ error: 'userCode invalide' });
  }
  const bundle = BUNDLES[bundleId];
  if(!bundle){
    return res.status(400).json({ error: 'bundleId inconnu' });
  }

  /* Construit les URLs de retour */
  const protocol = (req.headers['x-forwarded-proto'] || 'https').toString().split(',')[0];
  const host     = (req.headers.host || 'cookitrader.vercel.app').toString();
  const baseUrl  = process.env.VITE_PUBLIC_APP_URL || `${protocol}://${host}`;

  try{
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: bundle.amountCents,
          product_data: {
            name: bundle.name,
            description: `Bundle de ${bundle.cafes} cafés crédités sur le compte ${userCode}`,
          },
        },
        quantity: 1,
      }],
      /* metadata : c'est ici que le webhook lit qui créditer + combien.
         Source de vérité côté serveur — pas confiance au client. */
      metadata: {
        userCode,
        bundleId,
        cafes: String(bundle.cafes),
      },
      success_url: `${baseUrl}/?cf_purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${baseUrl}/?cf_purchase=cancel`,
    });
    return res.status(200).json({ url: session.url });
  }catch(err){
    // eslint-disable-next-line no-console
    console.error('[stripe] checkout session error:', err.message);
    return res.status(500).json({ error: 'Erreur lors de la création de la session Stripe' });
  }
}
