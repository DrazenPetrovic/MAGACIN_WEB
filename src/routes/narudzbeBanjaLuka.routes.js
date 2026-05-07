import { Router } from 'express';
import * as LokalnoController from '../controllers/narudzbeBanjaLuka.controller.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

// Dohvati sve aktivne lokalne narudžbe sa stavkama
router.get('/', LokalnoController.getNarudzbeLokalno);

// Inicijalizuj pripremu za cijelu narudžbu
router.post('/pokreni-pripremu', LokalnoController.pokreniPripremu);

// Ažuriraj pojedinačnu stavku
router.post('/azuriraj', LokalnoController.azurirajLokalno);

export default router;
