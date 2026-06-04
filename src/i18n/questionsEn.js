/* ════════════════════════════════════════════════════
   questionsEn.js — traductions EN du quiz (95 questions)
   ────────────────────────────────────────────────────
   Indexées dans le même ordre que QUESTIONS de constants.js.
   Lookup : QUESTIONS_EN[i] = { q, choices }. Le champ `answer` est
   inchangé (la position de la bonne réponse est la même dans les 2
   langues — l'order des choices est respecté).
═══════════════════════════════════════════════════════ */

export const QUESTIONS_EN = [
  // FACILE (20 reward)
  { q: 'What country is the historical origin of coffee?', choices: ['Italy', 'Ethiopia', 'Brazil', 'Yemen'] },
  { q: 'Which plant produces coffee beans?', choices: ['Tea plant', 'Coffee tree', 'Cacao tree', 'Olive tree'] },
  { q: 'How many levels does CookiMiner have?', choices: ['12', '15', '20', '25'] },
  { q: 'What is the title of level 1 in CookiMiner?', choices: ['Apprentice', 'Barista', 'Master', 'Legend'] },
  { q: 'What color is a coffee bean BEFORE roasting?', choices: ['Brown', 'Black', 'Green', 'Yellow'] },
  { q: 'What is the golden foam on top of an espresso called?', choices: ['Foam', 'Crema', 'Schiuma', 'Latte'] },
  { q: 'Which country is the world\'s top coffee producer?', choices: ['Colombia', 'Brazil', 'Vietnam', 'Ethiopia'] },
  { q: 'How many questions are drawn per Daily Quiz session?', choices: ['1', '3', '5', '10'] },
  { q: 'Which mini-game has you guessing customer orders?', choices: ['Quiz', 'Guess the order', 'Coffee Memory', 'Reflexes'] },
  { q: 'What is the premium currency in CookiMiner?', choices: ['Cookies', 'Coffees', 'Diamonds', 'Stars'] },
  { q: 'Which emoji represents the main CookiMiner currency?', choices: ['🍰', '🥐', '🍪', '☕'] },
  { q: 'Main ingredient of hot chocolate?', choices: ['Caffeine', 'Cocoa', 'Cinnamon', 'Turmeric'] },
  { q: 'What is the name of the profession of someone who prepares coffee?', choices: ['Sommelier', 'Pastry chef', 'Barista', 'Maître d\'hôtel'] },
  { q: 'Which country is world-famous for its Italian coffees?', choices: ['Spain', 'Italy', 'Greece', 'Portugal'] },
  { q: 'Which hot drink has a strong bitter and concentrated taste?', choices: ['Latte', 'Espresso', 'Hot chocolate', 'Green tea'] },
  { q: 'How often does the Daily Quiz become available again?', choices: ['1 h', '3 h', '5 h', '24 h'] },
  { q: 'Which mini-game spins a large wheel in CookiMiner?', choices: ['Wheel of fortune', 'Slot machine', 'Quiz', 'Memory'] },
  { q: 'Essential ingredient for a homemade cookie?', choices: ['Yeast', 'Butter', 'Curry', 'Agave syrup'] },
  { q: 'Which emoji represents a steaming cup of coffee?', choices: ['🍵', '🍫', '☕', '🥤'] },
  { q: 'When is coffee most often consumed?', choices: ['Bedtime', 'Morning', 'At 10pm', 'Before intense sport'] },

  // MOYEN (35 reward)
  { q: 'How many main coffee varieties are commercially grown?', choices: ['1', '2', '3', '5'] },
  { q: 'Which mini-game unlocks at level 8?', choices: ['Memory', 'Cup Stack', 'Slot Machine', 'Reflexes'] },
  { q: 'What is the name of the apex final achievement in CookiMiner?', choices: ['Coffee Master', 'Living Legend', 'Emperor', 'Cookie King'] },
  { q: 'Which city is the birthplace of the Starbucks chain?', choices: ['Seattle', 'New York', 'San Francisco', 'Chicago'] },
  { q: 'Which coffee variety contains the most caffeine?', choices: ['Arabica', 'Robusta', 'Liberica', 'Excelsa'] },
  { q: 'Which country invented the cappuccino?', choices: ['France', 'Italy', 'Austria', 'Switzerland'] },
  { q: 'How many event rewards to earn Living Legend?', choices: ['5', '7', '10', '15'] },
  { q: 'At what level does the Slot Machine unlock in CookiMiner?', choices: ['10', '12', '13', '15'] },
  { q: 'Which country is considered the birthplace of mocha?', choices: ['Brazil', 'Colombia', 'Yemen', 'Ethiopia'] },
  { q: 'Which mini-game unlocks from level 1?', choices: ['Cup Stack', 'Stop the coffee', 'Guess the order', 'Slot Machine'] },
  { q: 'Which ticker represents CookiMiner\'s stock on the market?', choices: ['$CKM', '$CKO', '$CKC', '$CMK'] },
  { q: 'Which American classic cookie was invented by Ruth Wakefield in 1938?', choices: ['Plain cookie', 'Chocolate chip cookie', 'Brownie', 'Shortbread'] },
  { q: 'What do you call an espresso diluted with hot water?', choices: ['Macchiato', 'Americano', 'Cortado', 'Royal Lungo'] },
  { q: 'At what level does the $CKM market open in CookiMiner?', choices: ['1', '3', '5', '10'] },
  { q: 'What is the name of the cold-brewed coffee method (long extraction)?', choices: ['Iced coffee', 'Cold brew', 'Frappé', 'Affogato'] },
  { q: 'Which Italian drink combines espresso and chocolate?', choices: ['Cappuccino', 'Affogato', 'Mocaccino', 'Bicerin'] },
  { q: 'What term refers to coffee from a single geographic origin?', choices: ['Blend', 'Single Origin', 'Mix', 'Tradition'] },
  { q: 'What is the coffee "grounds" used for after extraction?', choices: ['Fertilizer or exfoliant', 'Spread', 'Raw sugar', 'Preservative'] },
  { q: 'Which gentle method pours water drop by drop onto ground coffee?', choices: ['Espresso', 'Pour-over (V60)', 'Moka pot', 'Frappé'] },
  { q: 'Which famous cookie has white cream filling between two chocolate biscuits?', choices: ['Macaron', 'Oreo', 'Breton shortbread', 'Stroopwafel'] },

  // EXPERT (60 reward)
  { q: 'Which legend attributes the discovery of coffee to a shepherd?', choices: ['Pythagoras', 'Kaldi', 'Marco Polo', 'Saladin'] },
  { q: 'Which religious order inspired the name "cappuccino"?', choices: ['Benedictines', 'Franciscans', 'Capuchins', 'Jesuits'] },
  { q: 'Which country has the highest coffee consumption per capita?', choices: ['Italy', 'Finland', 'Brazil', 'France'] },
  { q: 'How many maximum wheel spins per day from level 10?', choices: ['10', '20', '30', '50'] },
  { q: 'Which CookiMiner level is called "Phoenix of Coffee"?', choices: ['12', '13', '14', '15'] },
  { q: 'Which coffee variety is most resistant to diseases?', choices: ['Arabica', 'Robusta', 'Liberica', 'Geisha'] },
  { q: 'What approximate percentage of world production is Arabica?', choices: ['30%', '60%', '80%', '95%'] },
  { q: 'How many bonus spins does the VIP +50 Token grant in CookiMiner?', choices: ['20', '30', '50', '100'] },
  { q: 'Who is the creator of the CookiMiner app?', choices: ['Cookithan', 'BaristaDev', 'CookieMaker', 'GrindMaster'] },
  { q: 'What is the ideal extraction temperature for an espresso?', choices: ['60-70 °C', '75-85 °C', '90-96 °C', '100-105 °C'] },
  { q: 'Which country produces the famous "Geisha" coffee known for its floral notes?', choices: ['Ethiopia', 'Kenya', 'Panama', 'Costa Rica'] },
  { q: 'Beyond what percentage variation in 5 minutes does the $CKM circuit breaker trigger?', choices: ['5 %', '10 %', '15 %', '25 %'] },
  { q: 'How many $CKM shares exist in total in CookiMiner after the market rework?', choices: ['1,000', '5,000', '10,000', '100,000'] },
  { q: 'After how long of holding does the PnL bonus reach its maximum on the market?', choices: ['1 h', '24 h', '3 days', '7 days'] },
  { q: 'What is the per-account limit of $CKM shares held?', choices: ['100', '250', '500', '1,000'] },
  { q: 'How many bars of pressure should an espresso machine ideally extract at?', choices: ['3 bars', '6 bars', '9 bars', '15 bars'] },
  { q: 'Which country is the 2nd largest coffee producer in the world?', choices: ['Colombia', 'Vietnam', 'Indonesia', 'Honduras'] },
  { q: 'Which 1933 Italian invention democratized coffee at home?', choices: ['Moka pot (Bialetti)', 'French press', 'Espresso machine', 'Drip coffee maker'] },
  { q: 'What is the most expensive coffee in the world, from beans digested by a civet?', choices: ['Black Ivory', 'Geisha Panama', 'Kopi Luwak', 'Jamaica Blue Mountain'] },
  { q: 'From which Ethiopian region does the famous Yirgacheffe coffee come?', choices: ['Sidamo', 'Yirgacheffe (Gedeo)', 'Harar', 'Limu'] },
  { q: 'How many $CKM shares max can you trade in ONE single transaction?', choices: ['15', '30', '50', 'No limit'] },
  { q: 'What permanent bonus does each Prestige level grant in CookiMiner?', choices: ['+5% on all gains', '+10% on all gains', '+25% XP', '+1 ☕ / day'] },
  { q: 'How much XP is needed to reach level 16 "Caffeinated Ascendant"?', choices: ['10,000', '15,000', '20,000', '30,000'] },
  { q: 'Which Italian city, a historic free port, is nicknamed the coffee capital?', choices: ['Naples', 'Trieste', 'Milan', 'Turin'] },
  { q: 'What minimum altitude defines a "Strictly High Grown" coffee?', choices: ['500 m', '1,000 m', '1,500 m', '2,500 m'] },

  /* +30 questions ajoutées 13/05/2026 */
  // FACILE
  { q: 'Which tree produces cocoa?', choices: ['Coconut tree', 'Cacao tree', 'Coffee tree', 'Vanilla tree'] },
  { q: 'What color is a coffee bean AFTER roasting?', choices: ['Green', 'Yellow', 'Dark brown', 'Red'] },
  { q: 'How do you say "coffee" in Italian?', choices: ['Café', 'Caffè', 'Kafe', 'Kaffe'] },
  { q: 'Which emoji represents a donut?', choices: ['🍩', '🥯', '🧁', '🍰'] },
  { q: 'Matcha comes from which plant?', choices: ['Coffee', 'Tea', 'Cocoa', 'Mint'] },
  { q: 'Which country does the modern croissant come from?', choices: ['Italy', 'France', 'Austria', 'Spain'] },
  { q: 'Which ingredient makes a cookie rise in the oven?', choices: ['Baking powder', 'Salt', 'Cocoa', 'Water'] },
  { q: 'Which classic cookie has chocolate chips?', choices: ['Chip cookie', 'Snickerdoodle', 'Macaron', 'Shortbread'] },
  { q: 'What is a chocolate-filled croissant called?', choices: ['Brioche', 'Pain au chocolat', 'Turnover', 'Mille-feuille'] },
  { q: 'Which flavor characterizes salted butter caramel?', choices: ['Sour', 'Bitter', 'Sweet-salty', 'Spicy'] },

  // MOYEN
  { q: 'Which typical ingredient flavors Indian chai latte?', choices: ['Vanilla', 'Cardamom', 'Cocoa', 'Star anise'] },
  { q: 'Which coffee popularized by Australia: espresso + microfoam milk?', choices: ['Cortado', 'Flat White', 'Latte', 'Macchiato'] },
  { q: 'Which texture characterizes a Breton shortbread?', choices: ['Crumbly', 'Elastic', 'Airy', 'Stringy'] },
  { q: 'Which country invented tiramisu?', choices: ['Italy', 'France', 'Spain', 'Greece'] },
  { q: 'Which French dessert bears the name of a cycling race?', choices: ['Paris-Brest', 'Tour de France', 'Grenoble', 'Bordeaux'] },
  { q: 'Which bean is typically blended with Arabica to add body?', choices: ['Liberica', 'Robusta', 'Geisha', 'Catimor'] },
  { q: 'Which Austrian pastry contains apples and phyllo dough?', choices: ['Strudel', 'Sachertorte', 'Linzer', 'Krapfen'] },
  { q: 'Which mini-game lets you earn coffees ☕ with espresso pipes?', choices: ['Cookie Click', 'Flappy Cookies', 'Wheel', 'Quiz'] },
  { q: 'Which Portuguese pastry is oven-caramelized with cream?', choices: ['Pastel de nata', 'Bolo do caco', 'Bola', 'Queijada'] },

  // EXPERT
  { q: 'Which country produces the renowned Blue Mountain coffee?', choices: ['Cuba', 'Jamaica', 'Haiti', 'Costa Rica'] },
  { q: 'Approximate Robusta / Arabica caffeine ratio?', choices: ['≈ equal', '×1.5', '×2', '×3'] },
  { q: 'Maximum top 1 vs top 2 gap in the cookies leaderboard?', choices: ['10 %', '15 %', '20 %', '25 %'] },
  { q: 'What is the cooldown between 2 consecutive $CKM buys (in seconds)?', choices: ['5 s', '15 s', '30 s', '60 s'] },
  { q: 'What is the name of the crema espresso machine invented by Achille Gaggia?', choices: ['Bialetti coffee maker', 'Crema espresso', 'Cold drip', 'French press'] },
  { q: 'Ideal milk temperature for latte art?', choices: ['50-55 °C', '60-65 °C', '70-75 °C', '80-85 °C'] },
  { q: 'Which Italian method uses steam pressure to extract (home coffee maker)?', choices: ['Aeropress', 'Moka pot', 'Chemex', 'V60'] },
  { q: 'Daily decay on $CKM shares after 7 days of holding without activity?', choices: ['0.1 %', '0.5 %', '1 %', '2 %'] },
  { q: 'Maximum price impact percentage on a single $CKM transaction?', choices: ['5 %', '10 %', '15 %', '20 %'] },

  /* ─── +18 questions added 2026-05-19 (6 Medium · 12 Expert) ─── */
  // MEDIUM
  { q: 'Which coffee is an espresso "stained" with a touch of hot milk?', choices: ['Latte', 'Macchiato', 'Americano', 'Cortado'] },
  { q: 'Which cereal is the flour base of a classic cookie?', choices: ['Wheat', 'Corn', 'Rice', 'Rye'] },
  { q: 'Which sweet ingredient makes up the Spanish "bombón" coffee?', choices: ['Sweetened condensed milk', 'Honey', 'Maple syrup', 'Liquid caramel'] },
  { q: 'How long does a cold brew ideally steep?', choices: ['30 min', '2 h', '12-24 h', '3 days'] },
  { q: 'Which pastry is an elongated choux dough, filled and glazed?', choices: ['Éclair', 'Mille-feuille', 'Madeleine', 'Financier'] },
  { q: 'Which country has very high "Scandinavian-style" filter coffee consumption?', choices: ['Finland', 'Italy', 'Turkey', 'Greece'] },

  // EXPERT
  { q: 'Which chemical reaction gives roasting its aromas and browning?', choices: ['Fermentation', 'Maillard reaction', 'Hydrolysis', 'Simple oxidation'] },
  { q: 'At what altitude is quality Arabica mostly grown?', choices: ['0-200 m', '300-600 m', '1,000-2,000 m', '3,500-4,500 m'] },
  { q: 'Which processing method dries the whole coffee cherry in the sun?', choices: ['Washed', 'Natural (dry process)', 'Decaffeination', 'Roasting'] },
  { q: 'A "ristretto" is an espresso that is…', choices: ['longer', 'shorter and concentrated', 'colder', 'caffeine-free'] },
  { q: 'Which rare coffee species is mainly grown in the Philippines?', choices: ['Arabica', 'Robusta', 'Liberica', 'Geisha'] },
  { q: 'What is caffeine in tea also called?', choices: ['Theobromine', 'Theine', 'Tannin', 'Guaranine'] },
  { q: 'Which glass carafe (gentle method) uses a thick paper filter?', choices: ['Moka pot', 'Chemex', 'Aeropress', 'French press'] },
  { q: 'Which coffee-to-water ratio is classic for filter brewing?', choices: ['1:4', '1:8', '1:16', '1:30'] },
  { q: 'Which Viennese chocolate pastry is named after an Austrian hotel?', choices: ['Linzer', 'Sachertorte', 'Strudel', 'Kouglof'] },
  { q: 'Which country has the most Starbucks cafés after the United States?', choices: ['France', 'China', 'Japan', 'Canada'] },
  { q: 'Which crema espresso machine was popularized by Achille Gaggia?', choices: ['Filter coffee maker', 'Spring lever (1948)', 'Cold drip', 'Percolator'] },
  { q: 'Which bitter component appears mostly when coffee is over-extracted?', choices: ['Sugars', 'Desirable acids', 'Tannins / bitterness', 'Lipids'] },
];
