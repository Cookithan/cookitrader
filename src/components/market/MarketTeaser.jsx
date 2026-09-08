import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { getMarketState, getMarketHistory, MARKET_CONFIG } from "../../lib/market.js";
import { useTranslation } from "../../i18n/index.js";

/* ════════════════════════════════════════════════════
   MarketTeaser — le cours du $CKM en pied d'accueil
   ────────────────────────────────────────────────────
   Le marché est l'écran le plus vivant de l'app et le moins visité : il
   faut ouvrir un onglet pour savoir s'il se passe quelque chose, donc
   personne n'y va, donc il ne s'y passe rien. Cette carte casse la
   boucle — le cours arrive jusqu'au joueur au lieu de l'attendre.

   Elle ne s'affiche que si le marché EXISTE pour ce joueur :
     · Supabase branché (sinon il n'y a pas de marché du tout)
     · niveau ≥ MARKET_CONFIG.UNLOCK_LEVEL — annoncer un cours à
       quelqu'un qui ne peut pas encore acheter, c'est de la frustration
       gratuite

   La variation se lit sur 24 h. Pas de rouge ni de vert : une hausse est
   dorée, une baisse est moka. La règle du projet vaut aussi ici, et de
   toute façon le vert boursier n'a rien à faire dans un café.
═══════════════════════════════════════════════════════ */

export function MarketTeaser({ level, onOpen, C }) {
  const { t } = useTranslation();
  const [etat, setEtat] = useState(null);

  const ouvert = level >= MARKET_CONFIG.UNLOCK_LEVEL;

  useEffect(() => {
    if (!ouvert) return;
    let vivant = true;

    const lire = async () => {
      try {
        const [state, histo] = await Promise.all([
          getMarketState(),
          getMarketHistory(24 * 60),
        ]);
        if (!vivant || !state) return;

        /* Le point le plus ancien des 24 h sert de référence. S'il n'y
           en a qu'un, la variation est nulle plutôt qu'inventée. */
        const debut = histo?.length ? Number(histo[0].price) : null;
        const prix  = Number(state.current_price) || 0;
        const varPct = debut && debut > 0 ? ((prix - debut) / debut) * 100 : 0;

        setEtat({ prix, varPct, circulation: Number(state.shares_in_circulation) || 0 });
      } catch { /* hors ligne : la carte reste absente, sans message d'erreur */ }
    };

    lire();
    return () => { vivant = false; };
  }, [ouvert]);

  if (!ouvert || !etat) return null;

  const hausse = etat.varPct >= 0;
  const teinte = hausse ? '#D4A017' : '#7D4E1F';

  return (
    <button
      onClick={onOpen}
      style={{
        width:'100%', marginTop:16, padding:'14px 16px', borderRadius:16,
        background:'linear-gradient(140deg, rgba(212,160,23,.10), rgba(193,127,60,.06))',
        border:`1px solid ${C.border}`,
        display:'flex', alignItems:'center', gap:12,
        cursor:'pointer', textAlign:'left',
      }}
    >
      <div style={{
        width:38, height:38, borderRadius:11, flexShrink:0,
        background:'rgba(212,160,23,.14)', border:'1px solid rgba(212,160,23,.35)',
        display:'flex', alignItems:'center', justifyContent:'center', color:'#D4A017',
      }}>
        <TrendingUp size={18} />
      </div>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1.5 }}>
          {t('market_card.ticker')}
        </div>
        <div style={{ display:'flex', alignItems:'baseline', gap:7, marginTop:2 }}>
          <span style={{ fontSize:18, fontWeight:900, color:C.text }}>
            {Math.round(etat.prix)} 🍪
          </span>
          <span style={{ fontSize:12, fontWeight:800, color:teinte }}>
            {hausse ? '▲' : '▼'} {Math.abs(etat.varPct).toFixed(1)} %
          </span>
        </div>
        <div style={{ fontSize:10.5, color:C.muted, marginTop:2 }}>
          {t('market_card.teaser_sub', { n: etat.circulation, total: MARKET_CONFIG.TOTAL_SHARES })}
        </div>
      </div>

      <span style={{ flexShrink:0, fontSize:15, fontWeight:800, color:'#D4A017' }}>›</span>
    </button>
  );
}
