import sql from 'mssql';
import { DatabaseService } from './DatabaseService';
import { NotificationService } from './NotificationService';
import { CourseEventService } from './CourseEventService';
import EmailService from './EmailService';
import { Server as SocketIOServer } from 'socket.io';

export interface InstructorStats {
  totalCourses: number;
  publishedCourses: number;
  archivedCourses: number;
  draftCourses: number;
  totalStudents: number;
  activeEnrollments: number;
}

export interface DeletionEligibility {
  canDelete: boolean;
  blockedReason?: string;
  details: InstructorStats;
}

export interface ArchiveResult {
  success: boolean;
  archivedCount: number;
  affectedStudents: number;
  failedCourses?: string[];
}

export interface TransferResult {
  success: boolean;
  transferredCount: number;
  failedCourses: string[];
  historyRecordIds: string[];
}

export interface EligibleInstructor {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  totalCourses: number;
  isActive: boolean;
}

export class CourseManagementService {
  private db: DatabaseService;
  private notificationService: NotificationService;

  constructor(io?: SocketIOServer) {
    this.db = DatabaseService.getInstance();
    this.notificationService = new NotificationService(io);
  }

  /**
   * Check if instructor can delete their account
   */
  async canInstructorDeleteAccount(instructorId: string): Promise<DeletionEligibility> {
    const request = await this.db.getRequest();

    const result = await request
      .input('instructorId', sql.UniqueIdentifier, instructorId)
      .query(`
        SELECT 
          -- Course counts by status
          (SELECT COUNT(*) FROM dbo.Courses WHERE InstructorId = @instructorId) AS TotalCourses,
          (SELECT COUNT(*) FROM dbo.Courses WHERE InstructorId = @instructorId AND Status = 'published') AS PublishedCourses,
          (SELECT COUNT(*) FROM dbo.Courses WHERE InstructorId = @instructorId AND Status = 'archived') AS ArchivedCourses,
          (SELECT COUNT(*) FROM dbo.Courses WHERE InstructorId = @instructorId AND Status = 'draft') AS DraftCourses,
          
          -- Student counts
          (SELECT COUNT(DISTINCT e.UserId) 
           FROM dbo.Enrollments e 
           INNER JOIN dbo.Courses c ON e.CourseId = c.Id 
           WHERE c.InstructorId = @instructorId 
             AND e.Status = 'active'
             AND c.Status IN ('published', 'archived')) AS TotalStudents,
          
          (SELECT COUNT(*) 
           FROM dbo.Enrollments e 
           INNER JOIN dbo.Courses c ON e.CourseId = c.Id 
           WHERE c.InstructorId = @instructorId 
             AND e.Status = 'active') AS ActiveEnrollments
      `);

    const stats = result.recordset[0];
    const details: InstructorStats = {
      totalCourses: stats.TotalCourses || 0,
      publishedCourses: stats.PublishedCourses || 0,
      archivedCourses: stats.ArchivedCourses || 0,
      draftCourses: stats.DraftCourses || 0,
      totalStudents: stats.TotalStudents || 0,
      activeEnrollments: stats.ActiveEnrollments || 0
    };

    // Business rule: Cannot delete if has active students
    const canDelete = details.totalStudents === 0;
    const blockedReason = canDelete 
      ? undefined 
      : `You have ${details.totalStudents} active student${details.totalStudents > 1 ? 's' : ''} in ${details.publishedCourses + details.archivedCourses} course${(details.publishedCourses + details.archivedCourses) > 1 ? 's' : ''}. Please archive or transfer your courses first.`;

    return {
      canDelete,
      blockedReason,
      details
    };
  }

  /**
   * Archive all instructor's courses
   */
  async archiveAllCourses(instructorId: string, reason?: string): Promise<ArchiveResult> {
    const pool = await this.db.getPool();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      const request = new sql.Request(transaction);
      request.input('instructorId', sql.UniqueIdentifier, instructorId);

      // Get courses that will be archived
      const coursesToArchive = await request.query(`
        SELECT Id, Title 
        FROM dbo.Courses 
        WHERE InstructorId = @instructorId 
          AND Status = 'published'
      `);

      if (coursesToArchive.recordset.length === 0) {
        await transaction.commit();
        return {
          success: true,
          archivedCount: 0,
          affectedStudents: 0
        };
      }

      // Count affected students
      const studentCount = await request.query(`
        SELECT COUNT(DISTINCT e.UserId) as StudentCount
        FROM dbo.Enrollments e
        INNER JOIN dbo.Courses c ON e.CourseId = c.Id
        WHERE c.InstructorId = @instructorId
          AND c.Status = 'published'
          AND e.Status = 'active'
      `);

      const affectedStudents = studentCount.recordset[0]?.StudentCount || 0;

      // Archive all published courses (keep IsPublished=1 for backward compatibility)
      const archiveResult = await request.query(`
        UPDATE dbo.Courses
        SET Status = 'archived',
            IsPublished = 1,
            UpdatedAt = GETUTCDATE()
        WHERE InstructorId = @instructorId
          AND Status = 'published'
      `);

      await transaction.commit();

      const archivedCount = archiveResult.rowsAffected[0] || 0;

      // Emit real-time catalog change events for each archived course
      const courseEventService = CourseEventService.getInstance();
      for (const course of coursesToArchive.recordset) {
        try {
          courseEventService.emitCourseCatalogChanged('removed', course.Id);
        } catch (emitError) {
          console.error('[CourseManagement] Failed to emit archive event:', emitError);
        }
      }

      // Send notifications to affected students (non-blocking)
      this.notifyStudentsOfArchive(instructorId, coursesToArchive.recordset).catch(err => {
        console.error('Failed to notify students of course archive:', err);
      });

      console.log(`✅ Archived ${archivedCount} courses, affecting ${affectedStudents} students`);

      return {
        success: true,
        archivedCount,
        affectedStudents
      };

    } catch (error) {
      await transaction.rollback();
      console.error('Error archiving courses:', error);
      throw error;
    }
  }

  /**
   * Transfer courses to another instructor
   */
  async transferCourses(params: {
    fromInstructorId: string;
    toInstructorId: string;
    courseIds?: string[]; // If null/empty, transfer all
    reason: string;
    transferredBy?: string; // Admin userId if applicable
  }): Promise<TransferResult> {
    const { fromInstructorId, toInstructorId, courseIds, reason, transferredBy } = params;

    // Validation
    if (fromInstructorId === toInstructorId) {
      throw new Error('Cannot transfer courses to yourself');
    }

    // Verify target instructor exists and is active
    const targetRequest = await this.db.getRequest();
    const targetInstructor = await targetRequest
      .input('instructorId', sql.UniqueIdentifier, toInstructorId)
      .query(`
        SELECT Id, Role, IsActive, FirstName, LastName, Email
        FROM dbo.Users 
        WHERE Id = @instructorId 
          AND Role = 'instructor' 
          AND IsActive = 1
      `);

    if (targetInstructor.recordset.length === 0) {
      throw new Error('Target instructor not found or inactive');
    }

    const pool = await this.db.getPool();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      const request = new sql.Request(transaction);
      request.input('fromInstructorId', sql.UniqueIdentifier, fromInstructorId);
      request.input('toInstructorId', sql.UniqueIdentifier, toInstructorId);

      // Get courses to transfer
      let coursesQuery = `
        SELECT Id, Title, Status, EnrollmentCount
        FROM dbo.Courses
        WHERE InstructorId = @fromInstructorId
      `;

      if (courseIds && courseIds.length > 0) {
        const courseIdList = courseIds.map(id => `'${id}'`).join(',');
        coursesQuery += ` AND Id IN (${courseIdList})`;
      }

      const coursesToTransfer = await request.query(coursesQuery);

      if (coursesToTransfer.recordset.length === 0) {
        await transaction.rollback();
        return {
          success: true,
          transferredCount: 0,
          failedCourses: [],
          historyRecordIds: []
        };
      }

      // Transfer courses
      let transferQuery = `
        UPDATE dbo.Courses
        SET InstructorId = @toInstructorId,
            UpdatedAt = GETUTCDATE()
        WHERE InstructorId = @fromInstructorId
      `;

      if (courseIds && courseIds.length > 0) {
        const courseIdList = courseIds.map(id => `'${id}'`).join(',');
        transferQuery += ` AND Id IN (${courseIdList})`;
      }

      const transferResult = await request.query(transferQuery);
      const transferredCount = transferResult.rowsAffected[0] || 0;

      // Create history records
      const historyRecordIds: string[] = [];
      for (const course of coursesToTransfer.recordset) {
        const historyRequest = new sql.Request(transaction);
        
        const historyResult = await historyRequest
          .input('courseId', sql.UniqueIdentifier, course.Id)
          .input('fromInstructorId', sql.UniqueIdentifier, fromInstructorId)
          .input('toInstructorId', sql.UniqueIdentifier, toInstructorId)
          .input('reason', sql.NVarChar(100), reason)
          .input('transferredBy', sql.UniqueIdentifier, transferredBy || null)
          .query(`
            INSERT INTO dbo.CourseOwnershipHistory 
              (CourseId, FromInstructorId, ToInstructorId, TransferReason, TransferredBy)
            OUTPUT INSERTED.Id
            VALUES (@courseId, @fromInstructorId, @toInstructorId, @reason, @transferredBy)
          `);

        historyRecordIds.push(historyResult.recordset[0].Id);
      }

      await transaction.commit();

      // Send notifications (non-blocking)
      const targetInstructorInfo = targetInstructor.recordset[0];
      this.notifyInstructorsOfTransfer(
        fromInstructorId,
        toInstructorId,
        targetInstructorInfo,
        coursesToTransfer.recordset
      ).catch(err => {
        console.error('Failed to notify instructors of transfer:', err);
      });

      console.log(`✅ Transferred ${transferredCount} courses from ${fromInstructorId} to ${toInstructorId}`);

      return {
        success: true,
        transferredCount,
        failedCourses: [],
        historyRecordIds
      };

    } catch (error) {
      await transaction.rollback();
      console.error('Error transferring courses:', error);
      throw error;
    }
  }

  /**
   * Get list of eligible instructors for course transfer
   */
  async getEligibleInstructors(excludeInstructorId: string): Promise<EligibleInstructor[]> {
    const request = await this.db.getRequest();

    const result = await request
      .input('excludeId', sql.UniqueIdentifier, excludeInstructorId)
      .query(`
        SELECT 
          u.Id,
          u.Email,
          u.FirstName,
          u.LastName,
          u.IsActive,
          COUNT(c.Id) as TotalCourses
        FROM dbo.Users u
        LEFT JOIN dbo.Courses c ON u.Id = c.InstructorId
        WHERE u.Role = 'instructor'
          AND u.IsActive = 1
          AND u.Id != @excludeId
        GROUP BY u.Id, u.Email, u.FirstName, u.LastName, u.IsActive
        ORDER BY u.FirstName, u.LastName
      `);

    return result.recordset.map((row: any) => ({
      id: row.Id,
      email: row.Email,
      firstName: row.FirstName,
      lastName: row.LastName,
      totalCourses: row.TotalCourses || 0,
      isActive: row.IsActive
    }));
  }

  /**
   * Soft delete courses (set status to 'deleted')
   */
  async softDeleteCourses(instructorId: string): Promise<{ success: boolean; deletedCount: number }> {
    const request = await this.db.getRequest();

    // Query course IDs BEFORE deleting so we know exactly which ones were affected
    const coursesToDelete = await request
      .input('instructorIdPre', sql.UniqueIdentifier, instructorId)
      .query(`
        SELECT Id FROM dbo.Courses
        WHERE InstructorId = @instructorIdPre
          AND Status != 'deleted'
      `);

    const request2 = await this.db.getRequest();
    const result = await request2
      .input('instructorId', sql.UniqueIdentifier, instructorId)
      .query(`
        UPDATE dbo.Courses
        SET Status = 'deleted',
            UpdatedAt = GETUTCDATE()
        WHERE InstructorId = @instructorId
          AND Status != 'deleted'
      `);

    const deletedCount = result.rowsAffected[0] || 0;

    // Emit catalog change events only for the courses just deleted
    if (deletedCount > 0) {
      const courseEventService = CourseEventService.getInstance();
      for (const course of coursesToDelete.recordset) {
        try {
          courseEventService.emitCourseCatalogChanged('removed', course.Id);
        } catch (emitError) {
          console.error('[CourseManagement] Failed to emit catalog change event:', emitError);
        }
      }
    }

    return {
      success: true,
      deletedCount
    };
  }

  /**
   * Notify students when courses are archived
   */
  private async notifyStudentsOfArchive(instructorId: string, courses: any[]): Promise<void> {
    try {
      // Get all affected students
      const request = await this.db.getRequest();
      const result = await request
        .input('instructorId', sql.UniqueIdentifier, instructorId)
        .query(`
          SELECT DISTINCT 
            u.Id, 
            u.Email, 
            u.FirstName,
            c.Id as CourseId,
            c.Title as CourseTitle
          FROM dbo.Users u
          INNER JOIN dbo.Enrollments e ON u.Id = e.UserId
          INNER JOIN dbo.Courses c ON e.CourseId = c.Id
          WHERE c.InstructorId = @instructorId
            AND c.Status = 'archived'
            AND e.Status = 'active'
        `);

      // Group by student
      const studentCourses = new Map<string, any[]>();
      for (const row of result.recordset) {
        if (!studentCourses.has(row.Id)) {
          studentCourses.set(row.Id, []);
        }
        studentCourses.get(row.Id)!.push({
          courseId: row.CourseId,
          courseTitle: row.CourseTitle
        });
      }

      // Send emails to each student
      for (const [studentId, courses] of studentCourses.entries()) {
        const student = result.recordset.find(r => r.Id === studentId);
        
        await EmailService.sendEmail({
          to: student.Email,
          subject: `Course Update - Courses Archived`,
          html: this.generateArchiveEmailHtml(student.FirstName, courses)
        });

        // Also create in-app notification
        await this.notificationService.createNotificationWithControls(
          {
            userId: studentId,
            type: 'course',
            priority: 'normal',
            title: 'Courses Archived',
            message: `${courses.length} of your enrolled course${courses.length > 1 ? 's have' : ' has'} been archived. You still have full access to all content.`,
            actionUrl: '/courses',
            actionText: 'View Courses'
          },
          {
            category: 'course',
            subcategory: 'CourseUpdated'
          }
        );
      }

      console.log(`✅ Notified ${studentCourses.size} students about course archive`);
    } catch (error) {
      console.error('Error notifying students:', error);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Notify instructors of course transfer
   */
  private async notifyInstructorsOfTransfer(
    fromInstructorId: string,
    toInstructorId: string,
    toInstructorInfo: any,
    courses: any[]
  ): Promise<void> {
    try {
      // Notify new instructor
      await this.notificationService.createNotificationWithControls(
        {
          userId: toInstructorId,
          type: 'course',
          priority: 'high',
          title: 'Course Ownership Transferred',
          message: `You are now the instructor for ${courses.length} course${courses.length > 1 ? 's' : ''}. You have full access to manage ${courses.length > 1 ? 'them' : 'it'}.`,
          actionUrl: '/instructor/dashboard',
          actionText: 'View Courses'
        },
        {
          category: 'course',
          subcategory: 'CourseUpdated'
        }
      );

      // Send email to new instructor
      await EmailService.sendEmail({
        to: toInstructorInfo.Email,
        subject: 'Course Ownership Transferred',
        html: this.generateTransferEmailHtml(toInstructorInfo.FirstName, courses)
      });

      console.log(`✅ Notified new instructor of course transfer`);
    } catch (error) {
      console.error('Error notifying instructors:', error);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Generate HTML for archive notification email
   */
  private generateArchiveEmailHtml(firstName: string, courses: any[]): string {
    const courseList = courses.map(c => `<li>${c.courseTitle}</li>`).join('');
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2196f3;">Course Update</h2>
        <p>Hi ${firstName},</p>
        <p>The instructor for the following course${courses.length > 1 ? 's' : ''} has archived ${courses.length > 1 ? 'them' : 'it'}:</p>
        
        <ul style="margin: 20px 0;">
          ${courseList}
        </ul>

        <div style="background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0;">
          <strong>What this means for you:</strong>
          <ul>
            <li>✅ You still have full access to all course content</li>
            <li>✅ Your progress is saved and you can continue learning</li>
            <li>✅ You can still complete assessments and earn certificates</li>
            <li>❌ No new content updates will be added</li>
            <li>❌ No new students can enroll</li>
          </ul>
        </div>

        <p>You can continue your learning journey without any interruption!</p>
        
        <p style="margin-top: 30px;">Best regards,<br>The Mishin Learn Team</p>
      </div>
    `;
  }

  /**
   * Generate HTML for transfer notification email
   */
  private generateTransferEmailHtml(firstName: string, courses: any[]): string {
    const courseList = courses.map(c => 
      `<li><strong>${c.Title}</strong> (${c.EnrollmentCount} enrolled student${c.EnrollmentCount !== 1 ? 's' : ''})</li>`
    ).join('');
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4caf50;">Course Ownership Transferred</h2>
        <p>Hi ${firstName},</p>
        <p>You are now the instructor for the following course${courses.length > 1 ? 's' : ''}:</p>
        
        <ul style="margin: 20px 0;">
          ${courseList}
        </ul>

        <div style="background-color: #f1f8e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0;">
          <strong>As the new instructor, you can:</strong>
          <ul>
            <li>Manage all course content and lessons</li>
            <li>View student progress and analytics</li>
            <li>Create and grade assessments</li>
            <li>Communicate with enrolled students</li>
          </ul>
        </div>

        <p><a href="http://localhost:5173/instructor/dashboard" style="background-color: #4caf50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">View Your Courses</a></p>
        
        <p style="margin-top: 30px;">Best regards,<br>The Mishin Learn Team</p>
      </div>
    `;
  }
}
