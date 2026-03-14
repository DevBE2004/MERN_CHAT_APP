import { useEffect, useRef } from 'react'

interface Props {
  stream: MediaStream
  peerId: string
  className?: string
}

const VideoPlayer = ({ stream, peerId, className }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  console.log(peerId)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream

      videoRef.current.play().catch(e => console.error('Video play error:', e))
    }
  }, [stream])

  return (
    <div className={`relative overflow-hidden rounded-xl border ${className}`}>
      <video ref={videoRef} autoPlay playsInline className='w-full h-full object-cover' />
    </div>
  )
}

export default VideoPlayer
