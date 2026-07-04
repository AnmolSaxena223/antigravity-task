"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSentFriendRequests = exports.getBlockedList = exports.cancelFriendRequest = exports.unblockUser = exports.blockUser = exports.searchFriend = exports.removeFriend = exports.getPendingFriendRequests = exports.getFriendsList = exports.rejectFriendRequest = exports.acceptFriendRequest = exports.sendFriendRequest = void 0;
const User_1 = require("../models/User");
const Friend_1 = require("../models/Friend");
const FriendRequest_1 = require("../models/FriendRequest");
const socketService_1 = require("../services/socketService");
/**
 * Send a Friend Request
 */
const sendFriendRequest = async (req, res) => {
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
            receiver = await User_1.User.findById(recipientId);
        }
        else if (friendIdOrName) {
            receiver = await User_1.User.findOne({
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
        const alreadyFriends = await Friend_1.Friend.findOne({ user: senderId, friend: receiver._id });
        if (alreadyFriends) {
            return res.status(400).json({ success: false, message: 'You are already friends with this user.' });
        }
        // Check block list
        const senderUser = await User_1.User.findById(senderId);
        if (!senderUser) {
            return res.status(404).json({ success: false, message: 'Sender user not found.' });
        }
        const isSenderBlocked = receiver.blockedUsers?.some(id => id.toString() === senderId);
        const isReceiverBlocked = senderUser.blockedUsers?.some(id => id.toString() === receiver._id.toString());
        if (isSenderBlocked || isReceiverBlocked) {
            return res.status(400).json({ success: false, message: 'Cannot send friend request. Block connection exists.' });
        }
        // Check if there is an existing incoming pending request to auto-accept
        const incomingRequest = await FriendRequest_1.FriendRequest.findOne({ sender: receiver._id, receiver: senderId, status: 'pending' });
        if (incomingRequest) {
            await FriendRequest_1.FriendRequest.findByIdAndDelete(incomingRequest._id);
            const friend1 = new Friend_1.Friend({ user: senderId, friend: receiver._id });
            const friend2 = new Friend_1.Friend({ user: receiver._id, friend: senderId });
            await Promise.all([friend1.save(), friend2.save()]);
            const io = global.socketIO;
            const senderSocketId = socketService_1.SocketService.activeUsers.get(senderId);
            const receiverSocketId = socketService_1.SocketService.activeUsers.get(receiver._id.toString());
            if (io) {
                if (senderSocketId) {
                    const recName = await User_1.User.findById(receiver._id).select('name avatar friendId');
                    io.to(senderSocketId).emit('friend_request:accepted', { friend: recName });
                    io.to(senderSocketId).emit('friend:online', { userId: receiver._id.toString() });
                }
                if (receiverSocketId) {
                    const sndName = await User_1.User.findById(senderId).select('name avatar friendId');
                    io.to(receiverSocketId).emit('friend_request:accepted', { friend: sndName });
                    io.to(receiverSocketId).emit('friend:online', { userId: senderId });
                }
            }
            return res.status(200).json({ success: true, message: 'Friend request accepted automatically.', autoAccepted: true });
        }
        // Check if there is an existing pending request
        const existingRequest = await FriendRequest_1.FriendRequest.findOne({ sender: senderId, receiver: receiver._id, status: 'pending' });
        if (existingRequest) {
            return res.status(400).json({ success: false, message: 'A friend request is already pending between you.' });
        }
        // Create Friend Request
        const request = new FriendRequest_1.FriendRequest({
            sender: senderId,
            receiver: receiver._id,
            status: 'pending'
        });
        await request.save();
        // Trigger real-time notification to receiver if online
        const receiverSocketId = socketService_1.SocketService.activeUsers.get(receiver._id.toString());
        if (receiverSocketId) {
            const senderUser = await User_1.User.findById(senderId).select('name avatar friendId');
            // Import IO instance dynamically or use dynamic callback to emit
            const io = global.socketIO;
            if (io) {
                io.to(receiverSocketId).emit('friend_request:received', {
                    requestId: request._id,
                    sender: senderUser
                });
            }
        }
        return res.status(200).json({ success: true, message: 'Friend request sent successfully.' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.sendFriendRequest = sendFriendRequest;
/**
 * Accept a Friend Request
 */
const acceptFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.body;
        const receiverId = req.user?.userId;
        if (!requestId) {
            return res.status(400).json({ success: false, message: 'Request ID is required.' });
        }
        if (!receiverId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const request = await FriendRequest_1.FriendRequest.findById(requestId);
        if (!request || request.status !== 'pending') {
            return res.status(404).json({ success: false, message: 'Pending request not found.' });
        }
        if (request.receiver.toString() !== receiverId) {
            return res.status(403).json({ success: false, message: 'You are not authorized to accept this request.' });
        }
        // Remove the pending request (delete it)
        await FriendRequest_1.FriendRequest.findByIdAndDelete(requestId);
        // Create bidirectional Friend entries
        const friend1 = new Friend_1.Friend({ user: request.sender, friend: request.receiver });
        const friend2 = new Friend_1.Friend({ user: request.receiver, friend: request.sender });
        await Promise.all([friend1.save(), friend2.save()]);
        // Notify sender that request was accepted
        const senderSocketId = socketService_1.SocketService.activeUsers.get(request.sender.toString());
        const receiverUser = await User_1.User.findById(receiverId).select('name avatar friendId');
        const io = global.socketIO;
        if (senderSocketId && io) {
            io.to(senderSocketId).emit('friend_request:accepted', {
                friend: receiverUser
            });
        }
        // Trigger online status updates for both if they are online
        const receiverSocketId = socketService_1.SocketService.activeUsers.get(receiverId);
        if (io) {
            if (senderSocketId) {
                io.to(senderSocketId).emit('friend:online', { userId: receiverId });
            }
            if (receiverSocketId) {
                const senderUser = await User_1.User.findById(request.sender).select('name avatar friendId');
                io.to(receiverSocketId).emit('friend:online', { userId: request.sender.toString() });
            }
        }
        return res.status(200).json({ success: true, message: 'Friend request accepted.' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.acceptFriendRequest = acceptFriendRequest;
/**
 * Reject a Friend Request
 */
const rejectFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.body;
        const receiverId = req.user?.userId;
        if (!requestId) {
            return res.status(400).json({ success: false, message: 'Request ID is required.' });
        }
        if (!receiverId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const request = await FriendRequest_1.FriendRequest.findById(requestId);
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
        await FriendRequest_1.FriendRequest.findByIdAndDelete(requestId);
        return res.status(200).json({ success: true, message: 'Friend request rejected.' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.rejectFriendRequest = rejectFriendRequest;
/**
 * Get Friends List
 */
const getFriendsList = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const friendships = await Friend_1.Friend.find({ user: userId }).populate('friend', 'name avatar friendId lastSeen gameStats');
        const friends = friendships.map((f) => {
            const friendUser = f.friend;
            if (!friendUser)
                return null;
            const isOnline = socketService_1.SocketService.activeUsers.has(friendUser._id.toString());
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
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getFriendsList = getFriendsList;
/**
 * Get Pending Friend Requests
 */
const getPendingFriendRequests = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const requests = await FriendRequest_1.FriendRequest.find({ receiver: userId, status: 'pending' })
            .populate('sender', 'name avatar friendId')
            .sort({ createdAt: -1 });
        return res.status(200).json({ success: true, requests });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getPendingFriendRequests = getPendingFriendRequests;
/**
 * Remove Friend
 */
const removeFriend = async (req, res) => {
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
        await Friend_1.Friend.deleteMany({
            $or: [
                { user: userId, friend: friendId },
                { user: friendId, friend: userId }
            ]
        });
        // Also delete any existing friend request history
        await FriendRequest_1.FriendRequest.deleteMany({
            $or: [
                { sender: userId, receiver: friendId },
                { sender: friendId, receiver: userId }
            ]
        });
        return res.status(200).json({ success: true, message: 'Friend removed successfully.' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.removeFriend = removeFriend;
/**
 * Search User by friendId or name
 */
const searchFriend = async (req, res) => {
    try {
        const queryVal = (req.query.q || req.query.query);
        const userId = req.user?.userId;
        if (!queryVal) {
            return res.status(400).json({ success: false, message: 'Search query is required.' });
        }
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const trimmedQuery = queryVal.trim();
        // Find the user by Friend ID or exact match on name
        const user = await User_1.User.findOne({
            $or: [
                { friendId: trimmedQuery },
                { name: { $regex: new RegExp('^' + trimmedQuery + '$', 'i') } }
            ]
        }).select('name avatar friendId gameStats blockedUsers');
        if (!user) {
            return res.status(200).json({ success: false, message: 'User not found.' });
        }
        const searchingUser = await User_1.User.findById(userId);
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
        const isFriend = await Friend_1.Friend.findOne({ user: userId, friend: user._id });
        // Check if friend request already exists
        const request = await FriendRequest_1.FriendRequest.findOne({
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
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.searchFriend = searchFriend;
/**
 * Block a User
 */
const blockUser = async (req, res) => {
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
        await User_1.User.findByIdAndUpdate(userId, {
            $addToSet: { blockedUsers: targetUserId }
        });
        // Dissolve friendship bidirectional
        await Friend_1.Friend.deleteMany({
            $or: [
                { user: userId, friend: targetUserId },
                { user: targetUserId, friend: userId }
            ]
        });
        // Delete any pending requests
        await FriendRequest_1.FriendRequest.deleteMany({
            $or: [
                { sender: userId, receiver: targetUserId },
                { sender: targetUserId, receiver: userId }
            ]
        });
        return res.status(200).json({ success: true, message: 'User blocked successfully.' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.blockUser = blockUser;
/**
 * Unblock a User
 */
const unblockUser = async (req, res) => {
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
        await User_1.User.findByIdAndUpdate(userId, {
            $pull: { blockedUsers: targetUserId }
        });
        return res.status(200).json({ success: true, message: 'User unblocked successfully.' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.unblockUser = unblockUser;
/**
 * Cancel Sent Friend Request
 */
const cancelFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.body;
        const userId = req.user?.userId;
        if (!requestId) {
            return res.status(400).json({ success: false, message: 'Request ID is required.' });
        }
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const request = await FriendRequest_1.FriendRequest.findById(requestId);
        if (!request || request.status !== 'pending') {
            return res.status(444).json({ success: false, message: 'Pending request not found.' });
        }
        if (request.sender.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'You are not authorized to cancel this request.' });
        }
        await FriendRequest_1.FriendRequest.findByIdAndDelete(requestId);
        return res.status(200).json({ success: true, message: 'Friend request cancelled successfully.' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.cancelFriendRequest = cancelFriendRequest;
/**
 * Get Blocked Users List
 */
const getBlockedList = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const user = await User_1.User.findById(userId).populate('blockedUsers', 'name avatar friendId gameStats');
        if (!user) {
            return res.status(444).json({ success: false, message: 'User not found.' });
        }
        const blocked = (user.blockedUsers || []).map((u) => ({
            _id: u._id,
            name: u.name,
            avatar: u.avatar,
            friendId: u.friendId,
            level: Math.max(1, Math.floor((u.gameStats?.won || 0) * 0.5) + 1)
        }));
        return res.status(200).json({ success: true, blocked });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getBlockedList = getBlockedList;
/**
 * Get Sent Friend Requests List
 */
const getSentFriendRequests = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const requests = await FriendRequest_1.FriendRequest.find({ sender: userId, status: 'pending' })
            .populate('receiver', 'name avatar friendId gameStats')
            .sort({ createdAt: -1 });
        const formatted = requests.map((r) => {
            const rec = r.receiver;
            if (!rec)
                return null;
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
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getSentFriendRequests = getSentFriendRequests;
