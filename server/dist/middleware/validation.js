"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateWithdraw = exports.validateDeposit = exports.validateVerifyOtp = exports.validateLogin = exports.validateRegister = void 0;
const validateRegister = (req, res, next) => {
    const { name, email, password } = req.body;
    if (!name || name.trim().length < 2) {
        return res.status(400).json({ success: false, message: 'Name must be at least 2 characters long.' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing email address.' });
    }
    if (!password || password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }
    next();
};
exports.validateRegister = validateRegister;
const validateLogin = (req, res, next) => {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing email address.' });
    }
    next();
};
exports.validateLogin = validateLogin;
const validateVerifyOtp = (req, res, next) => {
    const { email, otp } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing email address.' });
    }
    if (!otp || !/^\d{6}$/.test(otp)) {
        return res.status(400).json({ success: false, message: 'OTP must be a 6-digit number.' });
    }
    next();
};
exports.validateVerifyOtp = validateVerifyOtp;
const validateDeposit = (req, res, next) => {
    const { amount } = req.body;
    if (amount === undefined || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Amount must be a positive number.' });
    }
    next();
};
exports.validateDeposit = validateDeposit;
const validateWithdraw = (req, res, next) => {
    const { amount } = req.body;
    if (amount === undefined || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Amount must be a positive number.' });
    }
    next();
};
exports.validateWithdraw = validateWithdraw;
