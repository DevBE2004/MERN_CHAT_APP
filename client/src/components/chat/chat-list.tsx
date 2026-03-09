import AvatarWithBadge from '@/components/avatar-with-badge'
import { useAuth } from '@/hooks/use-auth'
import { useChat } from '@/hooks/use-chat'
import useChatId from '@/hooks/use-chat-id'
import { useSocket } from '@/hooks/use-socket'
import type { ChatType, NotificationType } from '@/types/chat.type'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { MessageType } from '../../types/chat.type'
import { Spinner } from '../ui/spinner'
import ChatListHeader from './chat-list-header'
import ChatListItem from './chat-list-item'

const ChatList = () => {
  const navigate = useNavigate()
  const { socket } = useSocket()
  const { fetchChats, chats, isChatsLoading, addNewChat, updateChatLastMessage } = useChat()
  const { user } = useAuth()
  const currentUserId = user?._id || null
  const chatId = useChatId()

  const [searchQuery, setSearchQuery] = useState('')

  const filteredChats =
    chats?.filter(
      chat =>
        chat.groupName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.participants?.some(
          p => p._id !== currentUserId && p.name?.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
    ) || []

  useEffect(() => {
    fetchChats()
  }, [fetchChats])

  useEffect(() => {
    if (!socket) return

    const handleNewChat = (newChat: ChatType) => {
      console.log('Recieved new chat', newChat)
      addNewChat(newChat)
    }

    socket.on('chat:new', handleNewChat)

    return () => {
      socket.off('chat:new', handleNewChat)
    }
  }, [addNewChat, socket])

  useEffect(() => {
    if (!socket) return

    const handleChatUpdate = (data: { chatId: string; lastMessage: MessageType }) => {
      console.log('Recieved update on chat', data.lastMessage)
      updateChatLastMessage(data.chatId, data.lastMessage)
    }

    socket.on('chat:update', handleChatUpdate)

    return () => {
      socket.off('chat:update', handleChatUpdate)
    }
  }, [socket, updateChatLastMessage])

  const handleOnClickNotification = useCallback(
    (chatId: string) => {
      navigate(`/chat/${chatId}`)
    },
    [navigate],
  )
  useEffect(() => {
    if (!socket) return

    const handleNotification = (data: NotificationType) => {
      if (data.chatId !== chatId) {
        toast(
          <div
            className='flex items-center gap-3'
            onClick={() => handleOnClickNotification(data.chatId)}
          >
            <AvatarWithBadge name={data.sender.name} src={data.sender.avatar} />
            <div className='flex flex-col'>
              <span className='font-semibold text-sm'>{data.sender.name}</span>
              <span className='text-xs text-muted-foreground'>{data.messagePreview}</span>
            </div>
          </div>,
        )
      }
    }

    socket.on('notification:new', handleNotification)

    return () => {
      socket.off('notification:new', handleNotification)
    }
  }, [socket, chatId, handleOnClickNotification])

  const onRoute = (id: string) => {
    navigate(`/chat/${id}`)
  }

  return (
    <div
      className='fixed inset-y-0
      pb-20 lg:pb-0
      lg:max-w-[379px]
      lg:block
      border-r
      border-border
      bg-sidebar
      max-w-[calc(100%-40px)]
      w-full
      left-10
      z-[98]
    '
    >
      <div className='flex-col'>
        <ChatListHeader onSearch={setSearchQuery} />

        <div
          className='
         flex-1 h-[calc(100vh-100px)]
         overflow-y-auto        '
        >
          <div className='px-2 pb-10 pt-1 space-y-1'>
            {isChatsLoading ? (
              <div className='flex items-center justify-center'>
                <Spinner className='w-7 h-7' />
              </div>
            ) : filteredChats?.length === 0 ? (
              <div className='flex items-center justify-center'>
                {searchQuery ? 'No chat found' : 'No chats created'}
              </div>
            ) : (
              filteredChats?.map(chat => (
                <ChatListItem
                  key={chat._id}
                  chat={chat}
                  currentUserId={currentUserId}
                  onClick={() => onRoute(chat._id)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatList
