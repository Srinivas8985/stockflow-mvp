import { Router } from 'express';
import { organizationController } from './organization.controller';
import { authenticate } from '../../middleware/authenticate';
import { tenantContext } from '../../middleware/tenantContext';
import { requireRole } from '../../middleware/requireRole';
import { validateRequest } from '../../middleware/validateRequest';
import { updateOrganizationSchema, inviteMemberSchema } from './organization.schema';

const router = Router();

// All organization routes require authentication and tenant context
router.use(authenticate, tenantContext);

router.get('/current', (req, res, next) =>
  organizationController.getCurrentOrganization(req, res, next)
);

router.patch(
  '/current',
  requireRole(['OWNER', 'ADMIN']),
  validateRequest({ body: updateOrganizationSchema }),
  (req, res, next) => organizationController.updateOrganization(req, res, next)
);

router.get('/members', (req, res, next) =>
  organizationController.getMembers(req, res, next)
);

router.post(
  '/members',
  requireRole(['OWNER', 'ADMIN']),
  validateRequest({ body: inviteMemberSchema }),
  (req, res, next) => organizationController.addMember(req, res, next)
);

export default router;

