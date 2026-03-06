import sql from 'mssql';
import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';

// ─── Public Interfaces ─────────────────────────────────────────────────────

export interface CouponValidationResult {
  couponId: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;  // actual $ saved
  finalAmount: number;     // price after discount (never < 0)
  description: string;     // human-readable e.g. "20% off" or "$10.00 off"
}

export interface CouponRow {
  Id: string;
  Code: string;
  InstructorId: string;
  CourseId: string | null;
  CourseTitle: string | null;
  DiscountType: 'percentage' | 'fixed';
  DiscountValue: number;
  MaxUses: number | null;
  UsedCount: number;
  MinimumPrice: number;
  ExpiresAt: string | null;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface CreateCouponInput {
  code: string;
  courseId?: string | null;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxUses?: number | null;
  expiresAt?: string | null;
  minimumPrice?: number;
}

export interface UpdateCouponInput {
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  maxUses?: number | null;
  expiresAt?: string | null;
  minimumPrice?: number;
  isActive?: boolean;
}

// ─── Service ───────────────────────────────────────────────────────────────

export class CouponService {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  // ── Validate a coupon code before checkout ──────────────────────────────

  async validateCoupon(
    code: string,
    courseId: string,
    userId: string,
    coursePrice: number
  ): Promise<CouponValidationResult> {
    const codeUpper = code.trim().toUpperCase();

    // 1. Look up coupon — must belong to instructor of this course
    const rows = await this.db.query<CouponRow & { InstructorId: string }>(
      `SELECT c.Id, c.Code, c.InstructorId, c.CourseId, c.DiscountType, c.DiscountValue,
              c.MaxUses, c.UsedCount, c.MinimumPrice, c.ExpiresAt, c.IsActive
       FROM dbo.Coupons c
       INNER JOIN dbo.Courses cr ON cr.InstructorId = c.InstructorId
       WHERE UPPER(c.Code) = @code
         AND cr.Id = @courseId
         AND (c.CourseId IS NULL OR c.CourseId = @courseId)`,
      { code: codeUpper, courseId }
    );

    if (!rows.length) {
      throw Object.assign(new Error('Coupon code is invalid or does not apply to this course.'), { statusCode: 400 });
    }

    const coupon = rows[0];

    // 2. Active check
    if (!coupon.IsActive) {
      throw Object.assign(new Error('This coupon is no longer active.'), { statusCode: 400 });
    }

    // 3. Expiry check
    if (coupon.ExpiresAt && new Date(coupon.ExpiresAt) < new Date()) {
      throw Object.assign(new Error('This coupon has expired.'), { statusCode: 400 });
    }

    // 4. Use limit check
    if (coupon.MaxUses !== null && coupon.UsedCount >= coupon.MaxUses) {
      throw Object.assign(new Error('This coupon has reached its maximum number of uses.'), { statusCode: 400 });
    }

    // 5. Minimum price check
    if (coursePrice < coupon.MinimumPrice) {
      throw Object.assign(
        new Error(`This coupon requires a minimum course price of $${coupon.MinimumPrice.toFixed(2)}.`),
        { statusCode: 400 }
      );
    }

    // 6. Per-user uniqueness: has this user already redeemed this coupon for this course?
    const usageRows = await this.db.query<{ used: number }>(
      `SELECT COUNT(*) AS used FROM dbo.CouponUsage
       WHERE CouponId = @couponId AND UserId = @userId AND CourseId = @courseId`,
      { couponId: coupon.Id, userId, courseId }
    );
    if (usageRows[0].used > 0) {
      throw Object.assign(new Error('You have already used this coupon for this course.'), { statusCode: 400 });
    }

    // 7. Calculate discount
    let discountAmount: number;
    let description: string;

    if (coupon.DiscountType === 'percentage') {
      discountAmount = Math.round(coursePrice * (coupon.DiscountValue / 100) * 100) / 100;
      description = `${coupon.DiscountValue}% off`;
    } else {
      discountAmount = Math.min(coupon.DiscountValue, coursePrice); // cannot discount more than price
      description = `$${coupon.DiscountValue.toFixed(2)} off`;
    }

    const finalAmount = Math.max(0, Math.round((coursePrice - discountAmount) * 100) / 100);

    logger.info('CouponService: coupon validated', {
      couponId: coupon.Id,
      code: codeUpper,
      userId,
      courseId,
      originalPrice: coursePrice,
      discountAmount,
      finalAmount,
    });

    return {
      couponId: coupon.Id,
      code: coupon.Code,
      discountType: coupon.DiscountType,
      discountValue: coupon.DiscountValue,
      discountAmount,
      finalAmount,
      description,
    };
  }

  // ── Create a new coupon ─────────────────────────────────────────────────

  async createCoupon(instructorId: string, input: CreateCouponInput): Promise<CouponRow> {
    const codeUpper = input.code.trim().toUpperCase();

    // Validate code format: alphanumeric + hyphens/underscores, 3–50 chars
    if (!/^[A-Z0-9_-]{3,50}$/.test(codeUpper)) {
      throw Object.assign(
        new Error('Coupon code must be 3–50 characters, alphanumeric, hyphens and underscores only.'),
        { statusCode: 400 }
      );
    }

    if (input.discountType === 'percentage' && (input.discountValue <= 0 || input.discountValue > 100)) {
      throw Object.assign(new Error('Percentage discount must be between 1 and 100.'), { statusCode: 400 });
    }
    if (input.discountType === 'fixed' && input.discountValue <= 0) {
      throw Object.assign(new Error('Fixed discount amount must be greater than 0.'), { statusCode: 400 });
    }

    // If courseId specified, verify it belongs to this instructor
    if (input.courseId) {
      const courseCheck = await this.db.query<{ Id: string }>(
        `SELECT Id FROM dbo.Courses WHERE Id = @courseId AND InstructorId = @instructorId AND Status != 'deleted'`,
        { courseId: input.courseId, instructorId }
      );
      if (!courseCheck.length) {
        throw Object.assign(new Error('Course not found or does not belong to you.'), { statusCode: 404 });
      }
    }

    const request = await this.db.getRequest();
    request.input('instructorId', sql.UniqueIdentifier, instructorId);
    request.input('courseId', sql.UniqueIdentifier, input.courseId ?? null);
    request.input('code', sql.NVarChar(50), codeUpper);
    request.input('discountType', sql.NVarChar(20), input.discountType);
    request.input('discountValue', sql.Decimal(10, 2), input.discountValue);
    request.input('maxUses', sql.Int, input.maxUses ?? null);
    request.input('minimumPrice', sql.Decimal(10, 2), input.minimumPrice ?? 0);
    request.input('expiresAt', sql.DateTime2, input.expiresAt ? new Date(input.expiresAt) : null);

    const result = await request.query(`
      INSERT INTO dbo.Coupons
        (Id, Code, InstructorId, CourseId, DiscountType, DiscountValue,
         MaxUses, MinimumPrice, ExpiresAt, IsActive, CreatedAt, UpdatedAt)
      OUTPUT INSERTED.*
      VALUES
        (NEWID(), @code, @instructorId, @courseId, @discountType, @discountValue,
         @maxUses, @minimumPrice, @expiresAt, 1, GETUTCDATE(), GETUTCDATE())
    `);

    logger.info('CouponService: coupon created', { instructorId, code: codeUpper, courseId: input.courseId });
    return result.recordset[0] as CouponRow;
  }

  // ── List instructor's coupons ───────────────────────────────────────────

  async getInstructorCoupons(
    instructorId: string,
    page = 1,
    limit = 20,
    search = '',
    activeOnly = false
  ): Promise<{ coupons: CouponRow[]; total: number }> {
    const offset = (page - 1) * limit;

    const request = await this.db.getRequest();
    request.input('instructorId', sql.UniqueIdentifier, instructorId);
    request.input('search', sql.NVarChar(100), `%${search.toUpperCase()}%`);
    request.input('offset', sql.Int, offset);
    request.input('limit', sql.Int, limit);

    const activeFilter = activeOnly ? 'AND c.IsActive = 1' : '';

    const result = await request.query(`
      SELECT
        c.Id, c.Code, c.InstructorId, c.CourseId,
        cr.Title AS CourseTitle,
        c.DiscountType, c.DiscountValue,
        c.MaxUses, c.UsedCount, c.MinimumPrice,
        c.ExpiresAt, c.IsActive, c.CreatedAt, c.UpdatedAt,
        COUNT(*) OVER() AS TotalCount
      FROM dbo.Coupons c
      LEFT JOIN dbo.Courses cr ON cr.Id = c.CourseId
      WHERE c.InstructorId = @instructorId
        AND (LEN(@search) <= 2 OR UPPER(c.Code) LIKE @search)
        ${activeFilter}
      ORDER BY c.CreatedAt DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    const total = result.recordset.length > 0 ? (result.recordset[0] as any).TotalCount : 0;
    return { coupons: result.recordset as CouponRow[], total };
  }

  // ── Get single coupon by ID ─────────────────────────────────────────────

  async getCouponById(id: string, instructorId: string): Promise<CouponRow & { recentUsage: any[] }> {
    const request = await this.db.getRequest();
    request.input('id', sql.UniqueIdentifier, id);
    request.input('instructorId', sql.UniqueIdentifier, instructorId);

    const couponResult = await request.query(`
      SELECT c.*, cr.Title AS CourseTitle
      FROM dbo.Coupons c
      LEFT JOIN dbo.Courses cr ON cr.Id = c.CourseId
      WHERE c.Id = @id AND c.InstructorId = @instructorId
    `);

    if (!couponResult.recordset.length) {
      throw Object.assign(new Error('Coupon not found.'), { statusCode: 404 });
    }

    // Last 10 usages
    const usageRequest = await this.db.getRequest();
    usageRequest.input('couponId', sql.UniqueIdentifier, id);
    const usageResult = await usageRequest.query(`
      SELECT TOP 10
        cu.Id, cu.UsedAt, cu.DiscountAmount, cu.OriginalAmount, cu.FinalAmount,
        u.FirstName + ' ' + u.LastName AS StudentName,
        co.Title AS CourseTitle
      FROM dbo.CouponUsage cu
      INNER JOIN dbo.Users u ON u.Id = cu.UserId
      INNER JOIN dbo.Courses co ON co.Id = cu.CourseId
      WHERE cu.CouponId = @couponId
      ORDER BY cu.UsedAt DESC
    `);

    return {
      ...(couponResult.recordset[0] as CouponRow),
      recentUsage: usageResult.recordset,
    };
  }

  // ── Update coupon ───────────────────────────────────────────────────────

  async updateCoupon(id: string, instructorId: string, input: UpdateCouponInput): Promise<CouponRow> {
    // Verify ownership
    const existing = await this.db.query<{ Id: string }>(
      `SELECT Id FROM dbo.Coupons WHERE Id = @id AND InstructorId = @instructorId`,
      { id, instructorId }
    );
    if (!existing.length) {
      throw Object.assign(new Error('Coupon not found.'), { statusCode: 404 });
    }

    if (input.discountType === 'percentage' && input.discountValue !== undefined &&
        (input.discountValue <= 0 || input.discountValue > 100)) {
      throw Object.assign(new Error('Percentage discount must be between 1 and 100.'), { statusCode: 400 });
    }

    const setClauses: string[] = ['UpdatedAt = GETUTCDATE()'];
    const request = await this.db.getRequest();
    request.input('id', sql.UniqueIdentifier, id);
    request.input('instructorId', sql.UniqueIdentifier, instructorId);

    if (input.discountType !== undefined) {
      setClauses.push('DiscountType = @discountType');
      request.input('discountType', sql.NVarChar(20), input.discountType);
    }
    if (input.discountValue !== undefined) {
      setClauses.push('DiscountValue = @discountValue');
      request.input('discountValue', sql.Decimal(10, 2), input.discountValue);
    }
    if ('maxUses' in input) {
      setClauses.push('MaxUses = @maxUses');
      request.input('maxUses', sql.Int, input.maxUses ?? null);
    }
    if ('expiresAt' in input) {
      setClauses.push('ExpiresAt = @expiresAt');
      request.input('expiresAt', sql.DateTime2, input.expiresAt ? new Date(input.expiresAt) : null);
    }
    if (input.minimumPrice !== undefined) {
      setClauses.push('MinimumPrice = @minimumPrice');
      request.input('minimumPrice', sql.Decimal(10, 2), input.minimumPrice);
    }
    if (input.isActive !== undefined) {
      setClauses.push('IsActive = @isActive');
      request.input('isActive', sql.Bit, input.isActive ? 1 : 0);
    }

    const result = await request.query(`
      UPDATE dbo.Coupons SET ${setClauses.join(', ')}
      OUTPUT INSERTED.*
      WHERE Id = @id AND InstructorId = @instructorId
    `);

    logger.info('CouponService: coupon updated', { id, instructorId });
    return result.recordset[0] as CouponRow;
  }

  // ── Record coupon usage after payment ───────────────────────────────────

  async recordUsage(params: {
    couponId: string;
    userId: string;
    courseId: string;
    transactionId: string | null;
    discountAmount: number;
    originalAmount: number;
    finalAmount: number;
  }): Promise<void> {
    const { couponId, userId, courseId, transactionId, discountAmount, originalAmount, finalAmount } = params;

    const request = await this.db.getRequest();
    request.input('couponId', sql.UniqueIdentifier, couponId);
    request.input('userId', sql.UniqueIdentifier, userId);
    request.input('courseId', sql.UniqueIdentifier, courseId);
    request.input('transactionId', sql.UniqueIdentifier, transactionId);
    request.input('discountAmount', sql.Decimal(10, 2), discountAmount);
    request.input('originalAmount', sql.Decimal(10, 2), originalAmount);
    request.input('finalAmount', sql.Decimal(10, 2), finalAmount);

    await request.query(`
      -- Insert usage record
      INSERT INTO dbo.CouponUsage
        (Id, CouponId, UserId, CourseId, TransactionId, DiscountAmount, OriginalAmount, FinalAmount, UsedAt)
      VALUES
        (NEWID(), @couponId, @userId, @courseId, @transactionId, @discountAmount, @originalAmount, @finalAmount, GETUTCDATE());

      -- Increment denormalized counter
      UPDATE dbo.Coupons SET UsedCount = UsedCount + 1, UpdatedAt = GETUTCDATE() WHERE Id = @couponId;
    `);

    logger.info('CouponService: usage recorded', { couponId, userId, courseId, discountAmount });
  }
}
