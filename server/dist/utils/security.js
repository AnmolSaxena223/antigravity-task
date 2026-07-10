"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRandomString = exports.generateOTP = exports.verifyRefreshToken = exports.verifyAccessToken = exports.generateRefreshToken = exports.generateAccessToken = exports.verifyPassword = exports.hashPassword = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../config/env");
const BCRYPT_SALT_ROUNDS = 10;
/**
 * Hash a plain text password.
 */
const hashPassword = async (password) => {
    return bcryptjs_1.default.hash(password, BCRYPT_SALT_ROUNDS);
};
exports.hashPassword = hashPassword;
/**
 * Verify a plain text password against a hash.
 */
const verifyPassword = async (password, hash) => {
    return bcryptjs_1.default.compare(password, hash);
};
exports.verifyPassword = verifyPassword;
/**
 * Generate a JWT Access Token.
 */
const generateAccessToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, env_1.config.JWT_SECRET, { expiresIn: '15m' });
};
exports.generateAccessToken = generateAccessToken;
/**
 * Generate a JWT Refresh Token.
 */
const generateRefreshToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, env_1.config.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};
exports.generateRefreshToken = generateRefreshToken;
/**
 * Verify JWT Access Token.
 */
const verifyAccessToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, env_1.config.JWT_SECRET);
    }
    catch (error) {
        return null;
    }
};
exports.verifyAccessToken = verifyAccessToken;
/**
 * Verify JWT Refresh Token.
 */
const verifyRefreshToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, env_1.config.JWT_REFRESH_SECRET);
    }
    catch (error) {
        return null;
    }
};
exports.verifyRefreshToken = verifyRefreshToken;
/**
 * Generate a cryptographically secure 6-digit numeric OTP.
 */
const generateOTP = () => {
    const val = crypto_1.default.randomInt(100000, 999999);
    return val.toString();
};
exports.generateOTP = generateOTP;
/**
 * Generate a secure random alphanumeric string (for referral codes, payment IDs etc.).
 */
const generateRandomString = (length = 8) => {
    return crypto_1.default.randomBytes(Math.ceil(length / 2))
        .toString('hex')
        .slice(0, length)
        .toUpperCase();
};
exports.generateRandomString = generateRandomString;
