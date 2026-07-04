import { Schema, model, Document, Types } from 'mongoose';

export interface IFriend extends Document {
  user: Types.ObjectId;
  friend: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FriendSchema = new Schema<IFriend>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    friend: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

// Compound index for fast lookup of exact friendships
FriendSchema.index({ user: 1, friend: 1 }, { unique: true });

export const Friend = model<IFriend>('Friend', FriendSchema);
export default Friend;
