import express from 'express';
import {getThemeIcon, getThemeScreenshots} from "../utils/imageUtils";
import {downloadAgentApp} from "../controllers/admin.controller";

const router = express.Router();

router.get('/getThemeIcon/:name', getThemeIcon);
router.get('/getThemeScreenshots/:name', getThemeScreenshots);
router.get('/download-agent/:agentID', downloadAgentApp);

export default router;
