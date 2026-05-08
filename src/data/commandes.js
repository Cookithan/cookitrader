/* ════════════════════════════════════════════════════
   COMMANDES — banque de questions pour GuessGame (PHASE 6C)
   ────────────────────────────────────────────────────
   45 entrées au total :
   - 30 questions standard (mode normal)
   - 15 questions DIFFICILES (flag `difficult:true`) — méthodes de
     préparation niches, pâtisseries rares, distinctions ultra-fines
     entre boissons proches.

   Mode Expert (joueur niv 7+) : GuessGame ne tire que les questions
   difficiles. Sinon : seulement les questions standard (compatibilité
   avec les joueurs débutants).

   Chaque entrée :
   - desc    : description du client (entrée en bulle de dialogue)
   - choices : 4 boissons / pâtisseries proposées
   - answer  : index (0-3) de la bonne réponse dans `choices`
   - difficult? : flag pour le mode Expert (niv 7+)

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

  /* ═══════════ MODE EXPERT (15 questions, flag `difficult:true`) ═══════════
     Pour les joueurs niveau 7+ uniquement. Distinctions très fines, méthodes
     rares, vocabulaire spécialisé. */

  { desc:"Méthode japonaise au goutte-à-goutte, dans un cône en porcelaine.",
    choices:['V60','Chemex','AeroPress','Syphon'], answer:0, difficult:true },
  { desc:"Méthode à siphon, l'eau monte par pression de vapeur puis redescend.",
    choices:['Moka','Syphon','Chemex','French Press'], answer:1, difficult:true },
  { desc:"Méthode infusion + pression manuelle, brevetée par Aerobie.",
    choices:['V60','AeroPress','Chemex','Cold Brew'], answer:1, difficult:true },
  { desc:"Espresso australien : ristretto + lait micro-moussé, dans une tasse 150ml.",
    choices:['Cappuccino','Flat White','Cortado','Latte'], answer:1, difficult:true },
  { desc:"Café espagnol concentré servi avec un peu de lait condensé sucré.",
    choices:['Cortado','Café bombón','Café con leche','Carajillo'], answer:1, difficult:true },
  { desc:"Café cubain au sucre fouetté avec la première extraction d'espresso.",
    choices:['Café Cubano','Cortado','Café latte','Café au lait'], answer:0, difficult:true },
  { desc:"Café australien identique à l'Americano mais l'eau est ajoutée AVANT.",
    choices:['Long Black','Americano','Lungo','Café filtré'], answer:0, difficult:true },
  { desc:"Espresso doppio versé sur de la glace, bu d'un trait.",
    choices:['Affogato','Iced Latte','Espresso shakerato','Cold Brew'], answer:2, difficult:true },
  { desc:"Café vietnamien filtré goutte-à-goutte sur du lait concentré sucré.",
    choices:['Cà phê sữa đá','Phin','Frappé','Café au lait'], answer:0, difficult:true },
  { desc:"Pâtisserie portugaise à base de pâte feuilletée et de crème pâtissière brûlée.",
    choices:['Pastel de nata','Brioche','Beignet','Cannelé'], answer:0, difficult:true },
  { desc:"Petit gâteau bordelais à la croûte caramélisée, mou à l'intérieur.",
    choices:['Madeleine','Cannelé','Financier','Sablé'], answer:1, difficult:true },
  { desc:"Pâtisserie viennoise feuilletée fourrée à la pâte d'amandes ou aux raisins.",
    choices:['Croissant','Kouign-amann','Strudel','Schnecke'], answer:3, difficult:true },
  { desc:"Variété d'arabica brésilien, notes chocolatées et corsées.",
    choices:['Geisha','Bourbon','Typica','Catuai'], answer:1, difficult:true },
  { desc:"Variété rare panaméenne, notes florales et de bergamote.",
    choices:['Geisha','Bourbon','SL28','Pacamara'], answer:0, difficult:true },
  { desc:"Méthode où le café est extrait sous très haute pression dans un percolateur italien.",
    choices:['Espresso','Moka','Lungo','Filtre'], answer:1, difficult:true },
];
