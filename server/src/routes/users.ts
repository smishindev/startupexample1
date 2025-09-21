import { Router } from 'express';

const router = Router();

router.get('/', (req: any, res: any) => {
  res.json({ message: 'Users endpoint - coming soon' });
});

export { router as userRoutes };