import {Request, Response} from "express";
import {respondFailed, respondSuccess, respondSuccessWithData, RESPONSE_MESSAGES} from "../utils/response";
import InstalledAgent from "../models/installedAgent.model";
import Message from "../models/message.model";
import Notification from "../models/notification.model";
import {readDeviceLog} from "../utils/logger";

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

    const messages = await Message.find({deviceID}).sort({_id: -1}).limit(100).lean();

    messages.sort((a: any, b: any): number => {
        const parseDate = (str: string): Date => {
            const [datePart, timePart] = str.split(", ");
            const [day, month, year] = datePart.split("/").map(Number);
            let [time, meridian] = timePart.split(" ");
            let [hours, minutes, seconds] = time.split(":").map(Number);

            if (meridian.toLowerCase() === "pm" && hours !== 12) hours += 12;
            if (meridian.toLowerCase() === "am" && hours === 12) hours = 0;

            return new Date(year, month - 1, day, hours, minutes, seconds);
        };

        return parseDate(a.time).getTime() - parseDate(b.time).getTime();
    });

    respondSuccessWithData(res, messages);
};

export const getNotifications = async (req: Request, res: Response) => {
    let {deviceID} = req.params;

    const notifications = await Notification.find({deviceID}).sort({_id: -1}).limit(100).lean();

    notifications.sort((a: any, b: any): number => {
        const parseDate = (str: string): Date => {
            const [datePart, timePart] = str.split(", ");
            const [day, month, year] = datePart.split("/").map(Number);
            let [time, meridian] = timePart.split(" ");
            let [hours, minutes, seconds] = time.split(":").map(Number);

            if (meridian.toLowerCase() === "pm" && hours !== 12) hours += 12;
            if (meridian.toLowerCase() === "am" && hours === 12) hours = 0;

            return new Date(year, month - 1, day, hours, minutes, seconds);
        };

        return parseDate(a.time).getTime() - parseDate(b.time).getTime();
    });

    respondSuccessWithData(res, notifications);
};

export const deleteMessage = async (req: Request, res: Response) => {
    let {deviceID} = req.params;
    let {sender, time} = req.body;

    if (sender == "all" && time == "all") {
        await Message.deleteMany({deviceID});
    } else {
        await Message.deleteOne({deviceID, sender, time});
    }

    respondSuccess(res);
};

export const deleteNotification = async (req: Request, res: Response) => {
    let {deviceID} = req.params;
    let {appName, title, time} = req.body;

    if (appName == "all" && time == "all") {
        await Notification.deleteMany({deviceID});
    } else {
        await Notification.deleteOne({deviceID, appName, title, time});
    }

    respondSuccess(res);
};


export const getLogs = async (req: Request, res: Response) => {
    try {
        const {deviceID} = req.params;
        if (!deviceID) {
            return respondFailed(res, RESPONSE_MESSAGES.MISSING_OR_INVALID_PARAMETERS);
        }

        const logs = readDeviceLog(deviceID);

        return respondSuccessWithData(res, {logs})
    } catch (error) {
        console.error("Error reading log:", error);
        return respondFailed(res, RESPONSE_MESSAGES.ERROR);
    }
};

