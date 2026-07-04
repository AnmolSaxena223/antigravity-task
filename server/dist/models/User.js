"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = require("mongoose");
const UserSchema = new mongoose_1.Schema({
    phone: {
        type: String,
        required: true,
        unique: true,
        trim: true,
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
    email: {
        type: String,
        unique: true,
        sparse: true, // Allow multiple nulls/undefineds
        trim: true,
        lowercase: true,
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
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
        default: [],
    },
    lastSeen: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });
// Pre-save hook to generate unique friendId
UserSchema.pre('save', async function (next) {
    if (!this.friendId) {
        let unique = false;
        let friendId = '';
        const UserModel = this.constructor;
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
UserSchema.virtual('totalBalance').get(function () {
    return this.balance.deposit + this.balance.win + this.balance.bonus;
});
exports.User = (0, mongoose_1.model)('User', UserSchema);
exports.default = exports.User;
