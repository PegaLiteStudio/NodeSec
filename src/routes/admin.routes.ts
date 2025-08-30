import express from 'express';
import {authorizeRoles} from '../middlewares/role.middleware';
import {protect} from '../middlewares/auth.middleware';
import {getAllAgents} from "../controllers/admin.controller";
// import * as superAdminCtrl from '../controllers/superAdmin.controller';

const router = express.Router();

router.use(protect); // JWT middleware
router.use(authorizeRoles('admin', 'super-admin'));

router.get('/agents', getAllAgents);
// router.post('/create-admin', superAdminCtrl.createAdmin);

export default router;
