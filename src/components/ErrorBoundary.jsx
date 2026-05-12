import { Component } from "react";
import { Cookie, RefreshCw } from "lucide-react";
import { GOLD } from "../data/themes.js";
import { GLOBAL_CSS } from "../styles/globalStyles.js";

/* ════════════════════════════════════════════════════
   ErrorBoundary — catch les crashs React et affiche un écran de
   récupération propre (au lieu d'un écran blanc).
   ────────────────────────────────────────────────────
   À placer le plus haut possible dans l'arbre (juste sous le Root) :
   - Catch les erreurs synchrones dans les composants enfants
   - N'attrape PAS : event handlers, async, server-side, lui-même
   - Inutile pour Suspense (qui a son propre mécanisme)

   Pour récupérer, l'utilisateur a deux boutons :
   - "Réessayer" : reset le state interne → re-rend les enfants
     (utile si l'erreur était transitoire, ex. fetch raté)
   - "Recharger l'app" : window.location.reload() (cas extrême)

   En dev, le détail technique de l'erreur est visible dans un bloc
   <pre>. En prod il est masqué (le joueur n'a pas à voir une stack).

   Log : console.error + appel optionnel à window.cookiOnError(err) si
   une telle fonction est exposée par ailleurs (ex. télémétrie future).
═══════════════════════════════════════════════════════ */

export default class ErrorBoundary extends Component {
  constructor(props){
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error){
    return { error };
  }

  componentDidCatch(error, errorInfo){
    /* eslint-disable no-console */
    console.error('[ErrorBoundary] React crash:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo?.componentStack);
    /* eslint-enable no-console */
    this.setState({ errorInfo });
    try{
      if(typeof window !== 'undefined' && typeof window.cookiOnError === 'function'){
        window.cookiOnError(error, errorInfo);
      }
    }catch{}
  }

  handleRetry = () => {
    this.setState({ error: null, errorInfo: null });
  };

  handleReload = () => {
    try{ window.location.reload(); }catch{}
  };

  render(){
    if(!this.state.error) return this.props.children;

    const isDev = (typeof import.meta !== 'undefined') && import.meta?.env?.DEV;
    const C = { text:'#F0E6D3', muted:'#A88B70' };

    return (
      <div style={{
        position:'fixed', inset:0, zIndex:99998,
        background:'linear-gradient(160deg,#0A0402 0%,#1F0E04 50%,#1A0A02 100%)',
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        padding:'24px', textAlign:'center',
        fontFamily:'system-ui,-apple-system,sans-serif', color:C.text,
        userSelect:'none', touchAction:'none',
        overflow:'auto',
      }}>
        <style>{GLOBAL_CSS}</style>

        {/* Cookie + cookie cassé pour signaler l'erreur sans rouge ni vert */}
        <div style={{
          position:'relative',
          width:140, height:140,
          marginBottom:28,
          animation:'idle 3.5s ease-in-out infinite',
        }}>
          <div style={{
            position:'absolute', inset:0,
            borderRadius:'50%',
            background:'radial-gradient(circle at 35% 30%, #C8945A 0%, #8B5A2A 55%, #5A3520 100%)',
            boxShadow:'0 0 48px rgba(212,160,23,.35), inset -8px -8px 20px rgba(0,0,0,.4), inset 6px 6px 12px rgba(255,220,170,.2)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <Cookie size={70} strokeWidth={1.5} color="#3D2010" style={{ opacity:.7 }} />
          </div>
          {/* Fissure visuelle simulée via 2 demi-cookies */}
          <div style={{
            position:'absolute', top:'48%', left:'10%', right:'10%',
            height:3, background:'#3D2010', opacity:.5,
            transform:'rotate(-8deg)', borderRadius:2,
          }} />
        </div>

        <h1 style={{
          margin:'0 0 14px 0',
          fontSize:24, fontWeight:800,
          letterSpacing:.4,
          background:'linear-gradient(180deg,#FFE89A,#D4A017)',
          WebkitBackgroundClip:'text', backgroundClip:'text',
          WebkitTextFillColor:'transparent',
        }}>
          🍪 Le cookie a craqué
        </h1>

        <p style={{
          margin:0, fontSize:15, lineHeight:1.6,
          color:C.muted, maxWidth:340,
        }}>
          Quelque chose s'est mal passé. Ta progression est sauvegardée
          — réessaie, ou recharge l'app si ça persiste.
        </p>

        {isDev && this.state.error && (
          <pre style={{
            marginTop:22, padding:'12px 14px',
            background:'rgba(0,0,0,.4)',
            border:'1px solid rgba(212,160,23,.2)',
            borderRadius:10,
            fontSize:11, color:'#FFE89A',
            maxWidth:'min(420px, 90vw)',
            maxHeight:200,
            overflow:'auto',
            textAlign:'left',
            whiteSpace:'pre-wrap',
            wordBreak:'break-word',
          }}>
            {String(this.state.error.message || this.state.error)}
            {this.state.errorInfo?.componentStack && (
              `\n\n— component stack —${this.state.errorInfo.componentStack}`
            )}
          </pre>
        )}

        <div style={{ display:'flex', gap:10, marginTop:28, flexWrap:'wrap', justifyContent:'center' }}>
          <button
            onClick={this.handleRetry}
            style={{
              padding:'13px 22px',
              background:GOLD, color:'#fff',
              border:'none', borderRadius:14,
              fontSize:14, fontWeight:800, letterSpacing:.3,
              cursor:'pointer',
              boxShadow:'0 6px 16px rgba(212,160,23,.45)',
              display:'inline-flex', alignItems:'center', gap:8,
              touchAction:'manipulation',
            }}
          >
            <RefreshCw size={16} strokeWidth={2.6} />
            Réessayer
          </button>
          <button
            onClick={this.handleReload}
            style={{
              padding:'13px 22px',
              background:'rgba(212,160,23,.15)',
              color:'#FFE8A8',
              border:'1px solid rgba(212,160,23,.4)',
              borderRadius:14,
              fontSize:14, fontWeight:700, letterSpacing:.3,
              cursor:'pointer',
              touchAction:'manipulation',
            }}
          >
            Recharger l'app
          </button>
        </div>
      </div>
    );
  }
}
