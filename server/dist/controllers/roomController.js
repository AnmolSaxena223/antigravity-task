"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.declineInvite = exports.getRoomDetails = exports.startMatch = exports.toggleReady = exports.transferHost = exports.kickPlayer = exports.leaveRoom = exports.joinRoom = exports.inviteFriend = exports.createRoom = void 0;
const User_1 = require("../models/User");
const GameRoom_1 = require("../models/GameRoom");
const RoomInvite_1 = require("../models/RoomInvite");
const GameInvite_1 = require("../models/GameInvite");
const GameSession_1 = require("../models/GameSession");
const Transaction_1 = require("../models/Transaction");
const socketService_1 = require("../services/socketService");
const crypto_1 = __importDefault(require("crypto"));
/**
 * Deducts room entry fee atomically from user's balance
 */
const deductEntryFee = async (userId, amount) => {
    if (amount <= 0)
        return true;
    const user = await User_1.User.findById(userId);
    if (!user)
        return false;
    const totalBalance = user.balance.bonus + user.balance.deposit + user.balance.win;
    if (totalBalance < amount)
        return false;
    let remaining = amount;
    // 1. Deduct from Bonus first
    if (user.balance.bonus >= remaining) {
        user.balance.bonus -= remaining;
        remaining = 0;
    }
    else {
        remaining -= user.balance.bonus;
        user.balance.bonus = 0;
    }
    // 2. Deduct from Deposit second
    if (remaining > 0) {
        if (user.balance.deposit >= remaining) {
            user.balance.deposit -= remaining;
            remaining = 0;
        }
        else {
            remaining -= user.balance.deposit;
            user.balance.deposit = 0;
        }
    }
    // 3. Deduct from Win balance third
    if (remaining > 0) {
        if (user.balance.win >= remaining) {
            user.balance.win -= remaining;
            remaining = 0;
        }
        else {
            return false; // Safety fallback
        }
    }
    await user.save();
    // Save transaction record
    const transaction = new Transaction_1.Transaction({
        userId: user._id,
        type: 'game_fee',
        amount,
        balanceType: 'deposit',
        status: 'completed',
        description: 'Ludo private room entry fee'
    });
    await transaction.save();
    return true;
};
/**
 * Refunds room entry fee back to user's deposit balance
 */
const refundEntryFee = async (userId, amount) => {
    if (amount <= 0)
        return true;
    const user = await User_1.User.findById(userId);
    if (!user)
        return false;
    user.balance.deposit += amount;
    await user.save();
    // Save transaction record
    const transaction = new Transaction_1.Transaction({
        userId: user._id,
        type: 'refund',
        amount,
        balanceType: 'deposit',
        status: 'completed',
        description: 'Refund for private room entry fee'
    });
    await transaction.save();
    return true;
};
/**
 * Create a Private Game Room
 */
const createRoom = async (req, res) => {
    try {
        const { entryFee, maxPlayers } = req.body;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const user = await User_1.User.findById(userId);
        if (!user) {
            return res.status(444).json({ success: false, message: 'User not found.' });
        }
        const stake = Number(entryFee) || 0;
        let max = Number(maxPlayers) || 4;
        if (![2, 3, 4].includes(max)) {
            max = 4;
        }
        // Deduct entry fee
        const feeDeducted = await deductEntryFee(userId, stake);
        if (!feeDeducted) {
            return res.status(400).json({ success: false, message: 'Insufficient balance to host room.' });
        }
        // Generate room code LUDOXXXX
        const roomId = 'LUDO' + crypto_1.default.randomInt(1000, 9999).toString();
        const room = new GameRoom_1.GameRoom({
            roomId,
            hostId: userId,
            entryFee: stake,
            maxPlayers: max,
            players: [
                {
                    userId: user._id,
                    name: user.name,
                    avatar: user.avatar,
                    color: 'red',
                    isReady: true // Host is ready by default
                }
            ]
        });
        await room.save();
        return res.status(201).json({ success: true, room });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.createRoom = createRoom;
/**
 * Send an Invite to a Friend
 */
const inviteFriend = async (req, res) => {
    try {
        const { roomId, friendId } = req.body; // friendId here is user's database _id or friendId field
        const inviterId = req.user?.userId;
        if (!roomId || !friendId) {
            return res.status(400).json({ success: false, message: 'Room ID and Friend ID are required.' });
        }
        if (!inviterId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const room = await GameRoom_1.GameRoom.findOne({ roomId, status: 'waiting' });
        if (!room) {
            return res.status(444).json({ success: false, message: 'Active room not found.' });
        }
        // Find the friend
        const friend = await User_1.User.findOne({
            $or: [{ _id: friendId }, { friendId }]
        });
        if (!friend) {
            return res.status(444).json({ success: false, message: 'Friend not found.' });
        }
        const inviter = await User_1.User.findById(inviterId);
        if (!inviter) {
            return res.status(444).json({ success: false, message: 'Inviter user not found.' });
        }
        // Check block list validation
        const isInviterBlocked = friend.blockedUsers?.some(id => id.toString() === inviterId);
        const isFriendBlocked = inviter.blockedUsers?.some(id => id.toString() === friend._id.toString());
        if (isInviterBlocked || isFriendBlocked) {
            return res.status(400).json({ success: false, message: 'Cannot invite this user. Block connection exists.' });
        }
        // Create RoomInvite
        const invite = new RoomInvite_1.RoomInvite({
            roomId,
            inviterId,
            inviteeId: friend._id,
            status: 'pending'
        });
        // Create GameInvite to keep both models updated
        const gameInvite = new GameInvite_1.GameInvite({
            roomId,
            inviter: inviterId,
            invitee: friend._id,
            status: 'pending'
        });
        try {
            await Promise.all([invite.save(), gameInvite.save()]);
        }
        catch (e) {
            // Index duplicate key error check
            if (e.code === 11000) {
                // Invite already exists, return success anyway
            }
            else {
                throw e;
            }
        }
        // Send real-time notification via Socket.io
        const friendSocketId = socketService_1.SocketService.activeUsers.get(friend._id.toString());
        if (friendSocketId) {
            const io = global.socketIO;
            if (io) {
                io.to(friendSocketId).emit('invite:received', {
                    inviteId: invite._id,
                    roomId,
                    entryFee: room.entryFee,
                    inviter: {
                        name: inviter.name || 'A friend',
                        avatar: inviter.avatar || 'avatar_1'
                    }
                });
            }
        }
        return res.status(200).json({ success: true, message: 'Room invitation sent.' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.inviteFriend = inviteFriend;
/**
 * Join a Private Room
 */
const joinRoom = async (req, res) => {
    try {
        const { roomId } = req.body;
        const userId = req.user?.userId;
        if (!roomId) {
            return res.status(400).json({ success: false, message: 'Room code is required.' });
        }
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const room = await GameRoom_1.GameRoom.findOne({ roomId: roomId.trim().toUpperCase(), status: 'waiting' });
        if (!room) {
            return res.status(444).json({ success: false, message: 'Lobby room does not exist, is full, or has already started.' });
        }
        // Check if player is already in room
        const isAlreadyInRoom = room.players.some(p => p.userId.toString() === userId);
        if (isAlreadyInRoom) {
            return res.status(200).json({ success: true, room });
        }
        // Check if room is full
        if (room.players.length >= room.maxPlayers) {
            return res.status(400).json({ success: false, message: 'Room is already full.' });
        }
        const user = await User_1.User.findById(userId);
        if (!user) {
            return res.status(444).json({ success: false, message: 'User not found.' });
        }
        // Check block list validation against room host
        const hostUser = await User_1.User.findById(room.hostId);
        const isHostBlockedByJoiner = user.blockedUsers?.some(id => id.toString() === room.hostId.toString());
        const isJoinerBlockedByHost = hostUser?.blockedUsers?.some(id => id.toString() === userId);
        if (isHostBlockedByJoiner || isJoinerBlockedByHost) {
            return res.status(400).json({ success: false, message: 'Cannot join room. Block connection exists with the host.' });
        }
        // Deduct entry fee
        const feeDeducted = await deductEntryFee(userId, room.entryFee);
        if (!feeDeducted) {
            return res.status(400).json({ success: false, message: 'Insufficient balance to join room.' });
        }
        // Assign first available color from ['red', 'green', 'yellow', 'blue']
        const takenColors = room.players.map(p => p.color);
        const availableColors = ['red', 'green', 'yellow', 'blue'];
        const assignedColor = availableColors.find(c => !takenColors.includes(c)) || 'green';
        // Add player to room
        room.players.push({
            userId: user._id,
            name: user.name,
            avatar: user.avatar,
            color: assignedColor,
            isReady: false
        });
        await room.save();
        // Accept invite if there was any pending
        await Promise.all([
            RoomInvite_1.RoomInvite.findOneAndUpdate({ roomId: room.roomId, inviteeId: userId, status: 'pending' }, { status: 'accepted' }),
            GameInvite_1.GameInvite.findOneAndUpdate({ roomId: room.roomId, invitee: userId, status: 'pending' }, { status: 'accepted' })
        ]);
        // Emit Socket.io event for Room Joined
        const io = global.socketIO;
        if (io) {
            io.to(room.roomId).emit('room:joined', {
                players: room.players,
                joinedPlayer: {
                    userId: user._id,
                    name: user.name,
                    avatar: user.avatar,
                    color: assignedColor
                }
            });
        }
        return res.status(200).json({ success: true, room });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.joinRoom = joinRoom;
/**
 * Leave a Private Room
 */
const leaveRoom = async (req, res) => {
    try {
        const { roomId } = req.body;
        const userId = req.user?.userId;
        if (!roomId) {
            return res.status(400).json({ success: false, message: 'Room ID is required.' });
        }
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const room = await GameRoom_1.GameRoom.findOne({ roomId, status: 'waiting' });
        if (!room) {
            return res.status(444).json({ success: false, message: 'Room not found.' });
        }
        const playerIndex = room.players.findIndex(p => p.userId.toString() === userId);
        if (playerIndex === -1) {
            return res.status(400).json({ success: false, message: 'You are not in this room.' });
        }
        // Refund entry fee
        await refundEntryFee(userId, room.entryFee);
        // Remove player
        room.players.splice(playerIndex, 1);
        const io = global.socketIO;
        if (room.players.length === 0) {
            // Cancel room if empty
            room.status = 'cancelled';
            await room.save();
        }
        else {
            // If host left, transfer host
            if (room.hostId.toString() === userId) {
                const nextHost = room.players[0];
                room.hostId = nextHost.userId;
                nextHost.isReady = true; // Host is always ready
                if (io) {
                    io.to(room.roomId).emit('room:host_transferred', {
                        newHostId: nextHost.userId,
                        newHostName: nextHost.name
                    });
                }
            }
            await room.save();
            // Emit Room Left
            if (io) {
                io.to(room.roomId).emit('room:left', {
                    players: room.players,
                    leftUserId: userId
                });
            }
        }
        return res.status(200).json({ success: true, message: 'Successfully left the room.' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.leaveRoom = leaveRoom;
/**
 * Kick Player from Private Room (Host only)
 */
const kickPlayer = async (req, res) => {
    try {
        const { roomId, targetUserId } = req.body;
        const hostId = req.user?.userId;
        if (!roomId || !targetUserId) {
            return res.status(400).json({ success: false, message: 'Room ID and target user ID are required.' });
        }
        const room = await GameRoom_1.GameRoom.findOne({ roomId, status: 'waiting' });
        if (!room) {
            return res.status(444).json({ success: false, message: 'Room not found.' });
        }
        if (room.hostId.toString() !== hostId) {
            return res.status(403).json({ success: false, message: 'Only the room host can kick players.' });
        }
        const playerIndex = room.players.findIndex(p => p.userId.toString() === targetUserId);
        if (playerIndex === -1) {
            return res.status(400).json({ success: false, message: 'Player is not in the room.' });
        }
        // Refund target player
        await refundEntryFee(targetUserId, room.entryFee);
        // Remove player
        room.players.splice(playerIndex, 1);
        await room.save();
        const io = global.socketIO;
        if (io) {
            // Notify the kicked player socket
            const targetSocketId = socketService_1.SocketService.activeUsers.get(targetUserId);
            if (targetSocketId) {
                io.to(targetSocketId).emit('room:kicked', { roomId });
            }
            // Notify others in room
            io.to(room.roomId).emit('room:left', {
                players: room.players,
                leftUserId: targetUserId
            });
        }
        return res.status(200).json({ success: true, message: 'Player kicked successfully.' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.kickPlayer = kickPlayer;
/**
 * Transfer Host (Host only)
 */
const transferHost = async (req, res) => {
    try {
        const { roomId, targetUserId } = req.body;
        const hostId = req.user?.userId;
        if (!roomId || !targetUserId) {
            return res.status(400).json({ success: false, message: 'Room ID and target user ID are required.' });
        }
        const room = await GameRoom_1.GameRoom.findOne({ roomId, status: 'waiting' });
        if (!room) {
            return res.status(444).json({ success: false, message: 'Room not found.' });
        }
        if (room.hostId.toString() !== hostId) {
            return res.status(403).json({ success: false, message: 'Only the room host can transfer ownership.' });
        }
        const targetPlayer = room.players.find(p => p.userId.toString() === targetUserId);
        if (!targetPlayer) {
            return res.status(400).json({ success: false, message: 'Target user is not in this room.' });
        }
        room.hostId = targetPlayer.userId;
        targetPlayer.isReady = true; // Host is always ready
        await room.save();
        const io = global.socketIO;
        if (io) {
            io.to(room.roomId).emit('room:host_transferred', {
                newHostId: targetPlayer.userId,
                newHostName: targetPlayer.name
            });
        }
        return res.status(200).json({ success: true, room });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.transferHost = transferHost;
/**
 * Toggle ready state in Lobby
 */
const toggleReady = async (req, res) => {
    try {
        const { roomId, isReady } = req.body;
        const userId = req.user?.userId;
        if (!roomId) {
            return res.status(400).json({ success: false, message: 'Room ID is required.' });
        }
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const room = await GameRoom_1.GameRoom.findOne({ roomId, status: 'waiting' });
        if (!room) {
            return res.status(444).json({ success: false, message: 'Room not found.' });
        }
        const player = room.players.find(p => p.userId.toString() === userId);
        if (!player) {
            return res.status(400).json({ success: false, message: 'You are not in this room.' });
        }
        // Host is always ready, check if host is trying to toggle unready
        if (room.hostId.toString() === userId && !isReady) {
            return res.status(400).json({ success: false, message: 'Host must remain ready.' });
        }
        player.isReady = !!isReady;
        await room.save();
        const io = global.socketIO;
        if (io) {
            io.to(room.roomId).emit('room:ready', {
                userId,
                isReady: player.isReady,
                players: room.players
            });
        }
        return res.status(200).json({ success: true, room });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.toggleReady = toggleReady;
/**
 * Start Match (Host only)
 */
const startMatch = async (req, res) => {
    try {
        const { roomId } = req.body;
        const hostId = req.user?.userId;
        if (!roomId) {
            return res.status(400).json({ success: false, message: 'Room ID is required.' });
        }
        const room = await GameRoom_1.GameRoom.findOne({ roomId, status: 'waiting' });
        if (!room) {
            return res.status(444).json({ success: false, message: 'Room not found.' });
        }
        if (room.hostId.toString() !== hostId) {
            return res.status(403).json({ success: false, message: 'Only the room host can start the match.' });
        }
        if (room.players.length < 2) {
            return res.status(400).json({ success: false, message: 'Need at least 2 players to start a match.' });
        }
        // Initialize Game Session in active status
        const entryFee = room.entryFee;
        const playersCount = room.players.length;
        const prizePool = entryFee * playersCount * 0.9; // 10% Platform fee
        // Prepare active game players format
        const gamePlayers = room.players.map((p, idx) => {
            // Map colors to valid color structures in GameSession.ts
            const colors = ['red', 'green', 'yellow', 'blue'];
            return {
                userId: p.userId,
                name: p.name,
                avatar: p.avatar,
                color: p.color,
                isReady: true,
                isDisconnected: false,
                skipCount: 0,
                tokens: [
                    { id: 0, position: -1, isSafe: true },
                    { id: 1, position: -1, isSafe: true },
                    { id: 2, position: -1, isSafe: true },
                    { id: 3, position: -1, isSafe: true }
                ]
            };
        });
        const newGame = new GameSession_1.GameSession({
            roomId: room.roomId,
            status: 'active',
            entryFee,
            prizePool,
            isPrivate: true,
            players: gamePlayers,
            turn: room.players[0].userId, // Host starts turn
            turnIndex: 0,
            hasRolled: false
        });
        await newGame.save();
        // Mark lobby GameRoom as active
        room.status = 'active';
        room.gameSessionId = newGame._id;
        await room.save();
        // Broadcast match start to all sockets in this room
        const io = global.socketIO;
        if (io) {
            // Emit socket service game sync payload representation
            const gamePayload = {
                roomId: newGame.roomId,
                status: newGame.status,
                entryFee: newGame.entryFee,
                prizePool: newGame.prizePool,
                players: newGame.players,
                turn: newGame.turn,
                turnIndex: newGame.turnIndex,
                hasRolled: newGame.hasRolled,
                rollHistory: newGame.rollHistory,
                moveHistory: newGame.moveHistory,
                isPrivate: newGame.isPrivate
            };
            io.to(room.roomId).emit('game:started', gamePayload);
        }
        return res.status(200).json({ success: true, gameSession: newGame });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.startMatch = startMatch;
/**
 * Get Room Details along with invite statuses
 */
const getRoomDetails = async (req, res) => {
    try {
        const { roomId } = req.params;
        const userId = req.user?.userId;
        if (!roomId) {
            return res.status(400).json({ success: false, message: 'Room ID is required.' });
        }
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const room = await GameRoom_1.GameRoom.findOne({ roomId, status: 'waiting' });
        if (!room) {
            return res.status(444).json({ success: false, message: 'Room not found.' });
        }
        // Fetch sent RoomInvites for this room
        const invites = await RoomInvite_1.RoomInvite.find({ roomId }).populate('inviteeId', 'name avatar friendId gameStats');
        // Format invite logs
        const inviteStatuses = invites.map((invite) => {
            const invitee = invite.inviteeId;
            if (!invitee)
                return null;
            // Check if they are currently inside the room
            const joined = room.players.some(p => p.userId.toString() === invitee._id.toString());
            let status = 'waiting';
            if (joined) {
                status = 'joined';
            }
            else if (invite.status === 'accepted') {
                status = 'accepted';
            }
            else if (invite.status === 'declined') {
                status = 'declined';
            }
            return {
                _id: invitee._id,
                name: invitee.name,
                avatar: invitee.avatar,
                friendId: invitee.friendId,
                level: Math.max(1, Math.floor((invitee.gameStats?.won || 0) * 0.5) + 1),
                status
            };
        }).filter(Boolean);
        return res.status(200).json({
            success: true,
            room: {
                roomId: room.roomId,
                hostId: room.hostId,
                entryFee: room.entryFee,
                maxPlayers: room.maxPlayers,
                status: room.status,
                players: room.players,
                invites: inviteStatuses
            }
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getRoomDetails = getRoomDetails;
/**
 * Decline Room Invite
 */
const declineInvite = async (req, res) => {
    try {
        const { inviteId, roomId } = req.body;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        let invite = null;
        if (inviteId) {
            invite = await RoomInvite_1.RoomInvite.findById(inviteId);
        }
        else if (roomId) {
            invite = await RoomInvite_1.RoomInvite.findOne({ roomId, inviteeId: userId, status: 'pending' });
        }
        if (!invite) {
            return res.status(444).json({ success: false, message: 'Pending invitation not found.' });
        }
        // Update both RoomInvite and GameInvite statuses
        invite.status = 'declined';
        await invite.save();
        await GameInvite_1.GameInvite.findOneAndUpdate({ roomId: invite.roomId, invitee: userId, status: 'pending' }, { status: 'declined' });
        // Notify room host of declination via sockets
        const io = global.socketIO;
        if (io) {
            const room = await GameRoom_1.GameRoom.findOne({ roomId: invite.roomId });
            if (room) {
                const hostSocketId = socketService_1.SocketService.activeUsers.get(room.hostId.toString());
                if (hostSocketId) {
                    io.to(hostSocketId).emit('invite:declined', {
                        roomId: invite.roomId,
                        inviteeId: userId
                    });
                }
            }
        }
        return res.status(200).json({ success: true, message: 'Invitation declined.' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.declineInvite = declineInvite;
