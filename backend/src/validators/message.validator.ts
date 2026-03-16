import { z } from 'zod'

export const sendMessageSchema = z
  .object({
    chatId: z.string().trim().min(1),
    content: z.string().trim().optional(),
    image: z.string().trim().optional(),
    replyTo: z
      .object({
        _id: z.string(),
        content: z.string().optional(),
        sender: z
          .object({
            _id: z.string(),
            name: z.string().nullable(),
            avatar: z.string().nullable().optional(),
          })
          .optional(),
      })
      .nullable()
      .optional(),
    type: z.string().trim().optional(),
    duration: z.number().optional(),
    startedAt: z.date().optional(),
    endedAt: z.date().optional(),
    newMessageId: z.string(),
  })
  .refine(data => data.content || data.image, {
    message: 'Either content or image must be provided',
    path: ['content'],
  })
