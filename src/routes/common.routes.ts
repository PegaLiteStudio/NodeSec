import express from 'express';
import {authorizeRoles} from '../middlewares/role.middleware';
import {protect} from '../middlewares/auth.middleware';
import {getThemeIcon} from "../utils/imageUtils";

const router = express.Router();

// router.use(protect); // JWT middleware
// router.use(authorizeRoles('user', 'admin', 'super-admin'));

router.get('/getThemeIcon/:name', getThemeIcon);

export default router;
