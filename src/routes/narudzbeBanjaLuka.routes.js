import { Router } from 'express';
import * as LokalnoController from '../controllers/narudzbeBanjaLuka.controller.js';

const router = Router();

// Dohvati sve aktivne lokalne narudžbe sa stavkama
router.get('/', LokalnoController.getNarudzbeLokalno);

// Inicijalizuj pripremu za cijelu narudžbu (sp_prepare_order)
router.post('/pokreni-pripremu', LokalnoController.pokreniPripremu);

// Ažuriraj pojedinačnu stavku (stub — SP još nije implementiran)
router.post('/azuriraj', LokalnoController.azurirajLokalno);

export default router;
