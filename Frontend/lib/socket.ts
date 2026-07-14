import { io, Socket } from "socket.io-client";
import { BACKEND_URL } from "@/lib/env";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    // If BACKEND_URL is a proxy path like '/api', we route the socket through it
    const isProxy = BACKEND_URL.startsWith("/");

    socket = io(isProxy ? undefined : BACKEND_URL, {
      path: isProxy ? `${BACKEND_URL}/socket.io/` : "/socket.io/",
      withCredentials: true,
      autoConnect: false,
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
