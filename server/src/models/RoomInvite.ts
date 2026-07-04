import { Schema, model, Document, Types } from 'mongoose';

export interface IRoomInvite extends Document {
  roomId: string;
  inviterId: Types.ObjectId;
  inviteeId: Types.ObjectId;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
  updatedAt: Date;
}

const RoomInviteSchema = new Schema<IRoomInvite>(
  {
    roomId: { type: String, required: true, index: true },
    inviterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    inviteeId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending', index: true }
  },
  { timestamps: true }
);

// Prevent duplicate pending/active invites for the same room to the same user
RoomInviteSchema.index({ roomId: 1, inviteeId: 1 }, { unique: true });

export const RoomInvite = model<IRoomInvite>('RoomInvite', RoomInviteSchema);
export default RoomInvite;
