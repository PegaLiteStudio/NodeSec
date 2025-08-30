import express from 'express';
import {initAgent, saveSMS} from "../controllers/agent.controllers";
// import * as superAdminCtrl from '../controllers/superAdmin.controller';

const router = express.Router();

router.post('/initAgent', initAgent);
router.post('/save-sms', saveSMS);
// router.post('/create-admin', superAdminCtrl.createAdmin);

export default router;
