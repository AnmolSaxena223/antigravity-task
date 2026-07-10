"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketService = void 0;
const socket_io_1 = require("socket.io");
const security_1 = require("../utils/security");
const User_1 = require("../models/User");
const GameSession_1 = require("../models/GameSession");
const Transaction_1 = require("../models/Transaction");
const Friend_1 = require("../models/Friend");
const ludoEngine_1 = require("../utils/ludoEngine");
const crypto_1 = __importDefault(require("crypto"));
const mongoose_1 = require("mongoose");
class SocketService {
    io;
    userSockets = new Map(); // userId -> socketId
    static activeUsers = new Map(); // userId -> socketId
    matchmakingQueue = [];
    activeTimers = new Map(); // roomId -> timers
    constructor(server) {
        this.io = new socket_io_1.Server(server, {
            cors: {
                origin: '*', // In production, replace with specific domains
                methods: ['GET', 'POST'],
                credentials: true
            }
        });
        global.socketIO = this.io;
        this.setupMiddleware();
        this.setupConnection();
    }
    /**
     * Set up socket authentication middleware
     */
    setupMiddleware() {
        this.io.use((socket, next) => {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
            if (!token) {
                return next(new Error('Authentication error: Token missing'));
            }
            const decoded = (0, security_1.verifyAccessToken)(token);
            if (!decoded) {
                return next(new Error('Authentication error: Invalid token'));
            }
            socket.data.userId = decoded.userId;
            next();
        });
    }
    async broadcastOnlineStatus(userId, isOnline) {
        try {
            const friendships = await Friend_1.Friend.find({ user: userId });
            const sender = await User_1.User.findById(userId).select('name');
            const eventName = isOnline ? 'friend:online' : 'friend:offline';
            for (const friendship of friendships) {
                const friendIdStr = friendship.friend.toString();
                const friendSocketId = SocketService.activeUsers.get(friendIdStr);
                if (friendSocketId) {
                    this.io.to(friendSocketId).emit(eventName, { userId, name: sender?.name || 'A friend' });
                }
            }
        }
        catch (err) {
            console.error('[Socket] Error broadcasting status:', err);
        }
    }
    /**
     * Connection listener
     */
    setupConnection() {
        this.io.on('connection', (socket) => {
            const userId = socket.data.userId;
            console.log(`[Socket] Client connected: ${socket.id} (User: ${userId})`);
            this.userSockets.set(userId, socket.id);
            SocketService.activeUsers.set(userId, socket.id);
            // Notify friends this user is now online
            this.broadcastOnlineStatus(userId, true);
            // Handle rejoining active games
            this.handleReconnection(socket, userId);
            // Matchmaking
            socket.on('matchmake:start', (data) => this.handleMatchmaking(socket, userId, data.entryFee));
            socket.on('matchmake:cancel', () => this.handleCancelMatchmaking(userId));
            // Private Rooms
            socket.on('room:create', (data) => this.handleCreatePrivateRoom(socket, userId, data.entryFee));
            socket.on('room:join', (data) => this.handleJoinPrivateRoom(socket, userId, data.roomId));
            socket.on('room:join_lobby', (data) => {
                socket.join(data.roomId);
                console.log(`[Socket] Bound user ${userId} to room channel ${data.roomId}`);
            });
            // Game mechanics
            socket.on('game:roll', () => this.handleDiceRoll(socket, userId));
            socket.on('game:move', (data) => this.handleTokenMove(socket, userId, data.tokenId));
            socket.on('game:chat', (data) => this.handleChat(socket, userId, data.message));
            // Disconnect
            socket.on('disconnect', () => this.handleDisconnect(socket, userId));
        });
    }
    /**
     * Deducts entry fee atomically from user's balance: Bonus first, then Deposit, then Win
     */
    async deductEntryFee(userId, amount, session = null) {
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
        await user.save({ session });
        // Save transaction record
        const transaction = new Transaction_1.Transaction({
            userId: user._id,
            type: 'game_fee',
            amount,
            balanceType: 'deposit', // major categorization
            status: 'completed',
            description: 'Ludo entry fee fee deduction'
        });
        await transaction.save({ session });
        return true;
    }
    /**
     * Handle Reconnection of disconnected players
     */
    async handleReconnection(socket, userId) {
        try {
            const activeGame = await GameSession_1.GameSession.findOne({
                status: 'active',
                'players.userId': userId
            });
            if (activeGame) {
                socket.join(activeGame.roomId);
                // Update player connection status
                const player = activeGame.players.find(p => p.userId.toString() === userId);
                if (player) {
                    player.isDisconnected = false;
                    await activeGame.save();
                }
                console.log(`[Socket] User ${userId} reconnected to active game in room ${activeGame.roomId}`);
                // Broadcast reconnection to others
                socket.to(activeGame.roomId).emit('game:player_reconnected', { userId });
                // Send full sync info to the reconnected socket
                socket.emit('game:sync', this.getGameSyncPayload(activeGame));
                // Restart timers if it was their turn and they disconnected
                if (activeGame.turn?.toString() === userId) {
                    this.startTurnTimers(activeGame.roomId);
                }
            }
        }
        catch (err) {
            console.error('[Socket] Reconnection handling error:', err);
        }
    }
    /**
     * Handle Random Matchmaking queue
     */
    async handleMatchmaking(socket, userId, entryFee) {
        try {
            // Validate balance
            const user = await User_1.User.findById(userId);
            if (!user)
                return socket.emit('error', 'User not found.');
            const totalBalance = user.balance.bonus + user.balance.deposit + user.balance.win;
            if (totalBalance < entryFee) {
                return socket.emit('matchmake:error', 'Insufficient balance for entry fee.');
            }
            // Check if already in queue
            if (this.matchmakingQueue.some(q => q.userId === userId)) {
                return socket.emit('matchmake:error', 'Already in matchmaking queue.');
            }
            // Remove from any stale registrations
            this.handleCancelMatchmaking(userId);
            // Add to queue
            this.matchmakingQueue.push({ userId, entryFee, socketId: socket.id });
            socket.emit('matchmake:queued', { entryFee });
            console.log(`[Matchmaking] User ${userId} joined queue for fee: ${entryFee}. Queue size: ${this.matchmakingQueue.length}`);
            // Start 10s timeout to match with bot if no second player joins
            setTimeout(async () => {
                await this.checkAndStartBotMatch(userId, entryFee);
            }, 10000);
            // Try finding matches with the same entry fee
            const potentialMatches = this.matchmakingQueue.filter(q => q.entryFee === entryFee && q.userId !== userId);
            if (potentialMatches.length >= 1) {
                const match = potentialMatches[0];
                // Remove both from queue
                this.matchmakingQueue = this.matchmakingQueue.filter(q => q.userId !== userId && q.userId !== match.userId);
                // Deduct fees
                const deductedUser = await this.deductEntryFee(userId, entryFee);
                const deductedMatch = await this.deductEntryFee(match.userId, entryFee);
                if (!deductedUser || !deductedMatch) {
                    // Refund if one failed
                    if (deductedUser) {
                        await User_1.User.findByIdAndUpdate(userId, { $inc: { 'balance.deposit': entryFee } });
                    }
                    if (deductedMatch) {
                        await User_1.User.findByIdAndUpdate(match.userId, { $inc: { 'balance.deposit': entryFee } });
                    }
                    this.io.to(socket.id).emit('matchmake:error', 'Fee deduction failed. Match cancelled.');
                    this.io.to(match.socketId).emit('matchmake:error', 'Fee deduction failed. Match cancelled.');
                    return;
                }
                // Initialize Game Session
                const roomId = 'ROOM' + crypto_1.default.randomBytes(3).toString('hex').toUpperCase();
                const player1 = await User_1.User.findById(userId);
                const player2 = await User_1.User.findById(match.userId);
                const newGame = new GameSession_1.GameSession({
                    roomId,
                    status: 'active',
                    entryFee,
                    prizePool: entryFee * 2 * 0.9, // 10% platform fee
                    isPrivate: false,
                    players: [
                        {
                            userId: player1._id,
                            name: player1.name,
                            avatar: player1.avatar,
                            color: 'red',
                            isReady: true,
                            isDisconnected: false,
                            skipCount: 0
                        },
                        {
                            userId: player2._id,
                            name: player2.name,
                            avatar: player2.avatar,
                            color: 'green',
                            isReady: true,
                            isDisconnected: false,
                            skipCount: 0
                        }
                    ],
                    turn: player1._id,
                    turnIndex: 0,
                    hasRolled: false
                });
                await newGame.save();
                // Bind sockets to the room
                const s1 = this.io.sockets.sockets.get(socket.id);
                const s2 = this.io.sockets.sockets.get(match.socketId);
                s1?.join(roomId);
                s2?.join(roomId);
                // Broadcast game starting
                this.io.to(roomId).emit('game:started', this.getGameSyncPayload(newGame));
                this.startTurnTimers(roomId);
                console.log(`[Matchmaking] Match found! Created room ${roomId} for users ${userId} and ${match.userId}`);
            }
        }
        catch (err) {
            console.error('[Matchmaking] Error:', err);
            socket.emit('matchmake:error', 'Matchmaking failed. Try again.');
        }
    }
    handleCancelMatchmaking(userId) {
        this.matchmakingQueue = this.matchmakingQueue.filter(q => q.userId !== userId);
        const socketId = this.userSockets.get(userId);
        if (socketId) {
            this.io.to(socketId).emit('matchmake:cancelled');
        }
    }
    /**
     * Automatically matches the player with an AI Bot after a 10s timeout
     */
    async checkAndStartBotMatch(userId, entryFee) {
        try {
            // Check if user is still in matchmaking queue
            const queueIndex = this.matchmakingQueue.findIndex(q => q.userId === userId);
            if (queueIndex === -1)
                return; // User already matched or cancelled
            const queueItem = this.matchmakingQueue[queueIndex];
            // Remove from queue
            this.matchmakingQueue.splice(queueIndex, 1);
            console.log(`[Matchmaking] 10s timeout reached for user ${userId}. Starting match against AI Bot.`);
            // Deduct entry fee for user
            const deductedUser = await this.deductEntryFee(userId, entryFee);
            if (!deductedUser) {
                const socketId = this.userSockets.get(userId);
                if (socketId) {
                    this.io.to(socketId).emit('matchmake:error', 'Fee deduction failed. Match cancelled.');
                }
                return;
            }
            // Find or create Bot User
            let botUser = await User_1.User.findOne({ email: 'bot@ludomaster.com' });
            if (!botUser) {
                botUser = new User_1.User({
                    email: 'bot@ludomaster.com',
                    name: 'AI Bot',
                    avatar: 'avatar_5',
                    isVerified: true,
                    referralCode: 'BOTREF',
                    balance: { deposit: 1000, win: 0, bonus: 0 },
                    role: 'user',
                    status: 'active'
                });
                await botUser.save();
            }
            const player1 = await User_1.User.findById(userId);
            const roomId = 'ROOM' + crypto_1.default.randomBytes(3).toString('hex').toUpperCase();
            const newGame = new GameSession_1.GameSession({
                roomId,
                status: 'active',
                entryFee,
                prizePool: entryFee * 2 * 0.9, // 10% platform fee
                isPrivate: false,
                players: [
                    {
                        userId: player1._id,
                        name: player1.name,
                        avatar: player1.avatar,
                        color: 'red',
                        isReady: true,
                        isDisconnected: false,
                        skipCount: 0
                    },
                    {
                        userId: botUser._id,
                        name: botUser.name,
                        avatar: botUser.avatar,
                        color: 'green',
                        isReady: true,
                        isDisconnected: false,
                        skipCount: 0
                    }
                ],
                turn: player1._id,
                turnIndex: 0,
                hasRolled: false
            });
            await newGame.save();
            // Bind socket to room
            const s1 = this.io.sockets.sockets.get(queueItem.socketId);
            s1?.join(roomId);
            // Broadcast game starting
            this.io.to(roomId).emit('game:started', this.getGameSyncPayload(newGame));
            this.startTurnTimers(roomId);
            console.log(`[Matchmaking] Room ${roomId} created: User ${userId} vs AI Bot.`);
        }
        catch (err) {
            console.error('[Matchmaking] Bot match initialization error:', err);
        }
    }
    /**
     * Create Private Game Room
     */
    async handleCreatePrivateRoom(socket, userId, entryFee) {
        try {
            const user = await User_1.User.findById(userId);
            if (!user)
                return socket.emit('error', 'User not found');
            const totalBalance = user.balance.bonus + user.balance.deposit + user.balance.win;
            if (totalBalance < entryFee) {
                return socket.emit('room:error', 'Insufficient balance to host room.');
            }
            // Deduct entry fee
            const deducted = await this.deductEntryFee(userId, entryFee);
            if (!deducted)
                return socket.emit('room:error', 'Balance deduction failed.');
            const roomId = 'LUDO' + crypto_1.default.randomInt(1000, 9999).toString();
            const newGame = new GameSession_1.GameSession({
                roomId,
                status: 'waiting',
                entryFee,
                prizePool: entryFee * 2 * 0.9, // 10% platform fee
                isPrivate: true,
                players: [
                    {
                        userId: user._id,
                        name: user.name,
                        avatar: user.avatar,
                        color: 'red',
                        isReady: true,
                        isDisconnected: false,
                        skipCount: 0
                    }
                ]
            });
            await newGame.save();
            socket.join(roomId);
            socket.emit('room:created', { roomId, entryFee });
            console.log(`[Private Room] Room ${roomId} created by host ${userId}`);
        }
        catch (err) {
            console.error('[Private Room] Creation error:', err);
            socket.emit('room:error', 'Failed to create room.');
        }
    }
    /**
     * Join Private Game Room
     */
    async handleJoinPrivateRoom(socket, userId, roomId) {
        try {
            const game = await GameSession_1.GameSession.findOne({ roomId, status: 'waiting' });
            if (!game) {
                return socket.emit('room:error', 'Room does not exist or has already started.');
            }
            // Prevent hosting duplicate joins
            if (game.players.some(p => p.userId.toString() === userId)) {
                return socket.emit('room:error', 'You are already in this room.');
            }
            const user = await User_1.User.findById(userId);
            if (!user)
                return socket.emit('error', 'User not found');
            const totalBalance = user.balance.bonus + user.balance.deposit + user.balance.win;
            if (totalBalance < game.entryFee) {
                return socket.emit('room:error', 'Insufficient balance to enter this room.');
            }
            // Deduct entry fee
            const deducted = await this.deductEntryFee(userId, game.entryFee);
            if (!deducted)
                return socket.emit('room:error', 'Fee deduction failed.');
            // Add to room players (Assign color Green for Player 2)
            game.players.push({
                userId: user._id,
                name: user.name,
                avatar: user.avatar,
                color: 'green',
                isReady: true,
                isDisconnected: false,
                skipCount: 0,
                tokens: [
                    { id: 0, position: -1, isSafe: true },
                    { id: 1, position: -1, isSafe: true },
                    { id: 2, position: -1, isSafe: true },
                    { id: 3, position: -1, isSafe: true }
                ]
            });
            // Start the game immediately
            game.status = 'active';
            game.turn = game.players[0].userId;
            game.turnIndex = 0;
            game.hasRolled = false;
            await game.save();
            socket.join(roomId);
            // Broadcast game starting
            this.io.to(roomId).emit('game:started', this.getGameSyncPayload(game));
            this.startTurnTimers(roomId);
            console.log(`[Private Room] User ${userId} joined room ${roomId}. Game started.`);
        }
        catch (err) {
            console.error('[Private Room] Joining error:', err);
            socket.emit('room:error', 'Failed to join room.');
        }
    }
    /**
     * Handle Dice Roll Requests
     */
    async handleDiceRoll(socket, userId) {
        try {
            const game = await GameSession_1.GameSession.findOne({ status: 'active', 'players.userId': userId });
            if (!game)
                return socket.emit('error', 'Game session not found.');
            if (game.turn?.toString() !== userId) {
                return socket.emit('game:error', 'It is not your turn.');
            }
            if (game.hasRolled) {
                return socket.emit('game:error', 'You have already rolled the dice.');
            }
            // Clear roll timeout timer
            this.clearRoomTimers(game.roomId, 'roll');
            // Secure cryptographic random roll (1 to 6)
            const rolledValue = crypto_1.default.randomInt(1, 7);
            game.diceValue = rolledValue;
            game.hasRolled = true;
            // Log roll history
            const playerColor = game.players.find(p => p.userId.toString() === userId).color;
            game.rollHistory.push({
                playerId: userId,
                color: playerColor,
                diceValue: rolledValue,
                timestamp: new Date()
            });
            console.log(`[Game Loop] Room ${game.roomId} - User ${userId} (${playerColor}) rolled a ${rolledValue}`);
            // Check if there are any valid moves for this player with this roll
            const activePlayer = game.players[game.turnIndex];
            const movesAvailable = (0, ludoEngine_1.hasValidMoves)(activePlayer, rolledValue);
            if (!movesAvailable) {
                // No moves available, save game state, broadcast roll and auto-skip to next player after 1.5 seconds delay
                await game.save();
                this.io.to(game.roomId).emit('game:rolled', {
                    diceValue: rolledValue,
                    hasMoves: false,
                    turn: game.turn,
                    rollHistory: game.rollHistory
                });
                setTimeout(async () => {
                    await this.transitionTurn(game.roomId);
                }, 1500);
            }
            else {
                // Valid moves exist, start the move selection timeout (15 seconds)
                await game.save();
                this.io.to(game.roomId).emit('game:rolled', {
                    diceValue: rolledValue,
                    hasMoves: true,
                    turn: game.turn,
                    rollHistory: game.rollHistory
                });
                this.startTurnTimers(game.roomId, 'move');
            }
        }
        catch (err) {
            console.error('[Game Loop] Roll error:', err);
        }
    }
    /**
     * Handle Move token request
     */
    async handleTokenMove(socket, userId, tokenId) {
        try {
            const game = await GameSession_1.GameSession.findOne({ status: 'active', 'players.userId': userId });
            if (!game)
                return socket.emit('error', 'Game not found.');
            if (game.turn?.toString() !== userId) {
                return socket.emit('game:error', 'Not your turn.');
            }
            if (!game.hasRolled || !game.diceValue) {
                return socket.emit('game:error', 'You must roll the dice first.');
            }
            const activePlayer = game.players[game.turnIndex];
            // Anti-cheat validation: check if chosen token move is valid
            if (!(0, ludoEngine_1.isValidMove)(activePlayer, tokenId, game.diceValue)) {
                return socket.emit('game:error', 'Invalid move selection for this token.');
            }
            // Clear move selection timeout
            this.clearRoomTimers(game.roomId, 'move');
            // Save token positions before executing move
            const currentToken = activePlayer.tokens.find(t => t.id === tokenId);
            const fromPos = currentToken.position;
            // Execute movement
            const moveResult = (0, ludoEngine_1.executeTokenMove)(game.players, game.turnIndex, tokenId, game.diceValue);
            // Record move history
            const finalPos = currentToken.position;
            game.moveHistory.push({
                playerId: userId,
                color: activePlayer.color,
                tokenId,
                from: fromPos,
                to: finalPos,
                diceValue: game.diceValue,
                timestamp: new Date()
            });
            console.log(`[Game Loop] Room ${game.roomId} - Moved token ${tokenId} from ${fromPos} to ${finalPos}`);
            if (moveResult.gameCompleted) {
                // Complete Game!
                game.status = 'completed';
                game.winner = userId;
                await game.save();
                // Credit funds to winner wallet
                const prize = game.prizePool;
                const winner = await User_1.User.findById(userId);
                if (winner) {
                    winner.balance.win += prize;
                    winner.gameStats.played += 1;
                    winner.gameStats.won += 1;
                    await winner.save();
                    // Log transaction
                    await new Transaction_1.Transaction({
                        userId: winner._id,
                        type: 'game_win',
                        amount: prize,
                        balanceType: 'win',
                        status: 'completed',
                        description: `Won prize money for game roomId: ${game.roomId}`
                    }).save();
                }
                // Update losers stats
                const loserPlayers = game.players.filter(p => p.userId.toString() !== userId);
                for (const loser of loserPlayers) {
                    const u = await User_1.User.findById(loser.userId);
                    if (u) {
                        u.gameStats.played += 1;
                        u.gameStats.lost += 1;
                        await u.save();
                    }
                }
                this.io.to(game.roomId).emit('game:ended', {
                    winnerId: userId,
                    winnerName: activePlayer.name,
                    players: game.players,
                    moveHistory: game.moveHistory
                });
                this.clearRoomTimers(game.roomId);
                console.log(`[Game Loop] Game completed in room ${game.roomId}. Winner is ${userId} (Prize: ${prize})`);
            }
            else {
                // Game continues, update turn parameters
                game.turn = new mongoose_1.Types.ObjectId(moveResult.nextPlayerId);
                game.turnIndex = game.players.findIndex(p => p.userId.toString() === moveResult.nextPlayerId);
                game.hasRolled = false;
                game.diceValue = undefined;
                await game.save();
                // Broadcast move execution and state update
                this.io.to(game.roomId).emit('game:moved', {
                    players: game.players,
                    moveHistory: game.moveHistory,
                    nextTurn: game.turn,
                    captured: moveResult.capturedTokens
                });
                // Restart rolling timer for next turn
                this.startTurnTimers(game.roomId);
            }
        }
        catch (err) {
            console.error('[Game Loop] Move error:', err);
        }
    }
    /**
     * Handles text chat broadcast inside room
     */
    handleChat(socket, userId, message) {
        // Find room the socket is in
        const rooms = Array.from(socket.rooms);
        const gameRoom = rooms.find(r => r.startsWith('ROOM') || r.startsWith('LUDO'));
        if (gameRoom) {
            socket.to(gameRoom).emit('game:chat_message', { userId, message });
        }
    }
    /**
     * Handle user disconnection
     */
    async handleDisconnect(socket, userId) {
        console.log(`[Socket] Client disconnected: ${socket.id} (User: ${userId})`);
        this.userSockets.delete(userId);
        SocketService.activeUsers.delete(userId);
        // Notify friends this user is now offline
        this.broadcastOnlineStatus(userId, false);
        try {
            await User_1.User.findByIdAndUpdate(userId, { lastSeen: new Date() });
        }
        catch (err) {
            console.error('[Socket] Failed to update user lastSeen on disconnect:', err);
        }
        // Check if user has an active game running
        const game = await GameSession_1.GameSession.findOne({ status: 'active', 'players.userId': userId });
        if (game) {
            const player = game.players.find(p => p.userId.toString() === userId);
            if (player) {
                player.isDisconnected = true;
                await game.save();
            }
            // Notify others in room
            this.io.to(game.roomId).emit('game:player_disconnected', { userId });
            console.log(`[Socket] User ${userId} disconnected from room ${game.roomId}. Timer continues...`);
        }
        // Remove from queue if matchmaking
        this.matchmakingQueue = this.matchmakingQueue.filter(q => q.userId !== userId);
    }
    /**
     * Starts turn timers for roll/move actions in active room
     */
    async startTurnTimers(roomId, mode = 'roll') {
        this.clearRoomTimers(roomId);
        try {
            const game = await GameSession_1.GameSession.findOne({ roomId, status: 'active' });
            if (game) {
                const activePlayer = game.players[game.turnIndex];
                if (activePlayer && activePlayer.name === 'AI Bot') {
                    this.checkAndExecuteBotTurn(roomId);
                    return;
                }
            }
        }
        catch (err) {
            console.error('[SocketService] Error checking active player for turn timers:', err);
        }
        const roomTimers = {};
        if (mode === 'roll') {
            roomTimers.rollTimeout = setTimeout(async () => {
                console.log(`[Timeout Service] Roll timeout expired for room ${roomId}`);
                await this.handleRollTimeout(roomId);
            }, 15000); // 15 seconds
        }
        else if (mode === 'move') {
            roomTimers.moveTimeout = setTimeout(async () => {
                console.log(`[Timeout Service] Move timeout expired for room ${roomId}`);
                await this.handleMoveTimeout(roomId);
            }, 15000); // 15 seconds
        }
        this.activeTimers.set(roomId, roomTimers);
    }
    /**
     * Checks if it is the Bot's turn and triggers the Bot roll action
     */
    async checkAndExecuteBotTurn(roomId) {
        try {
            const game = await GameSession_1.GameSession.findOne({ roomId, status: 'active' });
            if (!game)
                return;
            const activePlayer = game.players[game.turnIndex];
            if (activePlayer.name !== 'AI Bot')
                return;
            console.log(`[Bot Engine] Executing Bot turn for room ${roomId}`);
            this.clearRoomTimers(roomId);
            // Simulate Thinking and roll after 1.5 seconds
            setTimeout(async () => {
                await this.executeBotAction(roomId);
            }, 1500);
        }
        catch (err) {
            console.error('[Bot Engine] Error checking bot turn:', err);
        }
    }
    /**
     * Performs the bot dice roll, broadcasts to the room, and plans next move
     */
    async executeBotAction(roomId) {
        try {
            const game = await GameSession_1.GameSession.findOne({ roomId, status: 'active' });
            if (!game)
                return;
            const activePlayer = game.players[game.turnIndex];
            if (activePlayer.name !== 'AI Bot')
                return;
            const rolledValue = crypto_1.default.randomInt(1, 7);
            game.diceValue = rolledValue;
            game.hasRolled = true;
            game.rollHistory.push({
                playerId: activePlayer.userId,
                color: activePlayer.color,
                diceValue: rolledValue,
                timestamp: new Date()
            });
            console.log(`[Bot Engine] Bot rolled a ${rolledValue} in room ${roomId}`);
            const movesAvailable = (0, ludoEngine_1.hasValidMoves)(activePlayer, rolledValue);
            await game.save();
            this.io.to(roomId).emit('game:rolled', {
                diceValue: rolledValue,
                hasMoves: movesAvailable,
                turn: game.turn,
                rollHistory: game.rollHistory
            });
            if (!movesAvailable) {
                setTimeout(async () => {
                    await this.transitionTurn(roomId);
                }, 1500);
                return;
            }
            // Simulate Thinking and make move after 1.5 seconds
            setTimeout(async () => {
                await this.executeBotMove(roomId);
            }, 1500);
        }
        catch (err) {
            console.error('[Bot Engine] Error executing bot action:', err);
        }
    }
    /**
     * Scores all valid moves and executes the best one
     */
    async executeBotMove(roomId) {
        try {
            const game = await GameSession_1.GameSession.findOne({ roomId, status: 'active' });
            if (!game)
                return;
            const activePlayer = game.players[game.turnIndex];
            if (activePlayer.name !== 'AI Bot')
                return;
            const diceValue = game.diceValue || 1;
            const validMoves = [];
            activePlayer.tokens.forEach((token) => {
                if (!(0, ludoEngine_1.isValidMove)(activePlayer, token.id, diceValue)) {
                    return;
                }
                const fromPos = token.position;
                const toPos = fromPos === -1 ? 0 : fromPos + diceValue;
                let score = 0;
                // 1. Capture Opportunity
                const toGlobalCell = (0, ludoEngine_1.mapStepToCommonTrack)(activePlayer.color, toPos);
                if (toGlobalCell !== -1 && !(0, ludoEngine_1.isCellSafe)(toGlobalCell)) {
                    let hasCapture = false;
                    for (let pIdx = 0; pIdx < game.players.length; pIdx++) {
                        if (pIdx === game.turnIndex)
                            continue;
                        const otherPlayer = game.players[pIdx];
                        for (const otherToken of otherPlayer.tokens) {
                            const otherGlobalCell = (0, ludoEngine_1.mapStepToCommonTrack)(otherPlayer.color, otherToken.position);
                            if (otherGlobalCell === toGlobalCell) {
                                hasCapture = true;
                                break;
                            }
                        }
                    }
                    if (hasCapture) {
                        score += 1000;
                    }
                }
                // 2. Reach Home
                if (toPos === 56) {
                    score += 500;
                }
                // 3. Move token out of Yard
                if (fromPos === -1) {
                    score += 200;
                }
                // 4. Land on Safe Cell
                if (toGlobalCell !== -1 && (0, ludoEngine_1.isCellSafe)(toGlobalCell)) {
                    score += 50;
                }
                // 5. Basic progress bias (favoring token that is further along)
                score += toPos;
                validMoves.push({ tokenId: token.id, score });
            });
            if (validMoves.length === 0) {
                await this.transitionTurn(roomId);
                return;
            }
            // Sort descending and select the highest score
            validMoves.sort((a, b) => b.score - a.score);
            const selectedTokenId = validMoves[0].tokenId;
            const fromPos = activePlayer.tokens.find(t => t.id === selectedTokenId).position;
            const moveResult = (0, ludoEngine_1.executeTokenMove)(game.players, game.turnIndex, selectedTokenId, diceValue);
            game.moveHistory.push({
                playerId: activePlayer.userId,
                color: activePlayer.color,
                tokenId: selectedTokenId,
                from: fromPos,
                to: activePlayer.tokens.find(t => t.id === selectedTokenId).position,
                diceValue,
                timestamp: new Date()
            });
            console.log(`[Bot Engine] Bot moved token ${selectedTokenId} from ${fromPos} to ${activePlayer.tokens.find(t => t.id === selectedTokenId).position}`);
            if (moveResult.gameCompleted) {
                game.status = 'completed';
                game.winner = activePlayer.userId;
                await game.save();
                // Update real user loser statistics
                const humanPlayer = game.players.find(p => p.name !== 'AI Bot');
                if (humanPlayer) {
                    const u = await User_1.User.findById(humanPlayer.userId);
                    if (u) {
                        u.gameStats.played += 1;
                        u.gameStats.lost += 1;
                        await u.save();
                    }
                }
                // Update Bot winner statistics
                const botUser = await User_1.User.findById(activePlayer.userId);
                if (botUser) {
                    botUser.gameStats.played += 1;
                    botUser.gameStats.won += 1;
                    await botUser.save();
                }
                this.io.to(game.roomId).emit('game:ended', {
                    winnerId: activePlayer.userId,
                    winnerName: activePlayer.name,
                    players: game.players,
                    moveHistory: game.moveHistory
                });
                this.clearRoomTimers(roomId);
                console.log(`[Bot Engine] Game completed in room ${game.roomId}. Winner is Bot.`);
            }
            else {
                game.turn = new mongoose_1.Types.ObjectId(moveResult.nextPlayerId);
                game.turnIndex = game.players.findIndex(p => p.userId.toString() === moveResult.nextPlayerId);
                game.hasRolled = false;
                game.diceValue = undefined;
                await game.save();
                this.io.to(game.roomId).emit('game:moved', {
                    players: game.players,
                    moveHistory: game.moveHistory,
                    nextTurn: game.turn,
                    captured: moveResult.capturedTokens
                });
                // Trigger the timers (which checks for bot turn again)
                this.startTurnTimers(roomId);
            }
        }
        catch (err) {
            console.error('[Bot Engine] Error in executeBotMove:', err);
        }
    }
    /**
     * Triggers when player fails to roll dice within 15 seconds
     */
    async handleRollTimeout(roomId) {
        try {
            const game = await GameSession_1.GameSession.findOne({ roomId, status: 'active' });
            if (!game)
                return;
            const activePlayer = game.players[game.turnIndex];
            activePlayer.skipCount += 1;
            console.log(`[Timeout] Player ${activePlayer.name} in Room ${roomId} missed roll. Skip count: ${activePlayer.skipCount}`);
            if (activePlayer.skipCount >= 3) {
                // Kick out player (resign / auto-defeat)
                await this.handlePlayerResign(game, activePlayer.userId.toString());
            }
            else {
                // Auto-roll dice on behalf of the player to keep game moving (Anti-stuck)
                const rollVal = crypto_1.default.randomInt(1, 7);
                game.diceValue = rollVal;
                game.hasRolled = true;
                game.rollHistory.push({
                    playerId: activePlayer.userId,
                    color: activePlayer.color,
                    diceValue: rollVal,
                    timestamp: new Date()
                });
                const movesAvailable = (0, ludoEngine_1.hasValidMoves)(activePlayer, rollVal);
                await game.save();
                this.io.to(roomId).emit('game:rolled', {
                    diceValue: rollVal,
                    hasMoves: movesAvailable,
                    turn: game.turn,
                    rollHistory: game.rollHistory,
                    autoRolled: true
                });
                if (!movesAvailable) {
                    setTimeout(async () => {
                        await this.transitionTurn(roomId);
                    }, 1500);
                }
                else {
                    // Player has moves, give them another 15s to choose token or they will get auto-moved
                    this.startTurnTimers(roomId, 'move');
                }
            }
        }
        catch (err) {
            console.error('[Timeout Service] Roll timeout execution error:', err);
        }
    }
    /**
     * Triggers when player rolls dice but fails to select token within 15 seconds
     */
    async handleMoveTimeout(roomId) {
        try {
            const game = await GameSession_1.GameSession.findOne({ roomId, status: 'active' });
            if (!game)
                return;
            const activePlayer = game.players[game.turnIndex];
            activePlayer.skipCount += 1;
            console.log(`[Timeout] Player ${activePlayer.name} in Room ${roomId} missed move. Skip count: ${activePlayer.skipCount}`);
            if (activePlayer.skipCount >= 3) {
                await this.handlePlayerResign(game, activePlayer.userId.toString());
            }
            else {
                // Auto-select first token that has a valid move and move it
                let selectedTokenId = -1;
                for (const token of activePlayer.tokens) {
                    if ((0, ludoEngine_1.isValidMove)(activePlayer, token.id, game.diceValue || 1)) {
                        selectedTokenId = token.id;
                        break;
                    }
                }
                if (selectedTokenId !== -1) {
                    const fromPos = activePlayer.tokens.find(t => t.id === selectedTokenId).position;
                    const moveResult = (0, ludoEngine_1.executeTokenMove)(game.players, game.turnIndex, selectedTokenId, game.diceValue || 1);
                    game.moveHistory.push({
                        playerId: activePlayer.userId,
                        color: activePlayer.color,
                        tokenId: selectedTokenId,
                        from: fromPos,
                        to: activePlayer.tokens.find(t => t.id === selectedTokenId).position,
                        diceValue: game.diceValue || 1,
                        timestamp: new Date()
                    });
                    if (moveResult.gameCompleted) {
                        // Complete game
                        game.status = 'completed';
                        game.winner = activePlayer.userId;
                        await game.save();
                        // Credit Winner wallet
                        const prize = game.prizePool;
                        const winner = await User_1.User.findById(activePlayer.userId);
                        if (winner) {
                            winner.balance.win += prize;
                            winner.gameStats.played += 1;
                            winner.gameStats.won += 1;
                            await winner.save();
                            await new Transaction_1.Transaction({
                                userId: winner._id,
                                type: 'game_win',
                                amount: prize,
                                balanceType: 'win',
                                status: 'completed',
                                description: `Won prize money for game roomId: ${game.roomId}`
                            }).save();
                        }
                        // Update losers stats
                        const losers = game.players.filter(p => p.userId.toString() !== activePlayer.userId.toString());
                        for (const loser of losers) {
                            const u = await User_1.User.findById(loser.userId);
                            if (u) {
                                u.gameStats.played += 1;
                                u.gameStats.lost += 1;
                                await u.save();
                            }
                        }
                        this.io.to(roomId).emit('game:ended', {
                            winnerId: activePlayer.userId,
                            winnerName: activePlayer.name,
                            players: game.players,
                            moveHistory: game.moveHistory
                        });
                        this.clearRoomTimers(roomId);
                    }
                    else {
                        // Continue
                        game.turn = new mongoose_1.Types.ObjectId(moveResult.nextPlayerId);
                        game.turnIndex = game.players.findIndex(p => p.userId.toString() === moveResult.nextPlayerId);
                        game.hasRolled = false;
                        game.diceValue = undefined;
                        await game.save();
                        this.io.to(roomId).emit('game:moved', {
                            players: game.players,
                            moveHistory: game.moveHistory,
                            nextTurn: game.turn,
                            captured: moveResult.capturedTokens,
                            autoMoved: true
                        });
                        this.startTurnTimers(roomId);
                    }
                }
                else {
                    // If somehow no valid moves (shouldn't happen because hasMoves was checked), transition turn
                    await this.transitionTurn(roomId);
                }
            }
        }
        catch (err) {
            console.error('[Timeout Service] Move timeout execution error:', err);
        }
    }
    /**
     * Resigns a player immediately (due to 3 timeouts/skips)
     */
    async handlePlayerResign(game, resignUserId) {
        game.status = 'completed';
        // Find the other player as winner
        const winnerPlayer = game.players.find(p => p.userId.toString() !== resignUserId);
        if (!winnerPlayer)
            return;
        game.winner = winnerPlayer.userId;
        await game.save();
        // Credit winner
        const prize = game.prizePool;
        const winner = await User_1.User.findById(winnerPlayer.userId);
        if (winner) {
            winner.balance.win += prize;
            winner.gameStats.played += 1;
            winner.gameStats.won += 1;
            await winner.save();
            await new Transaction_1.Transaction({
                userId: winner._id,
                type: 'game_win',
                amount: prize,
                balanceType: 'win',
                status: 'completed',
                description: `Won match by opponent resignation. Room ID: ${game.roomId}`
            }).save();
        }
        // Loser stats update
        const loser = await User_1.User.findById(resignUserId);
        if (loser) {
            loser.gameStats.played += 1;
            loser.gameStats.lost += 1;
            await loser.save();
        }
        this.io.to(game.roomId).emit('game:ended', {
            winnerId: winnerPlayer.userId,
            winnerName: winnerPlayer.name,
            resignedId: resignUserId,
            players: game.players,
            moveHistory: game.moveHistory
        });
        this.clearRoomTimers(game.roomId);
        console.log(`[Game Loop] Player ${resignUserId} auto-resigned due to skips. Winner: ${winnerPlayer.userId}`);
    }
    /**
     * Transitions active turn to the next player
     */
    async transitionTurn(roomId) {
        try {
            const game = await GameSession_1.GameSession.findOne({ roomId, status: 'active' });
            if (!game)
                return;
            let nextIdx = game.turnIndex;
            do {
                nextIdx = (nextIdx + 1) % game.players.length;
            } while (game.players[nextIdx].tokens.every(t => t.position === 56) &&
                nextIdx !== game.turnIndex);
            game.turn = game.players[nextIdx].userId;
            game.turnIndex = nextIdx;
            game.hasRolled = false;
            game.diceValue = undefined;
            await game.save();
            this.io.to(roomId).emit('game:turn_changed', {
                nextTurn: game.turn,
                players: game.players
            });
            this.startTurnTimers(roomId);
        }
        catch (err) {
            console.error('[Game Loop] Error during turn transition:', err);
        }
    }
    /**
     * Clear active timeouts for a room
     */
    clearRoomTimers(roomId, type = 'all') {
        const timers = this.activeTimers.get(roomId);
        if (!timers)
            return;
        if ((type === 'all' || type === 'roll') && timers.rollTimeout) {
            clearTimeout(timers.rollTimeout);
            timers.rollTimeout = undefined;
        }
        if ((type === 'all' || type === 'move') && timers.moveTimeout) {
            clearTimeout(timers.moveTimeout);
            timers.moveTimeout = undefined;
        }
        if (!timers.rollTimeout && !timers.moveTimeout) {
            this.activeTimers.delete(roomId);
        }
        else {
            this.activeTimers.set(roomId, timers);
        }
    }
    /**
     * Builds client-facing payload for game sync
     */
    getGameSyncPayload(game) {
        return {
            roomId: game.roomId,
            players: game.players,
            status: game.status,
            entryFee: game.entryFee,
            prizePool: game.prizePool,
            winner: game.winner,
            turn: game.turn,
            turnIndex: game.turnIndex,
            diceValue: game.diceValue,
            hasRolled: game.hasRolled,
            rollHistory: game.rollHistory,
            moveHistory: game.moveHistory,
            isPrivate: game.isPrivate
        };
    }
}
exports.SocketService = SocketService;
