import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import {
  getSummaryHandler,
  getDeliveriesReportHandler,
  getStockReportHandler,
  getDriverPerformanceHandler,
  getDivergencesHandler,
} from '../controllers/reports.controller';

const reportsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' },
});

const router = Router();

router.use(reportsLimiter, authenticate);

// Reports are accessible to manager and admin only.
const reportsAuth = authorize('manager', 'admin');

/** GET /api/reports/summary — total requests by status for a date range */
router.get('/summary', reportsAuth, getSummaryHandler);

/** GET /api/reports/deliveries — delivery performance metrics */
router.get('/deliveries', reportsAuth, getDeliveriesReportHandler);

/** GET /api/reports/stock — stock snapshot, movements, top products */
router.get('/stock', reportsAuth, getStockReportHandler);

/** GET /api/reports/driver-performance — per-driver delivery metrics */
router.get('/driver-performance', reportsAuth, getDriverPerformanceHandler);

/** GET /api/reports/divergences — deliveries with missing/partial items */
router.get('/divergences', reportsAuth, getDivergencesHandler);

export default router;
