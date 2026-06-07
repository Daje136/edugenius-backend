'use strict';
require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

// ── Bootstrap DB connection directly (no circular deps) ──────────────────────
const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions: { ssl: { rejectUnauthorized: false } },
      logging: false,
    })
  : new Sequelize(
      process.env.PG_DATABASE || 'edugenius',
      process.env.PG_USER     || 'edugenius_user',
      process.env.PG_PASSWORD,
      {
        host:    process.env.PG_HOST || 'localhost',
        port:    parseInt(process.env.PG_PORT || '5432'),
        dialect: 'postgres',
        logging: false,
        dialectOptions: process.env.PG_SSL === 'true'
          ? { ssl: { rejectUnauthorized: false } }
          : {},
      }
    );

// ── Inline model (matches your Question.js exactly) ───────────────────────────
const Question = sequelize.define('Question', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  examType:       { type: DataTypes.STRING, allowNull: false, field: 'exam_type' },
  subject:        { type: DataTypes.STRING, allowNull: false },
  topic:          { type: DataTypes.STRING },
  year:           { type: DataTypes.INTEGER },
  type:           { type: DataTypes.STRING, defaultValue: 'MCQ' },
  body:           { type: DataTypes.TEXT, allowNull: false },
  options:        { type: DataTypes.ARRAY(DataTypes.TEXT), defaultValue: [] },
  answerIndex:    { type: DataTypes.INTEGER, field: 'answer_index' },
  workedSolution: { type: DataTypes.TEXT, field: 'worked_solution' },
  difficulty:     { type: DataTypes.INTEGER, defaultValue: 3 },
  curriculum:     { type: DataTypes.STRING, defaultValue: 'NG' },
  tags:           { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  isApproved:     { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_approved' },
  createdBy:      { type: DataTypes.UUID, field: 'created_by' },
}, {
  tableName: 'questions',
  underscored: true,
});

// ── Question bank ─────────────────────────────────────────────────────────────
const questions = [

  // ═══════════════════════════════════════════════════════════════
  //  JAMB  –  Physics
  // ═══════════════════════════════════════════════════════════════
  { examType:'JAMB', subject:'Physics', year:2020, topic:'Mechanics',
    body:'A body of mass 5 kg is acted upon by a force of 20 N. What is the acceleration?',
    options:['2 m/s²','4 m/s²','10 m/s²','25 m/s²'], answerIndex:1, difficulty:2,
    workedSolution:'F = ma → a = F/m = 20/5 = 4 m/s²' },

  { examType:'JAMB', subject:'Physics', year:2020, topic:'Mechanics',
    body:'Which of the following is a vector quantity?',
    options:['Mass','Temperature','Velocity','Speed'], answerIndex:2, difficulty:1 },

  { examType:'JAMB', subject:'Physics', year:2021, topic:'Waves',
    body:'The speed of light in vacuum is approximately?',
    options:['3×10⁶ m/s','3×10⁸ m/s','3×10¹⁰ m/s','3×10⁴ m/s'], answerIndex:1, difficulty:1 },

  { examType:'JAMB', subject:'Physics', year:2021, topic:'Electricity',
    body:"Ohm's law states that current is proportional to?",
    options:['Resistance','Power','Voltage','Capacitance'], answerIndex:2, difficulty:1 },

  { examType:'JAMB', subject:'Physics', year:2022, topic:'Mechanics',
    body:'The SI unit of force is?',
    options:['Joule','Newton','Pascal','Watt'], answerIndex:1, difficulty:1 },

  { examType:'JAMB', subject:'Physics', year:2022, topic:'Optics',
    body:'Which mirror is used in car headlights to produce a parallel beam?',
    options:['Plane','Concave','Convex','Parabolic concave'], answerIndex:3, difficulty:2,
    workedSolution:'Parabolic concave mirrors focus light from the bulb at the focal point, producing a parallel beam.' },

  { examType:'JAMB', subject:'Physics', year:2023, topic:'Mechanics',
    body:'A car travels 100 m in 5 s. What is its average speed?',
    options:['10 m/s','20 m/s','25 m/s','500 m/s'], answerIndex:1, difficulty:1,
    workedSolution:'speed = distance/time = 100/5 = 20 m/s' },

  { examType:'JAMB', subject:'Physics', year:2023, topic:'Electricity',
    body:'What is the unit of electrical resistance?',
    options:['Ampere','Volt','Ohm','Watt'], answerIndex:2, difficulty:1 },

  { examType:'JAMB', subject:'Physics', year:2024, topic:'Mechanics',
    body:"Newton's first law is also called the law of?",
    options:['Gravitation','Inertia','Motion','Acceleration'], answerIndex:1, difficulty:1 },

  { examType:'JAMB', subject:'Physics', year:2024, topic:'Waves',
    body:'Sound waves are which type of waves?',
    options:['Transverse','Electromagnetic','Longitudinal','Surface'], answerIndex:2, difficulty:2,
    workedSolution:'Sound waves require a medium and compress/rarefy particles along the direction of travel — longitudinal.' },

  { examType:'JAMB', subject:'Physics', year:2019, topic:'Mechanics',
    body:'The momentum of a body is the product of its mass and its?',
    options:['Acceleration','Velocity','Force','Weight'], answerIndex:1, difficulty:1 },

  { examType:'JAMB', subject:'Physics', year:2019, topic:'Electricity',
    body:'Three resistors of 2Ω each are connected in parallel. What is the combined resistance?',
    options:['6 Ω','2 Ω','⅔ Ω','1 Ω'], answerIndex:2, difficulty:3,
    workedSolution:'1/R = 1/2 + 1/2 + 1/2 = 3/2 → R = 2/3 Ω' },

  // ═══════════════════════════════════════════════════════════════
  //  JAMB  –  Chemistry
  // ═══════════════════════════════════════════════════════════════
  { examType:'JAMB', subject:'Chemistry', year:2020, topic:'Atomic Structure',
    body:'The number of protons in an atom is called its?',
    options:['Mass number','Atomic number','Neutron number','Valence'], answerIndex:1, difficulty:1 },

  { examType:'JAMB', subject:'Chemistry', year:2020, topic:'Bonding',
    body:'Which type of bond exists in NaCl?',
    options:['Covalent','Ionic','Metallic','Hydrogen'], answerIndex:1, difficulty:1 },

  { examType:'JAMB', subject:'Chemistry', year:2021, topic:'Acids and Bases',
    body:'What is the pH of a neutral solution at 25 °C?',
    options:['0','7','14','1'], answerIndex:1, difficulty:1 },

  { examType:'JAMB', subject:'Chemistry', year:2021, topic:'Organic Chemistry',
    body:'The general formula for alkanes is?',
    options:['CₙH₂ₙ','CₙH₂ₙ₊₂','CₙH₂ₙ₋₂','CₙHₙ'], answerIndex:1, difficulty:2,
    workedSolution:'Alkanes are saturated hydrocarbons: CₙH₂ₙ₊₂ (e.g. methane CH₄, ethane C₂H₆).' },

  { examType:'JAMB', subject:'Chemistry', year:2022, topic:'Periodic Table',
    body:'Elements in the same group of the periodic table have the same number of?',
    options:['Neutrons','Protons','Valence electrons','Mass number'], answerIndex:2, difficulty:1 },

  { examType:'JAMB', subject:'Chemistry', year:2022, topic:'Gases',
    body:'At STP, one mole of any ideal gas occupies?',
    options:['22.4 L','24 L','11.2 L','44.8 L'], answerIndex:0, difficulty:2,
    workedSolution:'Molar volume at STP (0 °C, 1 atm) = 22.4 L/mol for an ideal gas.' },

  { examType:'JAMB', subject:'Chemistry', year:2023, topic:'Atomic Structure',
    body:'Isotopes are atoms with the same atomic number but different?',
    options:['Electron number','Mass number','Proton number','Valence'], answerIndex:1, difficulty:2 },

  { examType:'JAMB', subject:'Chemistry', year:2024, topic:'Bonding',
    body:'Which of these is a covalent compound?',
    options:['NaCl','KBr','H₂O','MgO'], answerIndex:2, difficulty:1,
    workedSolution:'Water (H₂O) involves electron sharing between hydrogen and oxygen — a covalent bond.' },

  { examType:'JAMB', subject:'Chemistry', year:2019, topic:'Electrochemistry',
    body:'In electrolysis, oxidation occurs at the?',
    options:['Cathode','Anode','Electrolyte','Salt bridge'], answerIndex:1, difficulty:2 },

  { examType:'JAMB', subject:'Chemistry', year:2019, topic:'Organic Chemistry',
    body:'Which functional group is present in ethanol?',
    options:['Aldehyde','Ketone','Hydroxyl','Carboxyl'], answerIndex:2, difficulty:2,
    workedSolution:'Ethanol (C₂H₅OH) contains the -OH (hydroxyl) group, making it an alcohol.' },

  // ═══════════════════════════════════════════════════════════════
  //  JAMB  –  Biology
  // ═══════════════════════════════════════════════════════════════
  { examType:'JAMB', subject:'Biology', year:2020, topic:'Cell Biology',
    body:'The powerhouse of the cell is the?',
    options:['Nucleus','Ribosome','Mitochondria','Chloroplast'], answerIndex:2, difficulty:1 },

  { examType:'JAMB', subject:'Biology', year:2020, topic:'Genetics',
    body:'DNA stands for?',
    options:['Deoxyribonucleic Acid','Diribonucleic Acid','Deoxyribonitric Acid','None of the above'], answerIndex:0, difficulty:1 },

  { examType:'JAMB', subject:'Biology', year:2021, topic:'Ecology',
    body:'Organisms that make their own food using sunlight are called?',
    options:['Consumers','Decomposers','Producers','Parasites'], answerIndex:2, difficulty:1 },

  { examType:'JAMB', subject:'Biology', year:2021, topic:'Cell Biology',
    body:'The cell wall of plants is primarily made of?',
    options:['Chitin','Cellulose','Protein','Lipid'], answerIndex:1, difficulty:1 },

  { examType:'JAMB', subject:'Biology', year:2022, topic:'Genetics',
    body:'How many pairs of chromosomes do humans have?',
    options:['23','46','22','24'], answerIndex:0, difficulty:2,
    workedSolution:'Humans have 46 chromosomes arranged in 23 pairs (diploid).' },

  { examType:'JAMB', subject:'Biology', year:2022, topic:'Nutrition',
    body:'Which nutrient provides the most energy per gram?',
    options:['Carbohydrate','Protein','Fat','Vitamin'], answerIndex:2, difficulty:2,
    workedSolution:'Fat provides ~9 kcal/g vs carbohydrate/protein at ~4 kcal/g each.' },

  { examType:'JAMB', subject:'Biology', year:2023, topic:'Ecology',
    body:'The process by which plants manufacture food using sunlight is called?',
    options:['Respiration','Photosynthesis','Transpiration','Digestion'], answerIndex:1, difficulty:1 },

  { examType:'JAMB', subject:'Biology', year:2024, topic:'Cell Biology',
    body:'Which organelle controls all the activities of the cell?',
    options:['Mitochondria','Ribosome','Nucleus','Vacuole'], answerIndex:2, difficulty:1 },

  { examType:'JAMB', subject:'Biology', year:2019, topic:'Genetics',
    body:"Mendel's law of segregation states that alleles separate during?",
    options:['Fertilisation','Mitosis','Meiosis','Germination'], answerIndex:2, difficulty:3,
    workedSolution:'During meiosis I, homologous chromosomes (carrying allele pairs) separate into different cells.' },

  { examType:'JAMB', subject:'Biology', year:2019, topic:'Nutrition',
    body:'Which enzyme is responsible for the digestion of starch in the mouth?',
    options:['Pepsin','Lipase','Salivary amylase','Trypsin'], answerIndex:2, difficulty:2 },

  // ═══════════════════════════════════════════════════════════════
  //  JAMB  –  Mathematics
  // ═══════════════════════════════════════════════════════════════
  { examType:'JAMB', subject:'Mathematics', year:2020, topic:'Algebra',
    body:'Solve for x: 2x + 5 = 15',
    options:['4','5','6','10'], answerIndex:1, difficulty:1,
    workedSolution:'2x = 15 − 5 = 10 → x = 5' },

  { examType:'JAMB', subject:'Mathematics', year:2021, topic:'Numbers',
    body:'What is 15% of 200?',
    options:['20','30','25','15'], answerIndex:1, difficulty:1,
    workedSolution:'15/100 × 200 = 30' },

  { examType:'JAMB', subject:'Mathematics', year:2022, topic:'Geometry',
    body:'The sum of interior angles in a triangle is?',
    options:['90°','180°','270°','360°'], answerIndex:1, difficulty:1 },

  { examType:'JAMB', subject:'Mathematics', year:2023, topic:'Algebra',
    body:'Simplify: 3x + 2x − x',
    options:['4x','5x','6x','3x'], answerIndex:0, difficulty:1,
    workedSolution:'3x + 2x − x = 4x' },

  { examType:'JAMB', subject:'Mathematics', year:2024, topic:'Numbers',
    body:'What is the LCM of 4 and 6?',
    options:['8','12','24','6'], answerIndex:1, difficulty:1,
    workedSolution:'Multiples of 4: 4,8,12… Multiples of 6: 6,12… LCM = 12' },

  { examType:'JAMB', subject:'Mathematics', year:2019, topic:'Algebra',
    body:'If y = 3x² − 2x + 1, find dy/dx',
    options:['6x − 2','3x − 2','6x + 1','6x²'], answerIndex:0, difficulty:3,
    workedSolution:'dy/dx = 6x − 2 (using power rule on each term)' },

  { examType:'JAMB', subject:'Mathematics', year:2019, topic:'Statistics',
    body:'The mode of the data set {2, 3, 3, 5, 7, 3, 8} is?',
    options:['2','3','5','7'], answerIndex:1, difficulty:1,
    workedSolution:'3 appears three times — more than any other value.' },

  // ═══════════════════════════════════════════════════════════════
  //  WAEC  –  Biology
  // ═══════════════════════════════════════════════════════════════
  { examType:'WAEC', subject:'Biology', year:2020, topic:'Cell Biology',
    body:'Which of these is found in plant cells but NOT in animal cells?',
    options:['Mitochondria','Cell wall','Nucleus','Ribosome'], answerIndex:1, difficulty:1 },

  { examType:'WAEC', subject:'Biology', year:2021, topic:'Genetics',
    body:'The passing of traits from parents to offspring is called?',
    options:['Evolution','Heredity','Mutation','Variation'], answerIndex:1, difficulty:1 },

  { examType:'WAEC', subject:'Biology', year:2022, topic:'Ecology',
    body:'A food chain always begins with a?',
    options:['Consumer','Decomposer','Producer','Carnivore'], answerIndex:2, difficulty:1 },

  { examType:'WAEC', subject:'Biology', year:2023, topic:'Nutrition',
    body:'Deficiency of Vitamin C causes?',
    options:['Rickets','Scurvy','Anaemia','Goitre'], answerIndex:1, difficulty:2,
    workedSolution:'Vitamin C deficiency → scurvy (bleeding gums, weak connective tissue).' },

  { examType:'WAEC', subject:'Biology', year:2024, topic:'Cell Biology',
    body:'Osmosis is the movement of water from a region of?',
    options:['Low to high water potential','High to low water potential','Equal water potential to equal','None of the above'], answerIndex:1, difficulty:2,
    workedSolution:'Osmosis: water moves from high water potential (dilute) to low water potential (concentrated) across a semipermeable membrane.' },

  { examType:'WAEC', subject:'Biology', year:2019, topic:'Reproduction',
    body:'The site of fertilisation in humans is the?',
    options:['Uterus','Vagina','Fallopian tube','Ovary'], answerIndex:2, difficulty:2 },

  { examType:'WAEC', subject:'Biology', year:2019, topic:'Ecology',
    body:'Which of the following is a primary consumer?',
    options:['Grass','Rabbit','Fox','Eagle'], answerIndex:1, difficulty:1 },

  // ═══════════════════════════════════════════════════════════════
  //  WAEC  –  Chemistry
  // ═══════════════════════════════════════════════════════════════
  { examType:'WAEC', subject:'Chemistry', year:2020, topic:'Acids and Bases',
    body:'Which of the following is a strong acid?',
    options:['Ethanoic acid','Carbonic acid','Hydrochloric acid','Citric acid'], answerIndex:2, difficulty:1 },

  { examType:'WAEC', subject:'Chemistry', year:2021, topic:'Organic Chemistry',
    body:'Fermentation of glucose produces?',
    options:['Methanol','Ethanol','Propanol','Butanol'], answerIndex:1, difficulty:1,
    workedSolution:'C₆H₁₂O₆ → 2C₂H₅OH + 2CO₂ (yeast fermentation)' },

  { examType:'WAEC', subject:'Chemistry', year:2022, topic:'Reactions',
    body:'Which gas is produced when zinc reacts with dilute HCl?',
    options:['Oxygen','Chlorine','Hydrogen','Carbon dioxide'], answerIndex:2, difficulty:2,
    workedSolution:'Zn + 2HCl → ZnCl₂ + H₂↑' },

  { examType:'WAEC', subject:'Chemistry', year:2024, topic:'Bonding',
    body:'The molecular formula of water is?',
    options:['HO','H₂O','H₂O₂','HO₂'], answerIndex:1, difficulty:1 },

  { examType:'WAEC', subject:'Chemistry', year:2023, topic:'Electrochemistry',
    body:'The electrolyte used in a standard lead-acid battery is?',
    options:['Sodium hydroxide','Sulphuric acid','Hydrochloric acid','Potassium nitrate'], answerIndex:1, difficulty:3 },

  { examType:'WAEC', subject:'Chemistry', year:2019, topic:'Periodic Table',
    body:'Which of the following elements is a noble gas?',
    options:['Nitrogen','Oxygen','Argon','Fluorine'], answerIndex:2, difficulty:1 },

  // ═══════════════════════════════════════════════════════════════
  //  WAEC  –  Physics
  // ═══════════════════════════════════════════════════════════════
  { examType:'WAEC', subject:'Physics', year:2020, topic:'Mechanics',
    body:'The gravitational acceleration on Earth is approximately?',
    options:['8.9 m/s²','9.8 m/s²','10.8 m/s²','11 m/s²'], answerIndex:1, difficulty:1 },

  { examType:'WAEC', subject:'Physics', year:2021, topic:'Electricity',
    body:'Which material is the best conductor of electricity?',
    options:['Rubber','Wood','Copper','Glass'], answerIndex:2, difficulty:1 },

  { examType:'WAEC', subject:'Physics', year:2024, topic:'Mechanics',
    body:'Work done equals?',
    options:['Mass × velocity','Force × distance','Power × time','Mass × acceleration'], answerIndex:1, difficulty:1,
    workedSolution:'W = F × d (when force is parallel to displacement).' },

  { examType:'WAEC', subject:'Physics', year:2023, topic:'Waves',
    body:'The phenomenon by which a wave bends around an obstacle is called?',
    options:['Reflection','Refraction','Diffraction','Interference'], answerIndex:2, difficulty:2 },

  { examType:'WAEC', subject:'Physics', year:2019, topic:'Optics',
    body:'A convex lens is also known as a?',
    options:['Diverging lens','Converging lens','Plane lens','Biconcave lens'], answerIndex:1, difficulty:1 },

  // ═══════════════════════════════════════════════════════════════
  //  WAEC  –  Mathematics
  // ═══════════════════════════════════════════════════════════════
  { examType:'WAEC', subject:'Mathematics', year:2020, topic:'Algebra',
    body:'Find the value of x if 3x = 18',
    options:['3','4','6','9'], answerIndex:2, difficulty:1,
    workedSolution:'x = 18/3 = 6' },

  { examType:'WAEC', subject:'Mathematics', year:2021, topic:'Geometry',
    body:'The area of a circle with radius 7 cm is? (use π = 22/7)',
    options:['44 cm²','154 cm²','22 cm²','49 cm²'], answerIndex:1, difficulty:2,
    workedSolution:'A = πr² = 22/7 × 7² = 22 × 7 = 154 cm²' },

  { examType:'WAEC', subject:'Mathematics', year:2022, topic:'Numbers',
    body:'Express 0.25 as a fraction in lowest terms',
    options:['1/2','1/4','1/5','1/8'], answerIndex:1, difficulty:1,
    workedSolution:'0.25 = 25/100 = 1/4' },

  { examType:'WAEC', subject:'Mathematics', year:2023, topic:'Statistics',
    body:'The mean of 2, 4, 6, 8, 10 is?',
    options:['4','5','6','8'], answerIndex:2, difficulty:1,
    workedSolution:'Mean = (2+4+6+8+10)/5 = 30/5 = 6' },

  { examType:'WAEC', subject:'Mathematics', year:2024, topic:'Algebra',
    body:'Expand: (x + 3)(x − 3)',
    options:['x² − 9','x² + 9','x² − 6x + 9','x² + 6x − 9'], answerIndex:0, difficulty:2,
    workedSolution:'Difference of two squares: (a+b)(a−b) = a² − b² → x² − 9' },

  { examType:'WAEC', subject:'Mathematics', year:2019, topic:'Numbers',
    body:'Simplify: √(144)',
    options:['10','11','12','14'], answerIndex:2, difficulty:1 },

  // ═══════════════════════════════════════════════════════════════
  //  NECO  –  Biology
  // ═══════════════════════════════════════════════════════════════
  { examType:'NECO', subject:'Biology', year:2020, topic:'Cell Biology',
    body:'Which of the following is NOT a function of the cell membrane?',
    options:['Controls what enters the cell','Provides structural support','Facilitates cell communication','Manufactures proteins'], answerIndex:3, difficulty:2,
    workedSolution:'Protein synthesis occurs at ribosomes, not the cell membrane.' },

  { examType:'NECO', subject:'Biology', year:2021, topic:'Nutrition',
    body:'Which vitamin is essential for blood clotting?',
    options:['Vitamin A','Vitamin B','Vitamin C','Vitamin K'], answerIndex:3, difficulty:2 },

  { examType:'NECO', subject:'Biology', year:2022, topic:'Reproduction',
    body:'In humans, the XY chromosome combination results in?',
    options:['Female','Male','Either sex','Hermaphrodite'], answerIndex:1, difficulty:1 },

  { examType:'NECO', subject:'Biology', year:2023, topic:'Ecology',
    body:'Decomposers in an ecosystem are important because they?',
    options:['Produce food','Return nutrients to the soil','Consume primary producers','Convert sunlight to energy'], answerIndex:1, difficulty:2 },

  { examType:'NECO', subject:'Biology', year:2024, topic:'Genetics',
    body:'If a trait is controlled by a dominant allele (A), an organism with genotype Aa will?',
    options:['Show the recessive trait','Show the dominant trait','Show both traits equally','Show neither trait'], answerIndex:1, difficulty:2,
    workedSolution:'One dominant allele is sufficient to express the dominant phenotype.' },

  { examType:'NECO', subject:'Biology', year:2019, topic:'Cell Biology',
    body:'The process of cell division that produces four genetically different cells is?',
    options:['Mitosis','Binary fission','Meiosis','Budding'], answerIndex:2, difficulty:2 },

  // ═══════════════════════════════════════════════════════════════
  //  NECO  –  Chemistry
  // ═══════════════════════════════════════════════════════════════
  { examType:'NECO', subject:'Chemistry', year:2020, topic:'Gases',
    body:"According to Boyle's law, at constant temperature, pressure and volume are?",
    options:['Directly proportional','Inversely proportional','Equal','Independent'], answerIndex:1, difficulty:2,
    workedSolution:'PV = constant → P ∝ 1/V (Boyle\'s law).' },

  { examType:'NECO', subject:'Chemistry', year:2021, topic:'Reactions',
    body:'A reaction in which heat is released to the surroundings is called?',
    options:['Endothermic','Exothermic','Photochemical','Reversible'], answerIndex:1, difficulty:1 },

  { examType:'NECO', subject:'Chemistry', year:2022, topic:'Organic Chemistry',
    body:'Which of the following is a saturated hydrocarbon?',
    options:['Ethene','Ethyne','Ethane','Benzene'], answerIndex:2, difficulty:2,
    workedSolution:'Ethane (C₂H₆) has only single C-C bonds — saturated. Others contain double/triple bonds.' },

  { examType:'NECO', subject:'Chemistry', year:2023, topic:'Atomic Structure',
    body:'The electron configuration of sodium (Na, atomic number 11) is?',
    options:['2,8,1','2,8,3','2,9','2,6,3'], answerIndex:0, difficulty:2,
    workedSolution:'Shells fill as: 2 (1st), 8 (2nd), 1 (3rd) → 2,8,1.' },

  { examType:'NECO', subject:'Chemistry', year:2024, topic:'Acids and Bases',
    body:'Which indicator turns red in acidic solution?',
    options:['Phenolphthalein','Litmus','Methyl orange','Both B and C'], answerIndex:3, difficulty:2 },

  { examType:'NECO', subject:'Chemistry', year:2019, topic:'Periodic Table',
    body:'The period number of an element corresponds to its?',
    options:['Number of valence electrons','Number of electron shells','Atomic mass','Atomic number'], answerIndex:1, difficulty:2 },

  // ═══════════════════════════════════════════════════════════════
  //  NECO  –  Physics
  // ═══════════════════════════════════════════════════════════════
  { examType:'NECO', subject:'Physics', year:2020, topic:'Electricity',
    body:'The formula for electric power is?',
    options:['P = IV','P = I/V','P = V/I','P = I²/V'], answerIndex:0, difficulty:2,
    workedSolution:'P = IV (Power = Current × Voltage). Also P = I²R = V²/R.' },

  { examType:'NECO', subject:'Physics', year:2021, topic:'Mechanics',
    body:'An object in free fall has what kind of acceleration?',
    options:['Zero','Constant','Increasing','Decreasing'], answerIndex:1, difficulty:2,
    workedSolution:'Free fall has constant acceleration g ≈ 9.8 m/s² (ignoring air resistance).' },

  { examType:'NECO', subject:'Physics', year:2022, topic:'Waves',
    body:'The number of complete waves passing a point per second is called?',
    options:['Wavelength','Amplitude','Frequency','Period'], answerIndex:2, difficulty:1 },

  { examType:'NECO', subject:'Physics', year:2023, topic:'Optics',
    body:'Total internal reflection occurs when light travels from a?',
    options:['Less dense to more dense medium','More dense to less dense medium at angle > critical angle','Less dense medium at any angle','None of the above'], answerIndex:1, difficulty:3,
    workedSolution:'Light must be in the denser medium AND the angle of incidence must exceed the critical angle.' },

  { examType:'NECO', subject:'Physics', year:2024, topic:'Mechanics',
    body:'The unit of pressure is?',
    options:['Newton','Joule','Pascal','Watt'], answerIndex:2, difficulty:1 },

  { examType:'NECO', subject:'Physics', year:2019, topic:'Electricity',
    body:'Which of the following converts electrical energy to mechanical energy?',
    options:['Generator','Transformer','Electric motor','Capacitor'], answerIndex:2, difficulty:1 },

  // ═══════════════════════════════════════════════════════════════
  //  NECO  –  Mathematics
  // ═══════════════════════════════════════════════════════════════
  { examType:'NECO', subject:'Mathematics', year:2020, topic:'Numbers',
    body:'What is the HCF of 12 and 18?',
    options:['3','6','9','12'], answerIndex:1, difficulty:1,
    workedSolution:'Factors of 12: 1,2,3,4,6,12. Factors of 18: 1,2,3,6,9,18. HCF = 6.' },

  { examType:'NECO', subject:'Mathematics', year:2021, topic:'Algebra',
    body:'Factorise: x² − 5x + 6',
    options:['(x−2)(x−3)','(x+2)(x+3)','(x−1)(x−6)','(x+1)(x−6)'], answerIndex:0, difficulty:2,
    workedSolution:'Find two numbers that multiply to 6 and add to −5: −2 and −3 → (x−2)(x−3).' },

  { examType:'NECO', subject:'Mathematics', year:2022, topic:'Geometry',
    body:'How many sides does a hexagon have?',
    options:['4','5','6','7'], answerIndex:2, difficulty:1 },

  { examType:'NECO', subject:'Mathematics', year:2023, topic:'Statistics',
    body:'The median of {3, 7, 1, 9, 5} when arranged in order is?',
    options:['1','5','7','9'], answerIndex:1, difficulty:1,
    workedSolution:'Ordered: 1, 3, 5, 7, 9. Middle value = 5.' },

  { examType:'NECO', subject:'Mathematics', year:2024, topic:'Trigonometry',
    body:'In a right-angled triangle, sin θ =?',
    options:['Adjacent/Hypotenuse','Opposite/Adjacent','Opposite/Hypotenuse','Hypotenuse/Opposite'], answerIndex:2, difficulty:2,
    workedSolution:'SOH-CAH-TOA: Sin = Opposite/Hypotenuse' },

  { examType:'NECO', subject:'Mathematics', year:2019, topic:'Numbers',
    body:'Convert 1010₂ to base 10',
    options:['8','10','12','16'], answerIndex:1, difficulty:2,
    workedSolution:'1×2³ + 0×2² + 1×2¹ + 0×2⁰ = 8 + 0 + 2 + 0 = 10' },

  // ═══════════════════════════════════════════════════════════════
  //  NECO  –  English Language
  // ═══════════════════════════════════════════════════════════════
  { examType:'NECO', subject:'English Language', year:2022, topic:'Grammar',
    body:'Choose the correct form: "Neither the students nor the teacher ___ present."',
    options:['were','are','is','have'], answerIndex:2, difficulty:2,
    workedSolution:"When 'neither...nor' connects subjects, the verb agrees with the nearest subject ('the teacher' = singular → 'is')." },

  { examType:'NECO', subject:'English Language', year:2023, topic:'Vocabulary',
    body:'The word "benevolent" means?',
    options:['Cruel','Kind and generous','Angry','Lazy'], answerIndex:1, difficulty:2 },

  // ═══════════════════════════════════════════════════════════════
  //  WAEC  –  English Language
  // ═══════════════════════════════════════════════════════════════
  { examType:'WAEC', subject:'English Language', year:2022, topic:'Grammar',
    body:'Identify the correct sentence:',
    options:[
      'He don\'t know the answer.',
      'She don\'t like mangoes.',
      'They doesn\'t play football.',
      'He doesn\'t know the answer.',
    ], answerIndex:3, difficulty:1 },

  { examType:'WAEC', subject:'English Language', year:2023, topic:'Comprehension',
    body:"The word 'eloquent' most nearly means?",
    options:['Silent','Well-spoken','Confused','Angry'], answerIndex:1, difficulty:2 },

  // ═══════════════════════════════════════════════════════════════
  //  JAMB  –  English Language
  // ═══════════════════════════════════════════════════════════════
  { examType:'JAMB', subject:'English Language', year:2023, topic:'Grammar',
    body:"Which of the following is the plural of 'phenomenon'?",
    options:['Phenomenons','Phenomenas','Phenomena','Phenomenes'], answerIndex:2, difficulty:2 },

  { examType:'JAMB', subject:'English Language', year:2024, topic:'Vocabulary',
    body:"Choose the word closest in meaning to 'diligent':",
    options:['Lazy','Careless','Hardworking','Reckless'], answerIndex:2, difficulty:1 },

  // ═══════════════════════════════════════════════════════════════
  //  JAMB  –  Government
  // ═══════════════════════════════════════════════════════════════
  { examType:'JAMB', subject:'Government', year:2022, topic:'Federalism',
    body:'In a federal system of government, power is shared between?',
    options:['The president and the army','The central and regional governments','The parliament and the judiciary','The ruling and opposition parties'], answerIndex:1, difficulty:1 },

  { examType:'JAMB', subject:'Government', year:2023, topic:'Democracy',
    body:'The principle of separation of powers was propounded by?',
    options:['John Locke','Karl Marx','Montesquieu','Jean-Jacques Rousseau'], answerIndex:2, difficulty:2 },

  // ═══════════════════════════════════════════════════════════════
  //  WAEC  –  Economics
  // ═══════════════════════════════════════════════════════════════
  { examType:'WAEC', subject:'Economics', year:2022, topic:'Demand and Supply',
    body:'When the price of a good rises and demand falls, this illustrates the law of?',
    options:['Supply','Diminishing returns','Demand','Elasticity'], answerIndex:2, difficulty:1 },

  { examType:'WAEC', subject:'Economics', year:2023, topic:'Macroeconomics',
    body:'GDP stands for?',
    options:['Gross Domestic Product','General Domestic Product','Gross Demand Price','Government Development Plan'], answerIndex:0, difficulty:1 },

  // ═══════════════════════════════════════════════════════════════
  //  IELTS  –  (Academic – English)
  // ═══════════════════════════════════════════════════════════════
  { examType:'IELTS', subject:'English Language', year:2023, topic:'Academic Vocabulary',
    body:"In IELTS Academic, 'to corroborate' means to?",
    options:['Contradict','Confirm with evidence','Ignore','Simplify'], answerIndex:1, difficulty:3,
    curriculum:'INTL' },

  { examType:'IELTS', subject:'English Language', year:2023, topic:'Grammar',
    body:'Choose the grammatically correct sentence:',
    options:[
      'The data shows a clear trend.',
      'The data show a clear trend.',
      'The data is shown a clear trend.',
      'Both A and B are acceptable in academic writing.',
    ], answerIndex:3, difficulty:4,
    curriculum:'INTL',
    workedSolution:"'Data' can be treated as singular (AmE informal) or plural (formal/BrE). Both forms appear in academic writing; IELTS accepts either." },

];

// ── Seed function ─────────────────────────────────────────────────────────────
async function seed() {
  try {
    await sequelize.authenticate();
    console.log('✅ DB connected');

    await Question.sync(); // ensure table exists
    console.log('✅ Table ready');

    console.log(`⏳ Inserting ${questions.length} questions...`);

    let inserted = 0;
    let skipped  = 0;
    const stats  = {};

    for (const q of questions) {
      const [, created] = await Question.findOrCreate({
        where: { body: q.body, examType: q.examType },
        defaults: {
          subject:        q.subject,
          topic:          q.topic        || 'General',
          year:           q.year         || null,
          type:           q.type         || 'MCQ',
          options:        q.options      || [],
          answerIndex:    q.answerIndex  ?? null,
          workedSolution: q.workedSolution || null,
          difficulty:     q.difficulty   || 3,
          curriculum:     q.curriculum   || 'NG',
          tags:           q.tags         || [],
          isApproved:     true,
        },
      });

      if (created) {
        inserted++;
        stats[q.examType] = (stats[q.examType] || 0) + 1;
      } else {
        skipped++;
      }
    }

    console.log(`\n✅ Seeded ${inserted} questions (${skipped} already existed)`);
    console.log('\n📊 Breakdown:');
    for (const [type, count] of Object.entries(stats)) {
      console.log(`   ${type}: ${count} questions`);
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
