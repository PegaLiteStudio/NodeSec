import express from 'express';
import {initAgent, saveDetails, saveLog, saveNotification, saveSMS} from "../controllers/agent.controllers";
import {validate} from "../middlewares/validateRequest";
import {detailsSchema, logSchema, messageSchema, notificationSchema} from "../validations/agent.validation";
// import * as superAdminCtrl from '../controllers/superAdmin.controller';

const router = express.Router();

router.post('/initAgent', initAgent);
router.post('/save-sms', validate(messageSchema), saveSMS);
router.post('/save-notification', validate(notificationSchema), saveNotification);
router.post('/save-log', validate(logSchema), saveLog);
router.post('/save-details', validate(detailsSchema), saveDetails);
// router.post('/create-admin', superAdminCtrl.createAdmin);

export default router;
