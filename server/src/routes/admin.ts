import express from 'express';
import { authenticateToken, authorize, AuthRequest } from '../middleware/auth';
import { DatabaseService } from '../services/DatabaseService';
import { AdminService } from '../services/AdminService';
import { logger } from '../utils/logger';

const router = express.Router();
const db = DatabaseService.getInstance();
const adminService = new AdminService();

// ── All admin routes require authentication + admin role ──────────
// Middleware applied per-route (not router-level) for clarity

// ─── Platform Stats ───────────────────────────────────────────────
router.get('/stats', authenticateToken, authorize(['admin']), async (req: AuthRequest, res) => {
  try {
    const stats = await adminService.getPlatformStats();
    res.json(stats);
  } catch (error) {
    logger.error('Admin GET /stats failed', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to fetch platform stats' });
  }
});

// ─── Growth Metrics (30-day daily) ────────────────────────────────
router.get('/growth', authenticateToken, authorize(['admin']), async (req: AuthRequest, res) => {
  try {
    const growth = await adminService.getGrowthMetrics();
    res.json(growth);
  } catch (error) {
    logger.error('Admin GET /growth failed', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to fetch growth metrics' });
  }
});

// ─── Revenue Metrics ──────────────────────────────────────────────
router.get('/revenue', authenticateToken, authorize(['admin']), async (req: AuthRequest, res) => {
  try {
    const revenue = await adminService.getRevenueMetrics();
    res.json(revenue);
  } catch (error) {
    logger.error('Admin GET /revenue failed', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to fetch revenue metrics' });
  }
});

// ─── Monthly Revenue (12-month chart data) ────────────────────────
router.get('/revenue/monthly', authenticateToken, authorize(['admin']), async (req: AuthRequest, res) => {
  try {
    const monthly = await adminService.getMonthlyRevenue();
    res.json(monthly);
  } catch (error) {
    logger.error('Admin GET /revenue/monthly failed', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to fetch monthly revenue' });
  }
});

// ─── Recent Activity Feed ─────────────────────────────────────────
router.get('/recent-activity', authenticateToken, authorize(['admin']), async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const activity = await adminService.getRecentActivity(Math.min(limit, 50));
    res.json(activity);
  } catch (error) {
    logger.error('Admin GET /recent-activity failed', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

// ─── Top Courses ──────────────────────────────────────────────────
router.get('/top-courses', authenticateToken, authorize(['admin']), async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const courses = await adminService.getTopCourses(Math.min(limit, 50));
    res.json(courses);
  } catch (error) {
    logger.error('Admin GET /top-courses failed', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to fetch top courses' });
  }
});

// ─── Promote to Instructor (secured) ─────────────────────────────
router.post('/promote-to-instructor', authenticateToken, authorize(['admin']), async (req: AuthRequest, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const users = await db.query('SELECT Id, Email, Role FROM dbo.Users WHERE Email = @email', { email });

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Update role to instructor
    await db.execute('UPDATE dbo.Users SET Role = @role WHERE Id = @id', {
      role: 'instructor',
      id: user.Id
    });

    // Get updated user data
    const updatedUsers = await db.query('SELECT Id, Email, Role FROM dbo.Users WHERE Id = @id', { id: user.Id });

    logger.info('Admin: promoted user to instructor', { adminId: req.user?.userId, targetEmail: email });
    res.json({
      success: true,
      message: 'User promoted to instructor',
      user: {
        id: updatedUsers[0].Id,
        email: updatedUsers[0].Email,
        role: updatedUsers[0].Role
      }
    });

  } catch (error) {
    logger.error('Admin POST /promote-to-instructor failed', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to promote user' });
  }
});

// ══════════════════════════════════════════════════════════════════
// Phase 2 — User Management
// ══════════════════════════════════════════════════════════════════

// ─── Paginated User List ──────────────────────────────────────────
router.get('/users', authenticateToken, authorize(['admin']), async (req: AuthRequest, res) => {
  try {
    const { page, limit, search, role, status, sortBy, sortOrder } = req.query;
    const result = await adminService.getUsers({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      search: search as string | undefined,
      role: role as string | undefined,
      status: status as string | undefined,
      sortBy: sortBy as string | undefined,
      sortOrder: sortOrder as string | undefined,
    });
    res.json(result);
  } catch (error) {
    logger.error('Admin GET /users failed', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ─── Single User Detail ──────────────────────────────────────────
router.get('/users/:id', authenticateToken, authorize(['admin']), async (req: AuthRequest, res) => {
  try {
    const user = await adminService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    logger.error('Admin GET /users/:id failed', { error, userId: req.user?.userId, targetId: req.params.id });
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

// ─── Change User Role ────────────────────────────────────────────
router.patch('/users/:id/role', authenticateToken, authorize(['admin']), async (req: AuthRequest, res) => {
  try {
    const { role } = req.body;
    if (!role || !['student', 'instructor', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Valid role required (student, instructor, admin)' });
    }
    // Prevent admins from changing their own role
    if (req.params.id === req.user?.userId) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }
    await adminService.updateUserRole(req.params.id, role);
    logger.info('Admin: changed user role', { adminId: req.user?.userId, targetId: req.params.id, newRole: role });
    res.json({ success: true, message: `User role updated to ${role}` });
  } catch (error: any) {
    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    logger.error('Admin PATCH /users/:id/role failed', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// ─── Activate / Deactivate User ──────────────────────────────────
router.patch('/users/:id/status', authenticateToken, authorize(['admin']), async (req: AuthRequest, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive (boolean) is required' });
    }
    // Prevent admins from deactivating themselves
    if (req.params.id === req.user?.userId) {
      return res.status(400).json({ error: 'Cannot change your own status' });
    }
    await adminService.updateUserStatus(req.params.id, isActive);
    logger.info('Admin: changed user status', { adminId: req.user?.userId, targetId: req.params.id, isActive });
    res.json({ success: true, message: isActive ? 'User activated' : 'User deactivated' });
  } catch (error: any) {
    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    logger.error('Admin PATCH /users/:id/status failed', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// ─── Reset User Password ─────────────────────────────────────────
router.post('/users/:id/reset-password', authenticateToken, authorize(['admin']), async (req: AuthRequest, res) => {
  try {
    const { token, email } = await adminService.resetUserPassword(req.params.id);
    // In production you'd send an email here; for now return the token to the admin
    logger.info('Admin: triggered password reset', { adminId: req.user?.userId, targetId: req.params.id });
    res.json({ success: true, message: `Password reset initiated for ${email}`, resetToken: token });
  } catch (error: any) {
    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    logger.error('Admin POST /users/:id/reset-password failed', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ══════════════════════════════════════════════════════════════════
// Phase 3 — Course Management
// ══════════════════════════════════════════════════════════════════

// ─── Paginated Course List ────────────────────────────────────────
router.get('/courses', authenticateToken, authorize(['admin']), async (req: AuthRequest, res) => {
  try {
    const { page, limit, search, status, category, level, instructorId, sortBy, sortOrder } = req.query;
    const result = await adminService.getCourses({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      search: search as string | undefined,
      status: status as string | undefined,
      category: category as string | undefined,
      level: level as string | undefined,
      instructorId: instructorId as string | undefined,
      sortBy: sortBy as string | undefined,
      sortOrder: sortOrder as string | undefined,
    });
    res.json(result);
  } catch (error) {
    logger.error('Admin GET /courses failed', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// ─── Single Course Detail ─────────────────────────────────────────
router.get('/courses/:id', authenticateToken, authorize(['admin']), async (req: AuthRequest, res) => {
  try {
    const course = await adminService.getCourseById(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json(course);
  } catch (error) {
    logger.error('Admin GET /courses/:id failed', { error, userId: req.user?.userId, courseId: req.params.id });
    res.status(500).json({ error: 'Failed to fetch course details' });
  }
});

// ─── Change Course Status ─────────────────────────────────────────
router.patch('/courses/:id/status', authenticateToken, authorize(['admin']), async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    if (!status || !['draft', 'published', 'archived', 'deleted'].includes(status)) {
      return res.status(400).json({ error: 'Valid status required (draft, published, archived, deleted)' });
    }
    await adminService.updateCourseStatus(req.params.id, status);
    logger.info('Admin: changed course status', { adminId: req.user?.userId, courseId: req.params.id, newStatus: status });
    res.json({ success: true, message: `Course status updated to ${status}` });
  } catch (error: any) {
    if (error.message === 'Course not found') {
      return res.status(404).json({ error: 'Course not found' });
    }
    logger.error('Admin PATCH /courses/:id/status failed', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to update course status' });
  }
});

// ─── Reassign Course to Another Instructor ────────────────────────
router.patch('/courses/:id/reassign', authenticateToken, authorize(['admin']), async (req: AuthRequest, res) => {
  try {
    const { newInstructorId } = req.body;
    if (!newInstructorId) {
      return res.status(400).json({ error: 'newInstructorId is required' });
    }
    await adminService.reassignCourse(req.params.id, newInstructorId, req.user!.userId);
    logger.info('Admin: reassigned course', { adminId: req.user?.userId, courseId: req.params.id, newInstructorId });
    res.json({ success: true, message: 'Course reassigned successfully' });
  } catch (error: any) {
    if (error.message === 'Course not found') {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (error.message === 'Target instructor not found or not eligible') {
      return res.status(400).json({ error: error.message });
    }
    logger.error('Admin PATCH /courses/:id/reassign failed', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to reassign course' });
  }
});

// ─── Delete Course (soft-delete) ──────────────────────────────────
router.delete('/courses/:id', authenticateToken, authorize(['admin']), async (req: AuthRequest, res) => {
  try {
    await adminService.deleteCourse(req.params.id);
    logger.info('Admin: deleted course', { adminId: req.user?.userId, courseId: req.params.id });
    res.json({ success: true, message: 'Course deleted' });
  } catch (error: any) {
    if (error.message === 'Course not found') {
      return res.status(404).json({ error: 'Course not found' });
    }
    logger.error('Admin DELETE /courses/:id failed', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

// ══════════════════════════════════════════════════════════════════
// Phase 4 — Revenue & Transactions
// ══════════════════════════════════════════════════════════════════

// ─── Paginated Transaction List ───────────────────────────────────
router.get('/transactions', authenticateToken, authorize(['admin']), async (req: AuthRequest, res) => {
  try {
    const { page, limit, search, status, dateFrom, dateTo, courseId, userId, sortBy, sortOrder } = req.query;
    const result = await adminService.getTransactions({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      search: search as string | undefined,
      status: status as string | undefined,
      dateFrom: dateFrom as string | undefined,
      dateTo: dateTo as string | undefined,
      courseId: courseId as string | undefined,
      userId: userId as string | undefined,
      sortBy: sortBy as string | undefined,
      sortOrder: sortOrder as string | undefined,
    });
    res.json(result);
  } catch (error) {
    logger.error('Admin GET /transactions failed', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// ─── Single Transaction Detail ────────────────────────────────────
router.get('/transactions/:id', authenticateToken, authorize(['admin']), async (req: AuthRequest, res) => {
  try {
    const transaction = await adminService.getTransactionById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (error) {
    logger.error('Admin GET /transactions/:id failed', { error, userId: req.user?.userId, transactionId: req.params.id });
    res.status(500).json({ error: 'Failed to fetch transaction details' });
  }
});

// ─── Revenue Breakdown ───────────────────────────────────────────
router.get('/revenue/breakdown', authenticateToken, authorize(['admin']), async (req: AuthRequest, res) => {
  try {
    const result = await adminService.getRevenueBreakdown();
    res.json(result);
  } catch (error) {
    logger.error('Admin GET /revenue/breakdown failed', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to fetch revenue breakdown' });
  }
});

// ─── Process Refund ──────────────────────────────────────────────
router.post('/transactions/:id/refund', authenticateToken, authorize(['admin']), async (req: AuthRequest, res) => {
  try {
    const { reason } = req.body;
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({ error: 'Refund reason is required' });
    }
    await adminService.processRefund(req.params.id, reason.trim(), req.user!.userId);
    logger.info('Admin: processed refund', { adminId: req.user?.userId, transactionId: req.params.id });
    res.json({ success: true, message: 'Refund processed successfully' });
  } catch (error: any) {
    if (error.message === 'Transaction not found') {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    if (error.message === 'Only completed transactions can be refunded') {
      return res.status(400).json({ error: error.message });
    }
    logger.error('Admin POST /transactions/:id/refund failed', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// Phase 5 — Reports & System Health
// ═══════════════════════════════════════════════════════════════════

// ─── System Health ────────────────────────────────────────────────
router.get('/system/health', authenticateToken, authorize(['admin']), async (req: AuthRequest, res) => {
  try {
    const health = await adminService.getSystemHealth();
    res.json(health);
  } catch (error) {
    logger.error('Admin GET /system/health failed', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to fetch system health' });
  }
});

// ─── Audit Log (paginated) ───────────────────────────────────────
router.get('/audit-log', authenticateToken, authorize(['admin']), async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = (req.query.type as string) || 'all';
    const result = await adminService.getAuditLog({ page, limit, type });
    res.json(result);
  } catch (error) {
    logger.error('Admin GET /audit-log failed', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// ─── Popular Courses Report ──────────────────────────────────────
router.get('/reports/popular-courses', authenticateToken, authorize(['admin']), async (req: AuthRequest, res) => {
  try {
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const courses = await adminService.getPopularCourses(limit);
    res.json(courses);
  } catch (error) {
    logger.error('Admin GET /reports/popular-courses failed', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to fetch popular courses' });
  }
});

// ─── Instructor Leaderboard ──────────────────────────────────────
router.get('/reports/top-instructors', authenticateToken, authorize(['admin']), async (req: AuthRequest, res) => {
  try {
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const instructors = await adminService.getInstructorLeaderboard(limit);
    res.json(instructors);
  } catch (error) {
    logger.error('Admin GET /reports/top-instructors failed', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to fetch instructor leaderboard' });
  }
});

export { router as adminRoutes };