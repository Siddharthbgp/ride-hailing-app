const logger = require('../lib/logger');

class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}

function errorHandler(err, req, res, next) {
    let error = { ...err };
    error.message = err.message;
    error.statusCode = err.statusCode || 500;

    // Log error
    logger.error('Error occurred', {
        message: error.message,
        statusCode: error.statusCode,
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: req.body,
        params: req.params
    });

    // Prisma errors
    if (err.code === 'P2002') {
        error.message = 'Duplicate entry found';
        error.statusCode = 409;
    }
    if (err.code === 'P2025') {
        error.message = 'Record not found';
        error.statusCode = 404;
    }

    // Validation errors
    if (err.name === 'ValidationError') {
        error.statusCode = 400;
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        error.message = 'Invalid token';
        error.statusCode = 401;
    }
    if (err.name === 'TokenExpiredError') {
        error.message = 'Token expired';
        error.statusCode = 401;
    }

    // Send response
    res.status(error.statusCode).json({
        error: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
}

// Async handler wrapper
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

module.exports = {
    AppError,
    errorHandler,
    asyncHandler
};
