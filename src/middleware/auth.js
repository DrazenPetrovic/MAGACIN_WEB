import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const verifyToken = (req, res, next) => {
  try {
    let token = req.cookies.authToken;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) token = authHeader.slice(7);
    }

    if (!token) {
      return res.status(401).json({ error: 'Nedostaje autorizacija' });
    }

    const verified = jwt.verify(token, env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Nevažeći token' });
  }
};
