'use strict';
const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/postgres');
class Question extends Model {}
Question.init({
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  examType:       { type: DataTypes.STRING(20), allowNull: false, field: 'exam_type' },
  subject:        { type: DataTypes.STRING(100), allowNull: false },
  topic:          { type: DataTypes.STRING(100), allowNull: true },
  year:           { type: DataTypes.INTEGER, allowNull: true },
  type:           { type: DataTypes.STRING(20), defaultValue: 'MCQ' },
  body:           { type: DataTypes.TEXT, allowNull: false },
  options:        { type: DataTypes.ARRAY(DataTypes.TEXT), defaultValue: [] },
  answerIndex:    { type: DataTypes.INTEGER, allowNull: true, field: 'answer_index' },
  workedSolution: { type: DataTypes.TEXT, allowNull: true, field: 'worked_solution' },
  difficulty:     { type: DataTypes.INTEGER, defaultValue: 3 },
  curriculum:     { type: DataTypes.STRING(10), defaultValue: 'NG' },
  tags:           { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  isApproved:     { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_approved' },
  createdBy:      { type: DataTypes.UUID, allowNull: true, field: 'created_by' },
}, {
  sequelize, modelName: 'Question', tableName: 'questions', underscored: true, timestamps: true,
});
module.exports = Question;
