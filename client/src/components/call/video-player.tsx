import { useEffect, useRef } from 'react'

const VideoPlayer = ({
  stream,
  peerId,
  devices,
}: {
  stream: MediaStream
  peerId: string
  devices: MediaDeviceInfo[]
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  console.log(peerId)

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream
  }, [stream])

  const changeOutput = async (deviceId: string) => {
    if (videoRef.current && 'setSinkId' in videoRef.current) {
      await (videoRef.current as HTMLVideoElement).setSinkId(deviceId)
    }
  }

  return (
    <div className='relative w-80 h-60 bg-gray-800 rounded-lg overflow-hidden'>
      <video ref={videoRef} autoPlay playsInline className='w-full h-full object-cover' />
      <select
        onChange={e => changeOutput(e.target.value)}
        className='absolute bottom-2 left-2 bg-black/50 text-white text-xs'
      >
        {devices.map(d => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label || 'Loa'}
          </option>
        ))}
      </select>
    </div>
  )
}

export default VideoPlayer
