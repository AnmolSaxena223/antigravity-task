import { Schema, model, Document, Types } from 'mongoose';

export interface ITransaction extends Document {
  userId: Types.ObjectId;
  type: 'deposit' | 'withdrawal' | 'game_fee' | 'game_win' | 'referral_bonus' | 'cashback';
  amount: number;
  balanceType: 'deposit' | 'win' | 'bonus';
  status: 'pending' | 'completed' | 'failed' | 'rejected';
  paymentGateway: 'razorpay' | 'stripe' | 'system';
  paymentId?: string; // payment id from gateway
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['deposit', 'withdrawal', 'game_fee', 'game_win', 'referral_bonus', 'cashback'],
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01
    },
    balanceType: {
      type: String,
      enum: ['deposit', 'win', 'bonus'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'rejected'],
      default: 'pending',
      index: true
    },
    paymentGateway: {
      type: String,
      enum: ['razorpay', 'stripe', 'system'],
      default: 'system'
    },
    paymentId: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    description: {
      type: String
    }
  },
  { timestamps: true }
);

export const Transaction = model<ITransaction>('Transaction', TransactionSchema);
export default Transaction;
