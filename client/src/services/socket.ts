import { io, Socket } from 'socket.io-client';
import { store } from '../store';
import {
  setGameSession,
  updateGamePlayers,
  updateDiceRoll,
  updateMove,
  updateTurnChanged,
  setGameEnded,
  addChatMessage,
  setGameError
} from '../store/gameSlice';

const SOCKET_URL = 'http://localhost:5000';

class SocketClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();

  /**
   * Connect to Socket.io server using JWT auth
   */
  public connect(token: string) {
    if (this.socket) {
      if (this.socket.connected) return;
      this.socket.auth = { token };
      this.socket.connect();
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 2000
    });

    this.setupListeners();

    // Register all buffered/accumulated listeners to the newly created socket instance
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach(callback => {
        this.socket?.on(event, callback);
      });
    });
  }

  /**
   * Disconnect socket connection
   */
  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public emit(event: string, data?: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`[Socket Client] Cannot emit event ${event}, socket is not connected.`);
    }
  }

  /**
   * Subscribe to socket event
   */
  public on(event: string, callback: (...args: any[]) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  /**
   * Unsubscribe from socket event
   */
  public off(event: string, callback?: (...args: any[]) => void) {
    if (callback) {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(event);
        }
      }
      if (this.socket) {
        this.socket.off(event, callback);
      }
    } else {
      this.listeners.delete(event);
      if (this.socket) {
        this.socket.off(event);
      }
    }
  }

  /**
   * Attach listeners and map them to Redux actions
   */
  private setupListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[Socket Client] Connected to real-time server.');
    });

    this.socket.on('disconnect', () => {
      console.log('[Socket Client] Disconnected from server.');
    });

    // Game lifecycle events
    this.socket.on('game:started', (gameSession) => {
      store.dispatch(setGameSession(gameSession));
    });

    this.socket.on('game:sync', (gameSession) => {
      store.dispatch(setGameSession(gameSession));
    });

    this.socket.on('game:rolled', (payload) => {
      store.dispatch(updateDiceRoll(payload));
    });

    this.socket.on('game:moved', (payload) => {
      store.dispatch(updateMove(payload));
    });

    this.socket.on('game:turn_changed', (payload) => {
      store.dispatch(updateTurnChanged(payload));
    });

    this.socket.on('game:ended', (payload) => {
      store.dispatch(setGameEnded(payload));
    });

    this.socket.on('game:player_disconnected', ({ userId }) => {
      const currentPlayers = store.getState().game.currentGame?.players;
      if (currentPlayers) {
        const updated = currentPlayers.map(p => 
          p.userId === userId ? { ...p, isDisconnected: true } : p
        );
        store.dispatch(updateGamePlayers(updated));
      }
    });

    this.socket.on('game:player_reconnected', ({ userId }) => {
      const currentPlayers = store.getState().game.currentGame?.players;
      if (currentPlayers) {
        const updated = currentPlayers.map(p => 
          p.userId === userId ? { ...p, isDisconnected: false } : p
        );
        store.dispatch(updateGamePlayers(updated));
      }
    });

    this.socket.on('game:chat_message', (chatMessage) => {
      const player = store.getState().game.currentGame?.players.find(p => p.userId === chatMessage.userId);
      store.dispatch(addChatMessage({
        userId: chatMessage.userId,
        name: player?.name || 'Opponent',
        message: chatMessage.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
    });

    // General error listeners
    this.socket.on('game:error', (errorMsg: string) => {
      store.dispatch(setGameError(errorMsg));
    });

    this.socket.on('room:error', (errorMsg: string) => {
      store.dispatch(setGameError(errorMsg));
    });

    this.socket.on('matchmake:error', (errorMsg: string) => {
      store.dispatch(setGameError(errorMsg));
    });

    this.socket.on('error', (errorMsg: string) => {
      store.dispatch(setGameError(errorMsg));
    });
  }
}

export const socketClient = new SocketClient();
export default socketClient;
