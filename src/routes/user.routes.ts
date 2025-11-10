import express from 'express';
import {authorizeRoles} from '../middlewares/role.middleware';
import {protect} from '../middlewares/auth.middleware';
import {
    deleteDetail,
    deleteMessage,
    deleteNotification,
    getAllDevices,
    getContacts,
    getDetails,
    getDownloadStatus,
    getLogs,
    getMessages,
    getNotifications,
    requestAgentDownload,
    resetAgentDownloadRequest
} from "../controllers/user.controller";

const router = express.Router();

router.use(protect); // JWT middleware
router.use(authorizeRoles('user', 'admin', 'super-admin'));

router.get('/devices', getAllDevices);
router.get('/messages/:deviceID', getMessages);
router.get('/notifications/:deviceID', getNotifications);
router.get('/contacts/:deviceID', getContacts);
router.get('/logs/:deviceID', getLogs);
router.get('/details/:deviceID', getDetails);
router.get('/agent-download-status', getDownloadStatus);
router.post('/request-agent-download', requestAgentDownload);
router.post('/reset-agent-download-request', resetAgentDownloadRequest);
router.post('/delete-message/:deviceID', deleteMessage);
router.post('/delete-detail/:deviceID', deleteDetail);
router.post('/delete-notification/:deviceID', deleteNotification);

export default router;
