import { Lock } from "lucide-react";
import { LEVEL_NAMES } from "../../data/constants.js";
import { GOLD, ESPRESSO } from "../../data/themes.js";
import { useTranslation } from "../../i18n/index.js";

/* ════════════════════════════════════════════════════
   MarketLocked — écran "Marché indisponible" (niveau < 3)
   - xpDone : XP totale cumulée depuis niveau 1 (formule somme arithmétique)
   - xpTarget : XP totale requise pour atteindre niveau 3 (= 100 + 200 = 300)
   - Affiche la barre de progression + nombre d'XP restantes
═══════════════════════════════════════════════════════ */

export function MarketLocked({ level, xp, xpReq, C }) {
  const { t } = useTranslation();
  const TARGET_LEVEL = 3;
  const xpDone   = 100 * ((level-1)*level)/2 + xp;
  const xpTarget = 100 * ((TARGET_LEVEL-1)*TARGET_LEVEL)/2;
  const pct      = Math.min((xpDone/xpTarget)*100, 100);
  const xpLeft   = Math.max(0, xpTarget - xpDone);
  return (
    <div className="su" style={{ paddingTop:30, textAlign:'center' }}>
      <div style={{ width:88, height:88, borderRadius:'50%', margin:'0 auto 18px', background:ESPRESSO, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 10px 28px rgba(74,44,23,.4)' }}>
        <Lock size={36} color="#D4A017" />
      </div>
      <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:6 }}>{t('market.title')}</div>
      <div style={{ fontSize:22, fontWeight:800, color:C.text, marginBottom:8 }}>{t('market.locked_title')}</div>
      <div style={{ fontSize:13, color:C.muted, lineHeight:1.55, maxWidth:300, margin:'0 auto 22px' }}>
        {t('market.locked_desc')}
      </div>

      <div style={{ borderRadius:18, padding:16, background:C.card, border:`1px solid ${C.border}`, maxWidth:340, margin:'0 auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:C.muted, marginBottom:8 }}>
          <span>{t('home.level_card', { n: level, label: LEVEL_NAMES[level] })}</span>
          <span>{t('home.xp_label', { cur: xpDone, max: xpTarget })}</span>
        </div>
        <div style={{ height:8, borderRadius:4, background:C.card2, overflow:'hidden' }}>
          <div style={{ height:'100%', borderRadius:4, width:`${pct}%`, background:GOLD, transition:'width .8s cubic-bezier(.36,.07,.19,.97)' }} />
        </div>
        <div style={{ marginTop:10, fontSize:11, color:C.muted }}>
          {t('market.locked_xp_left', { n: xpLeft })}
        </div>
      </div>

      <div style={{ marginTop:22, fontSize:11, color:C.muted, fontStyle:'italic' }}>
        {t('market.locked_tip')}
      </div>
    </div>
  );
}
