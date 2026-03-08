import mongoose from 'mongoose'
import { mq } from '../config/rabbitmq.config'
import { emitLastMessageToParticipants, emitNewMessageToChatRoom } from '../lib/socket'
import ChatModel from '../models/chat.model'
import MessageModel from '../models/message.model'
import UserModel from '../models/user.model'
import { BadRequestException, NotFoundException } from '../utils/app-error'

export const sendMessageService = async (
  userId: string,
  body: {
    chatId: string
    content?: string
    image?: string
    replyToId?: string
  },
) => {
  const { chatId, content, image, replyToId } = body

  const chat = await ChatModel.findOne({
    _id: chatId,
    participants: {
      $in: [userId],
    },
  })
  if (!chat) throw new BadRequestException('Chat not found or unauthorized')

  if (replyToId) {
    const replyMessage = await MessageModel.findOne({
      _id: replyToId,
      chatId,
    })
    if (!replyMessage) throw new NotFoundException('Reply message not found')
  }
  const senderInfo = await UserModel.findById(userId).select('name avatar')
  const newMessageId = new mongoose.Types.ObjectId()

  const optimisticMessage = {
    _id: newMessageId,
    chatId: chatId,
    content,
    sender: {
      _id: userId,
      name: senderInfo?.name || 'You',
      avatar: senderInfo?.avatar || '',
    },
    image: image || null,
    replyTo: replyToId,
    createdAt: new Date(),
    updatedAt: new Date(),
    __v: 0,
  }

  //websocket emit the new Message to the chat room
  emitNewMessageToChatRoom(userId, chatId, optimisticMessage)

  //websocket emit the lastmessage to members (personnal room user)
  const allParticipantIds = chat.participants.map(id => id.toString())
  emitLastMessageToParticipants(allParticipantIds, chatId, optimisticMessage)

  await mq.send(optimisticMessage)

  return {
    userMessage: optimisticMessage,
    chat,
  }
}
