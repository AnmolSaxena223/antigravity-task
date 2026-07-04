import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { User } from '../models/User';
import { GameSession } from '../models/GameSession';
import { Transaction } from '../models/Transaction';
import { Setting } from '../models/Setting';

/**
 * Get Admin Dashboard Overview Statistics
 */
export const getDashboardStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalGames = await GameSession.countDocuments();
    const activeGames = await GameSession.countDocuments({ status: 'active' });

    // Aggregate transactions
    const deposits = await Transaction.aggregate([
      { $match: { type: 'deposit', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const withdrawals = await Transaction.aggregate([
      { $match: { type: 'withdrawal', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const pendingWithdrawalsCount = await Transaction.countDocuments({
      type: 'withdrawal',
      status: 'pending'
    });

    // Commission aggregate (10% commission on entry fee game sessions)
    const gamesCompleted = await GameSession.find({ status: 'completed' });
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
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get paginated list of users
 */
export const getUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '10', 10);
    const skip = (page - 1) * limit;

    const users = await User.find({ role: 'user' })
      .select('-password -otp -refreshToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments({ role: 'user' });

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
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Toggle user status (active / suspended)
 */
export const updateUserStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, status } = req.body;
    if (!userId || !['active', 'suspended'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid payload parameters.' });
    }

    const user = await User.findById(userId);
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
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Manually adjusts user balance (Admin Credit / Debit for disputes)
 */
export const adjustUserBalance = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, type, amount, balanceType, reason } = req.body;
    if (!userId || !amount || amount <= 0 || !['credit', 'debit'].includes(type) || !['deposit', 'win', 'bonus'].includes(balanceType)) {
      return res.status(400).json({ success: false, message: 'Invalid adjustment parameters.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const multiplier = type === 'credit' ? 1 : -1;
    const balanceKey = `balance.${balanceType}`;

    if (type === 'debit' && user.balance[balanceType as 'deposit' | 'win' | 'bonus'] < amount) {
      return res.status(400).json({ success: false, message: 'User has insufficient balance for this debit.' });
    }

    // Atomically increment balance
    await User.findByIdAndUpdate(userId, {
      $inc: { [balanceKey]: amount * multiplier }
    });

    // Create adjustment transaction log
    const transaction = new Transaction({
      userId: user._id,
      type: balanceType === 'bonus' ? 'referral_bonus' : (type === 'credit' ? 'game_win' : 'game_fee'),
      amount,
      balanceType: balanceType as any,
      status: 'completed',
      paymentGateway: 'system',
      description: `Admin manual ${type}: ${reason || 'Customer Support Dispute Adjustment'}`
    });
    await transaction.save();

    const updatedUser = await User.findById(userId);

    return res.status(200).json({
      success: true,
      message: 'Wallet balance adjusted successfully.',
      balance: updatedUser?.balance
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get withdrawal request ledger
 */
export const getWithdrawals = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = req.query.status as string; // pending, completed, rejected
    const filter: any = { type: 'withdrawal' };
    if (status) {
      filter.status = status;
    }

    const withdrawals = await Transaction.find(filter)
      .populate('userId', 'name phone email balance')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, withdrawals });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Approve Payout Withdrawal request
 */
export const approveWithdrawal = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { transactionId } = req.body;
    const transaction = await Transaction.findById(transactionId);
    
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
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Reject Payout Withdrawal (Refunds user's win wallet)
 */
export const rejectWithdrawal = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { transactionId, reason } = req.body;
    const transaction = await Transaction.findById(transactionId);
    
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
    await User.findByIdAndUpdate(transaction.userId, {
      $inc: { 'balance.win': transaction.amount }
    });

    console.log(`[Admin Wallet] Withdrawal request ${transactionId} rejected. Funds refunded.`);
    return res.status(200).json({
      success: true,
      message: 'Withdrawal rejected and balance refunded successfully.',
      transaction
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Fetch platform game logs
 */
export const getPlatformGames = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const games = await GameSession.find()
      .populate('players.userId', 'name avatar')
      .populate('winner', 'name')
      .sort({ createdAt: -1 })
      .limit(30);

    return res.status(200).json({ success: true, games });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
