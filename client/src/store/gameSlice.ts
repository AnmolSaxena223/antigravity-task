import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface PlayerToken {
  id: number;
  position: number;
  isSafe: boolean;
}

export interface GamePlayer {
  userId: string;
  name: string;
  avatar: string;
  color: 'red' | 'green' | 'yellow' | 'blue';
  isReady: boolean;
  isDisconnected: boolean;
  tokens: PlayerToken[];
  skipCount: number;
}

export interface RollRecord {
  playerId: string;
  color: string;
  diceValue: number;
  timestamp: string;
}

export interface MoveRecord {
  playerId: string;
  color: string;
  tokenId: number;
  from: number;
  to: number;
  diceValue: number;
  timestamp: string;
}

export interface GameSessionState {
  roomId: string;
  players: GamePlayer[];
  status: 'waiting' | 'active' | 'completed' | 'cancelled';
  entryFee: number;
  prizePool: number;
  winner?: string;
  turn?: string;
  turnIndex: number;
  diceValue?: number;
  hasRolled: boolean;
  rollHistory: RollRecord[];
  moveHistory: MoveRecord[];
  isPrivate: boolean;
}

export interface ChatMessage {
  userId: string;
  name: string;
  message: string;
  timestamp: string;
}

interface GameState {
  currentGame: GameSessionState | null;
  matchmaking: boolean;
  matchmakingFee: number | null;
  error: string | null;
  chats: ChatMessage[];
}

const initialState: GameState = {
  currentGame: null,
  matchmaking: false,
  matchmakingFee: null,
  error: null,
  chats: []
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    startMatchmaking: (state, action: PayloadAction<number>) => {
      state.matchmaking = true;
      state.matchmakingFee = action.payload;
      state.error = null;
    },
    cancelMatchmaking: (state) => {
      state.matchmaking = false;
      state.matchmakingFee = null;
    },
    setGameSession: (state, action: PayloadAction<GameSessionState>) => {
      state.currentGame = action.payload;
      state.matchmaking = false;
      state.matchmakingFee = null;
      state.error = null;
    },
    updateGamePlayers: (state, action: PayloadAction<GamePlayer[]>) => {
      if (state.currentGame) {
        state.currentGame.players = action.payload;
      }
    },
    updateDiceRoll: (state, action: PayloadAction<{ diceValue: number; hasMoves: boolean; turn: string; rollHistory: RollRecord[] }>) => {
      if (state.currentGame) {
        state.currentGame.diceValue = action.payload.diceValue;
        state.currentGame.hasRolled = true;
        state.currentGame.rollHistory = action.payload.rollHistory;
        state.currentGame.turn = action.payload.turn;
      }
    },
    updateMove: (state, action: PayloadAction<{ players: GamePlayer[]; moveHistory: MoveRecord[]; nextTurn: string }>) => {
      if (state.currentGame) {
        state.currentGame.players = action.payload.players;
        state.currentGame.moveHistory = action.payload.moveHistory;
        state.currentGame.turn = action.payload.nextTurn;
        state.currentGame.hasRolled = false;
        state.currentGame.diceValue = undefined;
      }
    },
    updateTurnChanged: (state, action: PayloadAction<{ nextTurn: string; players: GamePlayer[] }>) => {
      if (state.currentGame) {
        state.currentGame.turn = action.payload.nextTurn;
        state.currentGame.players = action.payload.players;
        state.currentGame.hasRolled = false;
        state.currentGame.diceValue = undefined;
      }
    },
    setGameEnded: (state, action: PayloadAction<{ winnerId: string; players: GamePlayer[]; moveHistory: MoveRecord[] }>) => {
      if (state.currentGame) {
        state.currentGame.status = 'completed';
        state.currentGame.winner = action.payload.winnerId;
        state.currentGame.players = action.payload.players;
        state.currentGame.moveHistory = action.payload.moveHistory;
      }
    },
    addChatMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.chats.push(action.payload);
    },
    clearGameSession: (state) => {
      state.currentGame = null;
      state.chats = [];
      state.matchmaking = false;
      state.matchmakingFee = null;
      state.error = null;
    },
    setGameError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.matchmaking = false;
    }
  }
});

export const {
  startMatchmaking,
  cancelMatchmaking,
  setGameSession,
  updateGamePlayers,
  updateDiceRoll,
  updateMove,
  updateTurnChanged,
  setGameEnded,
  addChatMessage,
  clearGameSession,
  setGameError
} = gameSlice.actions;

export default gameSlice.reducer;
