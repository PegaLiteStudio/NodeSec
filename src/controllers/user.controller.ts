import {Request, Response} from "express";
import {respondSuccessWithData} from "../utils/response";
import InstalledAgent from "../models/installedAgent.model";
import Message from "../models/message.model";

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


export const getMessages = async (req: Request, res: Response) => {
    let {deviceID} = req.params;

    const messages = await Message.find({deviceID}).lean();

    respondSuccessWithData(res, messages);
};


