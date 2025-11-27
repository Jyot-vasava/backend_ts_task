import app from './app';
import connectDB from './db/database';
import { PORT } from './utils/constants';
import dotenv from 'dotenv';


dotenv.config();
const startServer = async () => {
  await connectDB();

  const port = PORT || 3000;

  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Health check: http://localhost:${port}/health`);
  });
};

startServer();