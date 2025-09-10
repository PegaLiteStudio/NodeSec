import express from 'express';
import {getThemeIcon, getThemeScreenshots} from "../utils/imageUtils";

const router = express.Router();

// router.use(protect); // JWT middleware
// router.use(authorizeRoles('user', 'admin', 'super-admin'));

router.get('/getThemeIcon/:name', getThemeIcon);
router.get('/getThemeScreenshots/:name', getThemeScreenshots);

export default router;
