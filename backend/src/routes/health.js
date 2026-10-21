import { Router } from 'express';
import { testConnection } from '../config/db.js';

const router = Router();

/**
 * GET /api/health
 * Returns backend service status and MySQL database connectivity.
 * Gracefully handles database offline/unconfigured state without crashing or leaking secrets.
 */
router.get('/', async (_req, res, next) => {
  try {
    const dbTest = await testConnection();

    if (dbTest.connected) {
      return res.status(200).json({
        status: 'ok',
        service: 'ecocycle-backend',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        database: {
          status: 'connected',
          name: dbTest.database,
        },
      });
    }

    // Database is unreachable or credentials need setup
    return res.status(200).json({
      status: 'degraded',
      service: 'ecocycle-backend',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: {
        status: 'disconnected',
        code: dbTest.code || 'UNKNOWN',
        hint: dbTest.hint || 'Check database configuration in backend/.env',
      },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
