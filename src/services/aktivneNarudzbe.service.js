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

export const resetProizvod = async (sifraPolja, kolicina) => {
  return withConnection(async (connection) => {
    const [rows] = await connection.execute(
      "CALL erp.sp_dostava_tereni_proizvodi_azuriranje_magacin_reset(?, ?)",
      [sifraPolja, kolicina],
    );
    return Array.isArray(rows) && rows.length > 0 ? rows[0][0] : null;
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

// POST /api/aktivne-narudzbe-teren/verifikacija
// Vrši verifikaciju grupe stavki (svi isti kupac ili svi isti proizvod).
// Sve stavke moraju biti popunjene (provjera je na frontendu),
// a sve se ažuriraju u jednoj transakciji — ili sve ili ništa.
export const verifikujGrupu = async (sifraTabeleArray, verifikovano = 1) => {
  console.log('[verifikujGrupu] POZIV — sifraTabeleArray:', sifraTabeleArray, '| verifikovano:', verifikovano);
  return withConnection(async (connection) => {
    await connection.beginTransaction();
    try {
      const results = [];
      for (const sifraTabele of sifraTabeleArray) {
        const [rows] = await connection.execute(
          "CALL erp.sp_dostava_tereni_proizvodi_verifikacija(?, ?)",
          [sifraTabele, verifikovano],
        );
        const result = Array.isArray(rows) && rows.length > 0 ? rows[0][0] : null;
        console.log(`[verifikujGrupu] sifra_tabele=${sifraTabele} result:`, result);
        if (!result || Number(result.success) !== 1) {
          await connection.rollback();
          return {
            success: false,
            poruka: `Greška za sifra_tabele ${sifraTabele}: ${result?.poruka ?? 'nepoznata greška'}`,
          };
        }
        results.push(result);
      }
      await connection.commit();
      return {
        success: true,
        poruka: verifikovano === 1 ? 'Verifikacija uspješna' : 'Verifikacija poništena',
        results,
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    }
  });
};
