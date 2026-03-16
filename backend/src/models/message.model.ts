import mongoose, { Document, Schema } from 'mongoose'

export interface MessageDocument extends Document {
  chatId: mongoose.Types.ObjectId
  sender: mongoose.Types.ObjectId
  content?: string
  image?: string
  replyTo?: mongoose.Types.ObjectId
  type?: string
  participantsCall?: mongoose.Types.ObjectId[]
  duration?: number
  startedAt?: Date
  endedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const messageSchema = new Schema<MessageDocument>(
  {
    chatId: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
    },
    content: { type: String },
    image: { type: String },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    type: { type: String, enum: ['CALL', 'CHAT'], default: 'CHAT' },
    participantsCall: [{ type: Schema.Types.ObjectId }],
    duration: { type: Number },
    startedAt: { type: Date },
    endedAt: { type: Date },
  },
  {
    timestamps: true,
  },
)

messageSchema.index({ chatId: 1, createdAt: -1 })
messageSchema.index({ sender: 1, createdAt: -1 })
messageSchema.index({ content: 'text' })
messageSchema.index({ chatId: 1, type: 1, createdAt: -1 })
messageSchema.index({ replyTo: 1 })

const MessageModel = mongoose.model<MessageDocument>('Message', messageSchema)

export default MessageModel
