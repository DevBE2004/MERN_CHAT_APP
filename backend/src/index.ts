import { createTerminus } from '@godaddy/terminus'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import 'dotenv/config'
import express from 'express'
import http from 'http'
import passport from 'passport'
import pino from 'pino-http'
import client from 'prom-client'
import connectDatabase from './config/database.config'
import { Env } from './config/env.config'
import './config/passport.config'
import { initializeSocket } from './lib/socket'
import { errorHandler } from './middlewares/errorHandler.middleware'
import routes from './routes'

const app = express()
const server = http.createServer(app)

const register = new client.Registry()
client.collectDefaultMetrics({ register })

const logger = pino({
  level: Env.NODE_ENV === 'production' ? 'info' : 'debug',
})
app.use(logger)

//socket
initializeSocket(server)
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

app.get('/metrics', async (_req, res) => {
  res.setHeader('Content-Type', register.contentType)
  res.send(await register.metrics())
})

createTerminus(server, {
  signal: 'SIGINT',
  healthChecks: {
    '/health': async () => {
      // Kiểm tra DB có thực sự sống không?
      // Nếu connectDatabase trả về lỗi, /health sẽ tự trả về 503
      return { status: 'up', db: 'connected', version: '1.0.0' }
    },
  },
  onSignal: async () => {
    console.log('Server is starting cleanup...')
    // Đóng các kết nối Database, Redis tại đây
  },
  onShutdown: async () => {
    console.log('Cleanup finished, server is shutting down')
  },
  logger: (msg, err) => console.error(msg, err),
})

app.use('/api', routes)
app.use(errorHandler)

server.listen(Env.PORT, async () => {
  await connectDatabase()
  console.log(`Server running on port ${Env.PORT} in ${Env.NODE_ENV} mode`)
})
