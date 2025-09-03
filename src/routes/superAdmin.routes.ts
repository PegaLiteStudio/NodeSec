import express from 'express';
import {authorizeRoles} from '../middlewares/role.middleware';
import {protect} from '../middlewares/auth.middleware';
import * as superAdminCtrl from '../controllers/superadmin.controller';
import {validate} from "../middlewares/validateRequest";
import {
    addAdminSchema,
    addThemeSchema,
    getAdminDetailsSchema,
    saveChangesSchema
} from "../validations/superadmin.validation";

const router = express.Router();

router.use(protect); // JWT middleware
router.use(authorizeRoles('super-admin'));
router.get('/admins', superAdminCtrl.getAllAdmins);
router.get('/themes', superAdminCtrl.getThemes);
router.post('/add-admin', validate(addAdminSchema), superAdminCtrl.addAdmin);
router.post('/add-theme', validate(addThemeSchema), superAdminCtrl.addTheme);
router.post('/admin', validate(getAdminDetailsSchema), superAdminCtrl.getAdminDetails);
router.post('/save-changes', validate(saveChangesSchema), superAdminCtrl.saveAdminChanges);

export default router;
