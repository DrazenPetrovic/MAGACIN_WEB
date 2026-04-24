import * as AktivneNarudzbeService from '../services/aktivneNarudzbe.service.js';

// POST /api/aktivne-narudzbe-teren/azuriraj
export const azurirajProizvod = async (req, res) => {
  try {
    const { sifraPolja, kolicinaZaUnos, napomena } = req.body;
    if (!sifraPolja || kolicinaZaUnos === undefined) {
      return res.status(400).json({ success: false, message: 'sifraPolja i kolicinaZaUnos su obavezni' });
    }
    const result = await AktivneNarudzbeService.azurirajProizvod(
      Number(sifraPolja),
      Number(kolicinaZaUnos),
      napomena || null,
    );
    if (result && result.status === 'OK') {
      return res.json({ success: true, data: result });
    }
    return res.status(400).json({ success: false, message: result?.poruka || 'Zapis nije pronađen' });
  } catch (error) {
    console.error('azurirajProizvod error:', error);
    return res.status(500).json({ success: false, message: 'Greška pri ažuriranju' });
  }
};

// GET /api/aktivne-narudzbe-teren/redosljed-gradova
export const getRedosljedGradova = async (req, res) => {
  try {
    const data = await AktivneNarudzbeService.getRedosljedGradova();
    return res.json({ success: true, data });
  } catch (error) {
    console.error('getRedosljedGradova error:', error);
    return res.status(500).json({ success: false, message: 'Greška pri dohvatanju redosljeda gradova' });
  }
};

// GET /api/aktivne-narudzbe-teren/tereni
// Vraća sve aktivne terene po danima — frontend filtrira za današnji dan
export const getTerenPoDanima = async (req, res) => {
  try {
    const data = await AktivneNarudzbeService.getTerenPoDanima();
    return res.json({ success: true, data });
  } catch (error) {
    console.error('getTerenPoDanima error:', error);
    return res.status(500).json({ success: false, message: 'Greška pri dohvatanju terena' });
  }
};

// GET /api/aktivne-narudzbe-teren/:sifraTerena
// Vraća sve stavke aktivnih narudžbi za teren (detaljan prikaz)
export const getAktivneNarudzbe = async (req, res) => {
  try {
    const { sifraTerena } = req.params;
    if (!sifraTerena) {
      return res.status(400).json({ success: false, message: 'Šifra terena je obavezna' });
    }
    const data = await AktivneNarudzbeService.getAktivneNarudzbe(Number(sifraTerena));
    return res.json({ success: true, data });
  } catch (error) {
    console.error('getAktivneNarudzbe error:', error);
    return res.status(500).json({ success: false, message: 'Greška pri dohvatanju narudžbi' });
  }
};

// GET /api/aktivne-narudzbe-teren/:sifraTerena/grupisano
// Vraća stavke grupisane po proizvodu (zbir naručenih količina)
export const getAktivneNarudzbeGrupisano = async (req, res) => {
  try {
    const { sifraTerena } = req.params;
    if (!sifraTerena) {
      return res.status(400).json({ success: false, message: 'Šifra terena je obavezna' });
    }
    const data = await AktivneNarudzbeService.getAktivneNarudzbeGrupisano(Number(sifraTerena));
    return res.json({ success: true, data });
  } catch (error) {
    console.error('getAktivneNarudzbeGrupisano error:', error);
    return res.status(500).json({ success: false, message: 'Greška pri dohvatanju grupiranih narudžbi' });
  }
};
