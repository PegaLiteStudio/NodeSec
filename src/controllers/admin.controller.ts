import {Request, Response} from "express";
import {respondSuccessWithData} from "../utils/response";
import Agent from "../models/agent.model";
import Theme from "../models/theme.model";

export const getAllAgents = async (req: Request, res: Response) => {
    let {username} = req.user;
    const agents = await Agent.find({createdBy: username}).lean();

    respondSuccessWithData(res, agents);
};

export const getThemes = async (_req: Request, res: Response) => {
    const themes = await Theme.find({"status": "active"}).lean();
    respondSuccessWithData(res, themes);
};

