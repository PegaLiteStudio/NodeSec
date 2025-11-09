// routes/auth.routes.ts
import {Router} from 'express';
import {
    adminLogin,
    adminSessionLogin,
    superAdminLogin,
    superAdminSessionLogin,
    userLogin,
    userSessionLogin
} from '../controllers/auth.controller';
import {validate} from "../middlewares/validateRequest";
import {loginSchema} from "../validations/auth.validation";
import {protect} from "../middlewares/auth.middleware";

const router = Router();

router.post('/super-admin/login', validate(loginSchema), superAdminLogin);
router.post('/super-admin/session-login', protect, superAdminSessionLogin);

router.post('/admin/login', validate(loginSchema), adminLogin);
router.post('/admin/session-login', protect, adminSessionLogin);

router.post('/user/login-2', validate(loginSchema), userLogin);
router.post('/user/session-login-2', protect, userSessionLogin);

export default router;
