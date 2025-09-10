import express from 'express';
import {authorizeRoles} from '../middlewares/role.middleware';
import {protect} from '../middlewares/auth.middleware';
import {
    addAgentAdmin,
    getAllAgentAdmins,
    getAllAgents,
    getThemes,
    getThemeScreenshots
} from "../controllers/admin.controller";
import {validate} from "../middlewares/validateRequest";
import {addAgentAdminSchema} from "../validations/admin.validation";

const router = express.Router();

router.use(protect); // JWT middleware
router.use(authorizeRoles('admin', 'super-admin'));

router.get('/agents', getAllAgents);
router.get('/themes', getThemes);
router.get('/agent-admins', getAllAgentAdmins);
router.get('/theme-screenshots/:themeID', getThemeScreenshots);
router.post('/add-agent-admin', validate(addAgentAdminSchema), addAgentAdmin);
router.post('/create-agent',  addAgentAdmin);
// router.post('/create-admin', superAdminCtrl.createAdmin);

export default router;
