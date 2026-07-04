import { Schema, model, Document, Types } from 'mongoose';

export interface IPlayerToken {
  id: number; // 0, 1, 2, 3
  position: number; // -1 means in yard, 0-51 are common path, 52-56 are home path, 57 is home
  isSafe: boolean;
}

export interface IGamePlayer {
  userId: Types.ObjectId;
  name: string;
  avatar: string;
  color: 'red' | 'green' | 'yellow' | 'blue';
  isReady: boolean;
  isDisconnected: boolean;
  tokens: IPlayerToken[];
  skipCount: number; // For timeout auto-kick
}

export interface IMoveRecord {
  playerId: Types.ObjectId;
  color: string;
  tokenId: number;
  from: number;
  to: number;
  diceValue: number;
  timestamp: Date;
}

export interface IRollRecord {
  playerId: Types.ObjectId;
  color: string;
  diceValue: number;
  timestamp: Date;
}

export interface IGameSession extends Document {
  roomId: string;
  players: IGamePlayer[];
  status: 'waiting' | 'active' | 'completed' | 'cancelled';
  entryFee: number;
  prizePool: number;
  winner?: Types.ObjectId;
  turn?: Types.ObjectId;
  turnIndex: number;
  diceValue?: number;
  hasRolled: boolean;
  rollHistory: IRollRecord[];
  moveHistory: IMoveRecord[];
  turnTimerExpiry?: Date;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PlayerTokenSchema = new Schema<IPlayerToken>({
  id: { type: Number, required: true },
  position: { type: Number, default: -1 }, // -1 is base
  isSafe: { type: Boolean, default: true }
}, { _id: false });

const GamePlayerSchema = new Schema<IGamePlayer>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
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

const MoveRecordSchema = new Schema<IMoveRecord>({
  playerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  color: { type: String, required: true },
  tokenId: { type: Number, required: true },
  from: { type: Number, required: true },
  to: { type: Number, required: true },
  diceValue: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const RollRecordSchema = new Schema<IRollRecord>({
  playerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  color: { type: String, required: true },
  diceValue: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const GameSessionSchema = new Schema<IGameSession>(
  {
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
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    turn: {
      type: Schema.Types.ObjectId,
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
  },
  { timestamps: true }
);

export const GameSession = model<IGameSession>('GameSession', GameSessionSchema);
export default GameSession;
