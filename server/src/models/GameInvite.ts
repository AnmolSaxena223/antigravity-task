import { Schema, model, Document, Types } from 'mongoose';

export interface IGameInvite extends Document {
  roomId: string;
  inviter: Types.ObjectId;
  invitee: Types.ObjectId;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
  updatedAt: Date;
}

const GameInviteSchema = new Schema<IGameInvite>(
  {
    roomId: { type: String, required: true, index: true },
    inviter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    invitee: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending', index: true }
  },
  { timestamps: true }
);

// Prevent duplicate active invites for the same room to the same user
GameInviteSchema.index({ roomId: 1, invitee: 1 }, { unique: true });

export const GameInvite = model<IGameInvite>('GameInvite', GameInviteSchema);
export default GameInvite;
