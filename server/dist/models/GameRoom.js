"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRoom = void 0;
const mongoose_1 = require("mongoose");
const RoomPlayerSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    avatar: { type: String, required: true },
    color: { type: String, enum: ['red', 'green', 'yellow', 'blue'], required: true },
    isReady: { type: Boolean, default: false }
}, { _id: false });
const GameRoomSchema = new mongoose_1.Schema({
    roomId: { type: String, required: true, unique: true, index: true },
    hostId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    players: { type: [RoomPlayerSchema], default: [] },
    entryFee: { type: Number, default: 0 },
    maxPlayers: { type: Number, default: 4 },
    status: { type: String, enum: ['waiting', 'active', 'completed', 'cancelled'], default: 'waiting' },
    gameSessionId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'GameSession' }
}, { timestamps: true });
exports.GameRoom = (0, mongoose_1.model)('GameRoom', GameRoomSchema);
exports.default = exports.GameRoom;
