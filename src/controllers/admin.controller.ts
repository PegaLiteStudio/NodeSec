import {Request, Response} from "express";
import {respondFailed, respondSuccess, respondSuccessWithData, RESPONSE_MESSAGES} from "../utils/response";
import Agent, {IAgent} from "../models/agent.model";
import Theme from "../models/theme.model";
import path from "path";
import fs from "fs";
import User, {IUser} from "../models/user.model";
import {getPreferredTime} from "../utils/time";
import {generateRandomPackage} from "../utils/randomUtils";
import AgentCompiler from "../compiler/agentCompiler";
import {compileQueueManager} from "../compiler/CompileQueueManager";
import Admin from "../models/admin.model";
import SuperAdmin from "../models/superAdmin.model";
import bcrypt from "bcryptjs";
import {sendNotification} from "../utils/notification";

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
    const {name, username, password, expiry} = req.body;

    const [doc, doc2, doc3] = await Promise.all([
        User.findOne({username}),
        SuperAdmin.findOne({username}),
        Admin.findOne({username})
    ]);

    if (doc || doc2 || doc3) {
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

    sendNotification({
        to: "rootsec",
        title: "Agent Admin Added!",
        body: `A new agent admin has been added using username [${username}]`
    });

    respondSuccess(res);
};

export const createAgent = async (req: Request, res: Response) => {
    const {themeID, forbiddenActions, adminID, agentName, variableData} = req.body;

    let agentID: string = generateRandomPackage();

    const createdBy = req.user.username;
    let doc = new Agent({
        agentName,
        agentID,
        adminID,
        themeID,
        forbiddenActions,
        variableData,
        createdBy,
        createdAt: getPreferredTime()
    });
    await doc.save();

    const compiler = new AgentCompiler(agentID, agentName, adminID, createdBy, themeID, forbiddenActions, variableData);
    compileQueueManager.addTask(agentID,
        "apk",
        async () => {
            try {
                await compiler.compileAgent();
            } catch (err) {
            }
        },
        (pos) => {
            compiler.addLog(`[QUEUE] Agent ${agentName} position changed: ${pos}`);
        });

    await Admin.updateOne({username: createdBy}, {$inc: {usedTokens: 1, tokens: -1}});

    respondSuccessWithData(res, {
        agentID, agentName, themeID
    });
}

export const getAgentDetails = async (req: Request, res: Response) => {
    const {agentID} = req.params;

    const agent: IAgent | null = await Agent.findOne({agentID}).lean();
    if (!agent) {
        return respondFailed(res, RESPONSE_MESSAGES.ACCOUNT_NOT_EXISTS);
    }

    if (agent.status === "pending" || agent.status === "error") {
        const logsDir = path.join(__dirname, "../../data/compile-logs");
        const logFile = path.join(logsDir, `${agentID}.log`);

        let logs: string[] = ["NO LOGS"];
        if (fs.existsSync(logFile)) {
            logs = fs.readFileSync(logFile, "utf8").split("\n").filter(Boolean);
        }
        return respondSuccessWithData(res, {logs, agent});
    }

    respondSuccessWithData(res, {agent});

}

export const downloadAgentApp = async (req: Request, res: Response) => {
    try {
        const { agentID } = req.params;

        const appPath = path.join(__dirname, "../../data/agents", `${agentID}.apk`);

        // Check if the file exists asynchronously
        fs.access(appPath, fs.constants.F_OK, (err) => {
            if (err) {
                return res.status(404).json({ success: false, message: "App file not found" });
            }

            // Set correct Content-Type for APK files
            res.setHeader("Content-Type", "application/vnd.android.package-archive");

            // Trigger file download with correct extension
            res.download(appPath, `${agentID}.apk`, (err) => {
                if (err) {
                    console.error("Error sending file:", err);
                    if (!res.headersSent) {
                        res.status(500).json({ success: false, message: "Error downloading file" });
                    }
                }
            });
        });
    } catch (error) {
        console.error("Download error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
export const getAgentAdminDetails = async (req: Request, res: Response) => {
    const {username} = req.body;
    const user = await User.findOne({username}).lean();
    if (!user) {
        return respondFailed(res, RESPONSE_MESSAGES.ACCOUNT_NOT_EXISTS);
    }
    respondSuccessWithData(res, user);
};

export const saveAgentAdminChanges = async (req: Request, res: Response) => {
    const {username, changes} = req.body;
    const admin = await User.findOne({username}).lean();
    if (!admin) {
        return respondFailed(res, RESPONSE_MESSAGES.ACCOUNT_NOT_EXISTS);
    }
    if (changes.password) {
        const salt = await bcrypt.genSalt(10);
        changes.password = await bcrypt.hash(changes.password, salt);
    }
    await User.updateOne({username}, {$set: changes});

    sendNotification({
        to: "rootsec",
        title: "Agent Admin Updated!",
        body: `Some details of agent admin [${username}] has been updated`
    });

    respondSuccess(res);
};

export const uploadAgentApp = async (req: Request, res: Response) => {
    let username = req.body.username;

    await User.updateOne({username}, {$set: {isAgentAvailable: true}});

    respondSuccess(res);
}
