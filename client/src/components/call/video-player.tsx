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
    }
  }, [stream])

  return (
    <div
      className={`relative overflow-hidden rounded-xl border
      bg-gray-100 border-gray-200
      dark:bg-black dark:border-zinc-800
      ${className}`}
    >
      <video ref={videoRef} autoPlay playsInline className='w-full h-full object-cover' />
    </div>
  )
}

export default VideoPlayer
