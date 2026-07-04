"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transaction = void 0;
const mongoose_1 = require("mongoose");
const TransactionSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
}, { timestamps: true });
exports.Transaction = (0, mongoose_1.model)('Transaction', TransactionSchema);
exports.default = exports.Transaction;
