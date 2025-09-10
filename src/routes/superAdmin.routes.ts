import express from 'express';
import {authorizeRoles} from '../middlewares/role.middleware';
import {protect} from '../middlewares/auth.middleware';
import * as superAdminCtrl from '../controllers/superadmin.controller';
import {validate} from "../middlewares/validateRequest";
import {addAdminSchema, getAdminDetailsSchema, saveChangesSchema} from "../validations/superadmin.validation";
import {themeUpload} from "../multer/themeUpload";

const router = express.Router();

router.use(protect); // JWT middleware
router.use(authorizeRoles('super-admin'));
router.get('/admins', superAdminCtrl.getAllAdmins);
router.get('/themes', superAdminCtrl.getThemes);
router.get('/theme-logs/:themeID', superAdminCtrl.getThemeLogs);
router.post('/add-admin', validate(addAdminSchema), superAdminCtrl.addAdmin);
router.post('/delete-theme/:themeID', superAdminCtrl.deleteTheme);
router.post('/add-theme', themeUpload.fields([
    {name: "themeIcon", maxCount: 1},
    {name: "themeResource", maxCount: 1},
    {name: "screenshots", maxCount: 10}]), superAdminCtrl.addTheme);
router.post('/admin', validate(getAdminDetailsSchema), superAdminCtrl.getAdminDetails);
router.post('/save-changes', validate(saveChangesSchema), superAdminCtrl.saveAdminChanges);

export default router;
