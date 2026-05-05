# CookiTrader 🍪☕

App mobile React de récompenses sur le thème café & cookie. L'utilisateur joue à des mini-jeux, accumule des cookies (la monnaie), monte de niveau, débloque des récompenses cosmétiques, investit sur un marché simulé $CKM, et se mesure dans un classement.

L'app est volontairement **mobile-first** (largeur max 430px) et **addictive** : animations, retours tactiles, feedback visuel, anticipation avant les récompenses.

## Stack

- React 19 + Vite
- lucide-react pour les icônes (seule dépendance externe en plus de React)
- Aucun framework CSS — styles inline + bloc `<style>` global pour les keyframes
- Persistance via `localStorage` (préfixe `cookiminer:`)

## Lancer l'app

```bash
npm install
npm run dev
```

L'app se lance sur `http://localhost:5173`.

Pour tester depuis un téléphone sur le même Wi-Fi : `npm run dev -- --host`, puis ouvrir l'IP affichée.

## Mini-jeux

- **Check-in quotidien** — récompense progressive selon la série, jackpot le 7e jour
- **Quiz café** — 1 session toutes les 5h, 3 questions, 3 difficultés (Facile / Moyen / Expert)
- **Roue de la fortune** — coût 20 🍪, gains/pertes jusqu'à ±300, jackpot rare à +200
- **Défi de clics** — 5 secondes, 1 cookie / 2 clics, combos visuels x2/x3/x4
- **Stop le café** — relâche entre 90% et 105% pour gagner, +15 🍪 au pile-poil

## Marché $CKM

Marché simulé qui tourne en arrière-plan dès le niveau 3. Cours volatil avec news café-thématiques (small / big / mega catastrophes), correction automatique aux extrêmes.

## Monnaies

- 🍪 **Cookie** — monnaie de base
- ☕ **CF (Café)** — monnaie premium rare, sources strictement limitées (4 achievements + convertisseur 1000:1)

## Classement

29 bots fictifs + le joueur. Top 1 reçoit +300 cookies/jour, tous les bots gagnent 1-10 cookies/heure avec dynamique de rattrapage. Tri par Cookies / Score / Cafés / Niveau / Série / Clics.
