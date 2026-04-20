import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { verifyToken } from '../middleware/auth.js';
import * as MagacinController from '../controllers/magacin.controller.js';

const router = Router();

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Previše zahtjeva. Pokušajte ponovo.' },
});

router.get('/stanje',                apiLimiter, verifyToken, MagacinController.stanjeMagacina);
router.post('/prijem',               apiLimiter, verifyToken, MagacinController.prijemRobe);
router.post('/izdavanje',            apiLimiter, verifyToken, MagacinController.izdavanjeRobe);
router.get('/narudzbenice',          apiLimiter, verifyToken, MagacinController.pregledNarudzbenica);
router.post('/narudzbenice/potvrdi', apiLimiter, verifyToken, MagacinController.potvrdiNarudzbenicu);
router.get('/inventura',             apiLimiter, verifyToken, MagacinController.pregledInventure);
router.post('/inventura',            apiLimiter, verifyToken, MagacinController.unosInventure);
router.get('/izvjestaj',             apiLimiter, verifyToken, MagacinController.izvjestajKretanjeRobe);
router.get('/artikli',               apiLimiter, verifyToken, MagacinController.pregledArtikala);
router.get('/partneri',              apiLimiter, verifyToken, MagacinController.pregledPartnera);

export default router;
