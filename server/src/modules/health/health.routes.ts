import { Router } from 'express';
import { healthController } from './health.controller';

const router = Router();

router.get('/health', (req, res, next) => healthController.getHealth(req, res, next));

export default router;

