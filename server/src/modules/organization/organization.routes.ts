import { Router } from 'express';
import { organizationController } from './organization.controller';
import { authenticate } from '../../middleware/authenticate';
import { validateRequest } from '../../middleware/validateRequest';
import { updateOrganizationSchema } from './organization.schema';

const router = Router();

// Protect all organization routes with JWT authentication
router.use(authenticate);

router.get('/current', (req, res, next) =>
  organizationController.getCurrentOrganization(req, res, next)
);

router.patch(
  '/current',
  validateRequest({ body: updateOrganizationSchema }),
  (req, res, next) => organizationController.updateCurrentOrganization(req, res, next)
);

export default router;
