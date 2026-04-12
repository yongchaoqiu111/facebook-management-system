import { io } from 'socket.io-client'

let socketInstance = null

export function initSocket() {
  if (!socketInstance) {
    socketInstance = io('http://localhost:3001', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    })

    socketInstance.on('connect', () => {
      console.log('Socket connected:', socketInstance.id)
    })

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected')
    })

    socketInstance.on('error', (error) => {
      console.error('Socket error:', error)
    })
  }

  return socketInstance
}

export function getSocket() {
  if (!socketInstance) {
    return initSocket()
  }
  return socketInstance
}