import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { config } from '../config/env';
import crypto from 'crypto';
import Razorpay from 'razorpay';

/**
 * Get Wallet Config (Public key for Razorpay checkout)
 */
export const getWalletConfig = async (req: AuthenticatedRequest, res: Response) => {
  try {
    return res.status(200).json({
      success: true,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || ''
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Wallet Balance & Transaction History
 */
export const getWalletData = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const transactions = await Transaction.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(50); // increased limit to support better transaction tracking

    return res.status(200).json({
      success: true,
      balance: user.balance,
      transactions
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Fetch detailed transaction history (GET /wallet/history)
 */
export const getWalletHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const transactions = await Transaction.find({ userId: user._id })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      transactions
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Submits withdrawal request (Debits win balance immediately and puts request in pending state)
 */
export const withdrawMoney = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { amount, bankDetails } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid withdrawal amount.' });
    }

    const user = await User.findById(req.user?.userId);
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

    const transactionId = 'WD' + crypto.randomBytes(6).toString('hex').toUpperCase();

    const transaction = new Transaction({
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
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
