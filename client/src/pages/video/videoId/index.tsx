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

  // lấy audio
  useEffect(() => {
    getMediaStream().then(s => {
      streamRef.current = s
      setStream(s)
      if (localVideoRef.current) localVideoRef.current.srcObject = s
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
        setRemoteStreams(prev => ({ ...prev, [call.peer]: remoteStream }))
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
    <div className='w-full h-screen bg-black flex flex-col items-center justify-center gap-4'>
      <div className='flex gap-4 flex-wrap'>
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className='w-80 h-60 object-cover rounded-lg bg-gray-800'
        />

        {Object.entries(remoteStreams).map(([pId, rStream]) => (
          <VideoPlayer key={pId} peerId={pId} stream={rStream} devices={outputDevices} />
        ))}
      </div>

      <button
        className='bg-red-500 hover:bg-red-600 px-6 py-2 rounded text-white'
        onClick={endCall}
      >
        Kết thúc
      </button>
    </div>
  )
}

export default VideoCallChat
