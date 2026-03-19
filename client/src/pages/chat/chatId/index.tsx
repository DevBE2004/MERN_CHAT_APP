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
import useThrottle from '@/hooks/use-throttle'

import type { MessageType } from '@/types/chat.type'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const SingleChat = () => {
  const chatId = useChatId()
  const navigate = useNavigate()
  const { fetchSingleChat, isSingleChatLoading, singleChat } = useChat()
  const [page, setPage] = useState(1)
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
  const messages = useMemo(() => singleChat?.messages || [], [singleChat?.messages])
  const hasMore = singleChat?.hasMore

  const containerRef = useRef<HTMLDivElement | null>(null)
  const isFirstLoadRef = useRef(true)
  const isLoadingMoreRef = useRef(false)
  const prevScrollHeightRef = useRef(0)

  useEffect(() => {
    if (!chatId) return
    fetchSingleChat(chatId, page)
  }, [fetchSingleChat, chatId, page])

  useEffect(() => {
    isFirstLoadRef.current = true
    setPage(1)
  }, [chatId])

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget

      const isNearTop = el.scrollTop < el.clientHeight * 0.5
      const canLoadMore = hasMore && !isLoadingMoreRef.current

      if (isNearTop && canLoadMore) {
        isLoadingMoreRef.current = true
        prevScrollHeightRef.current = el.scrollHeight
        setPage(prev => prev + 1)
      }
    },
    [hasMore],
  )

  const throttledScroll = useThrottle(handleScroll, 100)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return

    //  first load
    if (isFirstLoadRef.current) {
      el.scrollTop = el.scrollHeight
      isFirstLoadRef.current = false
      return
    }

    //  load more
    if (isLoadingMoreRef.current) {
      const newHeight = el.scrollHeight
      const prevHeight = prevScrollHeightRef.current

      el.scrollTop = newHeight - prevHeight

      isLoadingMoreRef.current = false
      return
    }

    //  new message
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100

    if (isNearBottom) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages])

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
      <div
        className='flex-1 overflow-y-auto bg-background'
        ref={containerRef}
        onScroll={throttledScroll}
      >
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
