import { createAdapter } from '@socket.io/redis-adapter'
import * as cookie from 'cookie'
import { Server as HTTPServer } from 'http'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { Server, type Socket } from 'socket.io'
import { Env } from '../config/env.config'
import { pubClient, subClient } from '../config/redis.config'
import { validateChatParticipant } from '../services/chat.service'
import { initCall, updateCall, updateParticipantMessage } from '../services/message.service'
import { getUserById } from '../services/user.service'

interface AuthenticatedSocket extends Socket {
  userId?: string
}

let io: Server | null = null

const REDIS_ONLINE_KEY = 'online_users'

export const initializeSocket = (httpServer: HTTPServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [Env.FRONTEND_ORIGIN, 'https://mern-chat-app-seven-gamma.vercel.app'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  })

  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const rawCookie = socket.handshake.headers.cookie
      if (!rawCookie) {
        return next(new Error('NO_COOKIE'))
      }

      const cookies = cookie.parse(rawCookie)
      const token = cookies.accessToken
      if (!token) {
        return next(new Error('NO_TOKEN'))
      }

      const decoded = jwt.verify(token, Env.SECRET_KEY) as { userId: string }
      socket.userId = decoded.userId

      next()
    } catch (err) {
      next(new Error('INVALID_TOKEN'))
    }
  })
  // Use Redis adapter for scaling
  io.adapter(createAdapter(pubClient, subClient))

  io.on('connection', async (socket: AuthenticatedSocket) => {
    const userId = socket.userId!
    const newSocketId = socket.id
    if (!socket.userId) {
      socket.disconnect(true)
      return
    }

    //register socket for the user
    await pubClient.hset(REDIS_ONLINE_KEY, userId, newSocketId)

    const allOnlineIds = await pubClient.hkeys('online_users')

    io?.emit('online:users', allOnlineIds)

    //create personnal room for user
    socket.join(`user:${userId}`)

    socket.on('chat:join', async (chatId: string, callback?: (err?: string) => void) => {
      try {
        await validateChatParticipant(chatId, userId)
        socket.join(`chat:${chatId}`)
        console.log(`User ${userId} join room chat:${chatId}`)

        callback?.()
      } catch (error) {
        callback?.('Error joining chat')
      }
    })

    socket.on('chat:leave', (chatId: string) => {
      if (chatId) {
        socket.leave(`chat:${chatId}`)
        console.log(`User ${userId} left room chat:${chatId}`)
      }
    })
    //call
    socket.on('call:start', async ({ chatId, peerId }: { chatId: string; peerId: string }) => {
      //nhận peerID => các member
      const messageId = new mongoose.Types.ObjectId()
      await initCall({ chatId, sender: userId, messageId })
      const user = await getUserById(userId)

      socket.to(`chat:${chatId}`).emit('call:incoming', {
        chatId,
        peerId,
        callerName: user?.name,
        callerAvatar: user?.avatar,
        messageId,
      })
    })
    socket.on(
      'call:accept',
      async ({
        chatId,
        peerId,
        messageId,
      }: {
        chatId: string
        peerId: string
        messageId: string
      }) => {
        await updateParticipantMessage(messageId, userId)
        socket.to(`chat:${chatId}`).emit('call:accepted', {
          chatId,
          peerId,
        })
      },
    )
    socket.on('call:reject', ({ chatId }: { chatId: string }) => {
      socket.to(`chat:${chatId}`).emit('call:rejected', {
        chatId,
      })
    })
    socket.on(
      'call:end',
      async ({
        chatId,
        messageId,
        duration,
      }: {
        chatId: string
        duration: number
        messageId: string
      }) => {
        await updateCall(messageId, duration)
        socket.to(`chat:${chatId}`).emit('call:ended', {
          chatId,
        })
      },
    )

    socket.on('disconnect', async () => {
      await pubClient.hdel('online_users', userId)
      const currentOnlineUsers = await pubClient.hkeys('online_users')
      io?.emit('online:users', currentOnlineUsers)

      console.log('socket disconnected', {
        userId,
        newSocketId,
      })
    })
  })
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialized')
  return io
}

export const emitNewChatToParticpants = (participantIds: string[] = [], chat: any) => {
  const io = getIO()
  for (const participantId of participantIds) {
    io.to(`user:${participantId}`).emit('chat:new', chat)
  }
}

export const emitNewMessageToChatRoom = async (senderId: string, chatId: string, message: any) => {
  const io = getIO()

  const senderSocketId = await pubClient.hget('online_users', senderId)

  console.log(senderId, 'senderId')
  console.log(senderSocketId, 'sender socketid exist')
  console.log('All online users:', await pubClient.hkeys(REDIS_ONLINE_KEY))

  if (senderSocketId) {
    io.to(`chat:${chatId}`).except(senderSocketId).emit('message:new', message)
  } else {
    io.to(`chat:${chatId}`).emit('message:new', message)
  }
}

export const emitLastMessageToParticipants = (
  participantIds: string[],
  chatId: string,
  lastMessage: any,
) => {
  const io = getIO()
  const payload = { chatId, lastMessage }

  for (const participantId of participantIds) {
    io.to(`user:${participantId}`).emit('chat:update', payload)
  }
}

export const emitNotificationToUsers = (participantIds: string[], payload: any) => {
  const io = getIO()
  console.log('emit notification to:', participantIds)
  participantIds.forEach(participantId => {
    io.to(`user:${participantId}`).emit('notification:new', payload)
  })
}
