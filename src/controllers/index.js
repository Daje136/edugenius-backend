'use strict';
const auth = require('./authController');
const user = require('./userController');

module.exports = {
  register:         auth.register,
  login:            auth.login,
  refresh:          auth.refresh,
  logout:           auth.logout,
  forgotPassword:   auth.forgotPassword,
  resetPassword:    auth.resetPassword,
  getMe:            auth.getMe,
  getProfile:       user.getProfile,
  updateProfile:    user.updateProfile,
  changePassword:   user.changePassword,
  createGoal:       user.createGoal,
  getMyGoal:        user.getMyGoal,
  updateGoal:       user.updateGoal,
  createAssignment: user.createAssignment,
  getAssignments:   user.getAssignments,
  getAssignment:    user.getAssignment,
  submitAssignment: user.submitAssignment,
  getSubmissions:   user.getSubmissions,
  gradeSubmission:  user.gradeSubmission,
  listResources:    user.listResources,
  getResource:      user.getResource,
  createResource:   user.createResource,
  getNotifications: user.getNotifications,
  markRead:         user.markRead,
  listUsers:        user.listUsers,
  updateUser:       user.updateUser,
  deleteUser:       user.deleteUser,
  sendAnnouncement: user.sendAnnouncement,
}; 
