import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const verifyToken = (req, res, next) => {
  try {
    const token = req.cookies.authToken;
    if (!token) {
      return res.status(401).json({ error: 'Nedostaje autorizacija' });
    }

    const verified = jwt.verify(token, env.JWT_SECRET);
    req.user = verified;
    console.log('[verifyToken] req.user:', { sifraRadnika: verified.sifraRadnika, type: typeof verified.sifraRadnika, username: verified.username });
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Nevažeći token' });
  }
};
