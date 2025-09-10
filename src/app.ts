// src/app.ts
import express, {Application} from 'express';
import morgan from 'morgan';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import router from './routes';
import dotenv from 'dotenv';
import {createServer} from 'http';
import {Server} from 'socket.io';
import {initSocket} from "./socket";

dotenv.config();

const app: Application = express();
const httpServer = createServer(app); // HTTP server for Express + Socket.IO

// Socket.IO setup
const io = new Server(httpServer, {
    cors: {
        origin: "*", // ⚠️ Change to frontend origin in production
        methods: ["GET", "POST"]
    }
});

// Attach to global for reuse
global.io = io;
global.connectedUsers = {};

// Handle socket connections
initSocket(io);

// ---------------------
// Global Middlewares
// ---------------------
app.set("trust proxy", 1);
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Rate Limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
});
// app.use(limiter);

// Routes
app.use('/api', router);

// Health Check
app.get('/', (_req, res) => {
    res.send('NodeSec API is running...');
});

// 404 Handler
app.use((_req, res) => {
    res.status(404).json({error: 'Endpoint not found'});
});

// Export server + io
export {httpServer, io};
