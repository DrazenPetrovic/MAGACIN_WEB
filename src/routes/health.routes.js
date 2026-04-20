import { Router } from 'express';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend je dostupan', app: 'Magacin' });
});

export default router;
