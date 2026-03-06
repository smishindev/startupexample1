import express, { Request, Response } from 'express';
import { AuthRequest, authenticateToken, authorize } from '../middleware/auth';
import { CouponService } from '../services/CouponService';
import { logger } from '../utils/logger';

const router = express.Router();
const couponService = new CouponService();

// ─── POST /api/coupons/validate ─────────────────────────────────────────────
// Validate a coupon code at checkout (any authenticated user)
router.post('/validate', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const { code, courseId, coursePrice } = req.body;
    if (!code || !courseId || coursePrice === undefined) {
      return res.status(400).json({ success: false, message: 'code, courseId, and coursePrice are required' });
    }
    if (typeof coursePrice !== 'number' || coursePrice <= 0) {
      return res.status(400).json({ success: false, message: 'coursePrice must be a positive number' });
    }

    const result = await couponService.validateCoupon(code, courseId, userId, coursePrice);

    logger.info('POST /api/coupons/validate success', { userId, code, courseId });
    return res.json({ success: true, data: result });
  } catch (err: any) {
    const status = err.statusCode || 500;
    logger.warn('POST /api/coupons/validate failed', { error: err.message });
    return res.status(status).json({ success: false, message: err.message });
  }
});

// ─── GET /api/coupons/instructor ───────────────────────────────────────────
// List all coupons created by the authenticated instructor
router.get('/instructor', authenticateToken, authorize(['instructor', 'admin']), async (req: Request, res: Response) => {
  try {
    const instructorId = (req as AuthRequest).user?.userId!;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const search = (req.query.search as string) || '';
    const activeOnly = req.query.active === 'true';

    const { coupons, total } = await couponService.getInstructorCoupons(instructorId, page, limit, search, activeOnly);

    return res.json({
      success: true,
      data: coupons,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    logger.error('GET /api/coupons/instructor failed', { error: err.message });
    return res.status(500).json({ success: false, message: 'Failed to fetch coupons' });
  }
});

// ─── GET /api/coupons/:id ──────────────────────────────────────────────────
// Get single coupon detail + recent usage (instructor only)
router.get('/:id', authenticateToken, authorize(['instructor', 'admin']), async (req: Request, res: Response) => {
  try {
    const instructorId = (req as AuthRequest).user?.userId!;
    const { id } = req.params;

    const coupon = await couponService.getCouponById(id, instructorId);
    return res.json({ success: true, data: coupon });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
});

// ─── POST /api/coupons ─────────────────────────────────────────────────────
// Create a new coupon (instructor only)
router.post('/', authenticateToken, authorize(['instructor', 'admin']), async (req: Request, res: Response) => {
  try {
    const instructorId = (req as AuthRequest).user?.userId!;
    const { code, courseId, discountType, discountValue, maxUses, expiresAt, minimumPrice } = req.body;

    if (!code || !discountType || discountValue === undefined) {
      return res.status(400).json({ success: false, message: 'code, discountType, and discountValue are required' });
    }
    if (!['percentage', 'fixed'].includes(discountType)) {
      return res.status(400).json({ success: false, message: "discountType must be 'percentage' or 'fixed'" });
    }

    const coupon = await couponService.createCoupon(instructorId, {
      code,
      courseId: courseId || null,
      discountType,
      discountValue: parseFloat(discountValue),
      maxUses: maxUses ? parseInt(maxUses) : null,
      expiresAt: expiresAt || null,
      minimumPrice: minimumPrice ? parseFloat(minimumPrice) : 0,
    });

    logger.info('POST /api/coupons created', { instructorId, code, discountType });
    return res.status(201).json({ success: true, data: coupon });
  } catch (err: any) {
    const status = err.statusCode || 500;
    logger.error('POST /api/coupons failed', { error: err.message });
    return res.status(status).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/coupons/:id ──────────────────────────────────────────────────
// Update coupon settings (instructor only)
router.put('/:id', authenticateToken, authorize(['instructor', 'admin']), async (req: Request, res: Response) => {
  try {
    const instructorId = (req as AuthRequest).user?.userId!;
    const { id } = req.params;
    const { discountType, discountValue, maxUses, expiresAt, minimumPrice, isActive } = req.body;

    const updateData: Record<string, any> = {};
    if (discountType !== undefined) updateData.discountType = discountType;
    if (discountValue !== undefined) updateData.discountValue = parseFloat(discountValue);
    if ('maxUses' in req.body) updateData.maxUses = maxUses ? parseInt(maxUses) : null;
    if ('expiresAt' in req.body) updateData.expiresAt = expiresAt || null;
    if (minimumPrice !== undefined) updateData.minimumPrice = parseFloat(minimumPrice);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const coupon = await couponService.updateCoupon(id, instructorId, updateData);
    return res.json({ success: true, data: coupon });
  } catch (err: any) {
    const status = err.statusCode || 500;
    logger.error('PUT /api/coupons/:id failed', { error: err.message, id: req.params.id });
    return res.status(status).json({ success: false, message: err.message });
  }
});

// ─── DELETE /api/coupons/:id ───────────────────────────────────────────────
// Deactivate (soft-delete) a coupon (instructor only)
router.delete('/:id', authenticateToken, authorize(['instructor', 'admin']), async (req: Request, res: Response) => {
  try {
    const instructorId = (req as AuthRequest).user?.userId!;
    const { id } = req.params;

    await couponService.updateCoupon(id, instructorId, { isActive: false });

    logger.info('DELETE /api/coupons/:id deactivated', { instructorId, id });
    return res.json({ success: true, message: 'Coupon deactivated successfully' });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, message: err.message });
  }
});

export default router;
