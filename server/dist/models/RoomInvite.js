"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomInvite = void 0;
const mongoose_1 = require("mongoose");
const RoomInviteSchema = new mongoose_1.Schema({
    roomId: { type: String, required: true, index: true },
    inviterId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    inviteeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending', index: true }
}, { timestamps: true });
// Prevent duplicate pending/active invites for the same room to the same user
RoomInviteSchema.index({ roomId: 1, inviteeId: 1 }, { unique: true });
exports.RoomInvite = (0, mongoose_1.model)('RoomInvite', RoomInviteSchema);
exports.default = exports.RoomInvite;
