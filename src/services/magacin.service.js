import { withConnection } from './db.service.js';

export const stanjeMagacina = async () => {
  return withConnection(async (connection) => {
    const [rows] = await connection.execute(
      'CALL aplikacija_kese.sp_stanje_magacina()'
    );
    return { success: true, data: rows?.[0] ?? [] };
  });
};

export const prijemRobe = async (sifraArtikla, kolicina, sifraPartnera, napomena, sifraRadnika) => {
  return withConnection(async (connection) => {
    const [rows] = await connection.execute(
      'CALL aplikacija_kese.sp_prijem_robe(?, ?, ?, ?, ?)',
      [sifraArtikla, kolicina, sifraPartnera, napomena ?? '', sifraRadnika]
    );
    return { success: true, data: rows?.[0] ?? [] };
  });
};

export const izdavanjeRobe = async (sifraArtikla, kolicina, sifraPartnera, napomena, sifraRadnika) => {
  return withConnection(async (connection) => {
    const [rows] = await connection.execute(
      'CALL aplikacija_kese.sp_izdavanje_robe(?, ?, ?, ?, ?)',
      [sifraArtikla, kolicina, sifraPartnera, napomena ?? '', sifraRadnika]
    );
    return { success: true, data: rows?.[0] ?? [] };
  });
};

export const pregledNarudzbenica = async () => {
  return withConnection(async (connection) => {
    const [rows] = await connection.execute(
      'CALL aplikacija_kese.sp_pregled_narudzbenica_magacin()'
    );
    return { success: true, data: rows?.[0] ?? [] };
  });
};

export const potvrdiNarudzbenicu = async (sifraNarudzbenice, sifraRadnika) => {
  return withConnection(async (connection) => {
    const [rows] = await connection.execute(
      'CALL aplikacija_kese.sp_potvrdi_narudzbenicu(?, ?)',
      [sifraNarudzbenice, sifraRadnika]
    );
    return { success: true, data: rows?.[0] ?? [] };
  });
};

export const pregledInventure = async () => {
  return withConnection(async (connection) => {
    const [rows] = await connection.execute(
      'CALL aplikacija_kese.sp_pregled_inventure()'
    );
    return { success: true, data: rows?.[0] ?? [] };
  });
};

export const unosInventure = async (sifraArtikla, stvarnaKolicina, sifraRadnika) => {
  return withConnection(async (connection) => {
    const [rows] = await connection.execute(
      'CALL aplikacija_kese.sp_unos_inventure(?, ?, ?)',
      [sifraArtikla, stvarnaKolicina, sifraRadnika]
    );
    return { success: true, data: rows?.[0] ?? [] };
  });
};

export const izvjestajKretanjeRobe = async (datumOd, datumDo) => {
  return withConnection(async (connection) => {
    const [rows] = await connection.execute(
      'CALL aplikacija_kese.sp_izvjestaj_kretanje_robe(?, ?)',
      [datumOd, datumDo]
    );
    return { success: true, data: rows?.[0] ?? [] };
  });
};

export const pregledArtikala = async () => {
  return withConnection(async (connection) => {
    const [rows] = await connection.execute(
      'CALL aplikacija_kese.sp_pregled_artikala_magacin()'
    );
    return { success: true, data: rows?.[0] ?? [] };
  });
};

export const pregledPartnera = async () => {
  return withConnection(async (connection) => {
    const [rows] = await connection.execute(
      'CALL aplikacija_kese.sp_pregled_partnera_magacin()'
    );
    return { success: true, data: rows?.[0] ?? [] };
  });
};
