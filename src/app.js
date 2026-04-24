import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { env } from './config/env.js';

import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import aktivneNarudzbeRoutes from './routes/aktivneNarudzbe.routes.js';

export const createApp = () => {
  const app = express();

  const allowedOrigins = [
    env.FRONTEND_URL,
    'https://localhost',
    'http://localhost',
    'capacitor://localhost',
    'http://localhost:5173',
  ];

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} nije dozvoljen`));
      }
    },
    credentials: true,
  }));
  app.use(express.json());
  app.use(cookieParser());

  app.use('/api', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/aktivne-narudzbe-teren', aktivneNarudzbeRoutes);

  return app;
};
