import { useEffect, useRef } from 'react'

interface Props {
  stream: MediaStream
  peerId: string
  className?: string
}

const VideoPlayer = ({ stream, peerId, className }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (stream) {
      const tracks = stream.getTracks()
      console.log('--- DEBUG STREAM ---')
      console.log('Peer ID:', peerId)
      console.log('Tổng số tracks:', tracks.length)
      tracks.forEach((t, i) => console.log(`Track ${i}:`, t.kind, '| Enabled:', t.enabled))

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(e => console.error('Video play error:', e))
      }
    }
  }, [stream, peerId])

  console.log(videoRef)
  return (
    <div className={`relative overflow-hidden rounded-xl border ${className}`}>
      <video ref={videoRef} autoPlay playsInline className='w-full h-full object-cover' />
    </div>
  )
}

export default VideoPlayer
