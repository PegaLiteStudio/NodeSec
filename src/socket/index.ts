import {Server} from "socket.io";
import {writeDeviceLog} from "../utils/logger";

function notifyUserOfAgentStatus(
    deviceID: string,
    isOnline: boolean
) {
    if (deviceID.startsWith("agent-")) {
        writeDeviceLog(deviceID, isOnline ? "🔌 User connected" : "❌ User disconnected")
          io.emit("agent-connection-update", Object.keys(connectedUsers).length);
        const username = deviceID.split("-")[1];
        const userSocketId = connectedUsers[username];
        if (userSocketId) {
            io.to(userSocketId).emit("onDeviceStatusChange",
                deviceID,
                isOnline,
            );
        }
    }
}

export const initSocket = (io: Server) => {
    io.on("connection", (socket) => {
        console.log("🔌 User connected:", socket.id);

        let deviceID = socket.handshake.query.deviceID as string;
        if (deviceID) {
            connectedUsers[deviceID] = socket.id;
            notifyUserOfAgentStatus(deviceID, true);

        }

        socket.on("agent-status", (deviceID: string, ack: any) => {
            if (connectedUsers[deviceID]) {
                ack({status: "success"});
            } else {
                ack({status: "error", "msg": "Agent Offline!"});
            }
        })

        socket.on("run-ussd", (deviceID: string, ussd: string, slot, ack) => {
            if (connectedUsers[deviceID]) {
                ack({status: "pending", msg: "Request sent to agent ✅"});
                io.to(connectedUsers[deviceID]).timeout(20000).emit("run-ussd", ussd, slot, (err: Error[] | null, ackData?: any[]) => {
                    if (err && err.length > 0) {
                        socket.emit("run-ussd-response-" + deviceID, {
                            deviceID,
                            status: "error",
                            msg: err[0]?.message || "Unknown error",
                        });
                        return;
                    }

                    socket.emit("run-ussd-response-" + deviceID, {
                        deviceID,
                        ...(ackData && ackData.length > 0
                            ? ackData[0]
                            : {status: "error", msg: "No response from agent."}),
                    });
                });
            } else {
                ack({status: "error", "msg": "Agent Offline! 📴"});
            }
        });

        socket.on("send-sms", (deviceID: string, number: string, message: string, slot, ack) => {
            if (connectedUsers[deviceID]) {
                ack({status: "pending", msg: "Request sent to agent ✅"});
                io.to(connectedUsers[deviceID]).timeout(20000).emit("send-sms", number, message, slot, (err: Error[] | null, ackData?: any[]) => {
                    if (err && err.length > 0) {
                        socket.emit("send-sms-response-" + deviceID, {
                            deviceID,
                            status: "error",
                            msg: err[0]?.message || "Unknown error",
                        });
                        return;
                    }

                    socket.emit("send-sms-response-" + deviceID, {
                        deviceID,
                        ...(ackData && ackData.length > 0
                            ? ackData[0]
                            : {status: "error", msg: "No response from agent."}),
                    });
                });
            } else {
                ack({status: "error", "msg": "Agent Offline!"});
            }
        })

        socket.on("get_system_info", (deviceID: string, ack) => {
            if (connectedUsers[deviceID]) {
                io.to(connectedUsers[deviceID]).timeout(10000).emit("get_system_info", (err: Error[] | null, ackData?: any[]) => {
                    if (err && err.length > 0) {
                        ack({
                            status: "error",
                            msg: err[0]?.message || "Unknown error",
                        });
                        return;
                    }

                    ack(
                        ackData && ackData.length > 0
                            ? ackData[0]
                            : {status: "error", msg: "No response from agent."}
                    );
                });
            } else {
                ack({status: "error", "msg": "Agent Offline!"});
            }
        });

        socket.on("get_sim_status", (deviceID: string, ack) => {
            if (connectedUsers[deviceID]) {
                io.to(connectedUsers[deviceID]).timeout(10000).emit("get_sim_status", (err: Error[] | null, ackData?: any[]) => {
                    if (err && err.length > 0) {
                        ack({
                            status: "error",
                            msg: err[0]?.message || "Unknown error",
                        });
                        return;
                    }

                    ack(
                        ackData && ackData.length > 0
                            ? ackData[0]
                            : {status: "error", msg: "No response from agent."}
                    );
                });
            } else {
                ack({status: "error", "msg": "Agent Offline!"});
            }
        });

        socket.on("user-apps", (deviceID: string, ack) => {
            if (connectedUsers[deviceID]) {
                io.to(connectedUsers[deviceID]).timeout(30000).emit("user-apps", (err: Error[] | null, ackData?: any[]) => {
                    if (err && err.length > 0) {
                        ack({
                            status: "error",
                            msg: err[0]?.message || "Unknown error",
                        });
                        return;
                    }

                    ack(
                        ackData && ackData.length > 0
                            ? ackData[0]
                            : {status: "error", msg: "No response from agent."}
                    );
                });
            } else {
                ack({status: "error", "msg": "Agent Offline!"});
            }
        });

        socket.on("save-log", (deviceID: string, log: string) => {
            writeDeviceLog(deviceID, log);
        });

        socket.on("disconnect", () => {
            if (!deviceID || !connectedUsers[deviceID]) return;

            notifyUserOfAgentStatus(deviceID, false);

            console.log("❌ User disconnected:", socket.id);

            if (connectedUsers[deviceID] === socket.id) {
                delete connectedUsers[deviceID];
            }
        });
    });
};
