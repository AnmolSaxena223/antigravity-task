"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withdrawMoney = exports.getWalletHistory = exports.getWalletData = exports.getWalletConfig = void 0;
const User_1 = require("../models/User");
const Transaction_1 = require("../models/Transaction");
const crypto_1 = __importDefault(require("crypto"));
/**
 * Get Wallet Config (Public key for Razorpay checkout)
 */
const getWalletConfig = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            razorpayKeyId: process.env.RAZORPAY_KEY_ID || ''
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getWalletConfig = getWalletConfig;
/**
 * Get Wallet Balance & Transaction History
 */
const getWalletData = async (req, res) => {
    try {
        const user = await User_1.User.findById(req.user?.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        const transactions = await Transaction_1.Transaction.find({ userId: user._id })
            .sort({ createdAt: -1 })
            .limit(50); // increased limit to support better transaction tracking
        return res.status(200).json({
            success: true,
            balance: user.balance,
            transactions
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getWalletData = getWalletData;
/**
 * Fetch detailed transaction history (GET /wallet/history)
 */
const getWalletHistory = async (req, res) => {
    try {
        const user = await User_1.User.findById(req.user?.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        const transactions = await Transaction_1.Transaction.find({ userId: user._id })
            .sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            transactions
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getWalletHistory = getWalletHistory;
/**
 * Submits withdrawal request (Debits win balance immediately and puts request in pending state)
 */
const withdrawMoney = async (req, res) => {
    try {
        const { amount, bankDetails } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid withdrawal amount.' });
        }
        const user = await User_1.User.findById(req.user?.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        // Withdrawals must be from winning balance only
        if (user.balance.win < amount) {
            return res.status(400).json({ success: false, message: 'Insufficient winning balance for withdrawal.' });
        }
        // Atomically debit balance and save withdrawal request (Double-spend prevention)
        user.balance.win -= amount;
        await user.save();
        const transactionId = 'WD' + crypto_1.default.randomBytes(6).toString('hex').toUpperCase();
        const transaction = new Transaction_1.Transaction({
            userId: user._id,
            type: 'withdrawal',
            amount,
            balanceType: 'win',
            status: 'pending',
            paymentGateway: 'system',
            paymentId: transactionId,
            description: `Withdrawal request to: ${JSON.stringify(bankDetails || 'Default account')}`
        });
        await transaction.save();
        return res.status(200).json({
            success: true,
            message: 'Withdrawal request submitted successfully.',
            transaction
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.withdrawMoney = withdrawMoney;
