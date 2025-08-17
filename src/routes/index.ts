import {Router} from 'express';

import userRoutes from './user.routes';
import superAdminRoutes from './superAdmin.routes';
import adminRoutes from './admin.routes';
import authRoutes from "./auth.routes";

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/super-admin', superAdminRoutes);

export default router;
