"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameInvite = void 0;
const mongoose_1 = require("mongoose");
const GameInviteSchema = new mongoose_1.Schema({
    roomId: { type: String, required: true, index: true },
    inviter: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    invitee: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending', index: true }
}, { timestamps: true });
// Prevent duplicate active invites for the same room to the same user
GameInviteSchema.index({ roomId: 1, invitee: 1 }, { unique: true });
exports.GameInvite = (0, mongoose_1.model)('GameInvite', GameInviteSchema);
exports.default = exports.GameInvite;
