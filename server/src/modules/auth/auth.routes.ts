import { Router } from 'express';
import { authController } from './auth.controller';
import { validateRequest } from '../../middleware/validateRequest';
import { authenticate } from '../../middleware/authenticate';
import { signupSchema, loginSchema } from './auth.schema';

const router = Router();

router.post(
  '/signup',
  validateRequest({ body: signupSchema }),
  (req, res, next) => authController.signup(req, res, next)
);

router.post(
  '/login',
  validateRequest({ body: loginSchema }),
  (req, res, next) => authController.login(req, res, next)
);

router.get('/me', authenticate, (req, res, next) =>
  authController.getMe(req, res, next)
);

export default router;
