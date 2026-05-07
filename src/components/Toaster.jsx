import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

/* ════════════════════════════════════════════════════
   Toaster — système global de toasts (BRIEF_INBOX phase 2)
   ────────────────────────────────────────────────────
   Petit système maison sans dépendance, monté UNE FOIS au plus
   haut niveau (App.jsx > <ToasterProvider>).

   API d'usage :
     const { showToast } = useToast();
     showToast('🎁 +50 🍪 reçu !');
     showToast('Bonus appliqué', { duration: 3500 });

   Contraintes CookiMiner :
     - Palette café-only : pas de rouge ni de vert. Or (#D4A017)
       pour le bord/lueur, espresso pour le fond.
     - Mobile-first : centré en haut, ne déborde jamais (max-width 360px).
     - Empile verticalement plusieurs toasts simultanés.
     - Animation slide-in 250ms, slide-out 250ms.
     - touchAction:none / pointerEvents:none (purement visuel).

   Volontairement séparé du `cafeToast` existant (App.jsx) qui a sa
   propre identité visuelle (gradient violet) pour les gains de café
   premium ; ce Toaster sert aux notifications génériques inbox.
═══════════════════════════════════════════════════════ */

const ToastCtx = createContext(null);

export function useToast(){
  const ctx = useContext(ToastCtx);
  if(!ctx) return { showToast: () => {} };
  return ctx;
}

let TOAST_ID = 0;

export function ToasterProvider({ children }){
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    /* Phase 1 : marquer leaving=true → CSS slide-out */
    setToasts(ts => ts.map(t => t.id === id ? { ...t, leaving: true } : t));
    /* Phase 2 : retirer du DOM 260ms plus tard */
    const t2 = setTimeout(() => {
      setToasts(ts => ts.filter(t => t.id !== id));
      timersRef.current.delete(id);
    }, 260);
    timersRef.current.set(id, t2);
  }, []);

  const showToast = useCallback((message, opts = {}) => {
    const id = ++TOAST_ID;
    const duration = opts.duration ?? 2800;
    setToasts(ts => [...ts, { id, message, leaving: false }]);
    const t1 = setTimeout(() => dismiss(id), duration);
    timersRef.current.set(id, t1);
    return id;
  }, [dismiss]);

  /* Cleanup : si l'app unmount, vide les timers */
  useEffect(() => {
    const map = timersRef.current;
    return () => { map.forEach(t => clearTimeout(t)); map.clear(); };
  }, []);

  return (
    <ToastCtx.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        style={{
          position:'fixed', top:84, left:'50%', transform:'translateX(-50%)',
          zIndex:130, display:'flex', flexDirection:'column', gap:8,
          pointerEvents:'none', width:'100%', maxWidth:360, padding:'0 16px',
        }}
      >
        {toasts.map(t => (
          <div
            key={t.id}
            className={t.leaving ? 'toast-out' : 'toast-in'}
            style={{
              background:'linear-gradient(135deg,#3D2010 0%,#5C3317 100%)',
              border:'1.5px solid rgba(212,160,23,.55)',
              borderRadius:14,
              padding:'12px 16px',
              color:'#FFE89A',
              fontSize:13,
              fontWeight:700,
              letterSpacing:.2,
              boxShadow:'0 8px 24px rgba(74,44,23,.45), 0 0 16px rgba(212,160,23,.25)',
              textAlign:'center',
              whiteSpace:'pre-wrap',
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
