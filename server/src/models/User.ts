import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document {
  email: string;
  name: string;
  password?: string;
  otp?: string;
  otpExpiry?: Date;
  isVerified: boolean;
  avatar: string;
  balance: {
    deposit: number;
    win: number;
    bonus: number;
  };
  referralCode: string;
  referredBy?: Types.ObjectId;
  referralsCount: number;
  gameStats: {
    played: number;
    won: number;
    lost: number;
  };
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  refreshToken?: string;
  friendId?: string;
  blockedUsers?: Types.ObjectId[];
  lastSeen?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    friendId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    name: {
      type: String,
      default: 'Ludo Master',
      trim: true,
    },
    password: {
      type: String,
    },
    otp: {
      type: String,
    },
    otpExpiry: {
      type: Date,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    avatar: {
      type: String,
      default: 'avatar_1',
    },
    balance: {
      deposit: { type: Number, default: 0, min: 0 },
      win: { type: Number, default: 0, min: 0 },
      bonus: { type: Number, default: 0, min: 0 },
    },
    referralCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    referredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    referralsCount: {
      type: Number,
      default: 0,
    },
    gameStats: {
      played: { type: Number, default: 0 },
      won: { type: Number, default: 0 },
      lost: { type: Number, default: 0 },
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
    },
    refreshToken: {
      type: String,
    },
    blockedUsers: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Pre-save hook to generate unique friendId
UserSchema.pre('save', async function (this: any, next) {
  if (!this.friendId) {
    let unique = false;
    let friendId = '';
    const UserModel = this.constructor as any;
    while (!unique) {
      friendId = 'FR-' + Math.floor(100000 + Math.random() * 900000).toString();
      const existing = await UserModel.findOne({ friendId });
      if (!existing) {
        unique = true;
      }
    }
    this.friendId = friendId;
  }
  next();
});

// Method to sum entire balance helper
UserSchema.virtual('totalBalance').get(function (this: IUser) {
  return this.balance.deposit + this.balance.win + this.balance.bonus;
});

export const User = model<IUser>('User', UserSchema);
export default User;
