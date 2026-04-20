import * as MagacinService from '../services/magacin.service.js';

export const stanjeMagacina = async (req, res) => {
  try {
    const result = await MagacinService.stanjeMagacina();
    return res.json(result);
  } catch (error) {
    console.error('stanjeMagacina error:', error);
    return res.status(503).json({ success: false, message: 'Baza podataka nije dostupna.' });
  }
};

export const prijemRobe = async (req, res) => {
  try {
    const { sifraArtikla, kolicina, sifraPartnera, napomena } = req.body;
    const sifraRadnika = req.user?.sifraRadnika;

    if (!sifraArtikla || !kolicina) {
      return res.status(400).json({ success: false, message: 'Šifra artikla i količina su obavezni.' });
    }

    let result;
    try {
      result = await MagacinService.prijemRobe(
        Number(sifraArtikla),
        Number(kolicina),
        Number(sifraPartnera ?? 0),
        napomena ?? '',
        Number(sifraRadnika ?? 0)
      );
    } catch (dbError) {
      console.error('DB error — sp_prijem_robe:', dbError);
      return res.status(503).json({ success: false, message: 'Baza podataka nije dostupna.' });
    }

    return res.json(result);
  } catch (error) {
    console.error('prijemRobe error:', error);
    return res.status(500).json({ success: false, message: 'Greška pri obradi zahtjeva.' });
  }
};

export const izdavanjeRobe = async (req, res) => {
  try {
    const { sifraArtikla, kolicina, sifraPartnera, napomena } = req.body;
    const sifraRadnika = req.user?.sifraRadnika;

    if (!sifraArtikla || !kolicina) {
      return res.status(400).json({ success: false, message: 'Šifra artikla i količina su obavezni.' });
    }

    let result;
    try {
      result = await MagacinService.izdavanjeRobe(
        Number(sifraArtikla),
        Number(kolicina),
        Number(sifraPartnera ?? 0),
        napomena ?? '',
        Number(sifraRadnika ?? 0)
      );
    } catch (dbError) {
      console.error('DB error — sp_izdavanje_robe:', dbError);
      return res.status(503).json({ success: false, message: 'Baza podataka nije dostupna.' });
    }

    return res.json(result);
  } catch (error) {
    console.error('izdavanjeRobe error:', error);
    return res.status(500).json({ success: false, message: 'Greška pri obradi zahtjeva.' });
  }
};

export const pregledNarudzbenica = async (req, res) => {
  try {
    const result = await MagacinService.pregledNarudzbenica();
    return res.json(result);
  } catch (error) {
    console.error('pregledNarudzbenica error:', error);
    return res.status(503).json({ success: false, message: 'Baza podataka nije dostupna.' });
  }
};

export const potvrdiNarudzbenicu = async (req, res) => {
  try {
    const { sifraNarudzbenice } = req.body;
    const sifraRadnika = req.user?.sifraRadnika;

    if (!sifraNarudzbenice) {
      return res.status(400).json({ success: false, message: 'Šifra narudžbenice je obavezna.' });
    }

    let result;
    try {
      result = await MagacinService.potvrdiNarudzbenicu(
        Number(sifraNarudzbenice),
        Number(sifraRadnika ?? 0)
      );
    } catch (dbError) {
      console.error('DB error — sp_potvrdi_narudzbenicu:', dbError);
      return res.status(503).json({ success: false, message: 'Baza podataka nije dostupna.' });
    }

    return res.json(result);
  } catch (error) {
    console.error('potvrdiNarudzbenicu error:', error);
    return res.status(500).json({ success: false, message: 'Greška pri obradi zahtjeva.' });
  }
};

export const pregledInventure = async (req, res) => {
  try {
    const result = await MagacinService.pregledInventure();
    return res.json(result);
  } catch (error) {
    console.error('pregledInventure error:', error);
    return res.status(503).json({ success: false, message: 'Baza podataka nije dostupna.' });
  }
};

export const unosInventure = async (req, res) => {
  try {
    const { sifraArtikla, stvarnaKolicina } = req.body;
    const sifraRadnika = req.user?.sifraRadnika;

    if (!sifraArtikla || stvarnaKolicina === undefined || stvarnaKolicina === null) {
      return res.status(400).json({ success: false, message: 'Šifra artikla i stvarna količina su obavezni.' });
    }

    let result;
    try {
      result = await MagacinService.unosInventure(
        Number(sifraArtikla),
        Number(stvarnaKolicina),
        Number(sifraRadnika ?? 0)
      );
    } catch (dbError) {
      console.error('DB error — sp_unos_inventure:', dbError);
      return res.status(503).json({ success: false, message: 'Baza podataka nije dostupna.' });
    }

    return res.json(result);
  } catch (error) {
    console.error('unosInventure error:', error);
    return res.status(500).json({ success: false, message: 'Greška pri obradi zahtjeva.' });
  }
};

export const izvjestajKretanjeRobe = async (req, res) => {
  try {
    const { datumOd, datumDo } = req.query;

    if (!datumOd || !datumDo) {
      return res.status(400).json({ success: false, message: 'Datum od i datum do su obavezni.' });
    }

    let result;
    try {
      result = await MagacinService.izvjestajKretanjeRobe(datumOd, datumDo);
    } catch (dbError) {
      console.error('DB error — sp_izvjestaj_kretanje_robe:', dbError);
      return res.status(503).json({ success: false, message: 'Baza podataka nije dostupna.' });
    }

    return res.json(result);
  } catch (error) {
    console.error('izvjestajKretanjeRobe error:', error);
    return res.status(500).json({ success: false, message: 'Greška pri obradi zahtjeva.' });
  }
};

export const pregledArtikala = async (req, res) => {
  try {
    const result = await MagacinService.pregledArtikala();
    return res.json(result);
  } catch (error) {
    console.error('pregledArtikala error:', error);
    return res.status(503).json({ success: false, message: 'Baza podataka nije dostupna.' });
  }
};

export const pregledPartnera = async (req, res) => {
  try {
    const result = await MagacinService.pregledPartnera();
    return res.json(result);
  } catch (error) {
    console.error('pregledPartnera error:', error);
    return res.status(503).json({ success: false, message: 'Baza podataka nije dostupna.' });
  }
};
