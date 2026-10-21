import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import healthRouter from './routes/health.js';
import authCustomerRouter from './routes/authCustomer.js';
import authCentreRouter from './routes/authCentre.js';
import customerRouter from './routes/customer.js';
import centresRouter from './routes/centres.js';
import centreRouter from './routes/centre.js';
import requestsRouter from './routes/requests.js';
import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Determine allowed origins for CORS
const corsOriginsEnv = process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173';
const allowedOrigins = corsOriginsEnv
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

// CORS middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Standard body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Basic API welcome / metadata endpoint
app.get('/api', (_req, res) => {
  res.json({
    service: 'EcoCycle Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      customerAuth: '/api/auth/customer',
      centreAuth: '/api/auth/centre',
      customer: '/api/customer',
      centres: '/api/centres',
      centre: '/api/centre',
      requests: '/api/requests',
    },
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/health', healthRouter);
app.use('/health', healthRouter);
app.use('/api/auth/customer', authCustomerRouter);
app.use('/api/auth/centre', authCentreRouter);
app.use('/api/customer', customerRouter);
app.use('/api/centres', centresRouter);
app.use('/api/centre', centreRouter);
app.use('/api/requests', requestsRouter);

// 404 handler for undefined routes
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

export default app;
