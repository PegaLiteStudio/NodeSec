import express from 'express';
import {authorizeRoles} from '../middlewares/role.middleware';
import {protect} from '../middlewares/auth.middleware';
import * as superAdminCtrl from '../controllers/superadmin.controller';
import {validate} from "../middlewares/validateRequest";
import {addAdminSchema} from "../validations/superadmin.validation";

const router = express.Router();

router.use(protect); // JWT middleware
router.use(authorizeRoles('super-admin'));
router.post('/add-admin', validate(addAdminSchema), superAdminCtrl.addAdmin);

// router.get('/admins', superAdminCtrl.getAllAdmins);

export default router;
