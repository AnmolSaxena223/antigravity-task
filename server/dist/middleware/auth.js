"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeAdmin = exports.authenticateJWT = void 0;
const security_1 = require("../utils/security");
/**
 * Middleware to authenticate requests via JWT access token.
 */
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    let token = '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }
    else if (req.cookies && req.cookies.accessToken) {
        token = req.cookies.accessToken;
    }
    if (!token) {
        return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }
    const decoded = (0, security_1.verifyAccessToken)(token);
    if (!decoded) {
        return res.status(401).json({ success: false, message: 'Invalid or expired access token.' });
    }
    req.user = {
        userId: decoded.userId,
        role: decoded.role,
    };
    next();
};
exports.authenticateJWT = authenticateJWT;
/**
 * Middleware to restrict access to admin users only.
 */
const authorizeAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(430).json({ success: false, message: 'Forbidden. Access restricted to administrators only.' });
    }
    next();
};
exports.authorizeAdmin = authorizeAdmin;
