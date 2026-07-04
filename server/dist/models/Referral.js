"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Referral = void 0;
const mongoose_1 = require("mongoose");
const ReferralSchema = new mongoose_1.Schema({
    referrerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    refereeId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
}, { timestamps: true });
exports.Referral = (0, mongoose_1.model)('Referral', ReferralSchema);
exports.default = exports.Referral;
