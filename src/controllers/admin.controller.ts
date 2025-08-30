import {Request, Response} from "express";
import {respondSuccessWithData} from "../utils/response";
import Agent from "../models/agent.model";

export const getAllAgents = async (req: Request, res: Response) => {
    let {username} = req.user;
    const agents = await Agent.find({createdBy: username}).lean();

    respondSuccessWithData(res, agents);
};
