import { useAuth } from '@/hooks/use-auth'
import useChatId from '@/hooks/use-chat-id'
import { usePeer } from '@/hooks/use-peer'
import { useSocket } from '@/hooks/use-socket'
import { getMediaStream } from '@/utils/media'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const VideoCallChat = () => {
  const { user } = useAuth()
  const { socket } = useSocket()
  const navigate = useNavigate()
  const { peer, peerId, isPeerReady } = usePeer(user!._id)
  const chatId = useChatId()

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [remotePeerId, setRemotePeerId] = useState<string | null>(null)

  useEffect(() => {
    let activeStream: MediaStream | null = null
    getMediaStream().then(s => {
      activeStream = s
      setStream(s)
      if (localVideoRef.current) localVideoRef.current.srcObject = s
    })
    return () => activeStream?.getTracks().forEach(t => t.stop())
  }, [])

  useEffect(() => {
    if (socket && isPeerReady && peerId && chatId) {
      socket.emit('call:start', { chatId, peerId })
    }
  }, [chatId, peerId, socket, isPeerReady])

  const isListenerSet = useRef(false)
  useEffect(() => {
    if (!peer || !stream || isListenerSet.current) return

    peer.on('call', call => {
      call.answer(stream)
      call.on('stream', remoteStream => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream
      })
    })
    isListenerSet.current = true
  }, [peer, stream])

  useEffect(() => {
    if (!socket) return
    const handleAccepted = ({ peerId: id }: { peerId: string }) => {
      console.log('da goi')
      setRemotePeerId(id)
    }
    const handleRejected = () => {
      console.log('❌ Cuộc gọi bị từ chối')
      setRemotePeerId(null)
      navigate('/chat/' + chatId)
    }

    socket.on('call:accepted', handleAccepted)
    socket.on('call:rejected', handleRejected)

    return () => {
      socket.off('call:accepted', handleAccepted)
      socket.off('call:rejected', handleRejected)
    }
  }, [socket, chatId, navigate])

  const startCall = () => {
    if (!peer || !stream || !remotePeerId) return
    const call = peer.call(remotePeerId, stream)
    call.on('stream', remoteStream => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream
    })
  }
  const endCall = () => {
    socket?.emit('call:end', { chatId })

    stream?.getTracks().forEach(track => track.stop())

    peer?.destroy()

    navigate('/chat/' + chatId)
  }

  useEffect(() => {
    if (!socket) return

    const handleCallEnd = () => {
      stream?.getTracks().forEach(track => track.stop())
      navigate('/chat/' + chatId)
    }

    socket.on('call:end', handleCallEnd)

    return () => {
      socket.off('call:end', handleCallEnd)
    }
  }, [socket, chatId, navigate, stream])
  return (
    <div className='w-full h-screen bg-black flex flex-col items-center justify-center gap-4'>
      <div className='flex gap-4'>
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className='w-80 h-60 object-cover rounded-lg bg-gray-800'
        />

        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className='w-80 h-60 object-cover rounded-lg bg-gray-800'
        />
      </div>

      <div className='flex gap-4'>
        <button
          disabled={!remotePeerId}
          className={`px-6 py-2 rounded text-white ${!remotePeerId ? 'bg-gray-500' : 'bg-green-500 hover:bg-green-600'}`}
          onClick={startCall}
        >
          {remotePeerId ? 'Kết nối Video' : 'Chờ đối phương...'}
        </button>

        <button
          className='bg-red-500 hover:bg-red-600 px-6 py-2 rounded text-white'
          onClick={endCall}
        >
          Kết thúc
        </button>
      </div>
    </div>
  )
}

export default VideoCallChat
