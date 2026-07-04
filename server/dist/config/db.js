"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("./env");
const User_1 = require("../models/User");
const connectDB = async () => {
    try {
        const conn = await mongoose_1.default.connect(env_1.config.MONGO_URI);
        console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
        // Auto-migrate legacy users missing friendId
        const usersWithoutFriendId = await User_1.User.find({
            $or: [
                { friendId: { $exists: false } },
                { friendId: null },
                { friendId: "" }
            ]
        });
        if (usersWithoutFriendId.length > 0) {
            console.log(`[Migration] Generating friendId for ${usersWithoutFriendId.length} users...`);
            for (const u of usersWithoutFriendId) {
                // Force pre-save hook by clearing friendId
                u.friendId = undefined;
                await u.save();
            }
            console.log(`[Migration] FriendId generation complete.`);
        }
    }
    catch (error) {
        console.error(`[Database] Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
// Monitor connection changes
mongoose_1.default.connection.on('disconnected', () => {
    console.warn('[Database] MongoDB disconnected. Attempting to reconnect...');
});
mongoose_1.default.connection.on('error', (err) => {
    console.error(`[Database] MongoDB connection error: ${err}`);
});
