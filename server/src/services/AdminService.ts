import sql from 'mssql';
import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';

/**
 * AdminService — Platform-level administration queries
 * Used exclusively by admin.ts routes (authorize(['admin']))
 */
export class AdminService {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  // ─── Platform Overview Stats ───────────────────────────────────

  async getPlatformStats(): Promise<{
    totalUsers: number;
    totalInstructors: number;
    totalStudents: number;
    totalCourses: number;
    publishedCourses: number;
    draftCourses: number;
    totalEnrollments: number;
    activeEnrollments: number;
    completedEnrollments: number;
    totalRevenue: number;
    totalRefunds: number;
  }> {
    try {
      const request = await this.db.getRequest();
      const result = await request.query(`
        SELECT
          (SELECT COUNT(*) FROM dbo.Users WHERE IsActive = 1) AS totalUsers,
          (SELECT COUNT(*) FROM dbo.Users WHERE IsActive = 1 AND Role = 'instructor') AS totalInstructors,
          (SELECT COUNT(*) FROM dbo.Users WHERE IsActive = 1 AND Role = 'student') AS totalStudents,
          (SELECT COUNT(*) FROM dbo.Courses WHERE Status IN ('published', 'draft')) AS totalCourses,
          (SELECT COUNT(*) FROM dbo.Courses WHERE Status = 'published') AS publishedCourses,
          (SELECT COUNT(*) FROM dbo.Courses WHERE Status = 'draft') AS draftCourses,
          (SELECT COUNT(*) FROM dbo.Enrollments) AS totalEnrollments,
          (SELECT COUNT(*) FROM dbo.Enrollments WHERE Status IN ('active', 'approved')) AS activeEnrollments,
          (SELECT COUNT(*) FROM dbo.Enrollments WHERE Status = 'completed') AS completedEnrollments,
          (SELECT ISNULL(SUM(Amount), 0) FROM dbo.Transactions WHERE Status = 'completed') AS totalRevenue,
          (SELECT ISNULL(SUM(RefundAmount), 0) FROM dbo.Transactions WHERE Status = 'refunded') AS totalRefunds
      `);

      const row = result.recordset[0];
      logger.info('Admin: fetched platform stats', { totalUsers: row.totalUsers });
      return row;
    } catch (error) {
      logger.error('AdminService.getPlatformStats failed', { error });
      throw error;
    }
  }

  // ─── Growth Metrics (past 30 days, daily) ──────────────────────

  async getGrowthMetrics(): Promise<Array<{ date: string; newUsers: number; newEnrollments: number }>> {
    try {
      const request = await this.db.getRequest();
      const result = await request.query(`
        ;WITH DateRange AS (
          SELECT CAST(DATEADD(day, -29, GETUTCDATE()) AS DATE) AS dt
          UNION ALL
          SELECT DATEADD(day, 1, dt) FROM DateRange WHERE dt < CAST(GETUTCDATE() AS DATE)
        )
        SELECT
          FORMAT(d.dt, 'yyyy-MM-dd') AS date,
          ISNULL(u.cnt, 0) AS newUsers,
          ISNULL(e.cnt, 0) AS newEnrollments
        FROM DateRange d
        LEFT JOIN (
          SELECT CAST(CreatedAt AS DATE) AS dt, COUNT(*) AS cnt
          FROM dbo.Users
          WHERE CreatedAt >= DATEADD(day, -29, GETUTCDATE())
          GROUP BY CAST(CreatedAt AS DATE)
        ) u ON u.dt = d.dt
        LEFT JOIN (
          SELECT CAST(EnrolledAt AS DATE) AS dt, COUNT(*) AS cnt
          FROM dbo.Enrollments
          WHERE EnrolledAt >= DATEADD(day, -29, GETUTCDATE())
          GROUP BY CAST(EnrolledAt AS DATE)
        ) e ON e.dt = d.dt
        ORDER BY d.dt
        OPTION (MAXRECURSION 31)
      `);

      logger.info('Admin: fetched growth metrics', { days: result.recordset.length });
      return result.recordset;
    } catch (error) {
      logger.error('AdminService.getGrowthMetrics failed', { error });
      throw error;
    }
  }

  // ─── Revenue Metrics ───────────────────────────────────────────

  async getRevenueMetrics(): Promise<{
    totalRevenue: number;
    monthlyRevenue: number;
    averageOrderValue: number;
    refundTotal: number;
    refundCount: number;
  }> {
    try {
      const request = await this.db.getRequest();
      const result = await request.query(`
        SELECT
          (SELECT ISNULL(SUM(Amount), 0) FROM dbo.Transactions WHERE Status = 'completed') AS totalRevenue,
          (SELECT ISNULL(SUM(Amount), 0) FROM dbo.Transactions WHERE Status = 'completed' AND CreatedAt >= DATEADD(month, -1, GETUTCDATE())) AS monthlyRevenue,
          (SELECT ISNULL(AVG(Amount), 0) FROM dbo.Transactions WHERE Status = 'completed') AS averageOrderValue,
          (SELECT ISNULL(SUM(RefundAmount), 0) FROM dbo.Transactions WHERE Status = 'refunded') AS refundTotal,
          (SELECT COUNT(*) FROM dbo.Transactions WHERE Status = 'refunded') AS refundCount
      `);

      const row = result.recordset[0];
      logger.info('Admin: fetched revenue metrics', { totalRevenue: row.totalRevenue, monthlyRevenue: row.monthlyRevenue });
      return row;
    } catch (error) {
      logger.error('AdminService.getRevenueMetrics failed', { error });
      throw error;
    }
  }

  // ─── Recent Activity Feed ──────────────────────────────────────

  async getRecentActivity(limit: number = 20): Promise<Array<{
    id: string;
    type: string;
    description: string;
    userName: string;
    timestamp: string;
    metadata: string | null;
  }>> {
    try {
      const request = await this.db.getRequest();
      request.input('limit', sql.Int, limit);

      const result = await request.query(`
        ;WITH RecentEvents AS (
          -- New signups
          SELECT
            u.Id AS id,
            'signup' AS type,
            ISNULL(u.FirstName, '') + ' ' + ISNULL(u.LastName, '') + ' registered as ' + u.Role AS description,
            ISNULL(u.FirstName, '') + ' ' + ISNULL(u.LastName, '') AS userName,
            u.CreatedAt AS timestamp,
            NULL AS metadata
          FROM dbo.Users u
          WHERE u.CreatedAt >= DATEADD(day, -7, GETUTCDATE())

          UNION ALL

          -- New enrollments
          SELECT
            e.Id AS id,
            'enrollment' AS type,
            ISNULL(u.FirstName, '') + ' ' + ISNULL(u.LastName, '') + ' enrolled in "' + c.Title + '"' AS description,
            ISNULL(u.FirstName, '') + ' ' + ISNULL(u.LastName, '') AS userName,
            e.EnrolledAt AS timestamp,
            NULL AS metadata
          FROM dbo.Enrollments e
          JOIN dbo.Users u ON u.Id = e.UserId
          JOIN dbo.Courses c ON c.Id = e.CourseId
          WHERE e.EnrolledAt >= DATEADD(day, -7, GETUTCDATE())

          UNION ALL

          -- Completed payments
          SELECT
            t.Id AS id,
            'payment' AS type,
            ISNULL(u.FirstName, '') + ' ' + ISNULL(u.LastName, '') + ' paid $' + CAST(t.Amount AS NVARCHAR(20)) + ' for "' + c.Title + '"' AS description,
            ISNULL(u.FirstName, '') + ' ' + ISNULL(u.LastName, '') AS userName,
            t.CompletedAt AS timestamp,
            NULL AS metadata
          FROM dbo.Transactions t
          JOIN dbo.Users u ON u.Id = t.UserId
          JOIN dbo.Courses c ON c.Id = t.CourseId
          WHERE t.Status = 'completed' AND t.CompletedAt >= DATEADD(day, -7, GETUTCDATE())

          UNION ALL

          -- Course published
          SELECT
            c.Id AS id,
            'course_published' AS type,
            ISNULL(u.FirstName, '') + ' ' + ISNULL(u.LastName, '') + ' published "' + c.Title + '"' AS description,
            ISNULL(u.FirstName, '') + ' ' + ISNULL(u.LastName, '') AS userName,
            c.UpdatedAt AS timestamp,
            NULL AS metadata
          FROM dbo.Courses c
          JOIN dbo.Users u ON u.Id = c.InstructorId
          WHERE c.Status = 'published' AND c.UpdatedAt >= DATEADD(day, -7, GETUTCDATE())
            AND c.CreatedAt < c.UpdatedAt  -- exclude new courses (created=updated)

          UNION ALL

          -- Refunds
          SELECT
            t.Id AS id,
            'refund' AS type,
            'Refund of $' + CAST(ISNULL(t.RefundAmount, t.Amount) AS NVARCHAR(20)) + ' for "' + c.Title + '"' AS description,
            ISNULL(u.FirstName, '') + ' ' + ISNULL(u.LastName, '') AS userName,
            t.RefundedAt AS timestamp,
            t.RefundReason AS metadata
          FROM dbo.Transactions t
          JOIN dbo.Users u ON u.Id = t.UserId
          JOIN dbo.Courses c ON c.Id = t.CourseId
          WHERE t.Status = 'refunded' AND t.RefundedAt >= DATEADD(day, -7, GETUTCDATE())
        )
        SELECT TOP (@limit) *
        FROM RecentEvents
        ORDER BY timestamp DESC
      `);

      logger.info('Admin: fetched recent activity', { count: result.recordset.length });
      return result.recordset;
    } catch (error) {
      logger.error('AdminService.getRecentActivity failed', { error });
      throw error;
    }
  }

  // ─── Revenue by Month (past 12 months) ─────────────────────────

  async getMonthlyRevenue(): Promise<Array<{ month: string; revenue: number; count: number }>> {
    try {
      const request = await this.db.getRequest();
      const result = await request.query(`
        ;WITH Months AS (
          SELECT 0 AS offset
          UNION ALL SELECT offset + 1 FROM Months WHERE offset < 11
        )
        SELECT
          FORMAT(DATEADD(month, -m.offset, GETUTCDATE()), 'yyyy-MM') AS month,
          ISNULL(SUM(CASE WHEN t.Status = 'completed' THEN t.Amount ELSE 0 END), 0) AS revenue,
          COUNT(CASE WHEN t.Status = 'completed' THEN 1 END) AS count
        FROM Months m
        LEFT JOIN dbo.Transactions t
          ON FORMAT(t.CreatedAt, 'yyyy-MM') = FORMAT(DATEADD(month, -m.offset, GETUTCDATE()), 'yyyy-MM')
        GROUP BY m.offset, FORMAT(DATEADD(month, -m.offset, GETUTCDATE()), 'yyyy-MM')
        ORDER BY month ASC
        OPTION (MAXRECURSION 12)
      `);

      logger.info('Admin: fetched monthly revenue', { months: result.recordset.length });
      return result.recordset;
    } catch (error) {
      logger.error('AdminService.getMonthlyRevenue failed', { error });
      throw error;
    }
  }

  // ─── Top Courses (by enrollment) ───────────────────────────────

  async getTopCourses(limit: number = 10): Promise<Array<{
    courseId: string;
    title: string;
    instructorName: string;
    enrollmentCount: number;
    revenue: number;
  }>> {
    try {
      const request = await this.db.getRequest();
      request.input('limit', sql.Int, limit);

      const result = await request.query(`
        SELECT TOP (@limit)
          c.Id AS courseId,
          c.Title AS title,
          ISNULL(u.FirstName, '') + ' ' + ISNULL(u.LastName, '') AS instructorName,
          c.EnrollmentCount AS enrollmentCount,
          ISNULL(rev.revenue, 0) AS revenue
        FROM dbo.Courses c
        LEFT JOIN dbo.Users u ON u.Id = c.InstructorId
        LEFT JOIN (
          SELECT CourseId, SUM(Amount) AS revenue
          FROM dbo.Transactions
          WHERE Status = 'completed'
          GROUP BY CourseId
        ) rev ON rev.CourseId = c.Id
        WHERE c.Status = 'published'
        ORDER BY c.EnrollmentCount DESC
      `);

      logger.info('Admin: fetched top courses', { count: result.recordset.length });
      return result.recordset;
    } catch (error) {
      logger.error('AdminService.getTopCourses failed', { error });
      throw error;
    }
  }

  // ─── User Management ───────────────────────────────────────────

  /**
   * Paginated user list with search, role filter, status filter, sorting.
   */
  async getUsers(opts: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{
    users: Array<{
      id: string;
      email: string;
      username: string;
      firstName: string;
      lastName: string;
      avatar: string | null;
      role: string;
      isActive: boolean;
      emailVerified: boolean;
      createdAt: string;
      lastLoginAt: string | null;
      enrollmentCount: number;
      totalSpent: number;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    try {
      const page = Math.max(1, opts.page || 1);
      const limit = Math.min(100, Math.max(1, opts.limit || 20));
      const offset = (page - 1) * limit;

      // Build WHERE clause dynamically
      const conditions: string[] = [];
      const request = await this.db.getRequest();
      request.input('offset', sql.Int, offset);
      request.input('limit', sql.Int, limit);

      if (opts.search) {
        conditions.push(`(u.Email LIKE @search OR u.FirstName LIKE @search OR u.LastName LIKE @search OR u.Username LIKE @search)`);
        request.input('search', sql.NVarChar, `%${opts.search}%`);
      }
      if (opts.role && ['student', 'instructor', 'admin'].includes(opts.role)) {
        conditions.push(`u.Role = @role`);
        request.input('role', sql.NVarChar, opts.role);
      }
      if (opts.status === 'active') {
        conditions.push(`u.IsActive = 1`);
      } else if (opts.status === 'inactive') {
        conditions.push(`u.IsActive = 0`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Validate sort column against allowlist
      const allowedSorts: Record<string, string> = {
        name: 'u.FirstName',
        email: 'u.Email',
        role: 'u.Role',
        created: 'u.CreatedAt',
        lastLogin: 'u.LastLoginAt',
      };
      const sortCol = allowedSorts[opts.sortBy || 'created'] || 'u.CreatedAt';
      const sortDir = opts.sortOrder === 'asc' ? 'ASC' : 'DESC';

      const [dataResult, countResult] = await Promise.all([
        request.query(`
          SELECT
            u.Id AS id,
            u.Email AS email,
            u.Username AS username,
            u.FirstName AS firstName,
            u.LastName AS lastName,
            u.Avatar AS avatar,
            u.Role AS role,
            u.IsActive AS isActive,
            u.EmailVerified AS emailVerified,
            u.CreatedAt AS createdAt,
            u.LastLoginAt AS lastLoginAt,
            ISNULL(e.cnt, 0) AS enrollmentCount,
            ISNULL(t.total, 0) AS totalSpent
          FROM dbo.Users u
          LEFT JOIN (
            SELECT UserId, COUNT(*) AS cnt FROM dbo.Enrollments GROUP BY UserId
          ) e ON e.UserId = u.Id
          LEFT JOIN (
            SELECT UserId, SUM(Amount) AS total FROM dbo.Transactions WHERE Status = 'completed' GROUP BY UserId
          ) t ON t.UserId = u.Id
          ${whereClause}
          ORDER BY ${sortCol} ${sortDir}
          OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `),
        // Count query uses a separate request (mssql limitation: can't reuse request)
        (async () => {
          const countReq = await this.db.getRequest();
          if (opts.search) countReq.input('search', sql.NVarChar, `%${opts.search}%`);
          if (opts.role && ['student', 'instructor', 'admin'].includes(opts.role)) countReq.input('role', sql.NVarChar, opts.role);
          return countReq.query(`SELECT COUNT(*) AS total FROM dbo.Users u ${whereClause}`);
        })(),
      ]);

      const users = dataResult.recordset.map((r: any) => ({
        ...r,
        isActive: Boolean(r.isActive),
        emailVerified: Boolean(r.emailVerified),
      }));
      const total = countResult.recordset[0]?.total || 0;
      const totalPages = Math.ceil(total / limit);

      logger.info('Admin: fetched users', { page, limit, total, filters: { search: opts.search, role: opts.role, status: opts.status } });
      return {
        users,
        pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
      };
    } catch (error) {
      logger.error('AdminService.getUsers failed', { error });
      throw error;
    }
  }

  /**
   * Full detail for a single user (profile + aggregated stats).
   */
  async getUserById(userId: string): Promise<{
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    role: string;
    isActive: boolean;
    emailVerified: boolean;
    createdAt: string;
    lastLoginAt: string | null;
    stats: {
      enrollmentCount: number;
      completedCourses: number;
      totalSpent: number;
      totalRefunds: number;
      coursesCreated: number;
    };
    enrollments: Array<{
      courseId: string;
      courseTitle: string;
      enrolledAt: string;
      status: string;
    }>;
    recentTransactions: Array<{
      id: string;
      courseTitle: string;
      amount: number;
      status: string;
      createdAt: string;
    }>;
  } | null> {
    try {
      const request = await this.db.getRequest();
      request.input('userId', sql.UniqueIdentifier, userId);

      const userResult = await request.query(`
        SELECT
          u.Id AS id,
          u.Email AS email,
          u.Username AS username,
          u.FirstName AS firstName,
          u.LastName AS lastName,
          u.Avatar AS avatar,
          u.Role AS role,
          u.IsActive AS isActive,
          u.EmailVerified AS emailVerified,
          u.CreatedAt AS createdAt,
          u.LastLoginAt AS lastLoginAt
        FROM dbo.Users u
        WHERE u.Id = @userId
      `);

      if (userResult.recordset.length === 0) return null;

      const user = userResult.recordset[0];

      // Fetch stats, enrollments, transactions in parallel (separate requests)
      const [statsResult, enrollmentsResult, transactionsResult] = await Promise.all([
        (async () => {
          const r = await this.db.getRequest();
          r.input('userId', sql.UniqueIdentifier, userId);
          return r.query(`
            SELECT
              (SELECT COUNT(*) FROM dbo.Enrollments WHERE UserId = @userId) AS enrollmentCount,
              (SELECT COUNT(*) FROM dbo.Enrollments WHERE UserId = @userId AND Status = 'completed') AS completedCourses,
              (SELECT ISNULL(SUM(Amount), 0) FROM dbo.Transactions WHERE UserId = @userId AND Status = 'completed') AS totalSpent,
              (SELECT ISNULL(SUM(RefundAmount), 0) FROM dbo.Transactions WHERE UserId = @userId AND Status = 'refunded') AS totalRefunds,
              (SELECT COUNT(*) FROM dbo.Courses WHERE InstructorId = @userId) AS coursesCreated
          `);
        })(),
        (async () => {
          const r = await this.db.getRequest();
          r.input('userId', sql.UniqueIdentifier, userId);
          return r.query(`
            SELECT TOP 20
              e.CourseId AS courseId,
              c.Title AS courseTitle,
              e.EnrolledAt AS enrolledAt,
              e.Status AS status
            FROM dbo.Enrollments e
            JOIN dbo.Courses c ON c.Id = e.CourseId
            WHERE e.UserId = @userId
            ORDER BY e.EnrolledAt DESC
          `);
        })(),
        (async () => {
          const r = await this.db.getRequest();
          r.input('userId', sql.UniqueIdentifier, userId);
          return r.query(`
            SELECT TOP 10
              t.Id AS id,
              c.Title AS courseTitle,
              t.Amount AS amount,
              t.Status AS status,
              t.CreatedAt AS createdAt
            FROM dbo.Transactions t
            JOIN dbo.Courses c ON c.Id = t.CourseId
            WHERE t.UserId = @userId
            ORDER BY t.CreatedAt DESC
          `);
        })(),
      ]);

      logger.info('Admin: fetched user detail', { userId });
      return {
        ...user,
        isActive: Boolean(user.isActive),
        emailVerified: Boolean(user.emailVerified),
        stats: statsResult.recordset[0],
        enrollments: enrollmentsResult.recordset,
        recentTransactions: transactionsResult.recordset,
      };
    } catch (error) {
      logger.error('AdminService.getUserById failed', { error, userId });
      throw error;
    }
  }

  /**
   * Change a user's role.
   */
  async updateUserRole(userId: string, newRole: string): Promise<void> {
    try {
      const request = await this.db.getRequest();
      request.input('userId', sql.UniqueIdentifier, userId);
      request.input('role', sql.NVarChar, newRole);
      const result = await request.query(`
        UPDATE dbo.Users SET Role = @role, UpdatedAt = GETUTCDATE() WHERE Id = @userId
      `);
      if (result.rowsAffected[0] === 0) throw new Error('User not found');
      logger.info('Admin: updated user role', { userId, newRole });
    } catch (error) {
      logger.error('AdminService.updateUserRole failed', { error, userId, newRole });
      throw error;
    }
  }

  /**
   * Activate or deactivate a user account.
   */
  async updateUserStatus(userId: string, isActive: boolean): Promise<void> {
    try {
      const request = await this.db.getRequest();
      request.input('userId', sql.UniqueIdentifier, userId);
      request.input('isActive', sql.Bit, isActive ? 1 : 0);
      const result = await request.query(`
        UPDATE dbo.Users SET IsActive = @isActive, UpdatedAt = GETUTCDATE() WHERE Id = @userId
      `);
      if (result.rowsAffected[0] === 0) throw new Error('User not found');
      logger.info('Admin: updated user status', { userId, isActive });
    } catch (error) {
      logger.error('AdminService.updateUserStatus failed', { error, userId, isActive });
      throw error;
    }
  }

  /**
   * Trigger a password reset for a user (generates token + expiry, caller sends email).
   */
  async resetUserPassword(userId: string): Promise<{ token: string; email: string }> {
    try {
      // Generate a 6-digit token
      const token = Math.floor(100000 + Math.random() * 900000).toString();
      const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

      const request = await this.db.getRequest();
      request.input('userId', sql.UniqueIdentifier, userId);
      request.input('token', sql.NVarChar, token);
      request.input('expiry', sql.DateTime2, expiry);

      const result = await request.query(`
        UPDATE dbo.Users
        SET PasswordResetToken = @token, PasswordResetExpiry = @expiry, UpdatedAt = GETUTCDATE()
        OUTPUT INSERTED.Email
        WHERE Id = @userId
      `);

      if (result.recordset.length === 0) throw new Error('User not found');

      logger.info('Admin: triggered password reset', { userId });
      return { token, email: result.recordset[0].Email };
    } catch (error) {
      logger.error('AdminService.resetUserPassword failed', { error, userId });
      throw error;
    }
  }

  // ─── Course Management ─────────────────────────────────────────

  /**
   * Paginated course list with search, status, category, level, instructor filters.
   */
  async getCourses(opts: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    category?: string;
    level?: string;
    instructorId?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{
    courses: Array<{
      id: string;
      title: string;
      thumbnail: string | null;
      instructorId: string | null;
      instructorName: string;
      category: string;
      level: string;
      price: number;
      rating: number;
      ratingCount: number;
      enrollmentCount: number;
      lessonCount: number;
      status: string;
      visibility: string;
      createdAt: string;
      updatedAt: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    try {
      const page = Math.max(1, opts.page || 1);
      const limit = Math.min(100, Math.max(1, opts.limit || 20));
      const offset = (page - 1) * limit;

      const conditions: string[] = [];
      const request = await this.db.getRequest();
      request.input('offset', sql.Int, offset);
      request.input('limit', sql.Int, limit);

      if (opts.search) {
        conditions.push(`(c.Title LIKE @search OR c.Description LIKE @search)`);
        request.input('search', sql.NVarChar, `%${opts.search}%`);
      }
      if (opts.status && ['draft', 'published', 'archived', 'deleted'].includes(opts.status)) {
        conditions.push(`c.Status = @status`);
        request.input('status', sql.NVarChar, opts.status);
      }
      if (opts.category) {
        conditions.push(`c.Category = @category`);
        request.input('category', sql.NVarChar, opts.category);
      }
      if (opts.level && ['beginner', 'intermediate', 'advanced', 'expert'].includes(opts.level)) {
        conditions.push(`c.Level = @level`);
        request.input('level', sql.NVarChar, opts.level);
      }
      if (opts.instructorId) {
        conditions.push(`c.InstructorId = @instructorId`);
        request.input('instructorId', sql.UniqueIdentifier, opts.instructorId);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const allowedSorts: Record<string, string> = {
        title: 'c.Title',
        created: 'c.CreatedAt',
        updated: 'c.UpdatedAt',
        price: 'c.Price',
        rating: 'c.Rating',
        enrollments: 'c.EnrollmentCount',
        status: 'c.Status',
      };
      const sortCol = allowedSorts[opts.sortBy || 'updated'] || 'c.UpdatedAt';
      const sortDir = opts.sortOrder === 'asc' ? 'ASC' : 'DESC';

      const [dataResult, countResult] = await Promise.all([
        request.query(`
          SELECT
            c.Id AS id,
            c.Title AS title,
            c.Thumbnail AS thumbnail,
            c.InstructorId AS instructorId,
            LTRIM(RTRIM(ISNULL(u.FirstName, '') + ' ' + ISNULL(u.LastName, ''))) AS instructorName,
            c.Category AS category,
            c.Level AS level,
            c.Price AS price,
            c.Rating AS rating,
            c.RatingCount AS ratingCount,
            c.EnrollmentCount AS enrollmentCount,
            ISNULL(lc.cnt, 0) AS lessonCount,
            c.Status AS status,
            c.Visibility AS visibility,
            c.CreatedAt AS createdAt,
            c.UpdatedAt AS updatedAt
          FROM dbo.Courses c
          LEFT JOIN dbo.Users u ON u.Id = c.InstructorId
          LEFT JOIN (
            SELECT CourseId, COUNT(*) AS cnt FROM dbo.Lessons GROUP BY CourseId
          ) lc ON lc.CourseId = c.Id
          ${whereClause}
          ORDER BY ${sortCol} ${sortDir}
          OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `),
        (async () => {
          const countReq = await this.db.getRequest();
          if (opts.search) countReq.input('search', sql.NVarChar, `%${opts.search}%`);
          if (opts.status && ['draft', 'published', 'archived', 'deleted'].includes(opts.status)) countReq.input('status', sql.NVarChar, opts.status);
          if (opts.category) countReq.input('category', sql.NVarChar, opts.category);
          if (opts.level && ['beginner', 'intermediate', 'advanced', 'expert'].includes(opts.level)) countReq.input('level', sql.NVarChar, opts.level);
          if (opts.instructorId) countReq.input('instructorId', sql.UniqueIdentifier, opts.instructorId);
          return countReq.query(`SELECT COUNT(*) AS total FROM dbo.Courses c ${whereClause}`);
        })(),
      ]);

      const total = countResult.recordset[0]?.total || 0;
      const totalPages = Math.ceil(total / limit);

      logger.info('Admin: fetched courses', { page, limit, total });
      return {
        courses: dataResult.recordset,
        pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
      };
    } catch (error) {
      logger.error('AdminService.getCourses failed', { error });
      throw error;
    }
  }

  /**
   * Full detail for a single course.
   */
  async getCourseById(courseId: string): Promise<{
    id: string;
    title: string;
    description: string;
    thumbnail: string | null;
    instructorId: string | null;
    instructorName: string;
    instructorEmail: string;
    category: string;
    level: string;
    duration: number;
    price: number;
    rating: number;
    ratingCount: number;
    enrollmentCount: number;
    status: string;
    visibility: string;
    createdAt: string;
    updatedAt: string;
    stats: {
      lessonCount: number;
      activeStudents: number;
      completedStudents: number;
      totalRevenue: number;
      avgRating: number;
    };
    lessons: Array<{
      id: string;
      title: string;
      orderIndex: number;
      duration: number;
    }>;
    recentEnrollments: Array<{
      userId: string;
      userName: string;
      enrolledAt: string;
      status: string;
    }>;
  } | null> {
    try {
      const request = await this.db.getRequest();
      request.input('courseId', sql.UniqueIdentifier, courseId);

      const courseResult = await request.query(`
        SELECT
          c.Id AS id,
          c.Title AS title,
          c.Description AS description,
          c.Thumbnail AS thumbnail,
          c.InstructorId AS instructorId,
          LTRIM(RTRIM(ISNULL(u.FirstName, '') + ' ' + ISNULL(u.LastName, ''))) AS instructorName,
          ISNULL(u.Email, '') AS instructorEmail,
          c.Category AS category,
          c.Level AS level,
          c.Duration AS duration,
          c.Price AS price,
          c.Rating AS rating,
          c.RatingCount AS ratingCount,
          c.EnrollmentCount AS enrollmentCount,
          c.Status AS status,
          c.Visibility AS visibility,
          c.CreatedAt AS createdAt,
          c.UpdatedAt AS updatedAt
        FROM dbo.Courses c
        LEFT JOIN dbo.Users u ON u.Id = c.InstructorId
        WHERE c.Id = @courseId
      `);

      if (courseResult.recordset.length === 0) return null;

      const course = courseResult.recordset[0];

      const [statsResult, lessonsResult, enrollmentsResult] = await Promise.all([
        (async () => {
          const r = await this.db.getRequest();
          r.input('courseId', sql.UniqueIdentifier, courseId);
          return r.query(`
            SELECT
              (SELECT COUNT(*) FROM dbo.Lessons WHERE CourseId = @courseId) AS lessonCount,
              (SELECT COUNT(*) FROM dbo.Enrollments WHERE CourseId = @courseId AND Status IN ('active', 'approved')) AS activeStudents,
              (SELECT COUNT(*) FROM dbo.Enrollments WHERE CourseId = @courseId AND Status = 'completed') AS completedStudents,
              (SELECT ISNULL(SUM(Amount), 0) FROM dbo.Transactions WHERE CourseId = @courseId AND Status = 'completed') AS totalRevenue,
              (SELECT ISNULL(AVG(CAST(Rating AS DECIMAL(3,2))), 0) FROM dbo.CourseRatings WHERE CourseId = @courseId) AS avgRating
          `);
        })(),
        (async () => {
          const r = await this.db.getRequest();
          r.input('courseId', sql.UniqueIdentifier, courseId);
          return r.query(`
            SELECT
              Id AS id,
              Title AS title,
              OrderIndex AS orderIndex,
              Duration AS duration
            FROM dbo.Lessons
            WHERE CourseId = @courseId
            ORDER BY OrderIndex
          `);
        })(),
        (async () => {
          const r = await this.db.getRequest();
          r.input('courseId', sql.UniqueIdentifier, courseId);
          return r.query(`
            SELECT TOP 20
              e.UserId AS userId,
              LTRIM(RTRIM(ISNULL(u.FirstName, '') + ' ' + ISNULL(u.LastName, ''))) AS userName,
              e.EnrolledAt AS enrolledAt,
              e.Status AS status
            FROM dbo.Enrollments e
            JOIN dbo.Users u ON u.Id = e.UserId
            WHERE e.CourseId = @courseId
            ORDER BY e.EnrolledAt DESC
          `);
        })(),
      ]);

      logger.info('Admin: fetched course detail', { courseId });
      return {
        ...course,
        stats: statsResult.recordset[0],
        lessons: lessonsResult.recordset,
        recentEnrollments: enrollmentsResult.recordset,
      };
    } catch (error) {
      logger.error('AdminService.getCourseById failed', { error, courseId });
      throw error;
    }
  }

  /**
   * Change a course's status (draft / published / archived / deleted).
   */
  async updateCourseStatus(courseId: string, newStatus: string): Promise<void> {
    try {
      const request = await this.db.getRequest();
      request.input('courseId', sql.UniqueIdentifier, courseId);
      request.input('status', sql.NVarChar, newStatus);
      request.input('isPublished', sql.Bit, newStatus === 'published' ? 1 : 0);
      const result = await request.query(`
        UPDATE dbo.Courses
        SET Status = @status, IsPublished = @isPublished, UpdatedAt = GETUTCDATE()
        WHERE Id = @courseId
      `);
      if (result.rowsAffected[0] === 0) throw new Error('Course not found');
      logger.info('Admin: updated course status', { courseId, newStatus });
    } catch (error) {
      logger.error('AdminService.updateCourseStatus failed', { error, courseId, newStatus });
      throw error;
    }
  }

  /**
   * Reassign a course to a different instructor.
   * Inserts a CourseOwnershipHistory record.
   */
  async reassignCourse(courseId: string, newInstructorId: string, adminId: string): Promise<void> {
    try {
      // Get current instructor
      const lookupReq = await this.db.getRequest();
      lookupReq.input('courseId', sql.UniqueIdentifier, courseId);
      const lookupResult = await lookupReq.query(`
        SELECT InstructorId FROM dbo.Courses WHERE Id = @courseId
      `);
      if (lookupResult.recordset.length === 0) throw new Error('Course not found');

      const oldInstructorId = lookupResult.recordset[0].InstructorId;

      // Verify new instructor exists and is instructor or admin
      const instrReq = await this.db.getRequest();
      instrReq.input('newInstructorId', sql.UniqueIdentifier, newInstructorId);
      const instrResult = await instrReq.query(`
        SELECT Id FROM dbo.Users WHERE Id = @newInstructorId AND Role IN ('instructor', 'admin') AND IsActive = 1
      `);
      if (instrResult.recordset.length === 0) throw new Error('Target instructor not found or not eligible');

      // Update course
      const updateReq = await this.db.getRequest();
      updateReq.input('courseId', sql.UniqueIdentifier, courseId);
      updateReq.input('newInstructorId', sql.UniqueIdentifier, newInstructorId);
      await updateReq.query(`
        UPDATE dbo.Courses SET InstructorId = @newInstructorId, UpdatedAt = GETUTCDATE() WHERE Id = @courseId
      `);

      // Insert ownership history
      const historyReq = await this.db.getRequest();
      historyReq.input('courseId', sql.UniqueIdentifier, courseId);
      historyReq.input('fromId', sql.UniqueIdentifier, oldInstructorId);
      historyReq.input('toId', sql.UniqueIdentifier, newInstructorId);
      historyReq.input('adminId', sql.UniqueIdentifier, adminId);
      await historyReq.query(`
        INSERT INTO dbo.CourseOwnershipHistory (CourseId, FromInstructorId, ToInstructorId, TransferReason, TransferredBy)
        VALUES (@courseId, @fromId, @toId, 'admin_action', @adminId)
      `);

      logger.info('Admin: reassigned course', { courseId, from: oldInstructorId, to: newInstructorId, adminId });
    } catch (error) {
      logger.error('AdminService.reassignCourse failed', { error, courseId, newInstructorId });
      throw error;
    }
  }

  /**
   * Soft-delete a course (set status to 'deleted').
   */
  async deleteCourse(courseId: string): Promise<void> {
    try {
      const request = await this.db.getRequest();
      request.input('courseId', sql.UniqueIdentifier, courseId);
      const result = await request.query(`
        UPDATE dbo.Courses SET Status = 'deleted', IsPublished = 0, UpdatedAt = GETUTCDATE() WHERE Id = @courseId
      `);
      if (result.rowsAffected[0] === 0) throw new Error('Course not found');
      logger.info('Admin: soft-deleted course', { courseId });
    } catch (error) {
      logger.error('AdminService.deleteCourse failed', { error, courseId });
      throw error;
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // Phase 4 — Revenue & Transactions
  // ══════════════════════════════════════════════════════════════════

  /**
   * Paginated transaction list with search, status, date-range, course, user filters.
   */
  async getTransactions(opts: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    courseId?: string;
    userId?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{
    transactions: Array<{
      id: string;
      userId: string;
      userName: string;
      userEmail: string;
      courseId: string;
      courseTitle: string;
      amount: number;
      currency: string;
      status: string;
      paymentMethod: string;
      paymentMethodLast4: string | null;
      paymentMethodBrand: string | null;
      refundAmount: number | null;
      createdAt: string;
      completedAt: string | null;
      refundedAt: string | null;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    try {
      const page = Math.max(1, opts.page || 1);
      const limit = Math.min(100, Math.max(1, opts.limit || 20));
      const offset = (page - 1) * limit;

      const conditions: string[] = [];
      const request = await this.db.getRequest();
      request.input('offset', sql.Int, offset);
      request.input('limit', sql.Int, limit);

      if (opts.search) {
        conditions.push(`(u.Email LIKE @search OR u.FirstName LIKE @search OR u.LastName LIKE @search OR c.Title LIKE @search)`);
        request.input('search', sql.NVarChar, `%${opts.search}%`);
      }
      if (opts.status && ['pending', 'completed', 'failed', 'refunded'].includes(opts.status)) {
        conditions.push(`t.Status = @status`);
        request.input('status', sql.NVarChar, opts.status);
      }
      if (opts.dateFrom) {
        conditions.push(`t.CreatedAt >= @dateFrom`);
        request.input('dateFrom', sql.DateTime2, opts.dateFrom);
      }
      if (opts.dateTo) {
        conditions.push(`t.CreatedAt <= @dateTo`);
        request.input('dateTo', sql.DateTime2, opts.dateTo);
      }
      if (opts.courseId) {
        conditions.push(`t.CourseId = @courseId`);
        request.input('courseId', sql.UniqueIdentifier, opts.courseId);
      }
      if (opts.userId) {
        conditions.push(`t.UserId = @userId`);
        request.input('userId', sql.UniqueIdentifier, opts.userId);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const allowedSorts: Record<string, string> = {
        date: 't.CreatedAt',
        amount: 't.Amount',
        status: 't.Status',
        user: 'u.Email',
        course: 'c.Title',
      };
      const sortCol = allowedSorts[opts.sortBy || 'date'] || 't.CreatedAt';
      const sortDir = opts.sortOrder === 'asc' ? 'ASC' : 'DESC';

      const [dataResult, countResult] = await Promise.all([
        request.query(`
          SELECT
            t.Id AS id,
            t.UserId AS userId,
            LTRIM(RTRIM(ISNULL(u.FirstName, '') + ' ' + ISNULL(u.LastName, ''))) AS userName,
            u.Email AS userEmail,
            t.CourseId AS courseId,
            c.Title AS courseTitle,
            t.Amount AS amount,
            t.Currency AS currency,
            t.Status AS status,
            t.PaymentMethod AS paymentMethod,
            t.PaymentMethodLast4 AS paymentMethodLast4,
            t.PaymentMethodBrand AS paymentMethodBrand,
            t.RefundAmount AS refundAmount,
            t.CreatedAt AS createdAt,
            t.CompletedAt AS completedAt,
            t.RefundedAt AS refundedAt
          FROM dbo.Transactions t
          JOIN dbo.Users u ON u.Id = t.UserId
          JOIN dbo.Courses c ON c.Id = t.CourseId
          ${whereClause}
          ORDER BY ${sortCol} ${sortDir}
          OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `),
        (async () => {
          const countReq = await this.db.getRequest();
          if (opts.search) countReq.input('search', sql.NVarChar, `%${opts.search}%`);
          if (opts.status && ['pending', 'completed', 'failed', 'refunded'].includes(opts.status)) countReq.input('status', sql.NVarChar, opts.status);
          if (opts.dateFrom) countReq.input('dateFrom', sql.DateTime2, opts.dateFrom);
          if (opts.dateTo) countReq.input('dateTo', sql.DateTime2, opts.dateTo);
          if (opts.courseId) countReq.input('courseId', sql.UniqueIdentifier, opts.courseId);
          if (opts.userId) countReq.input('userId', sql.UniqueIdentifier, opts.userId);
          return countReq.query(`
            SELECT COUNT(*) AS total
            FROM dbo.Transactions t
            JOIN dbo.Users u ON u.Id = t.UserId
            JOIN dbo.Courses c ON c.Id = t.CourseId
            ${whereClause}
          `);
        })(),
      ]);

      const total = countResult.recordset[0]?.total || 0;
      const totalPages = Math.ceil(total / limit);

      logger.info('Admin: fetched transactions', { page, limit, total });
      return {
        transactions: dataResult.recordset,
        pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
      };
    } catch (error) {
      logger.error('AdminService.getTransactions failed', { error });
      throw error;
    }
  }

  /**
   * Full detail for a single transaction.
   */
  async getTransactionById(transactionId: string): Promise<{
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    courseId: string;
    courseTitle: string;
    courseCategory: string;
    instructorName: string;
    amount: number;
    currency: string;
    status: string;
    paymentMethod: string;
    paymentMethodLast4: string | null;
    paymentMethodBrand: string | null;
    stripePaymentIntentId: string | null;
    stripeChargeId: string | null;
    refundAmount: number | null;
    refundReason: string | null;
    refundedAt: string | null;
    createdAt: string;
    completedAt: string | null;
    updatedAt: string;
    invoice: {
      id: string;
      invoiceNumber: string;
      amount: number;
      taxAmount: number;
      totalAmount: number;
    } | null;
  } | null> {
    try {
      const request = await this.db.getRequest();
      request.input('transactionId', sql.UniqueIdentifier, transactionId);

      const txResult = await request.query(`
        SELECT
          t.Id AS id,
          t.UserId AS userId,
          LTRIM(RTRIM(ISNULL(u.FirstName, '') + ' ' + ISNULL(u.LastName, ''))) AS userName,
          u.Email AS userEmail,
          t.CourseId AS courseId,
          c.Title AS courseTitle,
          c.Category AS courseCategory,
          LTRIM(RTRIM(ISNULL(instr.FirstName, '') + ' ' + ISNULL(instr.LastName, ''))) AS instructorName,
          t.Amount AS amount,
          t.Currency AS currency,
          t.Status AS status,
          t.PaymentMethod AS paymentMethod,
          t.PaymentMethodLast4 AS paymentMethodLast4,
          t.PaymentMethodBrand AS paymentMethodBrand,
          t.StripePaymentIntentId AS stripePaymentIntentId,
          t.StripeChargeId AS stripeChargeId,
          t.RefundAmount AS refundAmount,
          t.RefundReason AS refundReason,
          t.RefundedAt AS refundedAt,
          t.CreatedAt AS createdAt,
          t.CompletedAt AS completedAt,
          t.UpdatedAt AS updatedAt
        FROM dbo.Transactions t
        JOIN dbo.Users u ON u.Id = t.UserId
        JOIN dbo.Courses c ON c.Id = t.CourseId
        LEFT JOIN dbo.Users instr ON instr.Id = c.InstructorId
        WHERE t.Id = @transactionId
      `);

      if (txResult.recordset.length === 0) return null;
      const tx = txResult.recordset[0];

      // Fetch invoice if exists
      const invoiceReq = await this.db.getRequest();
      invoiceReq.input('transactionId', sql.UniqueIdentifier, transactionId);
      const invoiceResult = await invoiceReq.query(`
        SELECT
          Id AS id,
          InvoiceNumber AS invoiceNumber,
          Amount AS amount,
          TaxAmount AS taxAmount,
          TotalAmount AS totalAmount
        FROM dbo.Invoices
        WHERE TransactionId = @transactionId
      `);

      logger.info('Admin: fetched transaction detail', { transactionId });
      return {
        ...tx,
        invoice: invoiceResult.recordset.length > 0 ? invoiceResult.recordset[0] : null,
      };
    } catch (error) {
      logger.error('AdminService.getTransactionById failed', { error, transactionId });
      throw error;
    }
  }

  /**
   * Revenue breakdown — by category, by instructor top 10, refund summary.
   */
  async getRevenueBreakdown(): Promise<{
    byCategory: Array<{ category: string; revenue: number; count: number }>;
    topInstructors: Array<{ instructorId: string; instructorName: string; revenue: number; transactionCount: number }>;
    refundSummary: { totalRefunds: number; refundCount: number; avgRefund: number };
    dailyRevenue: Array<{ date: string; revenue: number; count: number }>;
  }> {
    try {
      const [categoryResult, instructorResult, refundResult, dailyResult] = await Promise.all([
        (async () => {
          const r = await this.db.getRequest();
          return r.query(`
            SELECT
              c.Category AS category,
              ISNULL(SUM(t.Amount), 0) AS revenue,
              COUNT(*) AS count
            FROM dbo.Transactions t
            JOIN dbo.Courses c ON c.Id = t.CourseId
            WHERE t.Status = 'completed'
            GROUP BY c.Category
            ORDER BY revenue DESC
          `);
        })(),
        (async () => {
          const r = await this.db.getRequest();
          return r.query(`
            SELECT TOP 10
              c.InstructorId AS instructorId,
              LTRIM(RTRIM(ISNULL(u.FirstName, '') + ' ' + ISNULL(u.LastName, ''))) AS instructorName,
              SUM(t.Amount) AS revenue,
              COUNT(*) AS transactionCount
            FROM dbo.Transactions t
            JOIN dbo.Courses c ON c.Id = t.CourseId
            LEFT JOIN dbo.Users u ON u.Id = c.InstructorId
            WHERE t.Status = 'completed'
            GROUP BY c.InstructorId, u.FirstName, u.LastName
            ORDER BY revenue DESC
          `);
        })(),
        (async () => {
          const r = await this.db.getRequest();
          return r.query(`
            SELECT
              ISNULL(SUM(RefundAmount), 0) AS totalRefunds,
              COUNT(*) AS refundCount,
              ISNULL(AVG(RefundAmount), 0) AS avgRefund
            FROM dbo.Transactions
            WHERE Status = 'refunded'
          `);
        })(),
        (async () => {
          const r = await this.db.getRequest();
          return r.query(`
            SELECT
              CAST(t.CreatedAt AS DATE) AS date,
              SUM(t.Amount) AS revenue,
              COUNT(*) AS count
            FROM dbo.Transactions t
            WHERE t.Status = 'completed' AND t.CreatedAt >= DATEADD(day, -30, GETUTCDATE())
            GROUP BY CAST(t.CreatedAt AS DATE)
            ORDER BY date
          `);
        })(),
      ]);

      logger.info('Admin: fetched revenue breakdown');
      return {
        byCategory: categoryResult.recordset,
        topInstructors: instructorResult.recordset,
        refundSummary: refundResult.recordset[0],
        dailyRevenue: dailyResult.recordset,
      };
    } catch (error) {
      logger.error('AdminService.getRevenueBreakdown failed', { error });
      throw error;
    }
  }

  /**
   * Process a refund — updates transaction status + refund fields.
   * Note: Actual Stripe refund logic would be handled by a payment service.
   * This method handles the database side for admin-initiated refunds.
   */
  async processRefund(transactionId: string, reason: string, adminId: string): Promise<void> {
    try {
      // Verify transaction exists and is refundable
      const lookupReq = await this.db.getRequest();
      lookupReq.input('transactionId', sql.UniqueIdentifier, transactionId);
      const lookupResult = await lookupReq.query(`
        SELECT Id, Amount, Status FROM dbo.Transactions WHERE Id = @transactionId
      `);
      if (lookupResult.recordset.length === 0) throw new Error('Transaction not found');

      const tx = lookupResult.recordset[0];
      if (tx.Status !== 'completed') throw new Error('Only completed transactions can be refunded');

      // Update transaction
      const updateReq = await this.db.getRequest();
      updateReq.input('transactionId', sql.UniqueIdentifier, transactionId);
      updateReq.input('refundAmount', sql.Decimal(10, 2), tx.Amount);
      updateReq.input('reason', sql.NVarChar, reason);
      await updateReq.query(`
        UPDATE dbo.Transactions
        SET Status = 'refunded',
            RefundAmount = @refundAmount,
            RefundReason = @reason,
            RefundedAt = GETUTCDATE(),
            UpdatedAt = GETUTCDATE()
        WHERE Id = @transactionId
      `);

      logger.info('Admin: processed refund', { transactionId, amount: tx.Amount, adminId });
    } catch (error) {
      logger.error('AdminService.processRefund failed', { error, transactionId });
      throw error;
    }
  }

  // ─── Phase 5: Reports & System Health ─────────────────────────

  /**
   * System health — DB status, key table counts, last activity timestamps
   */
  async getSystemHealth(): Promise<{
    database: { status: string; timestamp: string };
    tables: Array<{ name: string; rowCount: number }>;
    recentActivity: {
      lastSignup: string | null;
      lastEnrollment: string | null;
      lastTransaction: string | null;
      lastLogin: string | null;
    };
    userSummary: {
      totalActive: number;
      totalInactive: number;
      loggedInToday: number;
      loggedInThisWeek: number;
    };
  }> {
    try {
      const [statsReq, activityReq, userSummaryReq] = await Promise.all([
        this.db.getRequest(),
        this.db.getRequest(),
        this.db.getRequest(),
      ]);

      // Run all 3 queries in parallel (independent read-only aggregates)
      const [statsResult, activityResult, userSummaryResult] = await Promise.all([
        statsReq.query(`
          SELECT 'Users' AS name, COUNT(*) AS [rowCount] FROM dbo.Users
          UNION ALL SELECT 'Courses', COUNT(*) FROM dbo.Courses
          UNION ALL SELECT 'Enrollments', COUNT(*) FROM dbo.Enrollments
          UNION ALL SELECT 'Transactions', COUNT(*) FROM dbo.Transactions
          UNION ALL SELECT 'Lessons', COUNT(*) FROM dbo.Lessons
          UNION ALL SELECT 'CourseRatings', COUNT(*) FROM dbo.CourseRatings
          UNION ALL SELECT 'Comments', COUNT(*) FROM dbo.Comments
        `),
        activityReq.query(`
          SELECT
            (SELECT MAX(CreatedAt) FROM dbo.Users) AS lastSignup,
            (SELECT MAX(EnrolledAt) FROM dbo.Enrollments) AS lastEnrollment,
            (SELECT MAX(CreatedAt) FROM dbo.Transactions) AS lastTransaction,
            (SELECT MAX(LastLoginAt) FROM dbo.Users WHERE LastLoginAt IS NOT NULL) AS lastLogin
        `),
        userSummaryReq.query(`
          SELECT
            (SELECT COUNT(*) FROM dbo.Users WHERE IsActive = 1) AS totalActive,
            (SELECT COUNT(*) FROM dbo.Users WHERE IsActive = 0) AS totalInactive,
            (SELECT COUNT(*) FROM dbo.Users WHERE CAST(LastLoginAt AS DATE) = CAST(GETUTCDATE() AS DATE)) AS loggedInToday,
            (SELECT COUNT(*) FROM dbo.Users WHERE LastLoginAt >= DATEADD(day, -7, GETUTCDATE())) AS loggedInThisWeek
        `),
      ]);

      const activity = activityResult.recordset[0];
      const userSum = userSummaryResult.recordset[0];

      logger.info('Admin: fetched system health');
      return {
        database: {
          status: 'connected',
          timestamp: new Date().toISOString(),
        },
        tables: statsResult.recordset,
        recentActivity: {
          lastSignup: activity.lastSignup || null,
          lastEnrollment: activity.lastEnrollment || null,
          lastTransaction: activity.lastTransaction || null,
          lastLogin: activity.lastLogin || null,
        },
        userSummary: {
          totalActive: userSum.totalActive,
          totalInactive: userSum.totalInactive,
          loggedInToday: userSum.loggedInToday,
          loggedInThisWeek: userSum.loggedInThisWeek,
        },
      };
    } catch (error) {
      logger.error('AdminService.getSystemHealth failed', { error });
      throw error;
    }
  }

  /**
   * Unified audit log — combines AccountDeletionLog + CourseOwnershipHistory
   * into a single chronological feed, paginated.
   */
  async getAuditLog(opts: {
    page?: number;
    limit?: number;
    type?: string; // 'all' | 'deletion' | 'ownership'
  } = {}): Promise<{
    entries: Array<{
      id: string;
      type: 'account_deletion' | 'course_ownership';
      description: string;
      details: string;
      timestamp: string;
    }>;
    pagination: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
  }> {
    try {
      const page = Math.max(1, opts.page || 1);
      const limit = Math.min(100, Math.max(1, opts.limit || 20));
      const offset = (page - 1) * limit;
      const typeFilter = opts.type || 'all';

      // Build a UNION query of both audit tables
      let cteFragments: string[] = [];

      if (typeFilter === 'all' || typeFilter === 'deletion') {
        cteFragments.push(`
          SELECT
            CAST(a.Id AS NVARCHAR(36)) AS id,
            'account_deletion' AS type,
            'Account deleted: ' + a.UserEmail + ' (' + a.UserRole + ')' AS description,
            'Method: ' + a.DeletionMethod
              + ', Courses: ' + CAST(a.TotalCourses AS NVARCHAR)
              + ', Students affected: ' + CAST(a.TotalStudents AS NVARCHAR)
              + CASE WHEN a.DeletionReason IS NOT NULL THEN ', Reason: ' + a.DeletionReason ELSE '' END
              AS details,
            a.DeletedAt AS timestamp
          FROM dbo.AccountDeletionLog a
        `);
      }

      if (typeFilter === 'all' || typeFilter === 'ownership') {
        cteFragments.push(`
          SELECT
            CAST(o.Id AS NVARCHAR(36)) AS id,
            'course_ownership' AS type,
            'Course ownership change: ' + ISNULL(c.Title, 'Unknown Course') AS description,
            'Reason: ' + o.TransferReason
              + ', From: ' + ISNULL(NULLIF(LTRIM(RTRIM(ISNULL(fu.FirstName, '') + ' ' + ISNULL(fu.LastName, ''))), ''), 'N/A')
              + ', To: ' + ISNULL(NULLIF(LTRIM(RTRIM(ISNULL(tu.FirstName, '') + ' ' + ISNULL(tu.LastName, ''))), ''), 'N/A')
              + CASE WHEN o.Notes IS NOT NULL THEN ', Notes: ' + o.Notes ELSE '' END
              AS details,
            o.TransferredAt AS timestamp
          FROM dbo.CourseOwnershipHistory o
            LEFT JOIN dbo.Courses c ON o.CourseId = c.Id
            LEFT JOIN dbo.Users fu ON o.FromInstructorId = fu.Id
            LEFT JOIN dbo.Users tu ON o.ToInstructorId = tu.Id
        `);
      }

      if (cteFragments.length === 0) {
        return {
          entries: [],
          pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
        };
      }

      const unionSql = cteFragments.join(' UNION ALL ');

      // Data query
      const dataReq = await this.db.getRequest();
      dataReq.input('offset', sql.Int, offset);
      dataReq.input('limit', sql.Int, limit);
      const dataResult = await dataReq.query(`
        WITH AuditCTE AS (${unionSql})
        SELECT * FROM AuditCTE
        ORDER BY timestamp DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);

      // Count query
      const countReq = await this.db.getRequest();
      const countResult = await countReq.query(`
        WITH AuditCTE AS (${unionSql})
        SELECT COUNT(*) AS total FROM AuditCTE
      `);

      const total = countResult.recordset[0].total;
      const totalPages = Math.ceil(total / limit);

      logger.info('Admin: fetched audit log', { page, total, type: typeFilter });
      return {
        entries: dataResult.recordset,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error('AdminService.getAuditLog failed', { error });
      throw error;
    }
  }

  /**
   * Popular courses — ranked by enrollments, rating, and revenue
   */
  async getPopularCourses(topN: number = 20): Promise<Array<{
    id: string;
    title: string;
    category: string;
    instructorName: string;
    status: string;
    enrollmentCount: number;
    rating: number;
    ratingCount: number;
    revenue: number;
    createdAt: string;
  }>> {
    try {
      const request = await this.db.getRequest();
      request.input('topN', sql.Int, topN);
      const result = await request.query(`
        SELECT TOP (@topN)
          c.Id AS id,
          c.Title AS title,
          c.Category AS category,
          LTRIM(RTRIM(ISNULL(u.FirstName, '') + ' ' + ISNULL(u.LastName, ''))) AS instructorName,
          c.Status AS status,
          c.EnrollmentCount AS enrollmentCount,
          c.Rating AS rating,
          c.RatingCount AS ratingCount,
          ISNULL((
            SELECT SUM(t.Amount) FROM dbo.Transactions t
            WHERE t.CourseId = c.Id AND t.Status = 'completed'
          ), 0) AS revenue,
          c.CreatedAt AS createdAt
        FROM dbo.Courses c
          LEFT JOIN dbo.Users u ON c.InstructorId = u.Id
        WHERE c.Status IN ('published', 'draft', 'archived')
        ORDER BY c.EnrollmentCount DESC, c.Rating DESC
      `);

      logger.info('Admin: fetched popular courses', { count: result.recordset.length });
      return result.recordset;
    } catch (error) {
      logger.error('AdminService.getPopularCourses failed', { error });
      throw error;
    }
  }

  /**
   * Instructor leaderboard — top instructors by total students, revenue, avg rating
   */
  async getInstructorLeaderboard(topN: number = 20): Promise<Array<{
    id: string;
    name: string;
    email: string;
    totalCourses: number;
    publishedCourses: number;
    totalStudents: number;
    totalRevenue: number;
    avgRating: number;
    totalRatings: number;
    joinedAt: string;
  }>> {
    try {
      const request = await this.db.getRequest();
      request.input('topN', sql.Int, topN);
      const result = await request.query(`
        SELECT TOP (@topN)
          u.Id AS id,
          LTRIM(RTRIM(ISNULL(u.FirstName, '') + ' ' + ISNULL(u.LastName, ''))) AS name,
          u.Email AS email,
          (SELECT COUNT(*) FROM dbo.Courses c2 WHERE c2.InstructorId = u.Id AND c2.Status IN ('published', 'draft', 'archived')) AS totalCourses,
          (SELECT COUNT(*) FROM dbo.Courses c3 WHERE c3.InstructorId = u.Id AND c3.Status = 'published') AS publishedCourses,
          ISNULL((
            SELECT SUM(c4.EnrollmentCount)
            FROM dbo.Courses c4 WHERE c4.InstructorId = u.Id AND c4.Status IN ('published', 'draft', 'archived')
          ), 0) AS totalStudents,
          ISNULL((
            SELECT SUM(t.Amount)
            FROM dbo.Transactions t
              INNER JOIN dbo.Courses c5 ON t.CourseId = c5.Id
            WHERE c5.InstructorId = u.Id AND t.Status = 'completed'
          ), 0) AS totalRevenue,
          ISNULL((
            SELECT AVG(CAST(cr.Rating AS DECIMAL(3,2)))
            FROM dbo.CourseRatings cr
              INNER JOIN dbo.Courses c6 ON cr.CourseId = c6.Id
            WHERE c6.InstructorId = u.Id
          ), 0) AS avgRating,
          ISNULL((
            SELECT COUNT(*)
            FROM dbo.CourseRatings cr2
              INNER JOIN dbo.Courses c7 ON cr2.CourseId = c7.Id
            WHERE c7.InstructorId = u.Id
          ), 0) AS totalRatings,
          u.CreatedAt AS joinedAt
        FROM dbo.Users u
        WHERE u.Role = 'instructor' AND u.IsActive = 1
        ORDER BY totalStudents DESC, totalRevenue DESC
      `);

      logger.info('Admin: fetched instructor leaderboard', { count: result.recordset.length });
      return result.recordset;
    } catch (error) {
      logger.error('AdminService.getInstructorLeaderboard failed', { error });
      throw error;
    }
  }
}
