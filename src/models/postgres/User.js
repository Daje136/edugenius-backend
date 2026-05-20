'use strict';
const { DataTypes, Model } = require('sequelize');
const bcrypt               = require('bcryptjs');
const { sequelize }        = require('../../config/postgres');

class User extends Model {
  async comparePassword(candidate) {
    return bcrypt.compare(candidate, this.password);
  }

  toSafeJSON() {
    const obj = this.toJSON();
    delete obj.password;
    delete obj.refreshToken;
    return obj;
  }
}

User.init({
  id: {
    type:         DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey:   true,
  },
  firstName: {
    type:      DataTypes.STRING(50),
    allowNull: false,
    validate:  { len: [2, 50] },
  },
  lastName: {
    type:      DataTypes.STRING(50),
    allowNull: false,
    validate:  { len: [2, 50] },
  },
  email: {
    type:      DataTypes.STRING(255),
    allowNull: false,
    unique:    true,
    validate:  { isEmail: true },
  },
  password: {
    type:      DataTypes.STRING(255),
    allowNull: false,
  },
  role: {
    type:         DataTypes.ENUM('student', 'teacher', 'admin'),
    defaultValue: 'student',
  },
  isActive: {
    type:         DataTypes.BOOLEAN,
    defaultValue: true,
  },
  isEmailVerified: {
    type:         DataTypes.BOOLEAN,
    defaultValue: false,
  },
  schoolId: {
    type:      DataTypes.UUID,
    allowNull: true,
  },
  classLevel: {
    type:      DataTypes.STRING(20),
    allowNull: true,
  },
  examTarget: {
    type:      DataTypes.ENUM('WAEC', 'JAMB', 'UK_GCSE', 'A_LEVEL', 'BOTH'),
    allowNull: true,
  },
  curriculum: {
    type:         DataTypes.ENUM('NG', 'UK', 'BOTH'),
    defaultValue: 'NG',
  },
  streakDays: {
    type:         DataTypes.INTEGER,
    defaultValue: 0,
  },
  lastActiveAt: {
    type:         DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  xpPoints: {
    type:         DataTypes.INTEGER,
    defaultValue: 0,
  },
  xpLevel: {
    type:         DataTypes.INTEGER,
    defaultValue: 1,
  },
  avatarUrl: {
    type:      DataTypes.STRING(500),
    allowNull: true,
  },
  refreshToken: {
    type:      DataTypes.TEXT,
    allowNull: true,
  },
  passwordResetToken: {
    type:      DataTypes.STRING(255),
    allowNull: true,
  },
  passwordResetExpires: {
    type:      DataTypes.DATE,
    allowNull: true,
  },
}, {
  sequelize,
  modelName:  'User',
  tableName:  'users',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      user.password = await bcrypt.hash(user.password, 12);
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
  },
  indexes: [
    { unique: true, fields: ['email'] },
    { fields: ['schoolId'] },
    { fields: ['role'] },
  ],
});

module.exports = User;
