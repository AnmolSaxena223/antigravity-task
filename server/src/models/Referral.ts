import { Schema, model, Document, Types } from 'mongoose';

export interface IReferral extends Document {
  referrerId: Types.ObjectId;
  refereeId: Types.ObjectId;
  rewardAmount: number;
  status: 'pending' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

const ReferralSchema = new Schema<IReferral>(
  {
    referrerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    refereeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // A user can only be referred once
      index: true
    },
    rewardAmount: {
      type: Number,
      required: true,
      default: 10
    },
    status: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'completed'
    }
  },
  { timestamps: true }
);

export const Referral = model<IReferral>('Referral', ReferralSchema);
export default Referral;
