'use strict';
const { DataTypes, Model } = require('sequelize');
const { sequelize }        = require('../../config/postgres');

// ─── StudyGoal ──────────────────────────────────────────────
class StudyGoal extends Model {}
StudyGoal.init({
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId:         { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
  targetScore:    { type: DataTypes.FLOAT, allowNull: false },
  examDate:       { type: DataTypes.DATEONLY, allowNull: false },
  weeklyHours:    { type: DataTypes.INTEGER, allowNull: false },
  examType:       { type: DataTypes.ENUM('WAEC','JAMB','UK_GCSE','A_LEVEL'), allowNull: false },
  targetSubjects: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  weakTopics:     { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  studyPlanJson:  { type: DataTypes.JSONB, defaultValue: {} },
  isActive:       { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  sequelize, modelName: 'StudyGoal', tableName: 'study_goals', timestamps: true,
  indexes: [{ fields: ['userId'] }],
});

// ─── Assignment ─────────────────────────────────────────────
class Assignment extends Model {}
Assignment.init({
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  teacherId:   { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
  classId:     { type: DataTypes.UUID, allowNull: false },
  title:       { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  examType:    { type: DataTypes.ENUM('WAEC','JAMB','UK_GCSE','A_LEVEL','MIXED'), defaultValue: 'MIXED' },
  subject:     { type: DataTypes.STRING(60), allowNull: true },
  questionIds: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  deadline:    { type: DataTypes.DATE, allowNull: false },
  aiGraded:    { type: DataTypes.BOOLEAN, defaultValue: true },
  maxScore:    { type: DataTypes.INTEGER, defaultValue: 100 },
  status:      { type: DataTypes.ENUM('draft','published','closed'), defaultValue: 'published' },
}, {
  sequelize, modelName: 'Assignment', tableName: 'assignments', timestamps: true,
  indexes: [{ fields: ['teacherId'] }, { fields: ['classId'] }, { fields: ['deadline'] }],
});

// ─── AssignmentSubmission ───────────────────────────────────
class AssignmentSubmission extends Model {}
AssignmentSubmission.init({
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  assignmentId:     { type: DataTypes.UUID, allowNull: false, references: { model: 'assignments', key: 'id' } },
  studentId:        { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
  answersJson:      { type: DataTypes.JSONB, defaultValue: [] },
  score:            { type: DataTypes.FLOAT, allowNull: true },
  aiFeedbackJson:   { type: DataTypes.JSONB, defaultValue: {} },
  teacherFeedback:  { type: DataTypes.TEXT, allowNull: true },
  teacherScore:     { type: DataTypes.FLOAT, allowNull: true },
  status:           { type: DataTypes.ENUM('not_started','in_progress','submitted','graded'), defaultValue: 'not_started' },
  submittedAt:      { type: DataTypes.DATE, allowNull: true },
}, {
  sequelize, modelName: 'AssignmentSubmission', tableName: 'assignment_submissions', timestamps: true,
  indexes: [
    { unique: true, fields: ['assignmentId', 'studentId'] },
    { fields: ['studentId'] },
  ],
});

// ─── School / Class ─────────────────────────────────────────
class School extends Model {}
School.init({
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:        { type: DataTypes.STRING(200), allowNull: false },
  country:     { type: DataTypes.STRING(50), defaultValue: 'Nigeria' },
  curriculum:  { type: DataTypes.ENUM('NG','UK','BOTH'), defaultValue: 'NG' },
  adminId:     { type: DataTypes.UUID, allowNull: true },
  isActive:    { type: DataTypes.BOOLEAN, defaultValue: true },
  planTier:    { type: DataTypes.ENUM('free','standard','premium'), defaultValue: 'free' },
  logoUrl:     { type: DataTypes.STRING(500), allowNull: true },
}, {
  sequelize, modelName: 'School', tableName: 'schools', timestamps: true,
});

class Class extends Model {}
Class.init({
  id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  schoolId:   { type: DataTypes.UUID, allowNull: false, references: { model: 'schools', key: 'id' } },
  teacherId:  { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
  name:       { type: DataTypes.STRING(50), allowNull: false },
  examType:   { type: DataTypes.ENUM('WAEC','JAMB','UK_GCSE','A_LEVEL','MIXED'), defaultValue: 'MIXED' },
  year:       { type: DataTypes.INTEGER, defaultValue: () => new Date().getFullYear() },
  isActive:   { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  sequelize, modelName: 'Class', tableName: 'classes', timestamps: true,
  indexes: [{ fields: ['schoolId'] }, { fields: ['teacherId'] }],
});

module.exports = { StudyGoal, Assignment, AssignmentSubmission, School, Class };
