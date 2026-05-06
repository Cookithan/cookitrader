import { useState } from "react";
import { ESPRESSO } from "../../data/themes.js";

/* ════════════════════════════════════════════════════
   FriendsSection — section "Mes Amis" du Profil (PHASE 3)
   ────────────────────────────────────────────────────
   À ce stade, l'UI uniquement :
   - Affichage du code unique de l'utilisateur (généré au 1er lancement)
   - Bouton "Copier" via navigator.clipboard
   - Zone "À venir prochainement" — pas de profils fictifs ni de bots
   Le branchement à un vrai backend (Supabase) viendra plus tard.

   Props :
   - userCode : code "XXX-XXX" généré par generateUserCode()
   - C        : palette active
═══════════════════════════════════════════════════════ */
export function FriendsSection({ userCode, C }){
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    if(!userCode) return;
    try {
      await navigator.clipboard.writeText(userCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard API indispo (http, vieux navigateurs) — fallback silencieux */
    }
  };

  return (
    <section>
      <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:2, marginBottom:10 }}>MES AMIS</div>

      {/* Carte code ami */}
      <div style={{ background:ESPRESSO, borderRadius:16, padding:'16px 18px', border:'1px solid rgba(212,160,23,.35)', boxShadow:'0 6px 18px rgba(74,44,23,.25)' }}>
        <div style={{ fontSize:9, color:'rgba(255,255,255,.55)', textTransform:'uppercase', letterSpacing:2, fontWeight:700, marginBottom:6 }}>MON CODE AMI</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
          <span style={{
            fontSize:21, fontWeight:900, color:'#F0C050',
            letterSpacing:3, whiteSpace:'nowrap',
            fontFamily:'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
            flex:'0 1 auto', minWidth:0
          }}>
            {userCode || '—'}
          </span>
          <button
            onClick={copyCode}
            disabled={!userCode}
            style={{
              flexShrink:0,
              padding:'8px 14px', borderRadius:11,
              background: copied ? 'rgba(212,160,23,.25)' : 'rgba(255,255,255,.08)',
              border:`1px solid ${copied ? 'rgba(212,160,23,.65)' : 'rgba(255,255,255,.18)'}`,
              color: copied ? '#F0C050' : '#F5E8D0',
              fontSize:12, fontWeight:700, cursor: userCode ? 'pointer' : 'default',
              transition:'all .25s', whiteSpace:'nowrap'
            }}
          >
            {copied ? '✓ Copié' : '📋 Copier'}
          </button>
        </div>
        <div style={{ fontSize:10.5, color:'rgba(255,255,255,.55)', marginTop:10, lineHeight:1.45 }}>
          Garde ce code, il te servira bientôt pour ajouter tes amis.
        </div>
      </div>

      {/* Zone à venir */}
      <div style={{
        background:'rgba(193,127,60,0.08)',
        border:'2px dashed rgba(193,127,60,0.3)',
        borderRadius:16,
        padding:24,
        textAlign:'center',
        marginTop:12,
      }}>
        <div style={{ fontSize:48, marginBottom:8 }}>👥</div>
        <div style={{ fontSize:15, fontWeight:800, color:C.text, marginBottom:6 }}>
          Système d'amis — Bientôt disponible
        </div>
        <div style={{ fontSize:12, color:C.muted, lineHeight:1.45 }}>
          Tu pourras ajouter d'autres joueurs avec leur code et comparer vos progressions !
        </div>
      </div>
    </section>
  );
}
