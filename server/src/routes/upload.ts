import { Router } from 'express';
const router = Router();
router.post('/', (req: any, res: any) => { res.json({ message: 'Upload endpoint - coming soon' }); });
export { router as uploadRoutes };