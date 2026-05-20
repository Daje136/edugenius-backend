'use strict';
const AppError = require('../utils/AppError');

const errorHandler = (err, req, res, next) => {
  console.error("?? ERROR:", err.message);
  console.error(err.stack);
  err.statusCode = err.statusCode || 500;
  err.status     = err.status     || 'error';

  res.status(err.statusCode).json({
    success: false,
    message: err.message || 'Something went wrong',
  });
};

module.exports = errorHandler;
module.exports.AppError = AppError;
