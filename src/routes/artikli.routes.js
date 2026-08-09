import { Router } from 'express';
import * as ArtikliController from '../controllers/artikli.controller.js';

const router = Router();

// Puna lista artikala (šifra, naziv, JM, cijene, količina, grupa, barkod...)
router.get('/', ArtikliController.getArtikli);

// Lista grupa artikala (za filter)
router.get('/grupe', ArtikliController.getArtikliGrupe);

export default router;
