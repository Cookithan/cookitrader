import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import { ToasterProvider } from './components/Toaster.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

/* ════════════════════════════════════════════════════
   MISE À JOUR DU CODE — le maillon qui manquait
   ────────────────────────────────────────────────────
   vite.config.js demande `registerType: 'autoUpdate'` avec skipWaiting
   et clientsClaim, en expliquant que c'est pour « éviter que les
   utilisateurs restent coincés sur une vieille version ». L'intention
   était là, l'implémentation non : sans import du module virtuel,
   le plugin n'injectait qu'un enregistrement nu —

       navigator.serviceWorker.register('/sw.js')

   — qui installe bien la nouvelle version, mais NE RECHARGE JAMAIS la
   page. Le nouveau service worker prenait le contrôle pendant que
   l'onglet continuait de faire tourner l'ancien JavaScript, parfois
   pendant des jours.

   Ce n'est pas un détail cosmétique. Le 08/09/2026, un joueur resté sur
   la version de juillet a fait tomber le cours du marché à 300 en
   boucle, parce que son code appliquait encore l'ancien plafond de
   prix. Un client périmé n'est pas un client en retard : c'est un
   client qui écrit dans la même base avec d'anciennes règles.

   ─── POURQUOI PAS UN RECHARGEMENT IMMÉDIAT ──────────
   Parce qu'il tomberait au milieu d'une partie. On attend que l'onglet
   passe en arrière-plan — écran verrouillé, app changée, téléphone
   posé : le moment exact où personne ne joue. Sur mobile ça arrive en
   quelques secondes, et le joueur retrouve l'app à jour sans avoir rien
   vu ni rien perdu.
═══════════════════════════════════════════════════════ */
const appliquerMaj = registerSW({
  immediate: true,
  onNeedRefresh() {
    const quandPersonneNeJoue = () => {
      if (document.visibilityState === 'hidden') {
        document.removeEventListener('visibilitychange', quandPersonneNeJoue)
        appliquerMaj(true)   // recharge et repart sur le nouveau code
      }
    }
    document.addEventListener('visibilitychange', quandPersonneNeJoue)
    quandPersonneNeJoue()    // déjà en arrière-plan ? on n'attend pas
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ToasterProvider>
        <App />
      </ToasterProvider>
    </ErrorBoundary>
  </StrictMode>,
)
