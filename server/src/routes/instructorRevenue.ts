import express from 'express';
import { authenticateToken, authorize, AuthRequest } from '../middleware/auth';
import { InstructorRevenueService } from '../services/InstructorRevenueService';
import { logger } from '../utils/logger';

const router = express.Router();
const revenueService = new InstructorRevenueService();

// All routes require instructor (or admin) role
// Mounted at /api/instructor/revenue

// ─── Revenue Metrics (totals) ─────────────────────────────────────
router.get('/metrics', authenticateToken, authorize(['instructor', 'admin']), async (req: AuthRequest, res) => {
  try {
    const metrics = await revenueService.getRevenueMetrics(req.user!.userId);
    res.json(metrics);
  } catch (error) {
    logger.error('Instructor GET /revenue/metrics failed', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to fetch revenue metrics' });
  }
});

// ─── Monthly Revenue (12-month chart data) ────────────────────────
router.get('/monthly', authenticateToken, authorize(['instructor', 'admin']), async (req: AuthRequest, res) => {
  try {
    const monthly = await revenueService.getMonthlyRevenue(req.user!.userId);
    res.json(monthly);
  } catch (error) {
    logger.error('Instructor GET /revenue/monthly failed', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to fetch monthly revenue' });
  }
});

// ─── Per-Course Revenue Breakdown ─────────────────────────────────
router.get('/courses', authenticateToken, authorize(['instructor', 'admin']), async (req: AuthRequest, res) => {
  try {
    const courses = await revenueService.getCourseRevenue(req.user!.userId);
    res.json(courses);
  } catch (error) {
    logger.error('Instructor GET /revenue/courses failed', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to fetch course revenue' });
  }
});

// ─── Paginated Transaction List ───────────────────────────────────
router.get('/transactions', authenticateToken, authorize(['instructor', 'admin']), async (req: AuthRequest, res) => {
  try {
    const { page, limit, search, status, courseId, sortBy, sortOrder } = req.query;
    const result = await revenueService.getTransactions(req.user!.userId, {
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      search: search as string | undefined,
      status: status as string | undefined,
      courseId: courseId as string | undefined,
      sortBy: sortBy as string | undefined,
      sortOrder: sortOrder as string | undefined,
    });
    res.json(result);
  } catch (error) {
    logger.error('Instructor GET /revenue/transactions failed', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

export default router;
