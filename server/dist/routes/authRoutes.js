"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController = __importStar(require("../controllers/authController"));
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
// Rate limited auth endpoints
router.post('/register', rateLimiter_1.authLimiter, validation_1.validateRegister, authController.register);
router.post('/send-email-otp', rateLimiter_1.authLimiter, validation_1.validateLogin, authController.sendEmailOtp);
router.post('/verify-email-otp', rateLimiter_1.authLimiter, validation_1.validateVerifyOtp, authController.verifyEmailOtp);
router.post('/login', rateLimiter_1.authLimiter, validation_1.validateLogin, authController.login);
router.post('/refresh-token', authController.refreshToken);
// Protected profile endpoints
router.get('/profile', auth_1.authenticateJWT, authController.getProfile);
router.put('/profile', auth_1.authenticateJWT, authController.updateProfile);
router.post('/logout', auth_1.authenticateJWT, authController.logout);
exports.default = router;
