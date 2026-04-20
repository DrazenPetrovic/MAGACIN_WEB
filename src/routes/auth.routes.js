import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as AuthController from '../controllers/auth.controller.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Previše pokušaja prijave. Pokušajte ponovo za 15 minuta.' },
});

const verifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Previše zahtjeva.' },
});

router.post('/login',        authLimiter,   AuthController.login);
router.post('/token-login',  authLimiter,   AuthController.loginByToken);
router.get('/verify',        verifyLimiter, AuthController.verify);
router.post('/logout',                      AuthController.logout);

export default router;
