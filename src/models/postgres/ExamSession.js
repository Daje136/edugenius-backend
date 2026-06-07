'use strict';
const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/postgres');

class ExamSession extends Model {}

ExamSession.init({
  id:                  { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId:              { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
  examType:            { type: DataTypes.STRING(30), allowNull: false, field: 'exam_type' },
  subject:             { type: DataTypes.STRING(100), allowNull: false },
  topic:               { type: DataTypes.STRING(100), allowNull: true },
  year:                { type: DataTypes.INTEGER, allowNull: true },
  totalQuestions:      { type: DataTypes.INTEGER, defaultValue: 0, field: 'total_questions' },
  answered:            { type: DataTypes.INTEGER, defaultValue: 0 },
  correct:             { type: DataTypes.INTEGER, defaultValue: 0 },
  score:               { type: DataTypes.FLOAT, allowNull: true },
  timeAllottedSeconds: { type: DataTypes.INTEGER, defaultValue: 3600, field: 'time_allotted_seconds' },
  timeSpentSeconds:    { type: DataTypes.INTEGER, defaultValue: 0, field: 'time_spent_seconds' },
  status:              { type: DataTypes.STRING(20), defaultValue: 'in_progress' },
  answersJson:         { type: DataTypes.JSONB, defaultValue: [], field: 'answers_json' },
  weakTopicsDetected:  { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [], field: 'weak_topics_detected' },
  xpEarned:            { type: DataTypes.INTEGER, defaultValue: 0, field: 'xp_earned' },
  submittedAt:         { type: DataTypes.DATE, allowNull: true, field: 'submitted_at' },
}, {
  sequelize,
  modelName: 'ExamSession',
  tableName: 'exam_sessions',
  timestamps: true,
  underscored: true,
});

module.exports = ExamSession;