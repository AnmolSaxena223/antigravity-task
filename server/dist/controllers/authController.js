"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.updateProfile = exports.getProfile = exports.refreshToken = exports.login = exports.verifyEmailOtp = exports.sendEmailOtp = exports.register = void 0;
const User_1 = require("../models/User");
const Referral_1 = require("../models/Referral");
const Transaction_1 = require("../models/Transaction");
const env_1 = require("../config/env");
const security_1 = require("../utils/security");
const emailService_1 = require("../services/emailService");
/**
 * Register User
 */
const register = async (req, res) => {
    try {
        const { name, email, password, referralCode } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email address is required.' });
        }
        const existingUser = await User_1.User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email address is already registered.' });
        }
        // Process referral code if provided
        let referrerUser = null;
        if (referralCode) {
            const codeUpper = referralCode.toUpperCase();
            referrerUser = await User_1.User.findOne({
                $or: [
                    { referralCode: codeUpper },
                    { friendId: codeUpper }
                ]
            });
            if (!referrerUser) {
                return res.status(400).json({ success: false, message: 'Invalid referral code.' });
            }
        }
        // Create new user
        const newUserReferralCode = 'REF' + (0, security_1.generateRandomString)(5);
        const otp = (0, security_1.generateOTP)();
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        const hashedPassword = password ? await (0, security_1.hashPassword)(password) : undefined;
        const user = new User_1.User({
            email: email.toLowerCase(),
            name: name || 'Ludo Player',
            password: hashedPassword,
            otp,
            otpExpiry,
            isVerified: false,
            referralCode: newUserReferralCode,
            referredBy: referrerUser ? referrerUser._id : undefined
        });
        await user.save();
        await (0, emailService_1.sendOTPEmail)(email, otp);
        return res.status(201).json({
            success: true,
            message: 'Registration successful. OTP sent for verification.',
            email
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.register = register;
/**
 * Send OTP to existing / registering user email
 */
const sendEmailOtp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email address is required.' });
        }
        let user = await User_1.User.findOne({ email: email.toLowerCase() });
        // If user doesn't exist, we can register them automatically
        const otp = (0, security_1.generateOTP)();
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
        if (!user) {
            const newUserReferralCode = 'REF' + (0, security_1.generateRandomString)(5);
            user = new User_1.User({
                email: email.toLowerCase(),
                name: email.split('@')[0] || 'Ludo Player',
                otp,
                otpExpiry,
                isVerified: false,
                referralCode: newUserReferralCode
            });
        }
        else {
            user.otp = otp;
            user.otpExpiry = otpExpiry;
        }
        await user.save();
        await (0, emailService_1.sendOTPEmail)(email, otp);
        return res.status(200).json({
            success: true,
            message: 'OTP sent successfully.',
            email
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.sendEmailOtp = sendEmailOtp;
/**
 * Verify Email OTP & Issue Token
 */
const verifyEmailOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
        }
        const user = await User_1.User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        // Verify OTP
        if (!user.otp || user.otp !== otp || !user.otpExpiry || user.otpExpiry < new Date()) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
        }
        const wasVerified = user.isVerified;
        // Mark as verified and clear OTP
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpiry = undefined;
        // Process signup bonuses if verified for first time
        if (!wasVerified) {
            // Credit sign-up bonus (e.g., 20 coins)
            user.balance.bonus += 20;
            // Save user first
            await user.save();
            // Log signup transaction
            await new Transaction_1.Transaction({
                userId: user._id,
                type: 'referral_bonus',
                amount: 20,
                balanceType: 'bonus',
                status: 'completed',
                description: 'Welcome sign-up bonus'
            }).save();
            // If referred, handle referral bonus
            if (user.referredBy) {
                const referrer = await User_1.User.findById(user.referredBy);
                if (referrer) {
                    // Add reward to referrer (e.g., 30 coins)
                    referrer.balance.bonus += 30;
                    referrer.referralsCount += 1;
                    await referrer.save();
                    // Log referrer transaction
                    await new Transaction_1.Transaction({
                        userId: referrer._id,
                        type: 'referral_bonus',
                        amount: 30,
                        balanceType: 'bonus',
                        status: 'completed',
                        description: `Referral bonus for inviting ${user.name}`
                    }).save();
                    // Log referral relationship
                    await new Referral_1.Referral({
                        referrerId: referrer._id,
                        refereeId: user._id,
                        rewardAmount: 30,
                        status: 'completed'
                    }).save();
                }
            }
        }
        else {
            await user.save();
        }
        // Generate JWTs
        const accessToken = (0, security_1.generateAccessToken)({ userId: user._id.toString(), role: user.role });
        const refreshToken = (0, security_1.generateRefreshToken)({ userId: user._id.toString() });
        // Store refresh token in user document
        user.refreshToken = refreshToken;
        await user.save();
        // Set HTTPOnly secure cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: env_1.config.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        return res.status(200).json({
            success: true,
            message: 'OTP verified successfully.',
            accessToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                balance: user.balance,
                referralCode: user.referralCode,
                referralsCount: user.referralsCount,
                gameStats: user.gameStats,
                role: user.role
            }
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.verifyEmailOtp = verifyEmailOtp;
/**
 * Standard password login
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }
        const user = await User_1.User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        if (!user.isVerified) {
            return res.status(403).json({ success: false, message: 'Account not verified. Please request OTP.' });
        }
        if (user.status === 'suspended') {
            return res.status(403).json({ success: false, message: 'Your account is suspended. Contact support.' });
        }
        if (!user.password) {
            return res.status(400).json({ success: false, message: 'No password set. Login via OTP.' });
        }
        const isMatch = await (0, security_1.verifyPassword)(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid password.' });
        }
        // Generate JWTs
        const accessToken = (0, security_1.generateAccessToken)({ userId: user._id.toString(), role: user.role });
        const refreshToken = (0, security_1.generateRefreshToken)({ userId: user._id.toString() });
        user.refreshToken = refreshToken;
        await user.save();
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: env_1.config.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        return res.status(200).json({
            success: true,
            message: 'Login successful.',
            accessToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                balance: user.balance,
                referralCode: user.referralCode,
                referralsCount: user.referralsCount,
                gameStats: user.gameStats,
                role: user.role
            }
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.login = login;
/**
 * Refresh JWT token
 */
const refreshToken = async (req, res) => {
    try {
        const token = req.cookies.refreshToken || req.body.refreshToken;
        if (!token) {
            return res.status(401).json({ success: false, message: 'Refresh token not found.' });
        }
        const decoded = (0, security_1.verifyRefreshToken)(token);
        if (!decoded) {
            return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
        }
        const user = await User_1.User.findById(decoded.userId);
        if (!user || user.refreshToken !== token) {
            return res.status(401).json({ success: false, message: 'User or token mismatch.' });
        }
        if (user.status === 'suspended') {
            return res.status(403).json({ success: false, message: 'Account suspended.' });
        }
        const newAccessToken = (0, security_1.generateAccessToken)({ userId: user._id.toString(), role: user.role });
        const newRefreshToken = (0, security_1.generateRefreshToken)({ userId: user._id.toString() });
        user.refreshToken = newRefreshToken;
        await user.save();
        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: env_1.config.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        return res.status(200).json({
            success: true,
            accessToken: newAccessToken
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.refreshToken = refreshToken;
/**
 * Get User Profile
 */
const getProfile = async (req, res) => {
    try {
        const user = await User_1.User.findById(req.user?.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        return res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                balance: user.balance,
                referralCode: user.referralCode,
                referralsCount: user.referralsCount,
                gameStats: user.gameStats,
                role: user.role
            }
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getProfile = getProfile;
/**
 * Update Profile details
 */
const updateProfile = async (req, res) => {
    try {
        const { name, avatar, email } = req.body;
        const user = await User_1.User.findById(req.user?.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        if (name)
            user.name = name;
        if (avatar)
            user.avatar = avatar;
        if (email)
            user.email = email;
        await user.save();
        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully.',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                balance: user.balance,
                referralCode: user.referralCode,
                referralsCount: user.referralsCount,
                gameStats: user.gameStats,
                role: user.role
            }
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateProfile = updateProfile;
/**
 * Logout
 */
const logout = async (req, res) => {
    try {
        const user = await User_1.User.findById(req.user?.userId);
        if (user) {
            user.refreshToken = undefined;
            await user.save();
        }
        res.clearCookie('refreshToken');
        return res.status(200).json({ success: true, message: 'Logged out successfully.' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.logout = logout;
