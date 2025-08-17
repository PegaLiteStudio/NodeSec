// routes/auth.routes.ts
import {Router} from 'express';
import {adminLogin, superAdminLogin, userLogin} from '../controllers/auth.controller';
import {validate} from "../middlewares/validateRequest";
import {loginSchema} from "../validations/auth.validation";

const router = Router();

router.post('/superadmin/login', validate(loginSchema), superAdminLogin);
router.post('/admin/login', validate(loginSchema), adminLogin);
router.post('/user/login', validate(loginSchema), userLogin);

export default router;
