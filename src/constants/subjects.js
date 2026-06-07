'use strict';

// ─── EXAM TYPES ───────────────────────────────────────────────
const EXAM_TYPES = ['WAEC', 'JAMB', 'NECO', 'IELTS', 'GCSE', 'A_LEVEL'];

// ─── SUBJECTS BY EXAM & CATEGORY ─────────────────────────────
const SUBJECTS = {

  WAEC: {
    Sciences: [
      'Mathematics', 'Further Mathematics', 'Biology', 'Chemistry', 'Physics',
      'Agricultural Science', 'Animal Husbandry', 'Fisheries', 'Forestry',
      'Physical Education', 'Computer Studies', 'Food & Nutrition',
    ],
    Arts: [
      'English Language', 'Literature in English', 'History', 'Geography',
      'Government', 'Christian Religious Studies', 'Islamic Religious Studies',
      'French', 'Yoruba', 'Igbo', 'Hausa', 'Arabic',
      'Visual Art', 'Music', 'Home Economics',
    ],
    Commercial: [
      'Economics', 'Commerce', 'Accounting', 'Marketing',
      'Office Practice', 'Store Management',
    ],
    Technical: [
      'Technical Drawing', 'Auto Mechanics', 'Building Construction',
      'Electronics', 'Metal Work', 'Plumbing & Pipe Fitting', 'Welding & Fabrication',
    ],
    'Civic & Social': ['Civic Education'],
  },

  JAMB: {
    Sciences: [
      'Mathematics', 'Further Mathematics', 'Biology', 'Chemistry', 'Physics',
      'Agricultural Science', 'Animal Husbandry', 'Fisheries', 'Forestry',
      'Physical Education', 'Computer Studies', 'Home Economics',
    ],
    Arts: [
      'English Language', 'Literature in English', 'History', 'Geography',
      'Government', 'Christian Religious Studies', 'Islamic Religious Studies',
      'French', 'Yoruba', 'Igbo', 'Hausa', 'Arabic',
      'Fine & Applied Arts', 'Music',
    ],
    Commercial: [
      'Economics', 'Commerce', 'Accounting', 'Marketing',
      'Office Practice', 'Principles of Accounts',
    ],
    'Civic & Social': ['Civic Education'],
  },

  NECO: {
    Sciences: [
      'Mathematics', 'Further Mathematics', 'Biology', 'Chemistry', 'Physics',
      'Agricultural Science', 'Animal Husbandry', 'Fisheries', 'Forestry',
      'Physical Education', 'Computer Studies', 'Food & Nutrition', 'Data Processing',
    ],
    Arts: [
      'English Language', 'Literature in English', 'History', 'Geography',
      'Government', 'Christian Religious Studies', 'Islamic Religious Studies',
      'French', 'Yoruba', 'Igbo', 'Hausa', 'Arabic',
      'Visual Art', 'Music', 'Home Economics',
    ],
    Commercial: [
      'Economics', 'Commerce', 'Accounting', 'Marketing',
      'Office Practice', 'Store Management',
    ],
    Technical: [
      'Technical Drawing', 'Auto Mechanics', 'Building Construction', 'Electronics',
    ],
    'Civic & Social': ['Civic Education'],
  },

  IELTS: {
    'Academic Track':          ['Academic Reading', 'Academic Writing'],
    'General Training Track':  ['General Reading', 'General Writing'],
    'Both Tracks':             ['Listening', 'Speaking'],
  },

  GCSE: {
    Sciences: [
      'Mathematics', 'Further Mathematics', 'Statistics', 'Biology', 'Chemistry',
      'Physics', 'Combined Science', 'Computer Science',
      'Design & Technology', 'Food Preparation & Nutrition',
    ],
    Arts: [
      'English Language', 'English Literature', 'History', 'Geography',
      'Religious Studies', 'Art & Design', 'Music', 'Drama',
      'Media Studies', 'Latin', 'Ancient History', 'Sociology', 'Psychology',
    ],
    Languages: ['French', 'German', 'Spanish'],
    Commercial: ['Business Studies', 'Economics'],
    'Physical Education': ['Physical Education'],
  },
};

// ─── FLAT LIST PER EXAM (for Joi validation & dropdowns) ─────
const FLAT_SUBJECTS = {};
for (const [exam, categories] of Object.entries(SUBJECTS)) {
  FLAT_SUBJECTS[exam] = Object.values(categories).flat();
}

// ─── ALL UNIQUE SUBJECTS ACROSS ALL EXAMS ────────────────────
const ALL_SUBJECTS = [...new Set(Object.values(FLAT_SUBJECTS).flat())].sort();

// ─── HELPER: get subjects for a specific exam + category ─────
const getSubjects = (examType, category = null) => {
  const exam = SUBJECTS[examType];
  if (!exam) return [];
  if (category) return exam[category] || [];
  return Object.values(exam).flat();
};

// ─── HELPER: get categories for a specific exam ──────────────
const getCategories = (examType) => {
  return Object.keys(SUBJECTS[examType] || {});
};

// ─── HELPER: check if subject is valid for exam ──────────────
const isValidSubject = (examType, subject) => {
  return getSubjects(examType).includes(subject);
};

module.exports = {
  EXAM_TYPES,
  SUBJECTS,
  FLAT_SUBJECTS,
  ALL_SUBJECTS,
  getSubjects,
  getCategories,
  isValidSubject,
};
