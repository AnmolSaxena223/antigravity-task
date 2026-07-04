"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authLimiter = exports.apiLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
/**
 * General API Rate Limiter
 * Limits requests to 100 per 15 minutes
 */
exports.apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false
});
/**
 * Authentication and OTP Rate Limiter
 * Limits requests to 5 per minute (to prevent brute forcing of OTPs / spamming SMS)
 */
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 5,
    message: {
        success: false,
        message: 'Too many authentication attempts. Please try again in a minute.'
    },
    standardHeaders: true,
    legacyHeaders: false
});
