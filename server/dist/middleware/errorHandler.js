"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.AppError = void 0;
const env_1 = require("../config/env");
class AppError extends Error {
    statusCode;
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        Object.setPrototypeOf(this, new Target().constructor); // restore prototype chain
    }
}
exports.AppError = AppError;
// Target helper for AppError prototype chain restoration
class Target {
}
/**
 * Express Global Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    // Log error stack trace internally
    console.error(`[Error Handler] ${err.stack || err}`);
    res.status(statusCode).json({
        success: false,
        message,
        stack: env_1.config.NODE_ENV === 'development' ? err.stack : undefined
    });
};
exports.errorHandler = errorHandler;
