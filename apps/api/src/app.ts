import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { corsOrigins, envs } from './config/envs.js';
import { ensureUploadsDir, uploadsDir } from './config/uploads.js';
import { globalErrorHandler, notFoundHandler } from './errors/errorController.js';
import { verifyOrigin } from './middlewares/verifyOrigin.js';
import { apiRouter } from './routes/index.js';

export const app = express();

ensureUploadsDir();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);
app.use(verifyOrigin);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: 'fail',
      message: 'Demasiadas solicitudes. Probá más tarde.',
    },
  })
);

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'REVIA API v1',
    environment: envs.NODE_ENV,
    uptime: process.uptime(),
  });
});

app.use('/uploads', express.static(uploadsDir, { maxAge: '7d', immutable: true }));
app.use('/api/v1', apiRouter);

app.all('*', notFoundHandler);
app.use(globalErrorHandler);
