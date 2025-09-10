import {Request, Response} from "express";
import {respondFailed, respondSuccess, respondSuccessWithData, RESPONSE_MESSAGES} from "../utils/response";
import Agent from "../models/agent.model";
import Theme from "../models/theme.model";
import path from "path";
import fs from "fs";
import User, {IUser} from "../models/user.model";
import {getPreferredTime} from "../utils/time";

export const getAllAgents = async (req: Request, res: Response) => {
    let {username} = req.user;
    const agents = await Agent.find({createdBy: username}).lean();

    respondSuccessWithData(res, agents);
};

export const getThemes = async (_req: Request, res: Response) => {
    const themes = await Theme.find({"status": "active"}).lean();
    respondSuccessWithData(res, themes);
};

export const getAllAgentAdmins = async (req: Request, res: Response) => {
    let {username} = req.user;
    const agents = await User.find({createdBy: username}).lean();

    respondSuccessWithData(res, agents);
};

export const getThemeScreenshots = async (req: Request, res: Response) => {

    let {themeID} = req.params;

    if (!themeID) {
        return respondFailed(res, RESPONSE_MESSAGES.MISSING_OR_INVALID_PARAMETERS);
    }

    const themesFolder = path.join(__dirname, `../../data/themes`);
    const screenshotsFolder = path.join(themesFolder, "screenshots");
    const screenshotIds: string[] = [];
    if (fs.existsSync(screenshotsFolder)) {
        const files = fs.readdirSync(screenshotsFolder);

        const regex = new RegExp(`^${themeID}-\\d+\\.[a-zA-Z0-9]+$`);

        files.forEach(file => {
            if (regex.test(file)) {
                screenshotIds.push(file);
            }
        });
    }

        respondSuccessWithData(res, {screenshotIds});

};

export const addAgentAdmin = async (req: Request, res: Response) => {
    const {name, username, password,expiry} = req.body;

    let doc: IUser | null = await User.findOne({username});
    if (doc) {
        return respondFailed(res, RESPONSE_MESSAGES.ACCOUNT_EXISTS)
    }

    let admin: IUser = new User({
        name,
        username,
        password,
        expiry,
        createdBy: req.user.username,
        createdAt: getPreferredTime()
    });
    await admin.save();

    respondSuccess(res);
};

