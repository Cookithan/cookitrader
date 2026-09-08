# -*- coding: utf-8 -*-
"""Plein écran pendant la partie.

Les sept mini-jeux qui ont une phase de jeu la signalent à GameOverlay,
qui efface son en-tête et laisse l'écran entier au jeu. Les cinq autres
(Quiz, Roue, Slot, Stop le café, Check-in) ne signalent rien : ce sont
des jeux au tour par tour, où la barre du haut ne gêne personne.

Pourquoi les jeux préviennent plutôt que GameOverlay ne devine : la
phase vit DANS chaque jeu, et lui seul sait quand la partie commence
vraiment. Une heuristique côté parent se serait trompée à chaque
changement de règle.
"""
import io, re

EFFET = """
  /* Plein écran pendant la partie (cf. GameOverlay). Le décompte est
     inclus : la bascule doit se faire AVANT le premier geste, pas au
     milieu de l'action. */
  useEffect(() => { onEnJeu?.(%s); }, [phase, onEnJeu]);
  /* Au démontage seulement — pas à chaque changement de phase, sinon
     l'en-tête clignoterait entre deux états. */
  useEffect(() => () => onEnJeu?.(false), [onEnJeu]);
"""

JEUX = {
    'CatcherGame': ("  const [phase,        setPhase]        = useState('idle');",
                    "phase === 'playing' || phase === 'countdown'"),
    'FlappyGame':  ("  const [phase, setPhase] = useState('idle');           // idle | countdown | playing | done",
                    "phase === 'playing' || phase === 'countdown'"),
    'ClickGame':   ("  const [phase,         setPhase]         = useState('idle');     // idle | countdown | playing | done",
                    "phase === 'playing' || phase === 'countdown'"),
    'ReflexGame':  ("  const [phase,         setPhase]         = useState('idle');     // idle | countdown | playing | done",
                    "phase === 'playing' || phase === 'countdown'"),
    'PyramidGame': ("  const [phase,           setPhase]           = useState('intro');     // intro | playing | gameover",
                    "phase === 'playing'"),
    'MemoryGame':  ("  const [phase,    setPhase]    = useState('idle');     // idle | playing | done",
                    "phase === 'playing'"),
    'GuessGame':   ("  const [phase,    setPhase]    = useState('idle');         // idle | playing | done",
                    "phase === 'playing'"),
}

for nom, (ancre, condition) in JEUX.items():
    p = 'src/components/games/%s.jsx' % nom
    s = io.open(p, encoding='utf-8').read()

    # 1. la prop
    m = re.search(r'export function %s\(\{' % nom, s)
    assert m, nom
    fin = s.index(' }) {', m.end() - 1)
    assert 'onEnJeu' not in s[m.start():fin], (nom, 'deja fait')
    s = s[:fin] + ', onEnJeu' + s[fin:]

    # 2. l'effet, juste après la déclaration de phase
    assert s.count(ancre) == 1, (nom, 'ancre', s.count(ancre))
    s = s.replace(ancre, ancre + (EFFET % condition))

    # 3. useEffect importé ?
    assert re.search(r'import \{[^}]*useEffect', s), (nom, 'useEffect non importe')

    io.open(p, 'w', encoding='utf-8').write(s)
    print('ok', nom)
