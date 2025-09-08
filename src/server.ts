// src/server.ts
import dotenv from 'dotenv';
import {httpServer} from './app'; // import httpServer instead of app
import connectDB from './configs/database';

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB();

    httpServer.listen(PORT, () => {
        console.log(`🚀 NodeSec Server running on http://localhost:${PORT}`);
    });
};

startServer().catch((err) => {
    console.error('❌ Failed to start server:', err);
});
