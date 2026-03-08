import { Cluster, ClusterOptions, Redis, RedisOptions } from 'ioredis'
import { Env } from './env.config'

const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null,
  retryStrategy: times => Math.min(times * 50, 2000),
  ...(Env.REDIS_URL?.startsWith('rediss://') && {
    tls: { rejectUnauthorized: false },
  }),
}

const clusterOptions: ClusterOptions = {
  clusterRetryStrategy: times => Math.min(times * 100, 2000),
  redisOptions: redisOptions,
}

const isCluster = Env.REDIS_MODE === 'cluster'

const nodes = [
  {
    host: Env.REDIS_HOST || '127.0.0.1',
    port: Number(Env.REDIS_PORT) || 6379,
  },
]

export const pubClient = isCluster
  ? new Redis.Cluster(nodes, clusterOptions)
  : new Redis(Env.REDIS_URL || 'redis://127.0.0.1:6379', redisOptions)

export const subClient = isCluster
  ? new Redis.Cluster(nodes, clusterOptions)
  : (pubClient as Redis).duplicate()

const handleEvents = (client: Redis | Cluster, name: string) => {
  client.on('ready', () => console.log(`Redis ${name}: Ready!`))
  client.on('error', err => {
    if (!err.message.includes('cluster support disabled')) {
      console.error(`Redis ${name} Error:`, err)
    }
  })
}

handleEvents(pubClient, 'Pub')
handleEvents(subClient, 'Sub')
