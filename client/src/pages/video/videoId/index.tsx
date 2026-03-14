/* eslint-disable react-hooks/exhaustive-deps */
import VideoPlayer from '@/components/call/video-player'
import { useAuth } from '@/hooks/use-auth'
import useChatId from '@/hooks/use-chat-id'
import { usePeer } from '@/hooks/use-peer'
import { useSocket } from '@/hooks/use-socket'
import { getMediaStream } from '@/utils/media'
import { Mic, MicOff, Video, VideoOff, Volume2, VolumeX } from 'lucide-react'
import { MediaConnection } from 'peerjs'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const VideoCallChat = () => {
  const { user } = useAuth()
  const { peer, peerId, isPeerReady } = usePeer(user!._id)
  const { socket } = useSocket()
  const chatId = useChatId()
  const navigate = useNavigate()

  const localVideoRef = useRef<HTMLVideoElement>(null)

  // Dùng ref để đảm bảo stream luôn có giá trị mới nhất cho các callback của PeerJS
  const streamRef = useRef<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({})

  const [micEnabled, setMicEnabled] = useState(false)
  const [camEnabled, setCamEnabled] = useState(false)
  const [speakerEnabled, setSpeakerEnabled] = useState(true)

  /* -------------------- GET MEDIA -------------------- */
  useEffect(() => {
    getMediaStream().then(s => {
      streamRef.current = s
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = s
      }
    })

    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  /* -------------------- RECEIVE CALL -------------------- */
  useEffect(() => {
    if (!peer) return

    const handleCall = (call: MediaConnection) => {
      call.answer(streamRef.current || undefined)

      call.on('stream', (remoteStream: MediaStream) => {
        console.log('Đã nhận được remote stream từ:', call.peer)
        setRemoteStreams(prev => ({ ...prev, [call.peer]: remoteStream }))
      })

      call.on('close', () => {
        setRemoteStreams(prev => {
          const next = { ...prev }
          delete next[call.peer]
          return next
        })
      })
    }

    peer.on('call', handleCall)

    return () => {
      peer.off('call', handleCall)
    }
  }, [peer])

  /* -------------------- START / ACCEPT CALL -------------------- */
  useEffect(() => {
    // Chỉ thực hiện khi peer đã sẵn sàng
    if (!socket || !isPeerReady) return

    const params = new URLSearchParams(window.location.search)
    const callerPeerId = params.get('callerPeerId')

    if (callerPeerId) {
      socket.emit('call:accept', { chatId, peerId })
    } else {
      socket.emit('call:start', { chatId, peerId })
    }
  }, [isPeerReady, socket])

  /* -------------------- SOCKET EVENTS -------------------- */
  useEffect(() => {
    if (!socket || !peer) return

    const handleAccepted = ({ peerId: remotePeerId }: { peerId: string }) => {
      if (streamRef.current) {
        const call = peer.call(remotePeerId, streamRef.current)
        call.on('stream', remoteStream => {
          setRemoteStreams(prev => ({ ...prev, [remotePeerId]: remoteStream }))
        })
      }
    }

    socket.on('call:accepted', handleAccepted)
    socket.on('call:rejected', () => navigate('/chat/' + chatId))
    socket.on('call:ended', () => endCall())

    return () => {
      socket.off('call:accepted', handleAccepted)
      socket.off('call:rejected')
      socket.off('call:ended')
    }
  }, [socket, peer])

  /* -------------------- CONTROLS -------------------- */
  const toggleMic = () => {
    streamRef.current?.getAudioTracks().forEach(t => {
      t.enabled = !t.enabled
      setMicEnabled(t.enabled)
    })
  }

  const toggleCamera = () => {
    streamRef.current?.getVideoTracks().forEach(t => {
      t.enabled = !t.enabled
      setCamEnabled(t.enabled)
    })
  }

  const toggleSpeaker = () => {
    const newState = !speakerEnabled
    setSpeakerEnabled(newState)
    document.querySelectorAll('video').forEach(v => {
      if (!v.hasAttribute('data-local')) v.muted = !newState
    })
  }

  const endCall = useCallback(() => {
    socket?.emit('call:end', { chatId })
    streamRef.current?.getTracks().forEach(t => t.stop())
    peer?.destroy()
    navigate('/chat/' + chatId)
  }, [socket, chatId, peer, navigate])

  /* -------------------- UI -------------------- */

  return (
    <div className='fixed inset-0 bg-black flex items-center justify-center'>
      <div className='absolute inset-0 z-0'>
        {Object.entries(remoteStreams).map(([pId, rStream]) => (
          <VideoPlayer key={pId} peerId={pId} stream={rStream} className='w-full h-full' />
        ))}

        {Object.keys(remoteStreams).length === 0 && (
          <div className='flex items-center justify-center h-full text-white/50'>
            Đang chờ kết nối...
          </div>
        )}
      </div>

      <video
        data-local
        ref={localVideoRef}
        autoPlay
        muted
        playsInline
        className='absolute bottom-28 right-4 w-40 h-52 md:w-60 md:h-80 object-cover rounded-xl border-2 border-white/20 shadow-2xl z-10'
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
