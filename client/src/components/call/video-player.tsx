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
      // Thêm play() trực tiếp nếu metadata đã có
      video.play().catch(e => console.warn('Autoplay prevented, retrying...', e))
    }
  }, [stream])

  return (
    <div className={`relative overflow-hidden rounded-xl border bg-black ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className='w-full h-full object-cover'
        onCanPlay={() => videoRef.current?.play()}
      />
    </div>
  )
}

export default VideoPlayer
