import Peer from 'peerjs'
import { useEffect, useState } from 'react'

export const usePeer = (userId: string) => {
  const [peer, setPeer] = useState<Peer | null>(null)
  const [peerId, setPeerId] = useState<string>('')
  const [isPeerReady, setIsPeerReady] = useState(false)

  useEffect(() => {
    if (!userId) return
    const newPeer = new Peer(userId, {
      host: import.meta.env.VITE_PEER_HOST,
      port: Number(import.meta.env.VITE_PEER_PORT),
      path: import.meta.env.VITE_PEER_PATH,
      secure: import.meta.env.VITE_PEER_SECURE === 'true',
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    })

    newPeer.on('open', id => {
      setPeerId(id)
      setIsPeerReady(true)
    })

    setPeer(newPeer)

    return () => {
      newPeer.destroy()
    }
  }, [userId])

  return { peer, peerId, isPeerReady }
}
