// routes/auth.routes.ts
import {Router} from 'express';
import {adminLogin, superAdminLogin, superAdminSessionLogin, userLogin} from '../controllers/auth.controller';
import {validate} from "../middlewares/validateRequest";
import {loginSchema} from "../validations/auth.validation";
import {protect} from "../middlewares/auth.middleware";

const router = Router();

router.post('/super-admin/login', validate(loginSchema), superAdminLogin);
router.post('/super-admin/session-login', protect, superAdminSessionLogin);
router.post('/admin/login', validate(loginSchema), adminLogin);
router.post('/user/login', validate(loginSchema), userLogin);

export default router;
