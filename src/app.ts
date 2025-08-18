// src/app.ts
import express, {Application} from 'express';
import morgan from 'morgan';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import router from './routes';
import dotenv from 'dotenv';

dotenv.config();

const app: Application = express();

// Global Middlewares
app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Rate Limiter (Optional but good for protection)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

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

export default app;
