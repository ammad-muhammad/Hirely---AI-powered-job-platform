import { io, Socket } from 'socket.io-client';
import { api } from './api';

let socket: Socket | null = null;

export const getSocket = async (): Promise<Socket | null> => {
  try {
    let token: string | undefined;
    try {
      const response = await api.get('/auth/socket-token');
      token = response.data?.token;
    } catch {
      // Guest or unauthenticated connection
    }

    if (socket) {
      if (token) {
        socket.auth = { token };
      }
      if (!socket.connected) {
        socket.connect();
      }
      return socket;
    }

    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.startsWith('http')
        ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, '')
        : 'https://hirely-ai-powered-job-platform-production.up.railway.app');

    socket = io(socketUrl, {
      auth: token ? { token } : {},
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      // Connected
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket.io] Connection error:', err.message);
    });

    return socket;
  } catch (err) {
    console.warn('[Socket.io] Failed to initialize socket:', err);
    return null;
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
