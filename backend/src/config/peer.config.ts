import { Express } from 'express'
import { Server } from 'http'
import { ExpressPeerServer } from 'peer'

export const initPeerServer = (app: Express, server: Server) => {
  const peerServer = ExpressPeerServer(server, {
    path: '/',
  })

  app.use('/peerjs', peerServer)
}
