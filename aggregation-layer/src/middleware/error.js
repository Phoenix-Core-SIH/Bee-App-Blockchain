function errorHandler(err, req, res, next) {
  console.error('[Aggregation Layer Error]', err.stack);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error'
  });
}

module.exports = { errorHandler };
