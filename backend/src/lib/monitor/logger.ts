import pino from 'pino'
import { Env } from '../../config/env.config'

export const logger = pino({
  level: Env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: {
    target: 'pino-pretty',
  },
})
