import { emitNewChatToParticpants } from '../lib/socket'
import ChatModel from '../models/chat.model'
import MessageModel from '../models/message.model'
import UserModel from '../models/user.model'
import { BadRequestException, NotFoundException } from '../utils/app-error'

export const createChatService = async (
  userId: string,
  body: {
    participantId?: string
    isGroup?: boolean
    participants?: string[]
    groupName?: string
  },
) => {
  const { participantId, isGroup, participants, groupName } = body

  let chat
  let allParticipantIds: string[] = []

  if (isGroup && participants?.length && groupName) {
    allParticipantIds = [userId, ...participants]
    chat = await ChatModel.create({
      participants: allParticipantIds,
      isGroup: true,
      groupName,
      createdBy: userId,
    })
  } else if (participantId) {
    const otherUser = await UserModel.findById(participantId)
    if (!otherUser) throw new NotFoundException('User not found')

    allParticipantIds = [userId, participantId]
    const existingChat = await ChatModel.findOne({
      participants: {
        $all: allParticipantIds,
        $size: 2,
      },
    }).populate('participants', 'name avatar')

    if (existingChat) return existingChat

    chat = await ChatModel.create({
      participants: allParticipantIds,
      isGroup: false,
      createdBy: userId,
    })
  }

  // Implement websocket
  const populatedChat = await chat?.populate('participants', 'name avatar isAI')
  const particpantIdStrings = populatedChat?.participants?.map(p => {
    return p._id?.toString()
  })

  emitNewChatToParticpants(particpantIdStrings, populatedChat)

  return chat
}

export const getUserChatsService = async (userId: string) => {
  return await ChatModel.find({
    participants: userId,
  })
    .select('participants lastMessage isGroup groupName updatedAt')
    .populate('participants', 'name avatar')

    .populate({
      path: 'lastMessage',
      select: 'content createdAt sender',
      populate: {
        path: 'sender',
        select: 'name avatar',
      },
    })

    .sort({ updatedAt: -1 })
    .lean()
}

export const getSingleChatService = async (
  chatId: string,
  userId: string,
  page: number = 1,
  limit: number = 20,
) => {
  const chat = await ChatModel.findOne({
    _id: chatId,
    participants: userId,
  })
    .populate('participants', 'name avatar')
    .lean()

  if (!chat) throw new BadRequestException('Chat not found or access denied')

  const skip = (page - 1) * limit
  const messages = await MessageModel.find({ chatId })
    .sort({ createdAt: -1 }) // Lấy từ mới nhất trước
    .skip(skip)
    .limit(limit)
    .populate('sender', 'name avatar')
    .populate({
      path: 'replyTo',
      select: 'content image sender',
      populate: { path: 'sender', select: 'name avatar' },
    })
    .lean()

  return {
    chat,
    messages: messages.reverse(),
  }
}

export const validateChatParticipant = async (chatId: string, userId: string) => {
  const chat = await ChatModel.findOne({
    _id: chatId,
    participants: {
      $in: [userId],
    },
  })
  if (!chat) throw new BadRequestException('User not a participant in chat')
  return chat
}
