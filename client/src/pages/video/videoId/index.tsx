/* eslint-disable react-hooks/exhaustive-deps */
import VideoPlayer from '@/components/call/video-player'
import { useAuth } from '@/hooks/use-auth'
import useChatId from '@/hooks/use-chat-id'
import { usePeer } from '@/hooks/use-peer'
import { useSocket } from '@/hooks/use-socket'
import { formatTime } from '@/utils/helper'
import { getMediaStream } from '@/utils/media'
import { Mic, MicOff, Video, VideoOff, Volume2, VolumeX } from 'lucide-react'
import type { MediaConnection } from 'peerjs'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const VideoCallChat = () => {
  const { user } = useAuth()
  const { peer, peerId, isPeerReady } = usePeer(user!._id)
  const { socket } = useSocket()
  const chatId = useChatId()
  const navigate = useNavigate()
  const params = new URLSearchParams(window.location.search)
  const callerPeerId = params.get('callerPeerId')
  const messageId = params.get('messageId')

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const callStartTimeRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({})
  const [isStreamReady, setIsStreamReady] = useState(false)
  const [micEnabled, setMicEnabled] = useState(true)
  const [camEnabled, setCamEnabled] = useState(true)
  const [speakerEnabled, setSpeakerEnabled] = useState(true)
  const [seconds, setSeconds] = useState<number>(0)

  /* -------------------- 1. LẤY MEDIA TRƯỚC -------------------- */
  useEffect(() => {
    let mounted = true
    getMediaStream().then(s => {
      if (!mounted) return
      streamRef.current = s
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = s
      }

      setMicEnabled(s.getAudioTracks()[0]?.enabled ?? false)
      setCamEnabled(s.getVideoTracks()[0]?.enabled ?? false)
      setIsStreamReady(true)
    })

    return () => {
      mounted = false
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  /* -------------------- 2. NHẬN CUỘC GỌI -------------------- */
  useEffect(() => {
    if (!peer || !isStreamReady) return

    const handleCall = (call: MediaConnection) => {
      call.answer(streamRef.current!)

      call.on('stream', (remoteStream: MediaStream) => {
        setRemoteStreams(prev => ({ ...prev, [call.peer]: remoteStream }))
      })
    }

    peer.on('call', handleCall)
    return () => {
      peer.off('call', handleCall)
    }
  }, [peer, isStreamReady])

  /* -------------------- 3. BẮT ĐẦU/CHẤP NHẬN (Sau khi có stream) -------------------- */
  useEffect(() => {
    if (!socket || !isPeerReady || !isStreamReady) return

    if (callerPeerId && messageId) {
      socket.emit('call:accept', { chatId, peerId, messageId })
    } else {
      socket.emit('call:start', { chatId, peerId })
    }
  }, [isPeerReady, isStreamReady, socket])

  /* -------------------- 4. XỬ LÝ SOCKET EVENTS -------------------- */
  useEffect(() => {
    if (!socket || !peer || !isStreamReady) return

    const handleAccepted = ({ peerId: remotePeerId }: { peerId: string }) => {
      if (streamRef.current) {
        // Thực hiện call và gửi stream của mình đi
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
  }, [socket, peer, isStreamReady])

  /* -------------------- BIẾN ĐẾM THỜI GIAN -------------------- */
  useEffect(() => {
    const hasRemoteUser = Object.keys(remoteStreams).length > 0
    if (!hasRemoteUser) {
      callStartTimeRef.current = null
      setSeconds(0)
      return
    }

    if (callStartTimeRef.current === null) {
      callStartTimeRef.current = Date.now()
    }

    const interval = setInterval(() => {
      if (callStartTimeRef.current) {
        setSeconds(Math.floor((Date.now() - callStartTimeRef.current) / 1000))
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [remoteStreams])

  /* -------------------- CONTROLS -------------------- */
  const toggleMic = () => {
    if (!streamRef.current) return
    const newState = !micEnabled
    streamRef.current.getAudioTracks().forEach(t => (t.enabled = newState))
    setMicEnabled(newState)
  }

  const toggleCamera = () => {
    if (!streamRef.current) return
    const newState = !camEnabled
    streamRef.current.getVideoTracks().forEach(t => (t.enabled = newState))
    setCamEnabled(newState)
  }

  const toggleSpeaker = () => {
    const newState = !speakerEnabled
    setSpeakerEnabled(newState)
    document.querySelectorAll('video').forEach(v => {
      if (!v.hasAttribute('data-local')) v.muted = !newState
    })
  }

  const endCall = useCallback(() => {
    console.log({ duration: seconds })
    socket?.emit('call:end', { chatId, messageId, duration: seconds })
    streamRef.current?.getTracks().forEach(t => t.stop())
    peer?.destroy()
    navigate('/chat/' + chatId)
  }, [socket, chatId, peer])

  return (
    <div className='fixed inset-0 bg-black flex items-center justify-center'>
      <div className='absolute top-6 left-1/2 -translate-x-1/2 z-20 bg-black/50 px-4 py-1 rounded-full border border-white/10'>
        <p className='text-white font-mono text-lg'>{formatTime(seconds)}</p>
      </div>

      <div className='absolute inset-0 z-0'>
        {Object.entries(remoteStreams).map(([pId, rStream]) => (
          <VideoPlayer key={pId} peerId={pId} stream={rStream} className='w-full h-full' />
        ))}
        {Object.keys(remoteStreams).length === 0 && (
          <div className='flex items-center justify-center h-full text-white/50'>
            Đang chờ đối phương...
          </div>
        )}
      </div>

      <video
        data-local
        ref={localVideoRef}
        autoPlay
        muted
        playsInline
        className='absolute top-4 right-4 w-40 h-52 md:w-60 md:h-80 object-cover rounded-xl border-2 border-white/20 shadow-2xl z-10'
      />

      <div className='absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/40 backdrop-blur-md px-6 py-3 rounded-full shadow-lg'>
        <button
          onClick={toggleMic}
          className='w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white'
        >
          {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
        </button>
        <button
          onClick={toggleCamera}
          className='w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white'
        >
          {camEnabled ? <Video size={20} /> : <VideoOff size={20} />}
        </button>
        <button
          onClick={toggleSpeaker}
          className='w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white'
        >
          {speakerEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </div>

      <button
        onClick={endCall}
        className='absolute bottom-6 bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-full shadow-lg'
      >
        Kết thúc
      </button>
    </div>
  )
}

export default VideoCallChat
