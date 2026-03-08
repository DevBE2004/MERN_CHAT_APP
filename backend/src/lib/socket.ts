import { createAdapter } from '@socket.io/redis-adapter'
import * as cookie from 'cookie'
import { Server as HTTPServer } from 'http'
import jwt from 'jsonwebtoken'
import { Server, type Socket } from 'socket.io'
import { Env } from '../config/env.config'
import { pubClient, subClient } from '../config/redis.config'
import { validateChatParticipant } from '../services/chat.service'

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

      const decoded = jwt.verify(token, Env.JWT_SECRET) as { userId: string }
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
    await pubClient.sadd(REDIS_ONLINE_KEY, userId, newSocketId)

    //BroadCast online users to all socket
    const allOnlineIds = await pubClient.smembers(REDIS_ONLINE_KEY)
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

    socket.on('disconnect', async () => {
      await pubClient.srem(REDIS_ONLINE_KEY, userId)

      const currentOnlineUsers = await pubClient.smembers(REDIS_ONLINE_KEY)
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
  const senderSocketId = await pubClient.hget(REDIS_ONLINE_KEY, senderId.toString())

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
