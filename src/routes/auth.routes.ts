// routes/auth.routes.ts
import {Router} from 'express';
import {adminLogin, superAdminLogin, userLogin} from '../controllers/auth.controller';

const router = Router();

router.post('/superadmin/login', superAdminLogin);
router.post('/admin/login', adminLogin);
router.post('/user/login', userLogin);

export default router;
