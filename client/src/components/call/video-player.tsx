import { useEffect, useRef } from 'react'

interface Props {
  stream: MediaStream
  peerId: string
  className?: string
}

const VideoPlayer = ({ stream, peerId, className }: Props) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  console.log(peerId)

  const setVideoRef = (node: HTMLVideoElement | null) => {
    videoRef.current = node
    if (node && stream) {
      node.srcObject = stream
      node.play().catch(e => console.error('Video play error:', e))
    }
  }

  useEffect(() => {
    // Nếu stream thay đổi, gán lại srcObject cho ref hiện tại
    if (videoRef.current) {
      videoRef.current.srcObject = stream
      videoRef.current.play().catch(e => console.error('Video play error:', e))
    }
  }, [stream])

  return (
    <div className={`relative overflow-hidden rounded-xl border ${className}`}>
      <video ref={setVideoRef} autoPlay playsInline muted className='w-full h-full object-cover' />
    </div>
  )
}

export default VideoPlayer
