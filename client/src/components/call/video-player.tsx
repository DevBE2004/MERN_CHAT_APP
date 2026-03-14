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
    const video = videoRef.current
    if (video && stream) {
      video.srcObject = stream

      // Quan trọng: Chỉ gọi play sau khi metadata đã load
      video.onloadedmetadata = () => {
        video.play().catch(e => console.error('Video play error:', e))
      }
    }

    return () => {
      if (video) video.srcObject = null
    }
  }, [stream])

  return (
    <div className={`relative overflow-hidden rounded-xl border bg-black ${className}`}>
      <video ref={videoRef} autoPlay playsInline muted className='w-full h-full object-cover' />
    </div>
  )
}

export default VideoPlayer
