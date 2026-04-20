import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import * as MagacinController from '../controllers/magacin.controller.js';

const router = Router();

router.get('/stanje',                verifyToken, MagacinController.stanjeMagacina);
router.post('/prijem',               verifyToken, MagacinController.prijemRobe);
router.post('/izdavanje',            verifyToken, MagacinController.izdavanjeRobe);
router.get('/narudzbenice',          verifyToken, MagacinController.pregledNarudzbenica);
router.post('/narudzbenice/potvrdi', verifyToken, MagacinController.potvrdiNarudzbenicu);
router.get('/inventura',             verifyToken, MagacinController.pregledInventure);
router.post('/inventura',            verifyToken, MagacinController.unosInventure);
router.get('/izvjestaj',             verifyToken, MagacinController.izvjestajKretanjeRobe);
router.get('/artikli',               verifyToken, MagacinController.pregledArtikala);
router.get('/partneri',              verifyToken, MagacinController.pregledPartnera);

export default router;
