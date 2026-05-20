'use strict';
const pool = require('../config/postgres');

const questions = [

  // ── GCSE Mathematics ─────────────────────────────────────
  { exam_type:'UK_GCSE', subject:'GCSE Mathematics', year:2018, topic:'Algebra', body:'Solve: 3x + 7 = 22', options:['3','4','5','6'], answer_index:2, difficulty:1 },
  { exam_type:'UK_GCSE', subject:'GCSE Mathematics', year:2018, topic:'Numbers', body:'What is 15% of 80?', options:['10','12','14','15'], answer_index:1, difficulty:1 },
  { exam_type:'UK_GCSE', subject:'GCSE Mathematics', year:2019, topic:'Geometry', body:'The area of a circle with diameter 10cm is? (π=3.14)', options:['31.4 cm²','78.5 cm²','157 cm²','314 cm²'], answer_index:1, difficulty:2 },
  { exam_type:'UK_GCSE', subject:'GCSE Mathematics', year:2019, topic:'Statistics', body:'The probability of rolling a 6 on a fair dice is?', options:['1/3','1/4','1/6','1/2'], answer_index:2, difficulty:1 },
  { exam_type:'UK_GCSE', subject:'GCSE Mathematics', year:2020, topic:'Algebra', body:'Expand: 3(2x - 4)', options:['6x - 4','6x - 12','5x - 12','6x + 12'], answer_index:1, difficulty:1 },
  { exam_type:'UK_GCSE', subject:'GCSE Mathematics', year:2020, topic:'Numbers', body:'What is the square root of 144?', options:['11','12','13','14'], answer_index:1, difficulty:1 },
  { exam_type:'UK_GCSE', subject:'GCSE Mathematics', year:2021, topic:'Geometry', body:'The sum of angles in a quadrilateral is?', options:['180°','270°','360°','450°'], answer_index:2, difficulty:1 },
  { exam_type:'UK_GCSE', subject:'GCSE Mathematics', year:2021, topic:'Algebra', body:'Factorise: x² - 9', options:['(x-3)(x-3)','(x+3)(x+3)','(x+3)(x-3)','(x-9)(x+1)'], answer_index:2, difficulty:2 },
  { exam_type:'UK_GCSE', subject:'GCSE Mathematics', year:2022, topic:'Statistics', body:'The mean of 3,5,7,9,11 is?', options:['6','7','8','9'], answer_index:1, difficulty:1 },
  { exam_type:'UK_GCSE', subject:'GCSE Mathematics', year:2022, topic:'Numbers', body:'What is 2³ × 3²?', options:['36','54','72','108'], answer_index:2, difficulty:2 },
  { exam_type:'UK_GCSE', subject:'GCSE Mathematics', year:2023, topic:'Algebra', body:'Solve: x² - 5x + 6 = 0', options:['x=1,6','x=2,3','x=3,4','x=1,4'], answer_index:1, difficulty:2 },
  { exam_type:'UK_GCSE', subject:'GCSE Mathematics', year:2023, topic:'Geometry', body:'Pythagoras theorem states: a² + b² = ?', options:['a','b','c','c²'], answer_index:3, difficulty:1 },

  // ── GCSE Physics ─────────────────────────────────────────
  { exam_type:'UK_GCSE', subject:'GCSE Physics', year:2018, topic:'Forces', body:'The unit of force is?', options:['Joule','Newton','Watt','Pascal'], answer_index:1, difficulty:1 },
  { exam_type:'UK_GCSE', subject:'GCSE Physics', year:2018, topic:'Energy', body:'Which energy transfer occurs in a light bulb?', options:['Chemical to kinetic','Electrical to light and heat','Nuclear to electrical','Gravitational to kinetic'], answer_index:1, difficulty:1 },
  { exam_type:'UK_GCSE', subject:'GCSE Physics', year:2019, topic:'Waves', body:'The speed of sound in air is approximately?', options:['300 m/s','340 m/s','3000 m/s','34 m/s'], answer_index:1, difficulty:2 },
  { exam_type:'UK_GCSE', subject:'GCSE Physics', year:2019, topic:'Electricity', body:'Resistance is calculated using?', options:['R=VI','R=V/I','R=I/V','R=V+I'], answer_index:1, difficulty:1 },
  { exam_type:'UK_GCSE', subject:'GCSE Physics', year:2020, topic:'Forces', body:'Weight is calculated as?', options:['W=m/g','W=mg','W=m+g','W=g/m'], answer_index:1, difficulty:1 },
  { exam_type:'UK_GCSE', subject:'GCSE Physics', year:2020, topic:'Atomic', body:'Alpha particles consist of?', options:['2 protons and 2 neutrons','1 proton and 1 neutron','2 electrons','1 proton'], answer_index:0, difficulty:2 },
  { exam_type:'UK_GCSE', subject:'GCSE Physics', year:2021, topic:'Energy', body:'The law of conservation of energy states?', options:['Energy can be created','Energy can be destroyed','Energy cannot be created or destroyed','Energy always increases'], answer_index:2, difficulty:1 },
  { exam_type:'UK_GCSE', subject:'GCSE Physics', year:2022, topic:'Waves', body:'Electromagnetic waves travel at?', options:['3×10⁶ m/s','3×10⁸ m/s','3×10¹⁰ m/s','3×10⁴ m/s'], answer_index:1, difficulty:1 },
  { exam_type:'UK_GCSE', subject:'GCSE Physics', year:2023, topic:'Electricity', body:'In a parallel circuit voltage is?', options:['Different across each component','Same across all components','Zero','Halved'], answer_index:1, difficulty:2 },

  // ── GCSE Chemistry ───────────────────────────────────────
  { exam_type:'UK_GCSE', subject:'GCSE Chemistry', year:2018, topic:'Atomic Structure', body:'The atomic number tells us the number of?', options:['Neutrons','Protons','Electrons and protons','Nucleons'], answer_index:1, difficulty:1 },
  { exam_type:'UK_GCSE', subject:'GCSE Chemistry', year:2018, topic:'Bonding', body:'Ionic bonds form between?', options:['Two non-metals','Two metals','A metal and non-metal','Two noble gases'], answer_index:2, difficulty:1 },
  { exam_type:'UK_GCSE', subject:'GCSE Chemistry', year:2019, topic:'Reactions', body:'In a neutralisation reaction acid + base produces?', options:['Acid and salt','Salt and water','Gas and water','Base and salt'], answer_index:1, difficulty:1 },
  { exam_type:'UK_GCSE', subject:'GCSE Chemistry', year:2019, topic:'Organic', body:'Crude oil is a mixture of?', options:['Elements','Compounds','Hydrocarbons','Polymers'], answer_index:2, difficulty:1 },
  { exam_type:'UK_GCSE', subject:'GCSE Chemistry', year:2020, topic:'Atomic Structure', body:'Isotopes have the same number of protons but different?', options:['Electrons','Neutrons','Atomic number','Charge'], answer_index:1, difficulty:2 },
  { exam_type:'UK_GCSE', subject:'GCSE Chemistry', year:2021, topic:'Bonding', body:'The structure of diamond makes it hard because it has?', options:['Ionic bonds','Weak forces','Giant covalent structure','Metallic bonds'], answer_index:2, difficulty:2 },
  { exam_type:'UK_GCSE', subject:'GCSE Chemistry', year:2022, topic:'Reactions', body:'Oxidation involves?', options:['Gain of electrons','Loss of electrons','Gain of protons','Loss of protons'], answer_index:1, difficulty:2 },
  { exam_type:'UK_GCSE', subject:'GCSE Chemistry', year:2023, topic:'Organic', body:'Polymers are made from?', options:['Atoms','Ions','Monomers','Electrons'], answer_index:2, difficulty:1 },

  // ── GCSE Biology ─────────────────────────────────────────
  { exam_type:'UK_GCSE', subject:'GCSE Biology', year:2018, topic:'Cell Biology', body:'Plant cells differ from animal cells because they contain?', options:['Nucleus','Cell membrane','Chloroplasts','Ribosomes'], answer_index:2, difficulty:1 },
  { exam_type:'UK_GCSE', subject:'GCSE Biology', year:2018, topic:'Genetics', body:'DNA is found in the?', options:['Cell membrane','Cytoplasm','Nucleus','Ribosome'], answer_index:2, difficulty:1 },
  { exam_type:'UK_GCSE', subject:'GCSE Biology', year:2019, topic:'Ecology', body:'Photosynthesis equation: CO2 + H2O + light → glucose + ?', options:['Carbon dioxide','Nitrogen','Oxygen','Hydrogen'], answer_index:2, difficulty:1 },
  { exam_type:'UK_GCSE', subject:'GCSE Biology', year:2019, topic:'Genetics', body:'Chromosomes are found in the?', options:['Cell membrane','Cytoplasm','Nucleus','Ribosome'], answer_index:2, difficulty:1 },
  { exam_type:'UK_GCSE', subject:'GCSE Biology', year:2020, topic:'Cell Biology', body:'Mitosis results in?', options:['4 haploid cells','2 identical diploid cells','2 different cells','4 diploid cells'], answer_index:1, difficulty:2 },
  { exam_type:'UK_GCSE', subject:'GCSE Biology', year:2021, topic:'Ecology', body:'A habitat is?', options:['A community of organisms','The place where an organism lives','A food chain','A population'], answer_index:1, difficulty:1 },
  { exam_type:'UK_GCSE', subject:'GCSE Biology', year:2022, topic:'Genetics', body:'Natural selection was proposed by?', options:['Mendel','Watson','Darwin','Crick'], answer_index:2, difficulty:1 },
  { exam_type:'UK_GCSE', subject:'GCSE Biology', year:2023, topic:'Cell Biology', body:'Enzymes are biological?', options:['Lipids','Carbohydrates','Catalysts','Vitamins'], answer_index:2, difficulty:1 },

  // ── A-Level Mathematics ───────────────────────────────────
  { exam_type:'A_LEVEL', subject:'A-Level Mathematics', year:2018, topic:'Calculus', body:'The derivative of x³ is?', options:['x²','3x²','3x³','x⁴'], answer_index:1, difficulty:2 },
  { exam_type:'A_LEVEL', subject:'A-Level Mathematics', year:2019, topic:'Calculus', body:'∫2x dx = ?', options:['x','x²','2x²','x² + c'], answer_index:3, difficulty:2 },
  { exam_type:'A_LEVEL', subject:'A-Level Mathematics', year:2020, topic:'Algebra', body:'The sum of an arithmetic series with first term 2, common difference 3, and 10 terms is?', options:['155','160','165','170'], answer_index:0, difficulty:3 },
  { exam_type:'A_LEVEL', subject:'A-Level Mathematics', year:2021, topic:'Trigonometry', body:'sin²θ + cos²θ = ?', options:['0','1','2','sinθcosθ'], answer_index:1, difficulty:1 },
  { exam_type:'A_LEVEL', subject:'A-Level Mathematics', year:2022, topic:'Calculus', body:'The derivative of sin(x) is?', options:['cos(x)','-cos(x)','sin(x)','-sin(x)'], answer_index:0, difficulty:2 },
  { exam_type:'A_LEVEL', subject:'A-Level Mathematics', year:2023, topic:'Algebra', body:'The binomial expansion of (1+x)³ is?', options:['1+3x+3x²+x³','1+x+x²+x³','1+3x+x²+x³','3+3x+3x²+x³'], answer_index:0, difficulty:3 },

  // ── A-Level Physics ───────────────────────────────────────
  { exam_type:'A_LEVEL', subject:'A-Level Physics', year:2018, topic:'Mechanics', body:'The equation of motion v² = u² + 2as is derived from?', options:['Newtons first law','Newtons second law','Kinematics','Energy conservation'], answer_index:2, difficulty:2 },
  { exam_type:'A_LEVEL', subject:'A-Level Physics', year:2019, topic:'Electricity', body:'The capacitance of a capacitor is measured in?', options:['Ohms','Henrys','Farads','Teslas'], answer_index:2, difficulty:1 },
  { exam_type:'A_LEVEL', subject:'A-Level Physics', year:2020, topic:'Waves', body:'The photoelectric effect shows light behaves as?', options:['A wave','A particle','Both wave and particle','Neither'], answer_index:1, difficulty:2 },
  { exam_type:'A_LEVEL', subject:'A-Level Physics', year:2021, topic:'Nuclear', body:'In nuclear fission a heavy nucleus?', options:['Combines with another','Splits into smaller nuclei','Emits alpha particles only','Absorbs neutrons only'], answer_index:1, difficulty:2 },
  { exam_type:'A_LEVEL', subject:'A-Level Physics', year:2022, topic:'Mechanics', body:'Simple harmonic motion occurs when acceleration is?', options:['Constant','Proportional to displacement','Zero','Maximum at equilibrium'], answer_index:1, difficulty:3 },
  { exam_type:'A_LEVEL', subject:'A-Level Physics', year:2023, topic:'Electricity', body:'Kirchhoffs current law states that?', options:['Voltage is constant','Sum of currents at a junction is zero','Resistance is constant','Power is conserved'], answer_index:1, difficulty:2 },

  // ── A-Level Chemistry ─────────────────────────────────────
  { exam_type:'A_LEVEL', subject:'A-Level Chemistry', year:2018, topic:'Physical', body:'Le Chateliers principle states that a system at equilibrium will?', options:['Always increase temperature','Resist changes to maintain equilibrium','Increase pressure always','Decrease concentration'], answer_index:1, difficulty:3 },
  { exam_type:'A_LEVEL', subject:'A-Level Chemistry', year:2019, topic:'Organic', body:'The mechanism of addition of HBr to an alkene is?', options:['Free radical','Electrophilic addition','Nucleophilic addition','Elimination'], answer_index:1, difficulty:3 },
  { exam_type:'A_LEVEL', subject:'A-Level Chemistry', year:2020, topic:'Physical', body:'The enthalpy change of formation refers to?', options:['Energy released in combustion','Energy to break bonds','Energy change when 1 mole of compound forms from elements','Energy of neutralisation'], answer_index:2, difficulty:2 },
  { exam_type:'A_LEVEL', subject:'A-Level Chemistry', year:2021, topic:'Inorganic', body:'The transition metals are characterised by?', options:['Fixed oxidation states','Variable oxidation states','No colour','Non-catalytic properties'], answer_index:1, difficulty:2 },
  { exam_type:'A_LEVEL', subject:'A-Level Chemistry', year:2022, topic:'Organic', body:'Benzene undergoes which type of reaction preferentially?', options:['Addition','Substitution','Elimination','Oxidation'], answer_index:1, difficulty:3 },
  { exam_type:'A_LEVEL', subject:'A-Level Chemistry', year:2023, topic:'Physical', body:'A catalyst increases reaction rate by?', options:['Increasing temperature','Providing alternative pathway with lower activation energy','Increasing concentration','Increasing pressure'], answer_index:1, difficulty:2 },

  // ── A-Level Biology ───────────────────────────────────────
  { exam_type:'A_LEVEL', subject:'A-Level Biology', year:2018, topic:'Cell Biology', body:'The fluid mosaic model describes?', options:['DNA structure','Cell membrane structure','Protein synthesis','Respiration'], answer_index:1, difficulty:2 },
  { exam_type:'A_LEVEL', subject:'A-Level Biology', year:2019, topic:'Genetics', body:'The process of transcription produces?', options:['DNA from DNA','mRNA from DNA','Protein from mRNA','tRNA from protein'], answer_index:1, difficulty:2 },
  { exam_type:'A_LEVEL', subject:'A-Level Biology', year:2020, topic:'Ecology', body:'The carrying capacity of an environment is?', options:['Maximum population size it can sustain','Minimum population size','Rate of population growth','Total biomass'], answer_index:0, difficulty:2 },
  { exam_type:'A_LEVEL', subject:'A-Level Biology', year:2021, topic:'Physiology', body:'The role of haemoglobin is to?', options:['Digest food','Transport oxygen','Filter blood','Produce antibodies'], answer_index:1, difficulty:1 },
  { exam_type:'A_LEVEL', subject:'A-Level Biology', year:2022, topic:'Genetics', body:'The Hardy-Weinberg principle applies when?', options:['Population is small','Random mating occurs','Natural selection occurs','Migration happens'], answer_index:1, difficulty:3 },
  { exam_type:'A_LEVEL', subject:'A-Level Biology', year:2023, topic:'Cell Biology', body:'ATP is produced during?', options:['Transcription only','Respiration','Translation only','DNA replication'], answer_index:1, difficulty:1 },
];

async function seed() {
  console.log('🌱 Seeding UK/GCSE questions...');
  let count = 0;
  for (const q of questions) {
    await pool.query(
      `INSERT INTO questions
        (exam_type, subject, year, topic, body, options, answer_index,
         difficulty, approved, class_level, curriculum)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT DO NOTHING`,
      [
        q.exam_type, q.subject, q.year, q.topic, q.body,
        JSON.stringify(q.options), q.answer_index,
        q.difficulty || 2, true, 'A-Level', 'UK'
      ]
    );
    count++;
  }
  console.log('✅ Seeded ' + count + ' UK/GCSE questions successfully');
  process.exit(0);
}

seed().catch(e => {
  console.error('❌ Seed failed: ' + e.message);
  process.exit(1);
});