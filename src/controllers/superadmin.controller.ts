import {Request, Response} from "express";
import {respondFailed, respondSuccess, respondSuccessWithData, RESPONSE_MESSAGES} from "../utils/response";
import {getPreferredTime} from "../utils/time";
import bcrypt from "bcryptjs";
import Theme, {ITheme} from "../models/theme.model";
import fs from "fs";
import ThemeCompiler from "../compiler/themeCompiler";
import {compileQueueManager} from "../compiler/CompileQueueManager";
import path from "path";
import User from "../models/user.model";
import SuperAdmin from "../models/superAdmin.model";
import Admin, {IAdmin} from "../models/admin.model";

export const addAdmin = async (req: Request, res: Response) => {
    const {name, username, password, tokens, maxDevices, expiresAt, loginAsUser} = req.body;

    const [doc, doc2, doc3] = await Promise.all([
        User.findOne({username}),
        SuperAdmin.findOne({username}),
        Admin.findOne({username})
    ]);
    if (doc || doc2 || doc3) {
        return respondFailed(res, RESPONSE_MESSAGES.ACCOUNT_EXISTS)
    }

    let admin: IAdmin = new Admin({
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
    const admins = await Admin.find({"createdBy": username}).lean();

    respondSuccessWithData(res, admins);
};


export const getAdminDetails = async (req: Request, res: Response) => {
    const {username} = req.body;
    const admin = await Admin.findOne({username}).lean();
    if (!admin) {
        return respondFailed(res, RESPONSE_MESSAGES.ACCOUNT_NOT_EXISTS);
    }
    respondSuccessWithData(res, admin);
};

export const saveAdminChanges = async (req: Request, res: Response) => {
    const {username, changes} = req.body;
    const admin = await Admin.findOne({username}).lean();
    if (!admin) {
        return respondFailed(res, RESPONSE_MESSAGES.ACCOUNT_NOT_EXISTS);
    }
    if (changes.password) {
        const salt = await bcrypt.genSalt(10);
        changes.password = await bcrypt.hash(changes.password, salt);
    }
    await Admin.updateOne({username}, {$set: changes});

    respondSuccess(res);
};


export const getThemes = async (req: Request, res: Response) => {
    let {username} = req.user;
    const themes = await Theme.find({"createdBy": username}).lean();

    respondSuccessWithData(res, themes);
};


export const getThemeLogs = async (req: Request, res: Response) => {
    let {themeID} = req.params;

    const logsDir = path.join(__dirname, "../../data/compile-logs");
    const logFile = path.join(logsDir, `${themeID}.log`);

    let logs: string[] = ["LOGS_DELETED"];
    if (fs.existsSync(logFile)) {
        logs = fs.readFileSync(logFile, "utf8").split("\n").filter(Boolean);
    }
    respondSuccessWithData(res, {logs});
};


export const addTheme = async (req: Request, res: Response) => {
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

    const compiler = new ThemeCompiler(username, themeID);
    compileQueueManager.addTask(themeID,
        "theme",
        async () => {
            try {
                await compiler.compileTheme();
            } catch (err) {
            }
        },
        (pos) => {
            compiler.addLog(`[QUEUE] Theme ${themeID} position changed: ${pos}`);
        });

    respondSuccess(res);
};

export const deleteTheme = async (req: Request, res: Response) => {
    let {themeID} = req.params;

    if (!themeID) {
        return respondFailed(res, RESPONSE_MESSAGES.MISSING_OR_INVALID_PARAMETERS);
    }

    // Delete from database
    await Theme.deleteOne({themeID});

    const themesFolder = path.join(__dirname, `../../data/themes`);
    const iconsFolder = path.join(themesFolder, "icons");
    const resourcesFolder = path.join(themesFolder, "resources");
    const screenshotsFolder = path.join(themesFolder, "screenshots");

    // Delete icon files
    if (fs.existsSync(iconsFolder)) {
        const files = fs.readdirSync(iconsFolder);

        files.forEach(file => {
            const filenameWithoutExt = path.parse(file).name;
            if (filenameWithoutExt === themeID) {
                fs.rmSync(path.join(iconsFolder, file), {recursive: true, force: true});
            }
        });
    }

    // Delete resource ZIP
    const resourceZip = path.join(resourcesFolder, `${themeID}.zip`);
    if (fs.existsSync(resourceZip)) {
        fs.rmSync(resourceZip, {recursive: true, force: true});
    }

    // Delete screenshots matching pattern: <themeID>-<number>.<ext>
    if (fs.existsSync(screenshotsFolder)) {
        const files = fs.readdirSync(screenshotsFolder);

        const regex = new RegExp(`^${themeID}-\\d+\\.[a-zA-Z0-9]+$`);

        files.forEach(file => {
            if (regex.test(file)) {
                fs.rmSync(path.join(screenshotsFolder, file), {force: true});
            }
        });
    }

    respondSuccess(res);
};




