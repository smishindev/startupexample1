import sql from 'mssql';
import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';

/**
 * InstructorRevenueService — Instructor-scoped revenue queries
 * All queries filter by instructorId via Courses.InstructorId
 */
export class InstructorRevenueService {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  // ─── Revenue Metrics (totals) ──────────────────────────────────

  async getRevenueMetrics(instructorId: string): Promise<{
    totalRevenue: number;
    monthlyRevenue: number;
    averageOrderValue: number;
    refundTotal: number;
    refundCount: number;
    totalTransactions: number;
  }> {
    try {
      const request = await this.db.getRequest();
      request.input('instructorId', sql.UniqueIdentifier, instructorId);

      const result = await request.query(`
        SELECT
          (SELECT ISNULL(SUM(t.Amount), 0)
           FROM dbo.Transactions t
           INNER JOIN dbo.Courses c ON c.Id = t.CourseId
           WHERE c.InstructorId = @instructorId AND t.Status = 'completed') AS totalRevenue,

          (SELECT ISNULL(SUM(t.Amount), 0)
           FROM dbo.Transactions t
           INNER JOIN dbo.Courses c ON c.Id = t.CourseId
           WHERE c.InstructorId = @instructorId AND t.Status = 'completed'
             AND t.CreatedAt >= DATEADD(month, -1, GETUTCDATE())) AS monthlyRevenue,

          (SELECT ISNULL(AVG(t.Amount), 0)
           FROM dbo.Transactions t
           INNER JOIN dbo.Courses c ON c.Id = t.CourseId
           WHERE c.InstructorId = @instructorId AND t.Status = 'completed') AS averageOrderValue,

          (SELECT ISNULL(SUM(t.RefundAmount), 0)
           FROM dbo.Transactions t
           INNER JOIN dbo.Courses c ON c.Id = t.CourseId
           WHERE c.InstructorId = @instructorId AND t.Status = 'refunded') AS refundTotal,

          (SELECT COUNT(*)
           FROM dbo.Transactions t
           INNER JOIN dbo.Courses c ON c.Id = t.CourseId
           WHERE c.InstructorId = @instructorId AND t.Status = 'refunded') AS refundCount,

          (SELECT COUNT(*)
           FROM dbo.Transactions t
           INNER JOIN dbo.Courses c ON c.Id = t.CourseId
           WHERE c.InstructorId = @instructorId AND t.Status = 'completed') AS totalTransactions
      `);

      const row = result.recordset[0];
      logger.info('InstructorRevenue: fetched metrics', { instructorId, totalRevenue: row.totalRevenue });
      return row;
    } catch (error) {
      logger.error('InstructorRevenueService.getRevenueMetrics failed', { error, instructorId });
      throw error;
    }
  }

  // ─── Monthly Revenue (past 12 months) ──────────────────────────

  async getMonthlyRevenue(instructorId: string): Promise<Array<{ month: string; revenue: number; count: number }>> {
    try {
      const request = await this.db.getRequest();
      request.input('instructorId', sql.UniqueIdentifier, instructorId);

      const result = await request.query(`
        ;WITH Months AS (
          SELECT 0 AS offset
          UNION ALL SELECT offset + 1 FROM Months WHERE offset < 11
        )
        SELECT
          FORMAT(DATEADD(month, -m.offset, GETUTCDATE()), 'yyyy-MM') AS month,
          ISNULL(SUM(t.Amount), 0) AS revenue,
          COUNT(t.Id) AS count
        FROM Months m
        LEFT JOIN (
          SELECT t.Id, t.Amount, t.CreatedAt
          FROM dbo.Transactions t
          INNER JOIN dbo.Courses c ON c.Id = t.CourseId
          WHERE c.InstructorId = @instructorId AND t.Status = 'completed'
        ) t ON FORMAT(t.CreatedAt, 'yyyy-MM') = FORMAT(DATEADD(month, -m.offset, GETUTCDATE()), 'yyyy-MM')
        GROUP BY m.offset, FORMAT(DATEADD(month, -m.offset, GETUTCDATE()), 'yyyy-MM')
        ORDER BY month ASC
        OPTION (MAXRECURSION 12)
      `);

      logger.info('InstructorRevenue: fetched monthly', { instructorId, months: result.recordset.length });
      return result.recordset;
    } catch (error) {
      logger.error('InstructorRevenueService.getMonthlyRevenue failed', { error, instructorId });
      throw error;
    }
  }

  // ─── Per-Course Revenue Breakdown ──────────────────────────────

  async getCourseRevenue(instructorId: string): Promise<Array<{
    courseId: string;
    courseTitle: string;
    revenue: number;
    transactionCount: number;
    enrollments: number;
    avgPrice: number;
    lastSaleAt: string | null;
  }>> {
    try {
      const request = await this.db.getRequest();
      request.input('instructorId', sql.UniqueIdentifier, instructorId);

      const result = await request.query(`
        SELECT
          c.Id AS courseId,
          c.Title AS courseTitle,
          ISNULL(SUM(CASE WHEN t.Status = 'completed' THEN t.Amount ELSE 0 END), 0) AS revenue,
          COUNT(CASE WHEN t.Status = 'completed' THEN 1 END) AS transactionCount,
          c.EnrollmentCount AS enrollments,
          ISNULL(AVG(CASE WHEN t.Status = 'completed' THEN t.Amount END), 0) AS avgPrice,
          MAX(CASE WHEN t.Status = 'completed' THEN t.CompletedAt END) AS lastSaleAt
        FROM dbo.Courses c
        LEFT JOIN dbo.Transactions t ON t.CourseId = c.Id
        WHERE c.InstructorId = @instructorId
          AND c.Status != 'deleted'
        GROUP BY c.Id, c.Title, c.EnrollmentCount
        ORDER BY revenue DESC
      `);

      logger.info('InstructorRevenue: fetched course revenue', { instructorId, courses: result.recordset.length });
      return result.recordset;
    } catch (error) {
      logger.error('InstructorRevenueService.getCourseRevenue failed', { error, instructorId });
      throw error;
    }
  }

  // ─── Paginated Transaction List ────────────────────────────────

  async getTransactions(instructorId: string, opts: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    courseId?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{
    transactions: Array<{
      id: string;
      studentName: string;
      studentEmail: string;
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

      const conditions: string[] = ['c.InstructorId = @instructorId'];
      const request = await this.db.getRequest();
      request.input('instructorId', sql.UniqueIdentifier, instructorId);
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
      if (opts.courseId) {
        conditions.push(`t.CourseId = @courseId`);
        request.input('courseId', sql.UniqueIdentifier, opts.courseId);
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const allowedSorts: Record<string, string> = {
        date: 't.CreatedAt',
        amount: 't.Amount',
        status: 't.Status',
        student: 'u.Email',
        course: 'c.Title',
      };
      const sortCol = allowedSorts[opts.sortBy || 'date'] || 't.CreatedAt';
      const sortDir = opts.sortOrder === 'asc' ? 'ASC' : 'DESC';

      const [dataResult, countResult] = await Promise.all([
        request.query(`
          SELECT
            t.Id AS id,
            LTRIM(RTRIM(ISNULL(u.FirstName, '') + ' ' + ISNULL(u.LastName, ''))) AS studentName,
            u.Email AS studentEmail,
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
          countReq.input('instructorId', sql.UniqueIdentifier, instructorId);
          if (opts.search) countReq.input('search', sql.NVarChar, `%${opts.search}%`);
          if (opts.status && ['pending', 'completed', 'failed', 'refunded'].includes(opts.status)) countReq.input('status', sql.NVarChar, opts.status);
          if (opts.courseId) countReq.input('courseId', sql.UniqueIdentifier, opts.courseId);
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

      logger.info('InstructorRevenue: fetched transactions', { instructorId, page, limit, total });
      return {
        transactions: dataResult.recordset,
        pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
      };
    } catch (error) {
      logger.error('InstructorRevenueService.getTransactions failed', { error, instructorId });
      throw error;
    }
  }
}
