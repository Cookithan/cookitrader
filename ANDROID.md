# 📱 Build Android (Capacitor) — CookiTrader

L'app web (PWA déjà live sur Vercel) est emballée dans une app Android native via
**Capacitor**. Le contenu (HTML/JS/CSS) est **embarqué dans l'APK** ; le marché,
le boss, le classement, Supabase Realtime et Stripe continuent de tourner **en
ligne** exactement comme sur le web (rien n'est hors-ligne, juste l'interface est
packagée pour passer la validation Google Play sans souci).

- **appId** : `com.cookithan.cookiminer` (⚠️ définitif une fois publié)
- **Nom affiché** : CookiTrader
- **versionName** : `1.23.0` · **versionCode** : `1` (à incrémenter à chaque release Play Store)
- minSdk 24 (Android 7+) · targetSdk 36

---

## 1. Prérequis (à installer une fois — ~1 Go)

Tu es sur Windows, tout tourne nativement, **pas besoin de Mac**.

1. Télécharge **Android Studio** : https://developer.android.com/studio
2. Installe avec les options par défaut. Au premier lancement, l'assistant
   installe automatiquement le **JDK**, l'**Android SDK** et les
   **build-tools** — laisse-le faire (accepte les licences).
3. Rien d'autre à configurer : Android Studio embarque son propre Java.

> Tant qu'Android Studio n'est pas installé, les commandes `npx cap run android`
> ou un build Gradle échoueront (« java not found »). C'est normal.

---

## 2. Workflow de dev (à chaque modif du code web)

```bash
npm run build        # régénère dist/
npx cap sync android # copie dist/ + plugins dans le projet android/
npx cap open android # ouvre Android Studio sur le projet
```

`cap sync` est la commande clé : **toujours la relancer après un `npm run build`**,
sinon l'app Android sert l'ancien bundle.

---

## 3. Tester sur ton téléphone

1. Sur le téléphone : Paramètres → À propos → tape 7× sur « Numéro de build »
   pour activer le mode développeur, puis active **Débogage USB**.
2. Branche le téléphone en USB, autorise l'ordi quand il demande.
3. Dans Android Studio : sélectionne ton appareil en haut, clique ▶ **Run**.
   (ou en ligne de commande : `npx cap run android`)

L'app s'installe et se lance. Vérifie : icône cookie correcte, pas de flash
blanc au démarrage, marché/classement/boss qui se connectent bien.

---

## 4. Générer l'APK / AAB pour le Play Store

### APK de test (partage direct, hors store)
Android Studio → menu **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
Fichier dans `android/app/build/outputs/apk/`.

### AAB signé (obligatoire pour publier sur le Play Store)
1. Android Studio → **Build → Generate Signed Bundle / APK → Android App Bundle**.
2. **Create new…** un keystore (fichier `.jks`).
   ⚠️ **SAUVEGARDE ce fichier + les mots de passe HORS du projet et hors git.**
   Le perdre = impossible de mettre à jour l'app sur le Play Store, jamais.
3. Build → l'`.aab` est dans `android/app/release/`.
4. Compte **Google Play Console** : 25 € une seule fois
   (https://play.google.com/console). Crée l'app, upload l'`.aab`, remplis la
   fiche (description, captures, politique de confidentialité), soumets.
   Validation Google : quelques heures à ~2 jours.

---

## 5. Mises à jour après publication

Le contenu étant embarqué dans l'APK, **mettre à jour le code = republier** :

```bash
# 1. incrémente versionCode (+1) et versionName dans android/app/build.gradle
# 2.
npm run build && npx cap sync android
# 3. regénère un AAB signé (même keystore) et upload sur la Play Console
```

> Le `ForceUpdateModal` (déclenché par `system_status.force_version` en SQL)
> reste utile pour **prévenir** les joueurs qu'une nouvelle version existe, mais
> sur Android il ne rafraîchit pas le bundle embarqué — c'est la mise à jour
> Play Store qui apporte le nouveau code. (Possibilité plus tard : live-update
> type Capgo si on veut pousser des correctifs sans review Google.)

---

## Notes / pièges

- `android/` **est versionné** dans git (config, icônes, Gradle). Les artefacts
  de build (`android/build/`, `.gradle/`, `local.properties`, web assets copiés)
  sont ignorés via `android/.gitignore` (généré par Capacitor).
- Le `.gitignore` racine ignore les `*.png` épars **sauf** `public/**` et
  `android/**` (sinon les icônes de lancement disparaîtraient à un clone neuf).
  → tout nouveau png ailleurs nécessite `git add -f`.
- Icônes générées via `@capacitor/assets` depuis `assets/icon-only.png` +
  `assets/icon-foreground.png` (copies des icônes PWA 512px). Fond adaptatif
  forcé en espresso `#3D2010` (palette café-only, jamais de blanc).
- `colors.xml` (caramel/espresso/or) a été créé manuellement : le scaffold
  Capacitor 8 référençait `colorPrimary` sans le définir → build cassé sinon.
