import {Router} from 'express';
// import userRoutes from './user.routes';
import superAdminRoutes from './superAdmin.routes';
import authRoutes from "./auth.routes";
// import other routes...

const router = Router();

// router.use('/users', userRoutes);
router.use('/root-sec', superAdminRoutes);
router.use('/auth', authRoutes);

export default router;
