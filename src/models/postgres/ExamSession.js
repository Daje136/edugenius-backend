'use strict';
const { DataTypes, Model } = require('sequelize');
const { sequelize }        = require('../../config/postgres');

class ExamSession extends Model {}

ExamSession.init({
  id: {
    type:         DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey:   true,
  },
  userId: {
    type:      DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  examType: {
    type:      DataTypes.ENUM('WAEC', 'JAMB', 'UK_GCSE', 'A_LEVEL', 'PRIMARY', 'AI_GENERATED'),
    allowNull: false,
  },
  subject: {
    type:      DataTypes.STRING(60),
    allowNull: false,
  },
  topic: {
    type:      DataTypes.STRING(100),
    allowNull: true,
  },
  year: {
    type:      DataTypes.INTEGER,
    allowNull: true,
  },
  totalQuestions: {
    type:         DataTypes.INTEGER,
    defaultValue: 0,
  },
  answered: {
    type:         DataTypes.INTEGER,
    defaultValue: 0,
  },
  correct: {
    type:         DataTypes.INTEGER,
    defaultValue: 0,
  },
  score: {
    type:      DataTypes.FLOAT,
    allowNull: true,
  },
  timeAllottedSeconds: {
    type:         DataTypes.INTEGER,
    defaultValue: 3600,
  },
  timeSpentSeconds: {
    type:         DataTypes.INTEGER,
    defaultValue: 0,
  },
  status: {
    type:         DataTypes.ENUM('in_progress', 'submitted', 'abandoned', 'timed_out'),
    defaultValue: 'in_progress',
  },
  answersJson: {
    type:         DataTypes.JSONB,
    defaultValue: [],
    comment:      'Array of { questionId, selected, correct, timeTakenMs }',
  },
  weakTopicsDetected: {
    type:         DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
  },
  xpEarned: {
    type:         DataTypes.INTEGER,
    defaultValue: 0,
  },
  submittedAt: {
    type:      DataTypes.DATE,
    allowNull: true,
  },
}, {
  sequelize,
  modelName:  'ExamSession',
  tableName:  'exam_sessions',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['examType', 'subject'] },
    { fields: ['status'] },
    { fields: ['createdAt'] },
  ],
});

module.exports = ExamSession;
