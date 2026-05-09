import { useState } from "react";
import { Coffee, ChevronLeft, Loader } from "lucide-react";
import { GOLD, ESPRESSO } from "../../data/themes.js";

/* ════════════════════════════════════════════════════
   BuyCafesModal — sélection d'un bundle de cafés ☕
   ────────────────────────────────────────────────────
   3 bundles (10/50/200 ☕). Tap un bundle → POST /api/create-checkout-session
   → redirect vers Stripe Checkout. Au retour, App.jsx détecte
   ?cf_purchase=success dans l'URL et affiche un toast.

   Source de vérité du prix/quantité : côté serveur (api/create-checkout-session.js).
   Le client n'envoie QUE le bundleId — sinon un attaquant pourrait
   modifier le montant.

   Props :
   - userCode : code unique du joueur (metadata Stripe)
   - onClose  : ferme la modale
   - C        : palette
═══════════════════════════════════════════════════════ */

const BUNDLES = [
  { id:'cf10',  cafes:10,  price:'0,99 €',  pricePerCafe:'~0,10 €/☕', tagline:'Pour goûter' },
  { id:'cf50',  cafes:50,  price:'3,99 €',  pricePerCafe:'~0,08 €/☕', tagline:'Le populaire' },
  { id:'cf200', cafes:200, price:'9,99 €',  pricePerCafe:'~0,05 €/☕', tagline:'Meilleur rapport ☕/€' },
];

export function BuyCafesModal({ userCode, onClose, C }){
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState('');

  const buy = async (bundleId) => {
    setError('');
    setLoadingId(bundleId);
    try{
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userCode, bundleId }),
      });
      const data = await res.json().catch(() => ({}));
      if(!res.ok || !data.url){
        setError(data.error || `Erreur (${res.status})`);
        setLoadingId(null);
        return;
      }
      /* Redirect vers Stripe Checkout. Au retour, App.jsx détecte le
         ?cf_purchase=success et affiche le toast / la sync remontera les
         cafés crédités côté serveur via le pull-on-mount. */
      window.location.href = data.url;
    }catch(err){
      setError('Erreur réseau');
      setLoadingId(null);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position:'fixed', inset:0, background:'rgba(15,8,4,.78)',
        display:'flex', alignItems:'center', justifyContent:'center',
        zIndex:90, backdropFilter:'blur(6px)', padding:18,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bi"
        style={{
          width:'100%', maxWidth:380,
          background:C.card, borderRadius:24,
          border:`1.5px solid ${C.border}`,
          boxShadow:'0 24px 60px rgba(0,0,0,.45)',
          overflow:'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          background:ESPRESSO, color:'#F0C050',
          padding:'18px 22px', textAlign:'center',
        }}>
          <div style={{ fontSize:36, lineHeight:1, marginBottom:4 }}>☕</div>
          <div style={{ fontSize:11, fontWeight:900, letterSpacing:3, textTransform:'uppercase', opacity:.85 }}>
            Achat de cafés
          </div>
          <div style={{ fontSize:18, fontWeight:900, marginTop:4 }}>
            Choisis ton bundle
          </div>
        </div>

        {/* Bundles */}
        <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:10 }}>
          {BUNDLES.map(b => {
            const loading = loadingId === b.id;
            const disabled = !!loadingId;
            return (
              <button
                key={b.id}
                onClick={()=>buy(b.id)}
                disabled={disabled}
                style={{
                  width:'100%', display:'flex', alignItems:'center', gap:14,
                  padding:'14px 16px', borderRadius:14,
                  background: loading ? GOLD : `linear-gradient(135deg, ${C.card2}, ${C.card})`,
                  border:`1.5px solid ${loading ? GOLD : 'rgba(212,160,23,.45)'}`,
                  color: loading ? '#fff' : C.text, textAlign:'left',
                  cursor: disabled ? 'wait' : 'pointer',
                  opacity: disabled && !loading ? .55 : 1,
                  transition:'background .2s, border-color .2s',
                }}
              >
                <div style={{ fontSize:34, lineHeight:1 }}>☕</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:15, fontWeight:900, marginBottom:2 }}>
                    {b.cafes} cafés
                  </div>
                  <div style={{ fontSize:10.5, color: loading ? 'rgba(255,255,255,.85)' : C.muted, fontStyle:'italic' }}>
                    {b.tagline} · {b.pricePerCafe}
                  </div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  {loading ? (
                    <Loader size={20} color="#fff" className="spin-anim" />
                  ) : (
                    <div style={{ fontSize:16, fontWeight:900, color:'#D4A017' }}>
                      {b.price}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {error && (
          <div style={{ padding:'0 18px 12px' }}>
            <div style={{
              fontSize:11.5, color:'#A87858', textAlign:'center', fontWeight:600,
              padding:'8px 12px', borderRadius:10,
              background:'rgba(125,78,31,.12)', border:'1px solid rgba(125,78,31,.3)',
            }}>
              ⚠ {error}
            </div>
          </div>
        )}

        <div style={{ padding:'12px 18px 18px', borderTop:`1px solid ${C.border}` }}>
          <div style={{ fontSize:10.5, color:C.muted, lineHeight:1.5, marginBottom:10, textAlign:'center' }}>
            Paiement sécurisé via Stripe. Tes cafés sont crédités automatiquement
            après confirmation.
          </div>
          <button
            onClick={onClose}
            disabled={!!loadingId}
            style={{
              width:'100%', padding:'12px 0', borderRadius:12,
              background:'transparent', color:C.muted,
              border:`1.5px solid ${C.border}`,
              fontSize:13, fontWeight:700,
              cursor: loadingId ? 'wait' : 'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:6,
            }}
          >
            <ChevronLeft size={14} /> Retour
          </button>
        </div>
      </div>
    </div>
  );
}
