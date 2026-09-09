# sql/ — tout ce qui se colle dans l'éditeur Supabase

Ces fichiers ne sont **pas des migrations**. Ils ne sont jamais joués par
un outil : on les ouvre, on copie, on colle dans l'éditeur SQL de
Supabase. C'est pour ça qu'ils ne sont pas dans `supabase/migrations/` —
la CLI essaierait de les rejouer.

Ils sont **idempotents** : les repasser deux fois ne casse rien.

> ⚠️ **`A_LANCER_PRIVE.sql` contient la phrase de passe en clair.** Il est
> dans le `.gitignore` et n'existe que sur la machine de Cookithan. Le
> dépôt `Cookithan/cookitrader` est **public** : ne jamais l'y ajouter, ne
> jamais recopier son contenu dans un autre fichier.

---

## Le socle vivant

Si on repartait d'une base vide, c'est ce qu'il faudrait repasser, dans
cet ordre. Le reste de la liste est de l'histoire.

**Le schéma de départ**
| | |
|---|---|
| `MIGRATION_system_status.sql` | l'état global (maintenance, bandeau) |
| `MIGRATION_total_play_time.sql` | le compteur de temps de jeu |
| `MIGRATION_banner.sql` | le bandeau d'annonce |
| `MIGRATION_duels.sql` | les duels |
| `MIGRATION_boss_communautaire.sql` | le boss communautaire |
| `MIGRATION_SENTINELLE.sql` | les tables de la Sentinelle |

**Les protections**
| | |
|---|---|
| `LE_MUR.sql` | empêche un compte sanctionné de remonter ses valeurs |
| `LE_MUR_CORRECTIF.sql` | ⚠️ le mur ne tenait que dans l'éditeur SQL — sans `security definer` il ne bloquait personne |
| `PROTEGER_LE_PRIX.sql` | le cours ne peut plus sauter de plus de 15 % d'un coup |

**La Sentinelle**
| | |
|---|---|
| `SENTINELLE_ACTIONS.sql` | les onze gestes + le journal + la table des ignorés |
| `SENTINELLE_SCHEMA.sql` | elle compare le dépôt et la base, et dit quoi coller |
| `SIGNALEMENTS.sql` | la boîte aux lettres des joueurs + la phrase de passe |
| `SIGNALEMENTS_LANGUE.sql` | que les refus se traduisent aussi |
| `SENTINELLE_HORLOGE.sql` | pg_cron : le battement du marché, la ronde déterministe |
| `SENTINELLE_IA.sql` | la mémoire de la conversation |
| `SENTINELLE_NOTES.sql` | ce qu'elle apprend et retient |
| `SENTINELLE_DOSSIERS.sql` | la pile de dossiers qu'elle te tend |
| `SENTINELLE_RONDE_IA.sql` | pg_net : l'horloge la réveille, elle ⚠️ contient l'URL et la clé anon, à substituer à la main |
| `SENTINELLE_MODIFIER.sql` | une main directe sur un compte |
| `SENTINELLE_ECONOMIE.sql` | les cinq portes devant ses rondes + l'interrupteur d'autonomie |
| `SENTINELLE_ANNONCE.sql` | elle parle aux joueurs (pop-up + messagerie) |
| `SENTINELLE_AUTONOMIE.sql` | le socle annulable ⚠️ **le mode full ne doit pas être activé sans lui** |

**Les données de référence**
| | |
|---|---|
| `CODES_HISTORIQUES_EN_BASE.sql` | les 24 codes promo de l'app passent en base |
| `VERSION_PAR_JOUEUR.sql` | connaître la version installée de chaque joueur |
| `TOUS_LES_JOUEURS.sql` | le tableau complet, sans filtre de temps |

---

## Passés une fois, gardés pour mémoire

À ne PAS repasser : ils décrivent un moment précis, et les rejouer
referait un geste déjà fait.

| | |
|---|---|
| `A_LANCER_1.29.sql` | la livraison 1.29 (sanctions, exploit Memory) |
| `A_LANCER_MAINTENANT.sql` | les deux chantiers du 08/09 au soir |
| `SANCTION_EXPLOIT_MEMORY.sql` | la sanction de l'exploit du Memory |
| `RESTAURER_ACTIONS_CKM.sql` | remise en état des portefeuilles $CKM |
| `SPLIT_MARCHE_500.sql` | passage du marché à l'échelle 500 |
| `LAUNCH_BOSS_50K.sql` | déclenchement manuel d'un boss |
| `EFFACER_TEXTES_MAINTENANCE.sql` | nettoyage des textes de maintenance |
| `RESET_APRES_ESSAIS.sql` | efface nos essais, garde le marché neuf |
| `DETECT_SOLDES_ABERRANTS.sql` | diagnostic, lecture seule — celui-là se rejoue sans risque |

---

## La convention d'écriture

Un fichier finit par une **vérification qui ne laisse rien derrière
elle** : on regarde que l'objet existe et que `anon` peut l'appeler, via
`pg_proc` + `has_function_privilege`.

On n'appelle **jamais** une fonction avec une fausse phrase de passe pour
« prouver qu'elle refuse » : chaque refus est journalisé, et **dix refus
en quinze minutes ferment la console pour un quart d'heure** — coller
deux ou trois fichiers d'affilée verrouillait l'écran à l'instant où on
venait de l'installer. Et ça ne prouvait rien : dans l'éditeur on est
`postgres`, pas `anon`.

Détail complet : règle 11 du `CLAUDE.md`.
