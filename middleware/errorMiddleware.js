const errorMiddleware = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
  
    // Mongoose duplicate key error
    if (err.code === 11000) {
      statusCode = 400;
      const field = Object.keys(err.keyValue)[0];
      message = `Duplicate value for field: ${field}`;
    }
  
    // Mongoose validation error
    if (err.name === 'ValidationError') {
      statusCode = 400;
      message = Object.values(err.errors)
        .map((e) => e.message)
        .join(', ');
    }
  
    // Mongoose CastError
    if (err.name === 'CastError') {
      statusCode = 400;
      message = `Invalid value for field: ${err.path}`;
    }
  
    res.status(statusCode).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  };
  
  module.exports = errorMiddleware;