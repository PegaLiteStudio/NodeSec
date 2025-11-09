import express from 'express';
import {authorizeRoles} from '../middlewares/role.middleware';
import {protect} from '../middlewares/auth.middleware';
import {
    addAgentAdmin,
    createAgent, deleteUserDevice,
    getAgentAdminDetails,
    getAgentDetails,
    getAllAgentAdmins,
    getAllAgents,
    getThemes,
    getThemeScreenshots, getUserDevices,
    saveAgentAdminChanges,
    uploadAgentApp
} from "../controllers/admin.controller";
import {validate} from "../middlewares/validateRequest";
import {addAgentAdminSchema, saveChangesSchema} from "../validations/admin.validation";
import {agentAppUpload} from "../multer/agentAppUpload";

const router = express.Router();

router.use(protect); // JWT middleware
router.use(authorizeRoles('admin', 'super-admin'));

router.get('/agents', getAllAgents);
router.get('/themes', getThemes);
router.get('/agent-admins', getAllAgentAdmins);
router.get('/user-devices/:username', getUserDevices);
router.get('/delete-user-device/:username/:deviceID', deleteUserDevice);
router.get('/theme-screenshots/:themeID', getThemeScreenshots);
router.post('/add-agent-admin', validate(addAgentAdminSchema), addAgentAdmin);
router.post('/create-agent', createAgent);
router.get('/agent-details/:agentID', getAgentDetails);
router.post('/agent-admin', getAgentAdminDetails);
router.post('/save-changes', validate(saveChangesSchema), saveAgentAdminChanges);
router.post('/add-agent-app', agentAppUpload.single("agentApp"), uploadAgentApp);
export default router;
