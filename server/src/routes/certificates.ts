import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { CertificateService } from '../services/CertificateService';
import certificatePdfService from '../services/CertificatePdfService';

const router = Router();
const certificateService = new CertificateService();

/**
 * GET /api/certificates/my-certificates
 * Get all certificates for authenticated user
 * Returns array of certificates ordered by issuance date (most recent first)
 */
router.get('/my-certificates', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const certificates = await certificateService.getUserCertificates(userId!);
    
    res.json({ 
      certificates,
      count: certificates.length
    });
  } catch (error) {
    console.error('Error fetching certificates:', error);
    res.status(500).json({ error: 'Failed to fetch certificates' });
  }
});

/**
 * GET /api/certificates/courses/:courseId
 * Get certificate for specific course
 * Returns 404 if certificate not found (course not completed or certificate not issued)
 */
router.get('/courses/:courseId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?.userId;
    
    console.log(`🔍 [Certificate API] Looking for certificate - UserId: ${userId}, CourseId: ${courseId}`);
    
    const certificate = await certificateService.getCertificateByUserAndCourse(userId!, courseId);
    
    if (!certificate) {
      console.log(`❌ [Certificate API] Certificate NOT FOUND for UserId: ${userId}, CourseId: ${courseId}`);
      return res.status(404).json({ 
        error: 'Certificate not found',
        message: 'Complete the course to earn your certificate'
      });
    }
    
    console.log(`✅ [Certificate API] Certificate FOUND: ${certificate.CertificateNumber}`);
    res.json({ certificate });
  } catch (error) {
    console.error('Error fetching certificate:', error);
    res.status(500).json({ error: 'Failed to fetch certificate' });
  }
});

/**
 * GET /api/certificates/verify/:verificationCode
 * Verify certificate authenticity by verification code
 * Public endpoint - no authentication required
 * Used for external verification of certificates
 */
router.get('/verify/:verificationCode', async (req, res: Response) => {
  try {
    const { verificationCode } = req.params;
    const certificate = await certificateService.verifyCertificate(verificationCode);
    
    if (!certificate) {
      return res.status(404).json({ 
        valid: false,
        error: 'Certificate not found or invalid'
      });
    }
    
    // Return limited information for verification (protect PII)
    res.json({ 
      valid: true,
      certificate: {
        certificateNumber: certificate.CertificateNumber,
        studentName: certificate.StudentName,
        courseTitle: certificate.CourseTitle,
        instructorName: certificate.InstructorName,
        completionDate: certificate.CompletionDate,
        issuedAt: certificate.IssuedAt,
        finalScore: certificate.FinalScore,
        status: certificate.Status
      }
    });
  } catch (error) {
    console.error('Error verifying certificate:', error);
    res.status(500).json({ error: 'Failed to verify certificate' });
  }
});

/**
 * GET /api/certificates/public/:verificationCode
 * Get full certificate by verification code (public shareable link)
 * Public endpoint - no authentication required
 * Returns complete certificate details for display
 */
router.get('/public/:verificationCode', async (req, res: Response) => {
  try {
    const { verificationCode } = req.params;
    
    console.log(`🌍 [Certificate API] Public certificate request - VerificationCode: ${verificationCode}`);
    
    const certificate = await certificateService.verifyCertificate(verificationCode);
    
    if (!certificate) {
      console.log(`❌ [Certificate API] Public certificate NOT FOUND: ${verificationCode}`);
      return res.status(404).json({ 
        error: 'Certificate not found',
        message: 'This certificate does not exist or has been revoked'
      });
    }
    
    console.log(`✅ [Certificate API] Public certificate FOUND: ${certificate.CertificateNumber}`);
    res.json({ certificate });
  } catch (error) {
    console.error('Error fetching public certificate:', error);
    res.status(500).json({ error: 'Failed to fetch certificate' });
  }
});

/**
 * GET /api/certificates/download/:verificationCode
 * Download certificate PDF by verification code
 * Public endpoint - uses verification code for secure access
 * IMPORTANT: Must come BEFORE /:certificateId route to avoid pattern matching
 */
router.get('/download/:verificationCode', async (req, res: Response) => {
  try {
    const { verificationCode } = req.params;
    
    console.log(`📥 [Certificate PDF] Download request - VerificationCode: ${verificationCode}`);
    
    // Get certificate by verification code (public access)
    const certificate = await certificateService.verifyCertificate(verificationCode);
    
    if (!certificate) {
      console.log(`❌ [Certificate PDF] Certificate NOT FOUND: ${verificationCode}`);
      return res.status(404).json({ 
        error: 'Certificate not found' 
      });
    }

    // Check if PDF exists
    if (!certificate.PdfPath) {
      console.log(`⚠️  [Certificate PDF] PDF not generated yet, triggering generation for: ${verificationCode}`);
      console.log(`📋 [Certificate PDF] Certificate ID: ${certificate.Id}, Number: ${certificate.CertificateNumber}`);
      // Trigger PDF generation asynchronously
      setImmediate(() => {
        certificateService.ensureCertificatePdf(certificate.Id)
          .then(() => {
            console.log(`✅ [Certificate PDF] PDF generation complete for: ${certificate.CertificateNumber}`);
          })
          .catch(error => {
            console.error('❌ [Certificate PDF] Error generating PDF:', error);
            console.error('❌ [Certificate PDF] Error stack:', error.stack);
          });
      });
      
      return res.status(202).json({ 
        error: 'Certificate PDF is being generated',
        message: 'Your PDF is being generated. Please wait a moment and try again.'
      });
    }

    const filepath = certificatePdfService.getFilePath(certificate.PdfPath);

    if (!certificatePdfService.fileExists(certificate.PdfPath)) {
      console.log(`❌ [Certificate PDF] PDF file missing on disk: ${certificate.PdfPath}, regenerating...`);
      // Trigger regeneration
      certificateService.ensureCertificatePdf(certificate.Id)
        .then(() => {
          console.log(`✅ [Certificate PDF] PDF regeneration complete for: ${certificate.CertificateNumber}`);
        })
        .catch(error => {
          console.error('❌ [Certificate PDF] Error regenerating PDF:', error);
        });
      
      return res.status(202).json({ 
        error: 'Certificate PDF is being generated',
        message: 'Your PDF is being generated. Please wait a moment and try again.'
      });
    }

    console.log(`✅ [Certificate PDF] Sending PDF: ${certificate.CertificateNumber}`);

    // Send file for download
    res.download(filepath, `certificate_${certificate.CertificateNumber}.pdf`, (err) => {
      if (err) {
        console.error('❌ Error downloading certificate PDF:', err);
        if (!res.headersSent) {
          res.status(500).json({ 
            error: 'Failed to download certificate' 
          });
        }
      }
    });
  } catch (error: any) {
    console.error('❌ Error downloading certificate:', error);
    res.status(500).json({ 
      error: 'Failed to download certificate' 
    });
  }
});

/**
 * GET /api/certificates/:certificateId
 * Get certificate by ID
 * Requires authentication and ownership validation
 * IMPORTANT: Must come AFTER specific routes like /download/:verificationCode
 */
router.get('/:certificateId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { certificateId } = req.params;
    const userId = req.user?.userId;
    
    const certificate = await certificateService.getCertificate(certificateId);
    
    // Verify ownership
    if (certificate.UserId !== userId) {
      return res.status(403).json({ error: 'Unauthorized access to certificate' });
    }
    
    res.json({ certificate });
  } catch (error: any) {
    if (error.message === 'Certificate not found') {
      return res.status(404).json({ error: 'Certificate not found' });
    }
    console.error('Error fetching certificate:', error);
    res.status(500).json({ error: 'Failed to fetch certificate' });
  }
});

export default router;
