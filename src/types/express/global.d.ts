import { Server } from "socket.io";

declare global {
    var io: Server;
    var connectedUsers: Record<string, any>;
}

export {};
