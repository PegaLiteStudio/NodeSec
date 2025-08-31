import express from 'express';
import {authorizeRoles} from '../middlewares/role.middleware';
import {protect} from '../middlewares/auth.middleware';
import {deleteMessage, getAllDevices, getMessages, getNotifications} from "../controllers/user.controller";
// import * as superAdminCtrl from '../controllers/superAdmin.controller';

const router = express.Router();

router.use(protect); // JWT middleware
router.use(authorizeRoles('user', 'admin', 'super-admin'));

router.get('/devices', getAllDevices);
router.get('/messages/:deviceID', getMessages);
router.get('/notifications/:deviceID', getNotifications);
router.post('/delete-message/:deviceID', deleteMessage);
// router.post('/create-admin', superAdminCtrl.createAdmin);

export default router;
