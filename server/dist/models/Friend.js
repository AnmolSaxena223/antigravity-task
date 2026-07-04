"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Friend = void 0;
const mongoose_1 = require("mongoose");
const FriendSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    friend: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });
// Compound index for fast lookup of exact friendships
FriendSchema.index({ user: 1, friend: 1 }, { unique: true });
exports.Friend = (0, mongoose_1.model)('Friend', FriendSchema);
exports.default = exports.Friend;
