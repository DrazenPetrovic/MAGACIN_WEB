import * as AktivneNarudzbeService from '../services/aktivneNarudzbe.service.js';

// POST /api/aktivne-narudzbe-teren/reset
// Resetuje spremljenu_kolicinu na -1 (stanje "nije uneseno")
export const resetProizvod = async (req, res) => {
  try {
    const { sifraPolja, kolicina } = req.body;
    if (!sifraPolja || kolicina === undefined) {
      return res.status(400).json({ success: false, message: 'sifraPolja i kolicina su obavezni' });
    }
    const result = await AktivneNarudzbeService.resetProizvod(Number(sifraPolja), Number(kolicina));
    if (result && (result.STATUS === 'OK' || result.status === 'OK')) {
      return res.json({ success: true, data: result });
    }
    return res.status(400).json({ success: false, message: result?.poruka || 'Zapis nije pronađen' });
  } catch (error) {
    console.error('resetProizvod error:', error);
    return res.status(500).json({ success: false, message: 'Greška pri resetovanju' });
  }
};

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

// GET /api/aktivne-narudzbe-teren/tereni-arhiva
export const getTerenPoDanimaArhiva = async (req, res) => {
  try {
    const data = await AktivneNarudzbeService.getTerenPoDanimaArhiva();
    return res.json({ success: true, data });
  } catch (error) {
    console.error('getTerenPoDanimaArhiva error:', error);
    return res.status(500).json({ success: false, message: 'Greška pri dohvatanju arhivskih terena' });
  }
};

// GET /api/aktivne-narudzbe-teren/arhiva
export const getArhiviraneNarudzbe = async (req, res) => {
  try {
    const data = await AktivneNarudzbeService.getArhiviraneNarudzbe();
    return res.json({ success: true, data });
  } catch (error) {
    console.error('getArhiviraneNarudzbe error:', error);
    return res.status(500).json({ success: false, message: 'Greška pri dohvatanju arhiviranih narudžbi' });
  }
};

// GET /api/aktivne-narudzbe-teren/arhiva-grupisano
export const getArhiviraneNarudzbeGrupisano = async (req, res) => {
  try {
    const data = await AktivneNarudzbeService.getArhiviraneNarudzbeGrupisano();
    return res.json({ success: true, data });
  } catch (error) {
    console.error('getArhiviraneNarudzbeGrupisano error:', error);
    return res.status(500).json({ success: false, message: 'Greška pri dohvatanju grupiranih arhiviranih narudžbi' });
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

// POST /api/aktivne-narudzbe-teren/verifikacija
// Prima: { sifraTabeleArray: number[], verifikovano: 0|1|2 }
// 0 = poništi verifikaciju, 1 = verifikovano, 2 = zaključano (kupac zaključan, dalje izmjene nisu moguće)
// Validacija kompletnosti grupe je na frontendu — ovdje samo zapisujemo.
export const verifikujGrupu = async (req, res) => {
  try {
    const { sifraTabeleArray, verifikovano } = req.body;
    if (!Array.isArray(sifraTabeleArray) || sifraTabeleArray.length === 0) {
      return res.status(400).json({ success: false, message: 'sifraTabeleArray je obavezan i ne smije biti prazan' });
    }
    const verifikovanoNum = verifikovano !== undefined ? Number(verifikovano) : 1;
    if (![0, 1, 2].includes(verifikovanoNum)) {
      return res.status(400).json({ success: false, message: 'verifikovano mora biti 0, 1 ili 2' });
    }
    const result = await AktivneNarudzbeService.verifikujGrupu(
      sifraTabeleArray.map(Number),
      verifikovanoNum,
    );
    if (result.success) {
      return res.json(result);
    }
    return res.status(400).json({ success: false, message: result.poruka });
  } catch (error) {
    console.error('verifikujGrupu error:', error);
    return res.status(500).json({ success: false, message: 'Greška pri verifikaciji' });
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
