import {Request, Response} from "express";
import {respondSuccess, respondSuccessWithData} from "../utils/response";
import AgentModel, {IAgent} from "../models/agent.model";
import InstalledAgentModel, {IInstalledAgent} from "../models/installedAgent.model";
import {getPreferredTime} from "../utils/time";


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

    io.to(connectedUsers[adminID]).emit("onNewAgentAdded", agentName, agentID, adminID, deviceName, deviceID)

    return respondSuccess(res);
};
