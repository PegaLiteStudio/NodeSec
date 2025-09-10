import express from 'express';
import {authorizeRoles} from '../middlewares/role.middleware';
import {protect} from '../middlewares/auth.middleware';
import {
    addAgentAdmin,
    createAgent,
    getAgentAdminDetails,
    getAgentDetails,
    getAllAgentAdmins,
    getAllAgents,
    getThemes,
    getThemeScreenshots,
    saveAgentAdminChanges
} from "../controllers/admin.controller";
import {validate} from "../middlewares/validateRequest";
import {addAgentAdminSchema, saveChangesSchema} from "../validations/admin.validation";

const router = express.Router();

router.use(protect); // JWT middleware
router.use(authorizeRoles('admin', 'super-admin'));

router.get('/agents', getAllAgents);
router.get('/themes', getThemes);
router.get('/agent-admins', getAllAgentAdmins);
router.get('/theme-screenshots/:themeID', getThemeScreenshots);
router.post('/add-agent-admin', validate(addAgentAdminSchema), addAgentAdmin);
router.post('/create-agent', createAgent);
router.get('/agent-details/:agentID', getAgentDetails);
router.post('/agent-admin', getAgentAdminDetails);
router.post('/save-changes', validate(saveChangesSchema), saveAgentAdminChanges);

export default router;
