/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef } from 'react'

interface Props {
  stream: MediaStream
  peerId: string
  className?: string
}

const VideoPlayer = ({ stream, peerId, className }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      console.log(`Gán stream cho ${peerId}`)
      videoRef.current.srcObject = stream

      videoRef.current.load()
      videoRef.current.play().catch(e => console.error('Play error:', e))
    }
  }, [stream])

  return (
    <div className={className}>
      <video ref={videoRef} autoPlay playsInline muted className='w-full h-full object-cover' />
    </div>
  )
}

export default VideoPlayer
