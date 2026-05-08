import { Router } from 'express';
import * as Controller from '../controllers/zavrseneNarudzbeLokal.controller.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

router.get('/', Controller.getFinishedOrdersLokal);

export default router;
