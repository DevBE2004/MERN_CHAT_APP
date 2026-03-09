import mongoose, { Document, Schema } from 'mongoose'

export interface ChatDocument extends Document {
  participants: mongoose.Types.ObjectId[]
  lastMessage: mongoose.Types.ObjectId
  isGroup: boolean
  groupName: string
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const chatSchema = new Schema<ChatDocument>(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    isGroup: {
      type: Boolean,
      default: false,
    },
    groupName: {
      type: String,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

chatSchema.index({ participants: 1, updatedAt: -1 })

const ChatModel = mongoose.model<ChatDocument>('Chat', chatSchema)
export default ChatModel
