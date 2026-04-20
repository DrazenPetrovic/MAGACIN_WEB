import { Router } from 'express';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'MAGACIN backend je dostupan' });
});

export default router;
