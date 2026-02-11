import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { DatabaseService } from './DatabaseService';
import certificatePdfService from './CertificatePdfService';

interface Certificate {
  Id: string;
  UserId: string;
  CourseId: string;
  CertificateNumber: string;
  StudentName: string;
  StudentEmail: string;
  CourseTitle: string;
  InstructorName: string;
  CompletionDate: string;
  FinalScore: number | null;
  TotalHoursSpent: number;
  Status: string;
  VerificationCode: string;
  IssuedAt: string;
  CreatedAt: string;
  PdfPath: string | null;
  PdfGeneratedAt: string | null;
  RevokedAt: string | null;
  RevokeReason: string | null;
}

/**
 * CertificateService - Manages certificate issuance, retrieval, and verification
 * 
 * Purpose: Issue certificates when students complete courses with passing grades
 * Features:
 * - Automatic certificate generation on course completion
 * - Unique certificate numbers and verification codes
 * - Snapshot of student/course info at completion time
 * - PDF generation support (future enhancement)
 * - Certificate verification endpoint for external validation
 */
export class CertificateService {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  /**
   * Generate unique certificate number
   * Format: CERT-{YEAR}-{12-char-hex}
   * Example: CERT-2026-A1B2C3D4E5F6
   */
  private generateCertificateNumber(): string {
    const year = new Date().getFullYear();
    const random = crypto.randomBytes(6).toString('hex').toUpperCase();
    return `CERT-${year}-${random}`;
  }

  /**
   * Generate verification code for certificate authenticity
   * SHA256 hash of userId, courseId, and timestamp
   */
  private generateVerificationCode(userId: string, courseId: string): string {
    const data = `${userId}-${courseId}-${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Check if user already has certificate for course
   */
  async hasCertificate(userId: string, courseId: string): Promise<boolean> {
    try {
      const result = await this.db.query(`
        SELECT Id FROM dbo.Certificates
        WHERE UserId = @userId AND CourseId = @courseId AND Status = 'issued'
      `, { userId, courseId });
      
      return result.length > 0;
    } catch (error) {
      console.error('Error checking certificate existence:', error);
      return false;
    }
  }

  /**
   * Issue certificate for course completion
   * Called when student reaches 100% course progress with passing grade
   * 
   * @param userId - Student's user ID
   * @param courseId - Completed course ID
   * @returns Certificate object
   */
  async issueCertificate(userId: string, courseId: string): Promise<Certificate> {
    // Check if already issued
    if (await this.hasCertificate(userId, courseId)) {
      const existing = await this.db.query(`
        SELECT * FROM dbo.Certificates
        WHERE UserId = @userId AND CourseId = @courseId AND Status = 'issued'
      `, { userId, courseId });
      console.log(`ℹ️ Certificate already exists for user ${userId} course ${courseId}`);
      
      // If PDF hasn't been generated yet, trigger generation
      if (!existing[0].PdfPath) {
        console.log(`📄 Triggering PDF generation for existing certificate: ${existing[0].CertificateNumber}`);
        this.generatePdfForCertificate(existing[0]).catch(error => {
          console.error('❌ Error generating PDF for existing certificate:', error);
        });
      }
      
      return existing[0];
    }

    // Get student information
    const userInfo = await this.db.query(`
      SELECT FirstName, LastName, Email FROM dbo.Users WHERE Id = @userId
    `, { userId });

    if (userInfo.length === 0) {
      throw new Error('User not found');
    }

    // Get course and instructor information
    const courseInfo = await this.db.query(`
      SELECT 
        c.Title,
        c.CertificateTitle,
        c.CertificateTemplate,
        ISNULL(u.FirstName + ' ' + u.LastName, 
               CASE 
                 WHEN u.FirstName IS NOT NULL THEN u.FirstName
                 WHEN u.LastName IS NOT NULL THEN u.LastName
                 ELSE u.Username
               END) as InstructorName
      FROM dbo.Courses c
      INNER JOIN dbo.Users u ON c.InstructorId = u.Id
      WHERE c.Id = @courseId
    `, { courseId });

    if (courseInfo.length === 0) {
      throw new Error('Course not found');
    }

    // Get completion details from CourseProgress
    const progressInfo = await this.db.query(`
      SELECT CompletedAt, TimeSpent FROM dbo.CourseProgress
      WHERE UserId = @userId AND CourseId = @courseId
    `, { userId, courseId });

    // Calculate average assessment score (only completed, non-preview submissions)
    const scoreInfo = await this.db.query(`
      SELECT AVG(CAST(Score as FLOAT) / NULLIF(MaxScore, 0) * 100) as AvgScore
      FROM dbo.AssessmentSubmissions asub
      INNER JOIN dbo.Assessments a ON asub.AssessmentId = a.Id
      INNER JOIN dbo.Lessons l ON a.LessonId = l.Id
      WHERE asub.UserId = @userId 
        AND l.CourseId = @courseId 
        AND asub.Status = 'completed'
        AND asub.IsPreview = 0
    `, { userId, courseId });

    const studentName = `${userInfo[0].FirstName} ${userInfo[0].LastName}`.trim();
    const completionDate = progressInfo[0]?.CompletedAt || new Date().toISOString();
    const finalScore = scoreInfo[0]?.AvgScore || null;
    const totalHoursSpent = progressInfo[0]?.TimeSpent || 0;
    
    // Use custom certificate title if set, otherwise fall back to course title
    const certificateTitle = courseInfo[0].CertificateTitle || courseInfo[0].Title;

    // Generate certificate
    const certificateId = uuidv4();
    const certificateNumber = this.generateCertificateNumber();
    const verificationCode = this.generateVerificationCode(userId, courseId);

    await this.db.execute(`
      INSERT INTO dbo.Certificates (
        Id, UserId, CourseId, CertificateNumber, StudentName, StudentEmail,
        CourseTitle, InstructorName, CompletionDate, FinalScore, TotalHoursSpent,
        Status, VerificationCode, IssuedAt, CreatedAt
      )
      VALUES (
        @id, @userId, @courseId, @certificateNumber, @studentName, @studentEmail,
        @courseTitle, @instructorName, @completionDate, @finalScore, @totalHoursSpent,
        'issued', @verificationCode, GETUTCDATE(), GETUTCDATE()
      )
    `, {
      id: certificateId,
      userId,
      courseId,
      certificateNumber,
      studentName,
      studentEmail: userInfo[0].Email,
      courseTitle: certificateTitle,
      instructorName: courseInfo[0].InstructorName,
      completionDate,
      finalScore,
      totalHoursSpent,
      verificationCode
    });

    console.log(`✅ Certificate issued: ${certificateNumber} for ${studentName} - ${courseInfo[0].Title}`);

    // Return certificate details
    const certificate = await this.db.query(`
      SELECT * FROM dbo.Certificates WHERE Id = @id
    `, { id: certificateId });

    // Generate PDF asynchronously (don't block certificate issuance)
    this.generatePdfForCertificate(certificate[0]).catch(error => {
      console.error('❌ Error generating PDF for certificate:', error);
    });

    return certificate[0];
  }

  /**
   * Generate PDF for certificate (async, non-blocking)
   */
  /**
   * Generate PDF for an existing certificate
   * Public method to trigger PDF generation for certificates that don't have one yet
   * Checks both database PdfPath AND actual file existence on disk
   */
  async ensureCertificatePdf(certificateId: string): Promise<void> {
    const certificate = await this.getCertificate(certificateId);
    
    // Check if PDF path exists in database AND file exists on disk
    const needsGeneration = !certificate.PdfPath || 
      !certificatePdfService.fileExists(certificate.PdfPath);
    
    if (needsGeneration) {
      console.log(`📄 PDF missing for certificate ${certificate.CertificateNumber}, generating...`);
      await this.generatePdfForCertificate(certificate);
    } else {
      console.log(`✅ PDF already exists for certificate ${certificate.CertificateNumber}`);
    }
  }

  /**
   * Generate PDF for a certificate (private helper)
   * Looks up the course's certificate template setting for styling
   */
  private async generatePdfForCertificate(certificate: Certificate): Promise<void> {
    try {
      console.log(`📄 Generating PDF for certificate: ${certificate.CertificateNumber}`);
      
      // Look up certificate template from course settings
      let template = 'classic';
      try {
        const courseSettings = await this.db.query(`
          SELECT CertificateTemplate FROM dbo.Courses WHERE Id = @courseId
        `, { courseId: certificate.CourseId });
        template = courseSettings[0]?.CertificateTemplate || 'classic';
      } catch (e) {
        console.log('⚠️ Could not fetch certificate template, using classic');
      }
      
      const pdfPath = await certificatePdfService.generateCertificatePdf({
        certificateNumber: certificate.CertificateNumber,
        studentName: certificate.StudentName,
        courseTitle: certificate.CourseTitle,
        instructorName: certificate.InstructorName,
        completionDate: new Date(certificate.CompletionDate),
        finalScore: certificate.FinalScore ?? undefined,
        totalHoursSpent: certificate.TotalHoursSpent,
        verificationCode: certificate.VerificationCode,
        template
      });

      // Update certificate with PDF path
      await this.db.execute(`
        UPDATE dbo.Certificates
        SET PdfPath = @pdfPath, PdfGeneratedAt = GETUTCDATE()
        WHERE Id = @certificateId
      `, {
        pdfPath,
        certificateId: certificate.Id
      });

      console.log(`✅ PDF generated successfully: ${pdfPath}`);
    } catch (error) {
      console.error(`❌ Failed to generate PDF for certificate ${certificate.CertificateNumber}:`, error);
      throw error;
    }
  }

  /**
   * Get certificate by ID
   */
  async getCertificate(certificateId: string): Promise<Certificate> {
    const result = await this.db.query(`
      SELECT * FROM dbo.Certificates WHERE Id = @certificateId
    `, { certificateId });
    
    if (result.length === 0) {
      throw new Error('Certificate not found');
    }
    
    return result[0];
  }

  /**
   * Get certificate by user and course
   * Returns null if certificate doesn't exist
   */
  async getCertificateByUserAndCourse(userId: string, courseId: string): Promise<Certificate | null> {
    const result = await this.db.query(`
      SELECT * FROM dbo.Certificates 
      WHERE UserId = @userId AND CourseId = @courseId AND Status = 'issued'
    `, { userId, courseId });
    
    if (result.length === 0) {
      return null;
    }
    
    return result[0];
  }

  /**
   * Get all certificates for a user
   * Ordered by most recent first
   */
  async getUserCertificates(userId: string): Promise<Certificate[]> {
    return await this.db.query(`
      SELECT * FROM dbo.Certificates 
      WHERE UserId = @userId AND Status = 'issued'
      ORDER BY IssuedAt DESC
    `, { userId });
  }

  /**
   * Verify certificate by verification code
   * Used for external validation of certificate authenticity
   * Returns null if invalid/not found
   */
  async verifyCertificate(verificationCode: string): Promise<Certificate | null> {
    const result = await this.db.query(`
      SELECT * FROM dbo.Certificates 
      WHERE VerificationCode = @verificationCode AND Status = 'issued'
    `, { verificationCode });
    
    if (result.length === 0) {
      return null;
    }
    
    return result[0];
  }

  /**
   * Revoke certificate (admin function)
   * Future enhancement: Add authorization checks
   */
  async revokeCertificate(certificateId: string, reason: string): Promise<void> {
    await this.db.execute(`
      UPDATE dbo.Certificates
      SET Status = 'revoked',
          RevokedAt = GETUTCDATE(),
          RevokeReason = @reason
      WHERE Id = @certificateId
    `, { certificateId, reason });
    
    console.log(`⚠️ Certificate ${certificateId} revoked: ${reason}`);
  }
}
