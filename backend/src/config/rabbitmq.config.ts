import amqp, { Channel } from 'amqplib'

class RabbitMQService {
  private channel!: Channel

  async init(url: string) {
    const conn = await amqp.connect(url)
    this.channel = await conn.createChannel()
    await this.channel.assertQueue('chat_queue', { durable: true })
    console.log('RabbitMQ Connected')
  }

  async send(data: any) {
    this.channel.sendToQueue('chat_queue', Buffer.from(JSON.stringify(data)), { persistent: true })
  }

  async consume(onMessage: (data: any, msg: amqp.ConsumeMessage) => Promise<void>) {
    this.channel.prefetch(1)
    this.channel.consume('chat_queue', async msg => {
      if (msg) {
        try {
          const data = JSON.parse(msg.content.toString())
          await onMessage(data, msg) // Chờ xử lý xong
          this.channel.ack(msg) // CHỈ ACK KHI XỬ LÝ THÀNH CÔNG
        } catch (error) {
          console.error('Xử lý thất bại, đang nack tin nhắn...', error)
          // Nack (Negative Acknowledge) để tin nhắn quay lại hàng đợi
          this.channel.nack(msg, false, true)
        }
      }
    })
  }
}
export const mq = new RabbitMQService()
