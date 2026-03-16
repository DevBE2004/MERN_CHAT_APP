import IncomingCallModal from '@/components/call/incoming-call-modal'
import ChatBody from '@/components/chat/chat-body'
import ChatFooter from '@/components/chat/chat-footer'
import ChatHeader from '@/components/chat/chat-header'
import EmptyState from '@/components/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/hooks/use-auth'
import { useChat } from '@/hooks/use-chat'
import useChatId from '@/hooks/use-chat-id'
import { useSocket } from '@/hooks/use-socket'
import type { MessageType } from '@/types/chat.type'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const SingleChat = () => {
  const chatId = useChatId()
  const navigate = useNavigate()
  const { fetchSingleChat, isSingleChatLoading, singleChat } = useChat()
  const { socket } = useSocket()
  const { user } = useAuth()

  const [replyTo, setReplyTo] = useState<MessageType | null>(null)
  const [messageId, setmessageId] = useState<string>('')

  const [activeCalls, setActiveCalls] = useState<
    Record<
      string,
      {
        chatId: string
        peerId: string
        callerName: string
        callerAvatar: string
      }
    >
  >({})

  const currentUserId = user?._id || null
  const chat = singleChat?.chat
  const messages = singleChat?.messages || []

  useEffect(() => {
    if (!chatId) return
    fetchSingleChat(chatId)
  }, [fetchSingleChat, chatId])

  //Socket Chat room
  useEffect(() => {
    if (!chatId || !socket) return

    socket.emit('chat:join', chatId)

    const handleIncomingCall = (data: {
      chatId: string
      peerId: string
      callerName: string
      callerAvatar: string
      messageId: string
    }) => {
      setActiveCalls(prev => ({
        ...prev,
        [data.peerId]: data,
      }))
      setmessageId(data?.messageId)
    }
    socket.on('call:incoming', handleIncomingCall)

    return () => {
      socket.off('call:incoming', handleIncomingCall)
    }
  }, [chatId, socket])

  const handleAccept = (call: { chatId: string; peerId: string }) => {
    navigate(`/video/${call.chatId}?callerPeerId=${call.peerId}&messageId=${messageId}`)
    setActiveCalls(prev => {
      const next = { ...prev }
      delete next[call.peerId]
      return next
    })
  }

  const handleReject = (peerId: string) => {
    socket?.emit('call:reject', { chatId })
    setActiveCalls(prev => {
      const next = { ...prev }
      delete next[peerId]
      return next
    })
  }

  if (isSingleChatLoading) {
    return (
      <div className='h-screen flex items-center justify-center'>
        <Spinner className='w-11 h-11 !text-primary' />
      </div>
    )
  }

  if (!chat) {
    return (
      <div className='h-screen flex items-center justify-center'>
        <p className='text-lg'>Chat not found</p>
      </div>
    )
  }

  return (
    <div className='relative h-svh flex flex-col'>
      <ChatHeader chat={chat} currentUserId={currentUserId} />
      <div className='flex-1 overflow-y-auto bg-background'>
        {messages.length === 0 ? (
          <EmptyState
            title='Start a conversation'
            description='No messages yet. Send the first message'
          />
        ) : (
          <ChatBody chatId={chatId} messages={messages} onReply={setReplyTo} />
        )}
      </div>
      <ChatFooter
        replyTo={replyTo}
        chatId={chatId}
        currentUserId={currentUserId}
        onCancelReply={() => setReplyTo(null)}
      />

      {Object.values(activeCalls).map(call => (
        <IncomingCallModal
          key={call.peerId}
          callerName={call.callerName}
          callerAvatar={call.callerAvatar}
          onAccept={() => handleAccept(call)}
          onReject={() => handleReject(call.peerId)}
        />
      ))}
    </div>
  )
}

export default SingleChat
