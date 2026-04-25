import { withConnection } from "./db.service.js";

export const getTerenPoDanima = async () => {
  return withConnection(async (connection) => {
    const [rows] = await connection.execute(
      "CALL erp.sp_pregled_aktivnih_terena_po_danima()",
    );
    // console.log('getTerenPoDanima rows:', rows);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : [];
  });
};

export const getTerenPoDanimaArhiva = async () => {
  return withConnection(async (connection) => {
    const [rows] = await connection.execute(
      "CALL erp.sp_pregled_aktivnih_terena_po_danima_arhiva()",
    );
    // console.log('getTerenPoDanimaArhiva rows:', rows);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : [];
  });
};

export const getRedosljedGradova = async () => {
  return withConnection(async (connection) => {
    const [rows] = await connection.execute(
      "CALL erp.sp_dostava_tereni_redosljed_gradova()",
    );
    // console.log('getRedosljedGradova rows:', rows);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : [];
  });
};

export const getAktivneNarudzbeGrupisano = async (sifraTerena) => {
  return withConnection(async (connection) => {
    const [rows] = await connection.execute(
      "CALL erp.sp_dostava_tereni_proizvodi_grupisano(?)",
      [sifraTerena],
    );

    return Array.isArray(rows) && rows.length > 0 ? rows[0] : [];
  });
};

export const azurirajProizvod = async (
  sifraPolja,
  kolicinaZaUnos,
  napomena,
) => {
  return withConnection(async (connection) => {
    const [rows] = await connection.execute(
      "CALL erp.sp_dostava_tereni_proizvodi_azuriranje_magacin(?, ?, ?)",
      [sifraPolja, kolicinaZaUnos, napomena ?? null],
    );
    return Array.isArray(rows) && rows.length > 0 ? rows[0][0] : null;
  });
};

export const getAktivneNarudzbe = async (sifraTerena) => {
  return withConnection(async (connection) => {
    const [rows] = await connection.execute(
      "CALL erp.sp_dostava_tereni_proizvodi(?)",
      [sifraTerena],
    );
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : [];
  });
};

export const getArhiviraneNarudzbe = async () => {
  return withConnection(async (connection) => {
    const [rows] = await connection.execute(
      "CALL erp.sp_dostava_tereni_proizvodi_arhiva()",
    );
    // console.log('getArhiviraneNarudzbe rows:', rows);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : [];
  });
};

export const getArhiviraneNarudzbeGrupisano = async () => {
  return withConnection(async (connection) => {
    const [rows] = await connection.execute(
      "CALL erp.sp_dostava_tereni_proizvodi_grupisano_arhiva()",
    );
    // console.log('getArhiviraneNarudzbeGrupisano rows:', rows);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : [];
  });
};
