'use strict';
const pool = require('../config/postgres');

const questions = [
  // ── JAMB Physics ─────────────────────────────────────────
  { exam_type:'JAMB', subject:'Physics', year:2020, topic:'Mechanics', body:'A body of mass 5kg is acted upon by a force of 20N. What is the acceleration?', options:['2 m/s²','4 m/s²','10 m/s²','25 m/s²'], answer_index:1, difficulty:2 },
  { exam_type:'JAMB', subject:'Physics', year:2020, topic:'Mechanics', body:'Which of the following is a vector quantity?', options:['Mass','Temperature','Velocity','Speed'], answer_index:2, difficulty:1 },
  { exam_type:'JAMB', subject:'Physics', year:2021, topic:'Waves', body:'The speed of light in vacuum is approximately?', options:['3×10⁶ m/s','3×10⁸ m/s','3×10¹⁰ m/s','3×10⁴ m/s'], answer_index:1, difficulty:1 },
  { exam_type:'JAMB', subject:'Physics', year:2021, topic:'Electricity', body:'Ohm\'s law states that current is proportional to?', options:['Resistance','Power','Voltage','Capacitance'], answer_index:2, difficulty:1 },
  { exam_type:'JAMB', subject:'Physics', year:2022, topic:'Mechanics', body:'The SI unit of force is?', options:['Joule','Newton','Pascal','Watt'], answer_index:1, difficulty:1 },
  { exam_type:'JAMB', subject:'Physics', year:2022, topic:'Optics', body:'Which mirror is used in car headlights?', options:['Plane','Concave','Convex','None'], answer_index:1, difficulty:2 },
  { exam_type:'JAMB', subject:'Physics', year:2023, topic:'Mechanics', body:'A car travels 100m in 5s. What is its average speed?', options:['10 m/s','20 m/s','25 m/s','500 m/s'], answer_index:1, difficulty:1 },
  { exam_type:'JAMB', subject:'Physics', year:2023, topic:'Electricity', body:'What is the unit of electrical resistance?', options:['Ampere','Volt','Ohm','Watt'], answer_index:2, difficulty:1 },
  { exam_type:'JAMB', subject:'Physics', year:2024, topic:'Mechanics', body:'Newton\'s first law is also called the law of?', options:['Gravitation','Inertia','Motion','Acceleration'], answer_index:1, difficulty:1 },
  { exam_type:'JAMB', subject:'Physics', year:2024, topic:'Waves', body:'Sound waves are which type of waves?', options:['Transverse','Electromagnetic','Longitudinal','Surface'], answer_index:2, difficulty:2 },

  // ── JAMB Chemistry ───────────────────────────────────────
  { exam_type:'JAMB', subject:'Chemistry', year:2020, topic:'Atomic Structure', body:'The number of protons in an atom is called its?', options:['Mass number','Atomic number','Neutron number','Valence'], answer_index:1, difficulty:1 },
  { exam_type:'JAMB', subject:'Chemistry', year:2020, topic:'Bonding', body:'Which type of bond exists in NaCl?', options:['Covalent','Ionic','Metallic','Hydrogen'], answer_index:1, difficulty:1 },
  { exam_type:'JAMB', subject:'Chemistry', year:2021, topic:'Acids and Bases', body:'What is the pH of a neutral solution?', options:['0','7','14','1'], answer_index:1, difficulty:1 },
  { exam_type:'JAMB', subject:'Chemistry', year:2021, topic:'Organic Chemistry', body:'The general formula for alkanes is?', options:['CnH2n','CnH2n+2','CnH2n-2','CnHn'], answer_index:1, difficulty:2 },
  { exam_type:'JAMB', subject:'Chemistry', year:2022, topic:'Periodic Table', body:'Elements in the same group have the same number of?', options:['Neutrons','Protons','Valence electrons','Mass number'], answer_index:2, difficulty:1 },
  { exam_type:'JAMB', subject:'Chemistry', year:2022, topic:'Gases', body:'At STP, one mole of any gas occupies?', options:['22.4 L','24 L','11.2 L','44.8 L'], answer_index:0, difficulty:2 },
  { exam_type:'JAMB', subject:'Chemistry', year:2023, topic:'Atomic Structure', body:'Isotopes are atoms with the same atomic number but different?', options:['Electron number','Mass number','Proton number','Valence'], answer_index:1, difficulty:2 },
  { exam_type:'JAMB', subject:'Chemistry', year:2024, topic:'Bonding', body:'Which of these is a covalent compound?', options:['NaCl','KBr','H2O','MgO'], answer_index:2, difficulty:1 },

  // ── JAMB Biology ─────────────────────────────────────────
  { exam_type:'JAMB', subject:'Biology', year:2020, topic:'Cell Biology', body:'The powerhouse of the cell is the?', options:['Nucleus','Ribosome','Mitochondria','Chloroplast'], answer_index:2, difficulty:1 },
  { exam_type:'JAMB', subject:'Biology', year:2020, topic:'Genetics', body:'DNA stands for?', options:['Deoxyribonucleic Acid','Diribonucleic Acid','Deoxyribonitric Acid','None'], answer_index:0, difficulty:1 },
  { exam_type:'JAMB', subject:'Biology', year:2021, topic:'Ecology', body:'Organisms that make their own food are called?', options:['Consumers','Decomposers','Producers','Parasites'], answer_index:2, difficulty:1 },
  { exam_type:'JAMB', subject:'Biology', year:2021, topic:'Cell Biology', body:'The cell wall of plants is made of?', options:['Chitin','Cellulose','Protein','Lipid'], answer_index:1, difficulty:1 },
  { exam_type:'JAMB', subject:'Biology', year:2022, topic:'Genetics', body:'How many pairs of chromosomes do humans have?', options:['23','46','22','24'], answer_index:0, difficulty:2 },
  { exam_type:'JAMB', subject:'Biology', year:2022, topic:'Nutrition', body:'Which nutrient provides the most energy per gram?', options:['Carbohydrate','Protein','Fat','Vitamin'], answer_index:2, difficulty:2 },
  { exam_type:'JAMB', subject:'Biology', year:2023, topic:'Ecology', body:'The process by which plants make food is called?', options:['Respiration','Photosynthesis','Transpiration','Digestion'], answer_index:1, difficulty:1 },
  { exam_type:'JAMB', subject:'Biology', year:2024, topic:'Cell Biology', body:'Which organelle controls the activities of the cell?', options:['Mitochondria','Ribosome','Nucleus','Vacuole'], answer_index:2, difficulty:1 },

  // ── JAMB Mathematics ─────────────────────────────────────
  { exam_type:'JAMB', subject:'Mathematics', year:2020, topic:'Algebra', body:'Solve for x: 2x + 5 = 15', options:['4','5','6','10'], answer_index:1, difficulty:1 },
  { exam_type:'JAMB', subject:'Mathematics', year:2021, topic:'Numbers', body:'What is 15% of 200?', options:['20','30','25','15'], answer_index:1, difficulty:1 },
  { exam_type:'JAMB', subject:'Mathematics', year:2022, topic:'Geometry', body:'The sum of angles in a triangle is?', options:['90°','180°','270°','360°'], answer_index:1, difficulty:1 },
  { exam_type:'JAMB', subject:'Mathematics', year:2023, topic:'Algebra', body:'Simplify: 3x + 2x - x', options:['4x','5x','6x','3x'], answer_index:0, difficulty:1 },
  { exam_type:'JAMB', subject:'Mathematics', year:2024, topic:'Numbers', body:'What is the LCM of 4 and 6?', options:['8','12','24','6'], answer_index:1, difficulty:1 },

  // ── WAEC Biology ─────────────────────────────────────────
  { exam_type:'WAEC', subject:'Biology', year:2020, topic:'Cell Biology', body:'Which of these is found in plant cells but not animal cells?', options:['Mitochondria','Cell wall','Nucleus','Ribosome'], answer_index:1, difficulty:1 },
  { exam_type:'WAEC', subject:'Biology', year:2021, topic:'Genetics', body:'The passing of traits from parents to offspring is called?', options:['Evolution','Heredity','Mutation','Variation'], answer_index:1, difficulty:1 },
  { exam_type:'WAEC', subject:'Biology', year:2022, topic:'Ecology', body:'A food chain always begins with a?', options:['Consumer','Decomposer','Producer','Carnivore'], answer_index:2, difficulty:1 },
  { exam_type:'WAEC', subject:'Biology', year:2023, topic:'Nutrition', body:'Deficiency of Vitamin C causes?', options:['Rickets','Scurvy','Anaemia','Goitre'], answer_index:1, difficulty:2 },
  { exam_type:'WAEC', subject:'Biology', year:2024, topic:'Cell Biology', body:'Osmosis is the movement of water from a region of?', options:['Low to high concentration','High to low concentration','Low to low concentration','High to high concentration'], answer_index:0, difficulty:2 },

  // ── WAEC Chemistry ───────────────────────────────────────
  { exam_type:'WAEC', subject:'Chemistry', year:2020, topic:'Acids and Bases', body:'Which of the following is a strong acid?', options:['Ethanoic acid','Carbonic acid','Hydrochloric acid','Citric acid'], answer_index:2, difficulty:1 },
  { exam_type:'WAEC', subject:'Chemistry', year:2021, topic:'Organic Chemistry', body:'Fermentation of sugar produces?', options:['Methanol','Ethanol','Propanol','Butanol'], answer_index:1, difficulty:1 },
  { exam_type:'WAEC', subject:'Chemistry', year:2022, topic:'Periodic Table', body:'Which gas is produced when zinc reacts with dilute HCl?', options:['Oxygen','Chlorine','Hydrogen','Carbon dioxide'], answer_index:2, difficulty:2 },
  { exam_type:'WAEC', subject:'Chemistry', year:2024, topic:'Bonding', body:'The formula of water is?', options:['HO','H2O','H2O2','HO2'], answer_index:1, difficulty:1 },

  // ── WAEC Physics ─────────────────────────────────────────
  { exam_type:'WAEC', subject:'Physics', year:2020, topic:'Mechanics', body:'The gravitational acceleration on Earth is approximately?', options:['8.9 m/s²','9.8 m/s²','10.8 m/s²','11 m/s²'], answer_index:1, difficulty:1 },
  { exam_type:'WAEC', subject:'Physics', year:2021, topic:'Electricity', body:'Which material is the best conductor of electricity?', options:['Rubber','Wood','Copper','Glass'], answer_index:2, difficulty:1 },
  { exam_type:'WAEC', subject:'Physics', year:2024, topic:'Mechanics', body:'Work done is equal to?', options:['Mass × velocity','Force × distance','Power × time','Mass × acceleration'], answer_index:1, difficulty:1 },

  // ── WAEC Mathematics ─────────────────────────────────────
  { exam_type:'WAEC', subject:'Mathematics', year:2020, topic:'Algebra', body:'Find the value of x if 3x = 18', options:['3','4','6','9'], answer_index:2, difficulty:1 },
  { exam_type:'WAEC', subject:'Mathematics', year:2021, topic:'Geometry', body:'The area of a circle with radius 7cm is? (π=22/7)', options:['44 cm²','154 cm²','22 cm²','49 cm²'], answer_index:1, difficulty:2 },
  { exam_type:'WAEC', subject:'Mathematics', year:2022, topic:'Numbers', body:'Express 0.25 as a fraction', options:['1/2','1/4','1/5','1/8'], answer_index:1, difficulty:1 },
  { exam_type:'WAEC', subject:'Mathematics', year:2023, topic:'Statistics', body:'The mean of 2, 4, 6, 8, 10 is?', options:['4','5','6','8'], answer_index:2, difficulty:1 },
  { exam_type:'WAEC', subject:'Mathematics', year:2024, topic:'Algebra', body:'Expand: (x + 3)(x - 3)', options:['x² - 9','x² + 9','x² - 6x + 9','x² + 6x - 9'], answer_index:0, difficulty:2 },
];

async function seed() {
  console.log('🌱 Seeding questions...');
  let count = 0;
  for (const q of questions) {
    await pool.query(
      `INSERT INTO questions 
        (exam_type, subject, year, topic, body, options, answer_index, difficulty, approved, class_level, curriculum)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT DO NOTHING`,
      [
        q.exam_type, q.subject, q.year, q.topic, q.body,
        JSON.stringify(q.options), q.answer_index,
        q.difficulty || 1, true, 'SS3', 'NG'
      ]
    );
    count++;
  }
  console.log(`✅ Seeded ${count} questions successfully`);
  process.exit(0);
}

seed().catch(e => { console.error('❌ Seed failed:', e.message); process.exit(1); });