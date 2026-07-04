"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FriendRequest = void 0;
const mongoose_1 = require("mongoose");
const FriendRequestSchema = new mongoose_1.Schema({
    sender: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    receiver: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending', index: true }
}, { timestamps: true });
// One active request at a time between two users
FriendRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true });
exports.FriendRequest = (0, mongoose_1.model)('FriendRequest', FriendRequestSchema);
exports.default = exports.FriendRequest;
