/* eslint-disable react-hooks/exhaustive-deps */
import VideoPlayer from '@/components/call/video-player'
import { useAuth } from '@/hooks/use-auth'
import useChatId from '@/hooks/use-chat-id'
import { usePeer } from '@/hooks/use-peer'
import { useSocket } from '@/hooks/use-socket'
import { getMediaStream } from '@/utils/media'
import { Mic, MicOff, Video, VideoOff, Volume2, VolumeX } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const VideoCallChat = () => {
  const { user } = useAuth()
  const { peer, peerId, isPeerReady } = usePeer(user!._id)
  const { socket } = useSocket()
  const chatId = useChatId()
  const navigate = useNavigate()

  const localVideoRef = useRef<HTMLVideoElement>(null)

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({})

  const [micEnabled, setMicEnabled] = useState(true)
  const [camEnabled, setCamEnabled] = useState(true)
  const [speakerEnabled, setSpeakerEnabled] = useState(true)

  /* -------------------- GET MEDIA -------------------- */

  useEffect(() => {
    getMediaStream().then(s => {
      setStream(s)

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = s
      }
    })

    return () => {
      stream?.getTracks().forEach(t => t.stop())
    }
  }, [])

  /* -------------------- RECEIVE CALL -------------------- */

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

  /* -------------------- START CALL -------------------- */

  useEffect(() => {
    if (!socket || !isPeerReady || !peer) return
    socket.emit('call:start', { chatId, peerId })
  }, [socket, isPeerReady, peer, chatId, peerId])

  /* -------------------- SOCKET EVENTS -------------------- */

  useEffect(() => {
    if (!socket || !peer || !stream) return

    const handleAccepted = ({ peerId }: { peerId: string }) => {
      const call = peer.call(peerId, stream)

      call.on('stream', remoteStream => {
        setRemoteStreams(prev => ({
          ...prev,
          [peerId]: remoteStream,
        }))
      })

      call.on('close', () => {
        setRemoteStreams(prev => {
          const next = { ...prev }
          delete next[peerId]
          return next
        })
      })
    }

    const handleRejected = () => navigate('/chat/' + chatId)

    const handleEnded = () => endCall()

    socket.on('call:accepted', handleAccepted)
    socket.on('call:rejected', handleRejected)
    socket.on('call:ended', handleEnded)

    return () => {
      socket.off('call:accepted', handleAccepted)
      socket.off('call:rejected', handleRejected)
      socket.off('call:ended', handleEnded)
    }
  }, [socket, peer, stream])

  /* -------------------- CONTROLS -------------------- */

  const toggleMic = () => {
    if (!stream) return
    stream.getAudioTracks().forEach(track => {
      track.enabled = !track.enabled
      setMicEnabled(track.enabled)
    })
  }

  const toggleCamera = () => {
    if (!stream) return
    stream.getVideoTracks().forEach(track => {
      track.enabled = !track.enabled
      setCamEnabled(track.enabled)
    })
  }

  const toggleSpeaker = () => {
    const newState = !speakerEnabled
    setSpeakerEnabled(newState)

    document.querySelectorAll('video').forEach(v => {
      if (!v.hasAttribute('data-local')) {
        v.muted = !newState
      }
    })
  }

  const endCall = useCallback(() => {
    socket?.emit('call:end', { chatId })

    stream?.getTracks().forEach(t => t.stop())

    peer?.disconnect()
    peer?.destroy()

    setRemoteStreams({})

    navigate('/chat/' + chatId)
  }, [socket, chatId, stream, peer, navigate])

  /* -------------------- UI -------------------- */

  return (
    <div className='fixed inset-0 bg-black flex items-center justify-center'>
      {/* Remote videos */}
      <div className='grid w-full h-full gap-2 p-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3'>
        {Object.keys(remoteStreams).length === 0 && (
          <div className='flex items-center justify-center text-white text-xl'>Đang gọi...</div>
        )}

        {Object.entries(remoteStreams).map(([pId, rStream]) => (
          <VideoPlayer key={pId} peerId={pId} stream={rStream} className='w-full h-full' />
        ))}
      </div>

      {/* Local video */}
      <video
        data-local
        ref={localVideoRef}
        autoPlay
        muted
        playsInline
        className='
        absolute bottom-28 right-4
        w-32 h-44 sm:w-40 sm:h-52
        object-cover
        rounded-xl
        border border-white/20
        shadow-lg
        '
      />

      {/* Controls */}
      <div
        className='
        absolute bottom-20 left-1/2 -translate-x-1/2
        flex items-center gap-4
        bg-black/40 backdrop-blur-md
        px-6 py-3
        rounded-full
        shadow-lg
        '
      >
        <button
          onClick={toggleMic}
          className='w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20'
        >
          {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
        </button>

        <button
          onClick={toggleCamera}
          className='w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20'
        >
          {camEnabled ? <Video size={20} /> : <VideoOff size={20} />}
        </button>

        <button
          onClick={toggleSpeaker}
          className='w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20'
        >
          {speakerEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </div>

      {/* End call */}
      <button
        onClick={endCall}
        className='
        absolute bottom-6
        bg-red-500 hover:bg-red-600
        text-white
        px-8 py-3
        rounded-full
        shadow-lg
        '
      >
        Kết thúc
      </button>
    </div>
  )
}

export default VideoCallChat
