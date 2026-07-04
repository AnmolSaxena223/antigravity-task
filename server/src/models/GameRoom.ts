import { Schema, model, Document, Types } from 'mongoose';

export interface IRoomPlayer {
  userId: Types.ObjectId;
  name: string;
  avatar: string;
  color: 'red' | 'green' | 'yellow' | 'blue';
  isReady: boolean;
}

export interface IGameRoom extends Document {
  roomId: string;
  hostId: Types.ObjectId;
  players: IRoomPlayer[];
  entryFee: number;
  maxPlayers: number;
  status: 'waiting' | 'active' | 'completed' | 'cancelled';
  gameSessionId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RoomPlayerSchema = new Schema<IRoomPlayer>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    avatar: { type: String, required: true },
    color: { type: String, enum: ['red', 'green', 'yellow', 'blue'], required: true },
    isReady: { type: Boolean, default: false }
  },
  { _id: false }
);

const GameRoomSchema = new Schema<IGameRoom>(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    players: { type: [RoomPlayerSchema], default: [] },
    entryFee: { type: Number, default: 0 },
    maxPlayers: { type: Number, default: 4 },
    status: { type: String, enum: ['waiting', 'active', 'completed', 'cancelled'], default: 'waiting' },
    gameSessionId: { type: Schema.Types.ObjectId, ref: 'GameSession' }
  },
  { timestamps: true }
);

export const GameRoom = model<IGameRoom>('GameRoom', GameRoomSchema);
export default GameRoom;
