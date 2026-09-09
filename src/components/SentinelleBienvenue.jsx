import { useEffect, useRef, useState } from "react";
import { THEME_SENTINELLE, BANNIERE, FOND } from "../data/sentinelleTheme.js";
import { useTranslation } from "../i18n/index.js";

/* ════════════════════════════════════════════════════
   SentinelleBienvenue — elle se réveille quand on entre
   ────────────────────────────────────────────────────
   Le même accueil pour les deux écrans de la Sentinelle : la console de
   Cookithan et l'entonnoir des joueurs. Seule la phrase change.

   POURQUOI UN ACCUEIL
   ───────────────────
   On pousse cette porte quand quelque chose ne va pas — c'est le moment
   de l'app où l'on est le moins bien disposé. Tomber directement sur une
   liste de catégories donne un formulaire administratif. Une seconde de
   présence avant, et c'est quelqu'un qui répond.

   Le nom du joueur y est pour beaucoup : l'app le connaît, autant s'en
   servir. « Bonjour Miagguy » n'est pas la même chose que « Signaler un
   problème ».

   POURQUOI ÇA NE BLOQUE PAS
   ─────────────────────────
   Un écran d'accueil qu'on doit fermer devient une corvée dès la
   deuxième fois. Celui-ci part tout seul, et un doigt posé n'importe où
   le fait partir immédiatement — on n'attend jamais après lui.

   Chaque animation reste sous 700 ms (règle du projet). C'est le
   DÉCALAGE entre le bouclier, le halo et la phrase qui donne
   l'impression d'un réveil, pas leur durée.
═══════════════════════════════════════════════════════ */

const C = THEME_SENTINELLE;

/* Le bouclier arrive (620), la phrase suit (450 après 300 de retard),
   on laisse respirer, puis tout se dissout (340). */
const AVANT_SORTIE = 1150;
const TOTAL        = 1500;

export function SentinelleBienvenue({ nom, admin = false, onFini }) {
  const { t } = useTranslation();
  const [sort, setSort] = useState(false);

  /* ── Pourquoi ce ref ──────────────────────────────
     `onFini` est écrit en clair dans le parent — donc reconstruit à
     CHAQUE rendu. Le mettre en dépendance de l'effet remettait les deux
     minuteries à zéro à chaque fois que le parent se redessinait, et la
     console en enchaîne plusieurs pendant qu'elle charge ses rapports :
     l'accueil ne partait jamais tout seul.

     On garde donc la fonction dans un ref, et l'effet ne tourne qu'une
     fois. Corriger côté parent (un useCallback) marcherait aussi, mais
     ce composant ne doit pas dépendre de la discipline de ses appelants
     pour savoir disparaître. */
  const finiRef = useRef(onFini);
  useEffect(() => { finiRef.current = onFini; }, [onFini]);

  useEffect(() => {
    const a = setTimeout(() => setSort(true), AVANT_SORTIE);
    const b = setTimeout(() => finiRef.current?.(), TOTAL);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);

  /* Passer outre : un doigt posé n'importe où et on est dans l'écran.
     On garde la dissolution — couper net donnerait un clignotement. */
  const passer = () => {
    if (sort) return;
    setSort(true);
    setTimeout(() => finiRef.current?.(), 340);
  };

  const titre = nom ? t('report.hello', { nom }) : t('report.hello_anon');
  /* Le ton du jeu plutôt que celui d'un outil d'administration : on
     est dans une app de café, la Sentinelle n'a pas de raison de
     parler comme un formulaire. Côté console la phrase reste en
     français — c'est le seul écran qui ne soit pas ouvert aux
     joueurs. */
  const sous  = admin ? 'Le café est chaud. Voyons.' : t('report.hello_guest');

  return (
    <div
      onPointerDown={passer}
      className={sort ? 's-out' : undefined}
      style={{
        position:'absolute', inset:0, zIndex:5,
        background:FOND,
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', gap:2,
        padding:'0 32px', textAlign:'center',
        touchAction:'manipulation', cursor:'pointer',
      }}
    >
      {/* Le bouclier, et le halo qui part de dessous lui. */}
      <div style={{ position:'relative', marginBottom:18 }}>
        <div
          className="s-halo"
          aria-hidden
          style={{
            position:'absolute', inset:-14, borderRadius:'50%',
            border:'2px solid rgba(43,124,178,.55)',
            animationDelay:'.18s',
          }}
        />
        <div
          className="s-wake"
          style={{
            width:88, height:88, borderRadius:26,
            background: BANNIERE,
            border:'1px solid rgba(255,255,255,.75)',
            boxShadow:'0 10px 28px rgba(30,80,125,.28)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:42, lineHeight:1,
          }}
        >
          🛡️
        </div>
      </div>

      <div
        className="s-line"
        style={{
          animationDelay:'.30s',
          fontSize:22, fontWeight:900, letterSpacing:-.4,
          color:C.text, lineHeight:1.2,
        }}
      >
        {titre}
      </div>

      <div
        className="s-line"
        style={{
          animationDelay:'.44s',
          fontSize:13, color:C.muted, lineHeight:1.5, marginTop:7,
          maxWidth:260,
        }}
      >
        {sous}
      </div>
    </div>
  );
}
