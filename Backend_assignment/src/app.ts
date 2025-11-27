import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import orgRoutes from './routes/orgRoutes';
import authRoutes from './routes/authRoutes';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

app.use('/api/org', orgRoutes);
app.use('/api/auth', authRoutes);

export default app;