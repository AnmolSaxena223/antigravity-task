"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlatformGames = exports.rejectWithdrawal = exports.approveWithdrawal = exports.getWithdrawals = exports.adjustUserBalance = exports.updateUserStatus = exports.getUsers = exports.getDashboardStats = void 0;
const User_1 = require("../models/User");
const GameSession_1 = require("../models/GameSession");
const Transaction_1 = require("../models/Transaction");
/**
 * Get Admin Dashboard Overview Statistics
 */
const getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User_1.User.countDocuments({ role: 'user' });
        const totalGames = await GameSession_1.GameSession.countDocuments();
        const activeGames = await GameSession_1.GameSession.countDocuments({ status: 'active' });
        // Aggregate transactions
        const deposits = await Transaction_1.Transaction.aggregate([
            { $match: { type: 'deposit', status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const withdrawals = await Transaction_1.Transaction.aggregate([
            { $match: { type: 'withdrawal', status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const pendingWithdrawalsCount = await Transaction_1.Transaction.countDocuments({
            type: 'withdrawal',
            status: 'pending'
        });
        // Commission aggregate (10% commission on entry fee game sessions)
        const gamesCompleted = await GameSession_1.GameSession.find({ status: 'completed' });
        let platformRevenue = 0;
        gamesCompleted.forEach(game => {
            const totalFeesCollected = game.entryFee * game.players.length;
            platformRevenue += (totalFeesCollected - game.prizePool);
        });
        return res.status(200).json({
            success: true,
            stats: {
                totalUsers,
                totalGames,
                activeGames,
                totalDeposits: deposits[0]?.total || 0,
                totalWithdrawals: withdrawals[0]?.total || 0,
                pendingWithdrawalsCount,
                platformRevenue
            }
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getDashboardStats = getDashboardStats;
/**
 * Get paginated list of users
 */
const getUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '10', 10);
        const skip = (page - 1) * limit;
        const users = await User_1.User.find({ role: 'user' })
            .select('-password -otp -refreshToken')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const total = await User_1.User.countDocuments({ role: 'user' });
        return res.status(200).json({
            success: true,
            users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getUsers = getUsers;
/**
 * Toggle user status (active / suspended)
 */
const updateUserStatus = async (req, res) => {
    try {
        const { userId, status } = req.body;
        if (!userId || !['active', 'suspended'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid payload parameters.' });
        }
        const user = await User_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        user.status = status;
        await user.save();
        return res.status(200).json({
            success: true,
            message: `User accounts status updated to ${status}.`,
            user: { id: user._id, name: user.name, status: user.status }
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateUserStatus = updateUserStatus;
/**
 * Manually adjusts user balance (Admin Credit / Debit for disputes)
 */
const adjustUserBalance = async (req, res) => {
    try {
        const { userId, type, amount, balanceType, reason } = req.body;
        if (!userId || !amount || amount <= 0 || !['credit', 'debit'].includes(type) || !['deposit', 'win', 'bonus'].includes(balanceType)) {
            return res.status(400).json({ success: false, message: 'Invalid adjustment parameters.' });
        }
        const user = await User_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        const multiplier = type === 'credit' ? 1 : -1;
        const balanceKey = `balance.${balanceType}`;
        if (type === 'debit' && user.balance[balanceType] < amount) {
            return res.status(400).json({ success: false, message: 'User has insufficient balance for this debit.' });
        }
        // Atomically increment balance
        await User_1.User.findByIdAndUpdate(userId, {
            $inc: { [balanceKey]: amount * multiplier }
        });
        // Create adjustment transaction log
        const transaction = new Transaction_1.Transaction({
            userId: user._id,
            type: balanceType === 'bonus' ? 'referral_bonus' : (type === 'credit' ? 'game_win' : 'game_fee'),
            amount,
            balanceType: balanceType,
            status: 'completed',
            paymentGateway: 'system',
            description: `Admin manual ${type}: ${reason || 'Customer Support Dispute Adjustment'}`
        });
        await transaction.save();
        const updatedUser = await User_1.User.findById(userId);
        return res.status(200).json({
            success: true,
            message: 'Wallet balance adjusted successfully.',
            balance: updatedUser?.balance
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.adjustUserBalance = adjustUserBalance;
/**
 * Get withdrawal request ledger
 */
const getWithdrawals = async (req, res) => {
    try {
        const status = req.query.status; // pending, completed, rejected
        const filter = { type: 'withdrawal' };
        if (status) {
            filter.status = status;
        }
        const withdrawals = await Transaction_1.Transaction.find(filter)
            .populate('userId', 'name email balance')
            .sort({ createdAt: -1 });
        return res.status(200).json({ success: true, withdrawals });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getWithdrawals = getWithdrawals;
/**
 * Approve Payout Withdrawal request
 */
const approveWithdrawal = async (req, res) => {
    try {
        const { transactionId } = req.body;
        const transaction = await Transaction_1.Transaction.findById(transactionId);
        if (!transaction || transaction.type !== 'withdrawal') {
            return res.status(404).json({ success: false, message: 'Withdrawal transaction request not found.' });
        }
        if (transaction.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Request is already processed.' });
        }
        // Complete withdrawal
        transaction.status = 'completed';
        await transaction.save();
        console.log(`[Admin Wallet] Withdrawal request ${transactionId} approved.`);
        return res.status(200).json({
            success: true,
            message: 'Withdrawal approved successfully.',
            transaction
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.approveWithdrawal = approveWithdrawal;
/**
 * Reject Payout Withdrawal (Refunds user's win wallet)
 */
const rejectWithdrawal = async (req, res) => {
    try {
        const { transactionId, reason } = req.body;
        const transaction = await Transaction_1.Transaction.findById(transactionId);
        if (!transaction || transaction.type !== 'withdrawal') {
            return res.status(404).json({ success: false, message: 'Withdrawal transaction request not found.' });
        }
        if (transaction.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Request is already processed.' });
        }
        // Reject transaction
        transaction.status = 'rejected';
        transaction.description = `${transaction.description} | Rejected reason: ${reason || 'Unspecified'}`;
        await transaction.save();
        // Refund the user's winning wallet atomically
        await User_1.User.findByIdAndUpdate(transaction.userId, {
            $inc: { 'balance.win': transaction.amount }
        });
        console.log(`[Admin Wallet] Withdrawal request ${transactionId} rejected. Funds refunded.`);
        return res.status(200).json({
            success: true,
            message: 'Withdrawal rejected and balance refunded successfully.',
            transaction
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.rejectWithdrawal = rejectWithdrawal;
/**
 * Fetch platform game logs
 */
const getPlatformGames = async (req, res) => {
    try {
        const games = await GameSession_1.GameSession.find()
            .populate('players.userId', 'name avatar')
            .populate('winner', 'name')
            .sort({ createdAt: -1 })
            .limit(30);
        return res.status(200).json({ success: true, games });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getPlatformGames = getPlatformGames;
