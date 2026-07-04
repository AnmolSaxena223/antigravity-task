import mongoose from 'mongoose';
import { config } from './env';

import { User } from '../models/User';

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(config.MONGO_URI);
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    
    // Auto-migrate legacy users missing friendId
    const usersWithoutFriendId = await User.find({
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
  } catch (error: any) {
    console.error(`[Database] Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

// Monitor connection changes
mongoose.connection.on('disconnected', () => {
  console.warn('[Database] MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('error', (err) => {
  console.error(`[Database] MongoDB connection error: ${err}`);
});
