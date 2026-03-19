import mongoose from 'mongoose'
import { mq } from '../config/rabbitmq.config'
import {
  emitLastMessageToParticipants,
  emitNewMessageToChatRoom,
  emitNotificationToUsers,
} from '../lib/socket'
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
    replyTo?: any
    type?: string
    participantsCall?: mongoose.Types.ObjectId[]
    duration?: number
    startedAt?: Date
    endedAt?: Date
    newMessageId: string
  },
) => {
  const {
    chatId,
    content,
    image,
    replyTo,
    type,
    participantsCall,
    duration,
    startedAt,
    endedAt,
    newMessageId,
  } = body

  const chat = await ChatModel.findOne({
    _id: chatId,
    participants: {
      $in: [userId],
    },
  })
  if (!chat) throw new BadRequestException('Chat not found or unauthorized')

  if (replyTo) {
    const replyMessage = await MessageModel.findOne({
      _id: replyTo,
      chatId,
    })
    if (!replyMessage) throw new NotFoundException('Reply message not found')
  }
  const senderInfo = await UserModel.findById(userId).select('name avatar')
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
    replyTo: replyTo,
    type,
    participantsCall,
    duration,
    startedAt,
    endedAt,
    createdAt: new Date(),
    updatedAt: new Date(),
    __v: 0,
  }

  //websocket emit the new Message to the chat room
  emitNewMessageToChatRoom(userId, chatId, optimisticMessage)

  //websocket emit the lastmessage to members (personnal room user)
  const allParticipantIds = chat.participants.map(id => id.toString())
  emitLastMessageToParticipants(allParticipantIds, chatId, optimisticMessage)

  const payload = {
    type: 'message',
    chatId,
    sender: {
      _id: userId,
      name: senderInfo?.name,
      avatar: senderInfo?.avatar,
    },
    messagePreview: optimisticMessage.content,
  }

  emitNotificationToUsers(allParticipantIds, payload)

  await mq.send({ ...optimisticMessage, replyTo: replyTo?._id })

  return {
    userMessage: optimisticMessage,
    chat,
  }
}

export const updateParticipantMessage = async (messageId: string, userId: string) => {
  return await MessageModel.findByIdAndUpdate(
    messageId,
    { $addToSet: { participantsCall: userId } },
    { new: true },
  )
}

export const initCall = async ({
  messageId,
  chatId,
  sender,
  type = 'CALL',
  participantsCall = [],
  duration = 0,
  startedAt = Date.now(),
  endedAt = Date.now(),
}: {
  messageId: mongoose.Types.ObjectId
  chatId: string
  sender: string
  type?: string
  participantsCall?: string[]
  duration?: number
  startedAt?: any
  endedAt?: any
}) => {
  return await MessageModel.create({
    _id: messageId,
    chatId,
    sender,
    type,
    participantsCall,
    duration,
    startedAt,
    endedAt,
  })
}

export const updateCall = async (
  messageId: string,
  duration: number,
  // chatId: string,
  // userId: string,
) => {
  // const chat = await ChatModel.findOne({
  //   _id: chatId,
  //   participants: {
  //     $in: [userId],
  //   },
  // })
  // if (!chat) throw new BadRequestException('Chat not found or unauthorized')

  // const allParticipantIds = chat.participants.map(id => id.toString())
  // emitLastMessageToParticipants(allParticipantIds, chatId, 'Cuộc gọi.')

  return await MessageModel.findByIdAndUpdate(
    messageId,
    { duration, endedAt: Date.now() },
    { new: true },
  )
}
