import {Request, Response} from "express";
import {respondSuccessWithData} from "../utils/response";
import InstalledAgent from "../models/installedAgent.model";

export const getAllDevices = async (req: Request, res: Response) => {
    let {username} = req.user;

    const devices = await InstalledAgent.find({adminID: username}).lean();

    if (devices != null) {
        for (let device of devices) {
            device.isOnline = !!connectedUsers[device.deviceID];
        }
    }

    respondSuccessWithData(res, devices);
};
