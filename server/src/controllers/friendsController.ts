import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { User } from '../models/User';
import { Friend } from '../models/Friend';
import { FriendRequest } from '../models/FriendRequest';
import { SocketService } from '../services/socketService';

/**
 * Send a Friend Request
 */
export const sendFriendRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { friendIdOrName, recipientId } = req.body;
    const senderId = req.user?.userId;

    if (!senderId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!friendIdOrName && !recipientId) {
      return res.status(400).json({ success: false, message: 'Please provide a Friend ID, Username, or User ID.' });
    }

    // Find the receiver user
    let receiver = null;
    if (recipientId) {
      receiver = await User.findById(recipientId);
    } else if (friendIdOrName) {
      receiver = await User.findOne({
        $or: [
          { friendId: friendIdOrName.trim() },
          { name: { $regex: new RegExp('^' + friendIdOrName.trim() + '$', 'i') } }
        ]
      });
    }

    if (!receiver) {
      return res.status(444).json({ success: false, message: 'User not found.' });
    }

    if (receiver._id.toString() === senderId) {
      return res.status(400).json({ success: false, message: 'You cannot add yourself as a friend.' });
    }

    // Check if already friends
    const alreadyFriends = await Friend.findOne({ user: senderId, friend: receiver._id });
    if (alreadyFriends) {
      return res.status(400).json({ success: false, message: 'You are already friends with this user.' });
    }

    // Check block list
    const senderUser = await User.findById(senderId);
    if (!senderUser) {
      return res.status(404).json({ success: false, message: 'Sender user not found.' });
    }

    const isSenderBlocked = receiver.blockedUsers?.some(id => id.toString() === senderId);
    const isReceiverBlocked = senderUser.blockedUsers?.some(id => id.toString() === receiver._id.toString());
    if (isSenderBlocked || isReceiverBlocked) {
      return res.status(400).json({ success: false, message: 'Cannot send friend request. Block connection exists.' });
    }

    // Check if there is an existing incoming pending request to auto-accept
    const incomingRequest = await FriendRequest.findOne({ sender: receiver._id, receiver: senderId, status: 'pending' });
    if (incomingRequest) {
      await FriendRequest.findByIdAndDelete(incomingRequest._id);

      const friend1 = new Friend({ user: senderId, friend: receiver._id });
      const friend2 = new Friend({ user: receiver._id, friend: senderId });
      await Promise.all([friend1.save(), friend2.save()]);

      const io = (global as any).socketIO;
      const senderSocketId = SocketService.activeUsers.get(senderId);
      const receiverSocketId = SocketService.activeUsers.get(receiver._id.toString());
      if (io) {
        if (senderSocketId) {
          const recName = await User.findById(receiver._id).select('name avatar friendId');
          io.to(senderSocketId).emit('friend_request:accepted', { friend: recName });
          io.to(senderSocketId).emit('friend:online', { userId: receiver._id.toString() });
        }
        if (receiverSocketId) {
          const sndName = await User.findById(senderId).select('name avatar friendId');
          io.to(receiverSocketId).emit('friend_request:accepted', { friend: sndName });
          io.to(receiverSocketId).emit('friend:online', { userId: senderId });
        }
      }
      return res.status(200).json({ success: true, message: 'Friend request accepted automatically.', autoAccepted: true });
    }

    // Check if there is an existing pending request
    const existingRequest = await FriendRequest.findOne({ sender: senderId, receiver: receiver._id, status: 'pending' });
    if (existingRequest) {
      return res.status(400).json({ success: false, message: 'A friend request is already pending between you.' });
    }

    // Create Friend Request
    const request = new FriendRequest({
      sender: senderId,
      receiver: receiver._id,
      status: 'pending'
    });

    await request.save();

    // Trigger real-time notification to receiver if online
    const receiverSocketId = SocketService.activeUsers.get(receiver._id.toString());
    if (receiverSocketId) {
      const senderUser = await User.findById(senderId).select('name avatar friendId');
      // Import IO instance dynamically or use dynamic callback to emit
      const io = (global as any).socketIO;
      if (io) {
        io.to(receiverSocketId).emit('friend_request:received', {
          requestId: request._id,
          sender: senderUser
        });
      }
    }

    return res.status(200).json({ success: true, message: 'Friend request sent successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Accept a Friend Request
 */
export const acceptFriendRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { requestId } = req.body;
    const receiverId = req.user?.userId;

    if (!requestId) {
      return res.status(400).json({ success: false, message: 'Request ID is required.' });
    }

    if (!receiverId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const request = await FriendRequest.findById(requestId);
    if (!request || request.status !== 'pending') {
      return res.status(404).json({ success: false, message: 'Pending request not found.' });
    }

    if (request.receiver.toString() !== receiverId) {
      return res.status(403).json({ success: false, message: 'You are not authorized to accept this request.' });
    }

    // Remove the pending request (delete it)
    await FriendRequest.findByIdAndDelete(requestId);

    // Create bidirectional Friend entries
    const friend1 = new Friend({ user: request.sender, friend: request.receiver });
    const friend2 = new Friend({ user: request.receiver, friend: request.sender });

    await Promise.all([friend1.save(), friend2.save()]);

    // Notify sender that request was accepted
    const senderSocketId = SocketService.activeUsers.get(request.sender.toString());
    const receiverUser = await User.findById(receiverId).select('name avatar friendId');
    const io = (global as any).socketIO;
    
    if (senderSocketId && io) {
      io.to(senderSocketId).emit('friend_request:accepted', {
        friend: receiverUser
      });
    }

    // Trigger online status updates for both if they are online
    const receiverSocketId = SocketService.activeUsers.get(receiverId);
    if (io) {
      if (senderSocketId) {
        io.to(senderSocketId).emit('friend:online', { userId: receiverId });
      }
      if (receiverSocketId) {
        const senderUser = await User.findById(request.sender).select('name avatar friendId');
        io.to(receiverSocketId).emit('friend:online', { userId: request.sender.toString() });
      }
    }

    return res.status(200).json({ success: true, message: 'Friend request accepted.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Reject a Friend Request
 */
export const rejectFriendRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { requestId } = req.body;
    const receiverId = req.user?.userId;

    if (!requestId) {
      return res.status(400).json({ success: false, message: 'Request ID is required.' });
    }

    if (!receiverId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const request = await FriendRequest.findById(requestId);
    if (!request || request.status !== 'pending') {
      return res.status(444).json({ success: false, message: 'Pending request not found.' });
    }

    if (request.receiver.toString() !== receiverId) {
      return res.status(403).json({ success: false, message: 'You are not authorized to reject this request.' });
    }

    // Update status to rejected
    request.status = 'rejected';
    await request.save();

    // Optionally delete from database to clean up space
    await FriendRequest.findByIdAndDelete(requestId);

    return res.status(200).json({ success: true, message: 'Friend request rejected.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Friends List
 */
export const getFriendsList = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const friendships = await Friend.find({ user: userId }).populate('friend', 'name avatar friendId lastSeen gameStats');
    
    const friends = friendships.map((f: any) => {
      const friendUser = f.friend;
      if (!friendUser) return null;
      
      const isOnline = SocketService.activeUsers.has(friendUser._id.toString());
      const level = Math.max(1, Math.floor((friendUser.gameStats?.won || 0) * 0.5) + 1);
      return {
        _id: friendUser._id,
        name: friendUser.name,
        avatar: friendUser.avatar,
        friendId: friendUser.friendId,
        level,
        lastSeen: friendUser.lastSeen || friendUser.updatedAt || new Date(),
        status: isOnline ? 'online' : 'offline'
      };
    }).filter(Boolean);

    return res.status(200).json({ success: true, friends, friendCount: friends.length });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Pending Friend Requests
 */
export const getPendingFriendRequests = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const requests = await FriendRequest.find({ receiver: userId, status: 'pending' })
      .populate('sender', 'name avatar friendId')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, requests });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Remove Friend
 */
export const removeFriend = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { friendId } = req.body;
    const userId = req.user?.userId;

    if (!friendId) {
      return res.status(400).json({ success: false, message: 'Friend ID is required.' });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Delete bidirectional Friend entries
    await Friend.deleteMany({
      $or: [
        { user: userId, friend: friendId },
        { user: friendId, friend: userId }
      ]
    });

    // Also delete any existing friend request history
    await FriendRequest.deleteMany({
      $or: [
        { sender: userId, receiver: friendId },
        { sender: friendId, receiver: userId }
      ]
    });

    return res.status(200).json({ success: true, message: 'Friend removed successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Search User by friendId or name
 */
export const searchFriend = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const queryVal = (req.query.q || req.query.query) as string;
    const userId = req.user?.userId;

    if (!queryVal) {
      return res.status(400).json({ success: false, message: 'Search query is required.' });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const trimmedQuery = queryVal.trim();

    // Find the user by Friend ID or exact match on name
    const user = await User.findOne({
      $or: [
        { friendId: trimmedQuery },
        { name: { $regex: new RegExp('^' + trimmedQuery + '$', 'i') } }
      ]
    }).select('name avatar friendId gameStats blockedUsers');

    if (!user) {
      return res.status(200).json({ success: false, message: 'User not found.' });
    }

    const searchingUser = await User.findById(userId);
    if (!searchingUser) {
      return res.status(404).json({ success: false, message: 'User session not found.' });
    }

    // If searcher is blocked by target user, hide their presence
    const isSearcherBlocked = user.blockedUsers?.some(id => id.toString() === userId);
    if (isSearcherBlocked) {
      return res.status(200).json({ success: false, message: 'User not found.' });
    }

    // Check if target is blocked by searcher
    const isTargetBlockedBySearcher = searchingUser.blockedUsers?.some(id => id.toString() === user._id.toString());

    // Check if already friends
    const isFriend = await Friend.findOne({ user: userId, friend: user._id });

    // Check if friend request already exists
    const request = await FriendRequest.findOne({
      $or: [
        { sender: userId, receiver: user._id, status: 'pending' },
        { sender: user._id, receiver: userId, status: 'pending' }
      ]
    });

    const isRequestSent = request?.sender.toString() === userId && request?.status === 'pending';
    const isRequestReceived = request?.receiver.toString() === userId && request?.status === 'pending';
    const level = Math.max(1, Math.floor((user.gameStats?.won || 0) * 0.5) + 1);

    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        avatar: user.avatar,
        friendId: user.friendId,
        level,
        isFriend: !!isFriend,
        isRequestSent,
        isRequestReceived,
        isBlocked: !!isTargetBlockedBySearcher
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Block a User
 */
export const blockUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetUserId } = req.body;
    const userId = req.user?.userId;

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'Target user ID is required.' });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (targetUserId === userId) {
      return res.status(400).json({ success: false, message: 'You cannot block yourself.' });
    }

    // Add targetUserId to user's blockedUsers list
    await User.findByIdAndUpdate(userId, {
      $addToSet: { blockedUsers: targetUserId }
    });

    // Dissolve friendship bidirectional
    await Friend.deleteMany({
      $or: [
        { user: userId, friend: targetUserId },
        { user: targetUserId, friend: userId }
      ]
    });

    // Delete any pending requests
    await FriendRequest.deleteMany({
      $or: [
        { sender: userId, receiver: targetUserId },
        { sender: targetUserId, receiver: userId }
      ]
    });

    return res.status(200).json({ success: true, message: 'User blocked successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Unblock a User
 */
export const unblockUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetUserId } = req.body;
    const userId = req.user?.userId;

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'Target user ID is required.' });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Remove from blocked list
    await User.findByIdAndUpdate(userId, {
      $pull: { blockedUsers: targetUserId }
    });

    return res.status(200).json({ success: true, message: 'User unblocked successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Cancel Sent Friend Request
 */
export const cancelFriendRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { requestId } = req.body;
    const userId = req.user?.userId;

    if (!requestId) {
      return res.status(400).json({ success: false, message: 'Request ID is required.' });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const request = await FriendRequest.findById(requestId);
    if (!request || request.status !== 'pending') {
      return res.status(444).json({ success: false, message: 'Pending request not found.' });
    }

    if (request.sender.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'You are not authorized to cancel this request.' });
    }

    await FriendRequest.findByIdAndDelete(requestId);

    return res.status(200).json({ success: true, message: 'Friend request cancelled successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Blocked Users List
 */
export const getBlockedList = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const user = await User.findById(userId).populate('blockedUsers', 'name avatar friendId gameStats');
    if (!user) {
      return res.status(444).json({ success: false, message: 'User not found.' });
    }

    const blocked = (user.blockedUsers || []).map((u: any) => ({
      _id: u._id,
      name: u.name,
      avatar: u.avatar,
      friendId: u.friendId,
      level: Math.max(1, Math.floor((u.gameStats?.won || 0) * 0.5) + 1)
    }));

    return res.status(200).json({ success: true, blocked });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Sent Friend Requests List
 */
export const getSentFriendRequests = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const requests = await FriendRequest.find({ sender: userId, status: 'pending' })
      .populate('receiver', 'name avatar friendId gameStats')
      .sort({ createdAt: -1 });

    const formatted = requests.map((r: any) => {
      const rec = r.receiver;
      if (!rec) return null;
      return {
        _id: r._id,
        receiver: {
          _id: rec._id,
          name: rec.name,
          avatar: rec.avatar,
          friendId: rec.friendId,
          level: Math.max(1, Math.floor((rec.gameStats?.won || 0) * 0.5) + 1)
        },
        status: r.status,
        createdAt: r.createdAt
      };
    }).filter(Boolean);

    return res.status(200).json({ success: true, requests: formatted });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
