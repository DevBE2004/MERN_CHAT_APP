import 'dotenv/config'
import cloudinary from './config/cloudinary.config'
import connectDatabase from './config/database.config'
import { Env } from './config/env.config'
import { mq } from './config/rabbitmq.config'
import ChatModel from './models/chat.model'
import MessageModel from './models/message.model'

export const startWorker = async () => {
  await connectDatabase()
  await mq.init(Env.AMQP_CLOUD!)

  console.log('Worker đang đợi tin nhắn...')

  await mq.consume(async (data, msg) => {
    const {
      messageId,
      chatId,
      sender,
      content,
      image,
      replyTo,
      type,
      participantsCall,
      duration,
      startedAt,
      endedAt,
    } = data
    let imageUrl = null

    if (image) {
      const uploadRes = await cloudinary.uploader.upload(image)
      imageUrl = uploadRes.secure_url
    }
    const newMessage = await MessageModel.create({
      _id: messageId,
      chatId,
      sender: sender._id,
      content,
      image: imageUrl,
      replyTo: replyTo || null,
      type,
      participantsCall,
      duration,
      startedAt,
      endedAt,
    })

    await ChatModel.findByIdAndUpdate(
      chatId,
      {
        $set: { lastMessage: newMessage._id },
      },
      { new: true },
    )
  })
}

startWorker()
