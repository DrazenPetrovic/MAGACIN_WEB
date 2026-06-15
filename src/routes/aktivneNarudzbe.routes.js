import { Router } from 'express';
import * as AktivneNarudzbeController from '../controllers/aktivneNarudzbe.controller.js';

const router = Router();

// Ažuriraj količinu i napomenu za stavku
router.post('/azuriraj', AktivneNarudzbeController.azurirajProizvod);

// Resetuj količinu na -1 (stanje "nije uneseno")
router.post('/reset', AktivneNarudzbeController.resetProizvod);

// Verifikacija grupe stavki (svi isti kupac ili svi isti proizvod)
router.post('/verifikacija', AktivneNarudzbeController.verifikujGrupu);

// Dohvati sve terene po danima (frontend bira današnji)
router.get('/tereni', AktivneNarudzbeController.getTerenPoDanima);

// Redosljed gradova za sortiranje kupaca
router.get('/redosljed-gradova', AktivneNarudzbeController.getRedosljedGradova);

// Arhiva terena i narudžbi
router.get('/tereni-arhiva', AktivneNarudzbeController.getTerenPoDanimaArhiva);
router.get('/arhiva', AktivneNarudzbeController.getArhiviraneNarudzbe);
router.get('/arhiva-grupisano', AktivneNarudzbeController.getArhiviraneNarudzbeGrupisano);

// Detaljan prikaz narudžbi za teren
router.get('/:sifraTerena', AktivneNarudzbeController.getAktivneNarudzbe);

// Grupisani prikaz po proizvodu za teren
router.get('/:sifraTerena/grupisano', AktivneNarudzbeController.getAktivneNarudzbeGrupisano);

export default router;
