// sec/server/ts
import dotenv from 'dotenv';
import app from './app';
import connectDB from './configs/database';

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB();

    app.listen(PORT, () => {
        console.log(`🚀 NodeSec Server running on http://localhost:${PORT}`);
    });
};

startServer().catch((err) => {
    console.error('❌ Failed to start server:', err);
});
