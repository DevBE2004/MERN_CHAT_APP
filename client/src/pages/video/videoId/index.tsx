import VideoPlayer from '@/components/call/video-player'
import { useAuth } from '@/hooks/use-auth'
import useChatId from '@/hooks/use-chat-id'
import { usePeer } from '@/hooks/use-peer'
import { useSocket } from '@/hooks/use-socket'
import { getMediaStream } from '@/utils/media'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const VideoCallChat = () => {
  const { user } = useAuth()
  const { peer, peerId, isPeerReady } = usePeer(user!._id)
  const chatId = useChatId()
  const navigate = useNavigate()
  const { socket } = useSocket()

  const localVideoRef = useRef<HTMLVideoElement>(null)

  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({})
  const [stream, setStream] = useState<MediaStream | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([])

  // get media
  useEffect(() => {
    getMediaStream().then(s => {
      streamRef.current = s
      setStream(s)

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = s
      }

      navigator.mediaDevices
        .enumerateDevices()
        .then(devices => setOutputDevices(devices.filter(d => d.kind === 'audiooutput')))
    })

    return () => streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  useEffect(() => {
    if (!peer || !stream) return

    peer.on('call', call => {
      call.answer(stream)

      call.on('stream', remoteStream => {
        setRemoteStreams(prev => ({
          ...prev,
          [call.peer]: remoteStream,
        }))
      })

      call.on('close', () => {
        setRemoteStreams(prev => {
          const next = { ...prev }
          delete next[call.peer]
          return next
        })
      })
    })
  }, [peer, stream])

  useEffect(() => {
    if (!socket || !isPeerReady || !peer) return

    socket.emit('call:start', { chatId, peerId })
  }, [socket, isPeerReady, peer, chatId, peerId])

  const endCall = () => {
    socket?.emit('call:end', { chatId })

    stream?.getTracks().forEach(track => track.stop())

    if (peer) {
      peer.disconnect()
      peer.destroy()
    }

    setRemoteStreams({})
    navigate('/chat/' + chatId)
  }

  return (
    <div className='fixed inset-0 bg-black flex items-center justify-center'>
      <div className='grid grid-cols-2 gap-2 w-full h-full'>
        {Object.entries(remoteStreams).map(([pId, rStream]) => (
          <VideoPlayer
            key={pId}
            peerId={pId}
            stream={rStream}
            devices={outputDevices}
            className='w-full h-40 sm:h-60'
          />
        ))}
      </div>

      <video
        ref={localVideoRef}
        autoPlay
        muted
        playsInline
        className='absolute bottom-24 right-4 w-32 h-44 sm:w-40 sm:h-52 object-cover rounded-xl border border-white/20'
      />

      {/* end call button */}
      <button
        onClick={endCall}
        className='absolute bottom-8 bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-full shadow-lg'
      >
        Kết thúc
      </button>
    </div>
  )
}

export default VideoCallChat
