import express from 'express';
import {authorizeRoles} from '../middlewares/role.middleware';
import {protect} from '../middlewares/auth.middleware';
import {getAllDevices, getMessages} from "../controllers/user.controller";
// import * as superAdminCtrl from '../controllers/superAdmin.controller';

const router = express.Router();

router.use(protect); // JWT middleware
router.use(authorizeRoles('user', 'admin', 'super-admin'));

router.get('/devices', getAllDevices);
router.get('/messages/:deviceID', getMessages);
// router.post('/create-admin', superAdminCtrl.createAdmin);

export default router;
