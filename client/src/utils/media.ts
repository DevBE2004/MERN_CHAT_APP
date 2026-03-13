export const getMediaStream = async (
  constraints: MediaStreamConstraints = {
    video: { width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: true,
  },
) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    return stream
  } catch (error) {
    console.error('Lỗi khi truy cập camera/micro:', error)
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
          throw new Error('Bạn chưa cấp quyền truy cập Camera/Micro.')
        case 'NotFoundError':
          throw new Error('Không tìm thấy thiết bị Camera/Micro.')
        case 'NotReadableError':
          throw new Error('Thiết bị đang được sử dụng bởi ứng dụng khác.')
        default:
          throw error
      }
    }
    throw error
  }
}
export const getAudioOutputDevices = async () => {
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices.filter(device => device.kind === 'audiooutput')
}
