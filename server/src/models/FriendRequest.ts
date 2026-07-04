import { Schema, model, Document, Types } from 'mongoose';

export interface IFriendRequest extends Document {
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const FriendRequestSchema = new Schema<IFriendRequest>(
  {
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending', index: true }
  },
  { timestamps: true }
);

// One active request at a time between two users
FriendRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true });

export const FriendRequest = model<IFriendRequest>('FriendRequest', FriendRequestSchema);
export default FriendRequest;
