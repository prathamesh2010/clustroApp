import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io('/', {
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function joinClusterRoom(clusterId: string) {
  const s = getSocket();
  s.emit('join_cluster', clusterId);
}

export function leaveClusterRoom(clusterId: string) {
  const s = getSocket();
  s.emit('leave_cluster', clusterId);
}
