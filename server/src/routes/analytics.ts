import { Router } from 'express';
const router = Router();
router.get('/', (req: any, res: any) => { res.json({ message: 'Analytics endpoint - coming soon' }); });
export { router as analyticsRoutes };