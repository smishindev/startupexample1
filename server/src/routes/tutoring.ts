import { Router } from 'express';
const router = Router();
router.get('/', (req: any, res: any) => { res.json({ message: 'Tutoring endpoint - coming soon' }); });
export { router as tutoringRoutes };