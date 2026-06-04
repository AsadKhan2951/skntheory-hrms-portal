import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getRealtimeSocket() {
  if (socket) return socket;

  const apiBaseUrl = import.meta.env.VITE_API_URL?.trim();
  const socketUrl = apiBaseUrl ? apiBaseUrl.replace(/\/+$/, "") : window.location.origin;

  socket = io(socketUrl, {
    withCredentials: true,
    transports: ["websocket", "polling"],
  });

  return socket;
}
