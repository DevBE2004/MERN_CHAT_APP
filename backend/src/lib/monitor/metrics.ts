import client from 'prom-client'

export const register = new client.Registry()
client.collectDefaultMetrics({ register })

// Counter tùy chỉnh: Đếm số lượng request
export const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Tổng số request HTTP',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
})
