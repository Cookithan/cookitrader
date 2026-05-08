import { useEffect, useRef, useState } from "react";
import { GOLD } from "../../data/themes.js";
import { restoreProfile } from "../../lib/supabaseSync.js";

/* ════════════════════════════════════════════════════
   RestoreProfileModal — saisie code + appel restoreProfile
   ────────────────────────────────────────────────────
   Appelée depuis :
     · OnboardingModal (1er lancement, "J'ai déjà un compte")
     · SettingsOverlay (utilisateur déjà connecté qui veut bascule)

   Format input : 6 chars alphanum (XXX-XXX), tiret auto inséré au 4e char.

   Props :
     onCancel             ()
     onSuccess(data)      reçoit le payload restoreProfile (cf. supabaseSync)
     warning              boolean — si true, affiche un avertissement
                          "données actuelles remplacées" en haut
     C
═══════════════════════════════════════════════════════ */
export function RestoreProfileModal({ onCancel, onSuccess, warning = false, C }){
  const [code,    setCode]    = useState('');
  const [pin,     setPin]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [shake,   setShake]   = useState(false);
  const inputRef    = useRef(null);
  const pinInputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  /* Auto-format : 6 chars alphanum max, tiret entre les 3 premiers et 3 derniers */
  const handleChange = (raw) => {
    const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    const formatted = cleaned.length > 3
      ? cleaned.slice(0, 3) + '-' + cleaned.slice(3)
      : cleaned;
    setCode(formatted);
    if(error) setError(null);
  };

  const handlePinChange = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    setPin(digits);
    if(error) setError(null);
  };

  const isCodeValid = /^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(code);
  const isPinValid  = /^\d{4}$/.test(pin);
  const isValid     = isCodeValid && isPinValid;

  const handleRestore = async () => {
    if(loading || !isValid) return;
    setError(null);
    setLoading(true);
    const res = await restoreProfile(code, pin);
    setLoading(false);

    if(res.error){
      setError(res.error);
      setShake(true);
      setTimeout(() => setShake(false), 450);
      return;
    }
    onSuccess(res.data);
  };

  return (
    <div
      onClick={onCancel}
      style={{
        position:'fixed', inset:0,
        background:'rgba(15,8,4,.85)',
        display:'flex', alignItems:'center', justifyContent:'center',
        zIndex:210, backdropFilter:'blur(8px)', padding:18,
      }}
    >
      <div
        onClick={(e)=>e.stopPropagation()}
        className="bi"
        style={{
          width:'100%', maxWidth:380,
          background:C.card, borderRadius:24,
          padding:'24px 22px 22px',
          boxShadow:'0 24px 60px rgba(0,0,0,.55)',
          border:`1.5px solid ${C.border}`,
          animation: shake ? 'shake .42s ease-in-out' : undefined,
        }}
      >
        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:16 }}>
          <div style={{ fontSize:54, lineHeight:1 }}>🔄</div>
          <div style={{ fontSize:20, fontWeight:900, color:C.text, marginTop:8 }}>
            Restaure ton compte
          </div>
          <div style={{ fontSize:12.5, color:C.muted, marginTop:8, lineHeight:1.5, padding:'0 4px' }}>
            Saisis ton code unique (6 caractères). Tu le trouves dans ton profil sur l'autre appareil.
          </div>
        </div>

        {/* Avertissement si remplacement d'un compte existant */}
        {warning && (
          <div style={{
            background:'rgba(125,78,31,.12)',
            border:'1px solid rgba(125,78,31,.35)',
            borderRadius:11, padding:'10px 12px',
            fontSize:11.5, color:'#7D4E1F', fontWeight:700,
            marginBottom:12, lineHeight:1.45, textAlign:'center',
          }}>
            ⚠️ Tes données actuelles seront <strong>remplacées</strong>.
          </div>
        )}

        {/* Input code */}
        <div style={{ marginBottom:8 }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1.5, marginBottom:5, textAlign:'center' }}>
            Code (XXX-XXX)
          </div>
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={code}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => {
              if(e.key === 'Enter'){
                if(isCodeValid && !isPinValid) pinInputRef.current?.focus();
                else if(isValid) handleRestore();
              }
            }}
            placeholder="B4R-1ST"
            maxLength={7}
            style={{
              width:'100%', padding:'14px 12px',
              borderRadius:14,
              border: error ? '2px solid #7D4E1F' : `2px solid ${C.border}`,
              background:C.card2, color:'#D4A017',
              fontSize:22, fontWeight:900, letterSpacing:6,
              textAlign:'center', outline:'none',
              fontFamily:'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
              boxSizing:'border-box',
              transition:'border-color .2s',
            }}
          />
        </div>

        {/* Input PIN (4 chiffres) */}
        <div style={{ marginBottom:4 }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1.5, marginBottom:5, textAlign:'center' }}>
            🔒 PIN (4 chiffres)
          </div>
          <input
            ref={pinInputRef}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={pin}
            onChange={(e) => handlePinChange(e.target.value)}
            onKeyDown={(e) => { if(e.key === 'Enter' && isValid) handleRestore(); }}
            placeholder="••••"
            maxLength={4}
            style={{
              width:'100%', padding:'14px 12px',
              borderRadius:14,
              border: error ? '2px solid #7D4E1F' : `2px solid ${C.border}`,
              background:C.card2, color:'#D4A017',
              fontSize:22, fontWeight:900, letterSpacing:8,
              textAlign:'center', outline:'none',
              fontFamily:'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
              boxSizing:'border-box',
              transition:'border-color .2s',
            }}
          />
        </div>

        {/* Erreur inline */}
        {error && (
          <div style={{
            marginTop:10, padding:'9px 12px', borderRadius:10,
            background:'rgba(125,78,31,.15)',
            fontSize:12, color:'#7D4E1F', fontWeight:700,
            textAlign:'center',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Hint scope complet */}
        <div style={{
          fontSize:10, color:C.muted, fontStyle:'italic',
          marginTop:10, lineHeight:1.5, textAlign:'center', padding:'0 6px',
        }}>
          Restauration complète : identité, progression, cafés ☕,<br/>
          tous les items débloqués, succès, amis et portfolio.
        </div>

        {/* Boutons */}
        <div style={{ display:'flex', gap:8, marginTop:16 }}>
          <button
            onClick={onCancel}
            style={{
              flex:1, padding:'13px 0', borderRadius:14,
              background:'transparent', border:`1.5px solid ${C.border}`,
              color:C.muted, fontSize:13, fontWeight:700, cursor:'pointer',
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleRestore}
            disabled={!isValid || loading}
            style={{
              flex:1.5, padding:'13px 0', borderRadius:14,
              background: !isValid || loading ? C.card2 : GOLD,
              color:      !isValid || loading ? C.muted   : '#fff',
              border:'none', fontSize:13, fontWeight:800, letterSpacing:.3,
              cursor: !isValid || loading ? 'not-allowed' : 'pointer',
              boxShadow: !isValid || loading ? 'none' : '0 6px 18px rgba(212,160,23,.4)',
            }}
          >
            {loading ? '…' : 'Restaurer'}
          </button>
        </div>
      </div>
    </div>
  );
}
