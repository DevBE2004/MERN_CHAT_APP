import { Client } from '@elastic/elasticsearch'
import { Env } from '../config/env.config'

export const esClient = new Client({
  node: Env.ELASTIC_NODE_URL,
  auth: {
    apiKey: Env.ELASTIC_API_KEY,
  },
  serverMode: 'serverless',
})
