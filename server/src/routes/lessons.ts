import { Router } from 'express';
const router = Router();
router.get('/', (req: any, res: any) => { res.json({ message: 'Lessons endpoint - coming soon' }); });
export { router as lessonRoutes };