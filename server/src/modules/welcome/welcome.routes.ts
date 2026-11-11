import { Router } from 'express';
import { welcomeController } from './welcome.controller';

const router = Router();

router.get('/', (req, res) => welcomeController.getWelcome(req, res));

export default router;

