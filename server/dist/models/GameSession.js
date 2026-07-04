"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameSession = void 0;
const mongoose_1 = require("mongoose");
const PlayerTokenSchema = new mongoose_1.Schema({
    id: { type: Number, required: true },
    position: { type: Number, default: -1 }, // -1 is base
    isSafe: { type: Boolean, default: true }
}, { _id: false });
const GamePlayerSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    avatar: { type: String, required: true },
    color: { type: String, enum: ['red', 'green', 'yellow', 'blue'], required: true },
    isReady: { type: Boolean, default: false },
    isDisconnected: { type: Boolean, default: false },
    tokens: {
        type: [PlayerTokenSchema],
        default: () => [
            { id: 0, position: -1, isSafe: true },
            { id: 1, position: -1, isSafe: true },
            { id: 2, position: -1, isSafe: true },
            { id: 3, position: -1, isSafe: true }
        ]
    },
    skipCount: { type: Number, default: 0 }
}, { _id: false });
const MoveRecordSchema = new mongoose_1.Schema({
    playerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    color: { type: String, required: true },
    tokenId: { type: Number, required: true },
    from: { type: Number, required: true },
    to: { type: Number, required: true },
    diceValue: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now }
}, { _id: false });
const RollRecordSchema = new mongoose_1.Schema({
    playerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    color: { type: String, required: true },
    diceValue: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now }
}, { _id: false });
const GameSessionSchema = new mongoose_1.Schema({
    roomId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    players: [GamePlayerSchema],
    status: {
        type: String,
        enum: ['waiting', 'active', 'completed', 'cancelled'],
        default: 'waiting'
    },
    entryFee: {
        type: Number,
        default: 0
    },
    prizePool: {
        type: Number,
        default: 0
    },
    winner: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    },
    turn: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    },
    turnIndex: {
        type: Number,
        default: 0
    },
    diceValue: {
        type: Number
    },
    hasRolled: {
        type: Boolean,
        default: false
    },
    rollHistory: [RollRecordSchema],
    moveHistory: [MoveRecordSchema],
    turnTimerExpiry: {
        type: Date
    },
    isPrivate: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });
exports.GameSession = (0, mongoose_1.model)('GameSession', GameSessionSchema);
exports.default = exports.GameSession;
