import { createTerminus } from '@godaddy/terminus'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import 'dotenv/config'
import express from 'express'
import http from 'http'
import mongoose from 'mongoose'
import passport from 'passport'
import connectDatabase from './config/database.config'
import { Env } from './config/env.config'
import './config/passport.config'
import { mq } from './config/rabbitmq.config'
import { pubClient, subClient } from './config/redis.config'
import { logger } from './lib/monitor/logger'
import { register } from './lib/monitor/metrics'
import { initializeSocket } from './lib/socket'
import { errorHandler } from './middlewares/errorHandler.middleware'
import routes from './routes'

const app = express()
const server = http.createServer(app)

app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())
app.use(express.urlencoded({ extended: true }))

const corsOptions = {
  origin: [Env.FRONTEND_ORIGIN, 'https://mern-chat-app-seven-gamma.vercel.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}

app.use(cors(corsOptions))
app.use(passport.initialize())

app.use('/api', routes)

app.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', register.contentType)
  res.send(await register.metrics())
})

createTerminus(server, {
  signal: 'SIGINT',
  healthChecks: {
    '/health': async () => {
      const mongoStatus = mongoose.connection.readyState === 1

      const redisStatus = pubClient.status === 'ready'

      if (!mongoStatus || !redisStatus) {
        throw new Error(`Health check failed: Mongo=${mongoStatus}, Redis=${redisStatus}`)
      }

      return { status: 'ok', mongo: 'connected', redis: 'connected' }
    },
  },
  onSignal: async () => {
    logger.info('Server đang dọn dẹp kết nối...')

    await Promise.all([mongoose.connection.close(), pubClient.disconnect()])

    logger.info('Đã đóng toàn bộ kết nối DB & Redis.')
  },
})

app.use(errorHandler)

server.listen(Env.PORT, async () => {
  await connectDatabase()
  await pubClient.connect()
  await subClient.connect()
  await mq.init(Env.AMQP_CLOUD)

  initializeSocket(server)
  console.log(`Server running on port ${Env.PORT} in ${Env.NODE_ENV} mode`)
})
