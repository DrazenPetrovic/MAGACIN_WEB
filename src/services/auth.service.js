import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { withConnection } from './db.service.js';

const PROC = 'CALL aplikacija_kese.sp_logovanje_korisnika(?, ?, ?)';

const buildToken = (username, sifraRadnika, vrstaRadnika) =>
  jwt.sign(
    { username, sifraRadnika, vrstaRadnika, loginTime: new Date().toISOString() },
    env.JWT_SECRET,
    { expiresIn: '8h' }
  );

export const login = async (username, password) => {
  return withConnection(async (connection) => {
    const [rows] = await connection.execute(PROC, [username, password, '-1']);

    const row = rows?.[0]?.[0] || null;
    const sifraRadnika = row?.sifra_radnika ?? null;
    const vrstaRadnika = row?.sifra_vrste ?? null;
    const nazivRadnika = row?.naziv_radnika ?? username;

    if (!sifraRadnika || Number(sifraRadnika) === 0) return { success: false };

    return {
      success: true,
      token: buildToken(nazivRadnika, sifraRadnika, vrstaRadnika),
      user: { username: nazivRadnika, sifraRadnika, vrstaRadnika },
    };
  });
};

export const loginByToken = async (rfidToken) => {
  return withConnection(async (connection) => {
    const [rows] = await connection.execute(PROC, ['-1', '-1', rfidToken]);

    const row = rows?.[0]?.[0] || null;
    const sifraRadnika = row?.sifra_radnika ?? null;
    const vrstaRadnika = row?.sifra_vrste ?? null;
    const username = row?.naziv_radnika ?? null;

    if (!sifraRadnika || Number(sifraRadnika) === 0) return { success: false };

    return {
      success: true,
      token: buildToken(username, sifraRadnika, vrstaRadnika),
      user: { username, sifraRadnika, vrstaRadnika },
    };
  });
};
