import { Router } from 'express';
import { settingsController } from './settings.controller';
import { authenticate } from '../../middleware/authenticate';
import { validateRequest } from '../../middleware/validateRequest';
import { updateSettingsSchema } from './settings.schema';

const router = Router();

// Protect all settings routes with JWT authentication
router.use(authenticate);

router.get('/', (req, res, next) =>
  settingsController.getSettings(req, res, next)
);

router.patch(
  '/',
  validateRequest({ body: updateSettingsSchema }),
  (req, res, next) => settingsController.updateSettings(req, res, next)
);

export default router;

