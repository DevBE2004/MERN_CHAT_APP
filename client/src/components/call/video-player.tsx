import { useEffect, useRef } from 'react'

interface Props {
  stream: MediaStream
  peerId: string
  devices: MediaDeviceInfo[]
  className?: string
}

const VideoPlayer = ({ stream, peerId, devices, className }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  console.log(peerId)
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  const changeOutput = async (deviceId: string) => {
    if (videoRef.current && 'setSinkId' in videoRef.current) {
      await (videoRef.current as HTMLVideoElement).setSinkId(deviceId)
    }
  }

  return (
    <div className={`relative bg-black overflow-hidden rounded-lg ${className}`}>
      <video ref={videoRef} autoPlay playsInline className='w-full h-full object-cover' />

      {devices.length > 0 && (
        <select
          onChange={e => changeOutput(e.target.value)}
          className='hidden sm:block absolute bottom-2 left-2 bg-black/60 text-white text-xs rounded px-1'
        >
          {devices.map(d => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || 'Loa'}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}

export default VideoPlayer
