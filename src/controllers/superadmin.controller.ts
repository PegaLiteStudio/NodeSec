import {Request, Response} from "express";
import {respondFailed, respondSuccess, RESPONSE_MESSAGES} from "../utils/response";
import AdminModel, {IAdmin} from "../models/admin.model";
import {getPreferredTime} from "../utils/time";

export const addAdmin = async (req: Request, res: Response) => {
    const {name, username, password, tokens, maxDevices, expiresAt} = req.body;

    let doc: IAdmin | null = await AdminModel.findOne({username});
    if (doc) {
        return respondFailed(res, RESPONSE_MESSAGES.ACCOUNT_EXISTS)
    }

    let admin: IAdmin = new AdminModel({name, username, password, tokens, maxDevices, expiresAt, createdBy : req.user.username, createdAt : getPreferredTime()});
    await admin.save();

    respondSuccess(res);
};

