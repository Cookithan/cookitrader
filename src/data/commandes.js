/* ════════════════════════════════════════════════════
   COMMANDES — banque de questions pour GuessGame (PHASE 6C)
   ────────────────────────────────────────────────────
   30 entrées. Chaque entrée :
   - desc    : description du client (entrée en bulle de dialogue)
   - choices : 4 boissons / pâtisseries proposées
   - answer  : index (0-3) de la bonne réponse dans `choices`

   Source : BRIEF_AMELIORATIONS.md > PHASE 6 > 6C.
   À chaque partie, GuessGame tire 5 commandes au hasard, sans
   répétition dans la même partie.
═══════════════════════════════════════════════════════ */

export const COMMANDES = [
  { desc:"Je voudrais un café fort, court et avec une mousse dorée.",
    choices:['Cappuccino','Espresso','Latte','Américano'], answer:1 },
  { desc:"J'aimerais quelque chose avec beaucoup de mousse de lait, comme un dessert.",
    choices:['Espresso','Macchiato','Cappuccino','Cold Brew'], answer:2 },
  { desc:"Une boisson froide pour aujourd'hui, infusée plusieurs heures à froid.",
    choices:['Café glacé','Cold Brew','Americano','Iced Latte'], answer:1 },
  { desc:"Un café noir doublé, je veux du peps.",
    choices:['Espresso','Doppio','Lungo','Ristretto'], answer:1 },
  { desc:"Je veux un latte mais avec moins de lait, plus de café.",
    choices:['Flat White','Cappuccino','Mocha','Latte'], answer:0 },
  { desc:"Un café avec une touche de chocolat fondu.",
    choices:['Latte','Mocha','Macchiato','Cortado'], answer:1 },
  { desc:"Du thé noir avec du lait et des épices indiennes.",
    choices:['Earl Grey','Chai Latte','Matcha','Thé vert'], answer:1 },
  { desc:"Un espresso avec très très peu d'eau, ultra concentré.",
    choices:['Lungo','Doppio','Ristretto','Macchiato'], answer:2 },
  { desc:"Un café allongé à l'eau, doux à boire.",
    choices:['Espresso','Americano','Lungo','Mocha'], answer:1 },
  { desc:"Une infusion de poudre de thé vert japonais.",
    choices:['Matcha','Sencha','Chai','Earl Grey'], answer:0 },
  { desc:"Un grand cookie avec des pépites au chocolat noir.",
    choices:['Cookie classique','Cookie chocolat','Brownie','Madeleine'], answer:1 },
  { desc:"Un petit gâteau au beurre en forme de coquillage.",
    choices:['Madeleine','Financier','Sablé','Cookie'], answer:0 },
  { desc:"Un croissant fourré au chocolat.",
    choices:['Croissant','Pain au chocolat','Brioche','Chausson'], answer:1 },
  { desc:"Un café espresso versé sur de la glace vanille.",
    choices:['Cold Brew','Affogato','Frappé','Iced Latte'], answer:1 },
  { desc:"Un café espresso avec une petite tache de mousse de lait.",
    choices:['Cortado','Macchiato','Cappuccino','Flat White'], answer:1 },
  { desc:"Un thé vert chinois à l'arôme floral.",
    choices:['Matcha','Jasmin','Sencha','Oolong'], answer:1 },
  { desc:"Un café à parts égales avec du lait chaud.",
    choices:['Latte','Cortado','Cappuccino','Macchiato'], answer:1 },
  { desc:"Un café préparé à la cafetière italienne.",
    choices:['Espresso','Moka','Americano','French Press'], answer:1 },
  { desc:"Un dessert moelleux à base de chocolat fondu.",
    choices:['Brownie','Cookie','Madeleine','Tartelette'], answer:0 },
  { desc:"Un sablé léger avec amande et beurre.",
    choices:['Madeleine','Financier','Sablé','Macaron'], answer:1 },
  { desc:"Une boisson glacée fouettée avec lait et café.",
    choices:['Frappé','Iced Latte','Cold Brew','Affogato'], answer:0 },
  { desc:"Un thé infusé avec lait, popularisé en Angleterre.",
    choices:['Earl Grey','Thé au lait','Chai','Oolong'], answer:1 },
  { desc:"Petit biscuit rond fourré de ganache aux deux couleurs.",
    choices:['Macaron','Sablé','Madeleine','Cookie'], answer:0 },
  { desc:"Café espresso double avec lait micro-moussé.",
    choices:['Latte','Flat White','Cappuccino','Mocha'], answer:1 },
  { desc:"Une viennoiserie pliée et croustillante en forme de demi-lune.",
    choices:['Pain au chocolat','Croissant','Brioche','Chausson'], answer:1 },
  { desc:"Un thé bleu/vert oxydé partiellement.",
    choices:['Oolong','Matcha','Sencha','Jasmin'], answer:0 },
  { desc:"Café espresso avec eau chaude — diluée comme un café filtre.",
    choices:['Lungo','Americano','Espresso','Doppio'], answer:1 },
  { desc:"Un café avec sirop, mousse de lait et chocolat saupoudré.",
    choices:['Latte','Mocha','Cappuccino','Frappé'], answer:1 },
  { desc:"Pâtisserie ronde, glacée, parfois fourrée.",
    choices:['Donut','Beignet','Macaron','Madeleine'], answer:0 },
  { desc:"Café avec mousse épaisse et crémeuse, très généreuse.",
    choices:['Cappuccino','Latte','Macchiato','Cortado'], answer:0 },
];
