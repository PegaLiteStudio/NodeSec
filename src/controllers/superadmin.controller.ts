import {Request, Response} from "express";
import {respondFailed, respondSuccess, respondSuccessWithData, RESPONSE_MESSAGES} from "../utils/response";
import AdminModel, {IAdmin} from "../models/admin.model";
import {getPreferredTime} from "../utils/time";
import bcrypt from "bcryptjs";
import Theme, {ITheme} from "../models/theme.model";
import fs from "fs";

export const addAdmin = async (req: Request, res: Response) => {
    const {name, username, password, tokens, maxDevices, expiresAt, loginAsUser} = req.body;

    let doc: IAdmin | null = await AdminModel.findOne({username});
    if (doc) {
        return respondFailed(res, RESPONSE_MESSAGES.ACCOUNT_EXISTS)
    }

    let admin: IAdmin = new AdminModel({
        name,
        username,
        password,
        tokens,
        maxDevices,
        expiresAt,
        loginAsUser,
        createdBy: req.user.username,
        createdAt: getPreferredTime()
    });
    await admin.save();

    respondSuccess(res);
};


export const getAllAdmins = async (req: Request, res: Response) => {
    let {username} = req.user;
    const admins = await AdminModel.find({"createdBy": username}).lean();

    respondSuccessWithData(res, admins);
};


export const getAdminDetails = async (req: Request, res: Response) => {
    const {username} = req.body;
    const admin = await AdminModel.findOne({username}).lean();
    if (!admin) {
        return respondFailed(res, RESPONSE_MESSAGES.ACCOUNT_NOT_EXISTS);
    }
    respondSuccessWithData(res, admin);
};

export const saveAdminChanges = async (req: Request, res: Response) => {
    const {username, changes} = req.body;
    const admin = await AdminModel.findOne({username}).lean();
    if (!admin) {
        return respondFailed(res, RESPONSE_MESSAGES.ACCOUNT_NOT_EXISTS);
    }
    if (changes.password) {
        const salt = await bcrypt.genSalt(10);
        changes.password = await bcrypt.hash(changes.password, salt);
    }
    await AdminModel.updateOne({username}, {$set: changes});

    respondSuccess(res);
};


export const getThemes = async (req: Request, res: Response) => {
    let {username} = req.user;
    const themes = await Theme.find({"createdBy": username}).lean();

    respondSuccessWithData(res, themes);
};


export const addTheme = async (req: Request, res: Response) => {
    console.log(req.body);
    if (req.body.isError) {
        if (fs.existsSync(req.body.errorFilePath)) {
            fs.unlinkSync(req.body.errorFilePath);
        }
        return respondFailed(res, RESPONSE_MESSAGES.ACCOUNT_EXISTS);
    }
    let {username} = req.user;
    let {name, themeID} = req.body;
    name = name.replaceAll("\"", "");
    themeID = themeID.replaceAll("\"", "");
    const theme: ITheme = new Theme({
        name, themeID, createdBy: username, createdAt: getPreferredTime(), "status": "pending"
    });

    await theme.save();

    respondSuccess(res);
};




