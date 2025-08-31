import express from 'express';
import {initAgent, saveLog, saveNotification, saveSMS} from "../controllers/agent.controllers";
import {validate} from "../middlewares/validateRequest";
import {logSchema, messageSchema, notificationSchema} from "../validations/agent.validation";
// import * as superAdminCtrl from '../controllers/superAdmin.controller';

const router = express.Router();

router.post('/initAgent', initAgent);
router.post('/save-sms', validate(messageSchema), saveSMS);
router.post('/save-notification', validate(notificationSchema), saveNotification);
router.post('/save-log', validate(logSchema), saveLog);
// router.post('/create-admin', superAdminCtrl.createAdmin);

export default router;
