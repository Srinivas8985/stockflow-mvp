import { Router } from 'express';
import { analyticsController } from './analytics.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

// Protect all analytics endpoints with JWT authentication
router.use(authenticate);

router.get('/dashboard', (req, res, next) =>
  analyticsController.getDashboardAnalytics(req, res, next)
);

export default router;

