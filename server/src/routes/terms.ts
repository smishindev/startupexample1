import { Router } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();
const db = DatabaseService.getInstance();

// GET /api/terms/current - Get current active terms versions (public, no auth required)
router.get('/current', async (req, res, next) => {
  try {
    const activeTerms = await db.query(
      `SELECT Id, DocumentType, Version, Title, Content, Summary, EffectiveDate, CreatedAt
       FROM dbo.TermsVersions
       WHERE IsActive = 1
       ORDER BY DocumentType ASC`
    );

    const termsOfService = activeTerms.find((t: any) => t.DocumentType === 'terms_of_service') || null;
    const privacyPolicy = activeTerms.find((t: any) => t.DocumentType === 'privacy_policy') || null;
    const refundPolicy = activeTerms.find((t: any) => t.DocumentType === 'refund_policy') || null;

    res.json({
      success: true,
      data: {
        termsOfService,
        privacyPolicy,
        refundPolicy
      }
    });
  } catch (error) {
    logger.error('Error fetching current terms:', error);
    next(error);
  }
});

// GET /api/terms/status - Check if authenticated user has accepted latest terms
router.get('/status', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.userId;

    // Get current active terms versions
    const activeTerms = await db.query(
      `SELECT Id, DocumentType, Version, Title, EffectiveDate
       FROM dbo.TermsVersions
       WHERE IsActive = 1`
    );

    const activeTos = activeTerms.find((t: any) => t.DocumentType === 'terms_of_service');
    const activePrivacy = activeTerms.find((t: any) => t.DocumentType === 'privacy_policy');

    // Check user's acceptance records
    const acceptances = await db.query(
      `SELECT uta.TermsVersionId, tv.DocumentType, tv.Version, uta.AcceptedAt
       FROM dbo.UserTermsAcceptance uta
       INNER JOIN dbo.TermsVersions tv ON uta.TermsVersionId = tv.Id
       WHERE uta.UserId = @userId AND tv.IsActive = 1`,
      { userId }
    );

    const tosAcceptance = acceptances.find((a: any) => a.DocumentType === 'terms_of_service');
    const privacyAcceptance = acceptances.find((a: any) => a.DocumentType === 'privacy_policy');

    res.json({
      success: true,
      data: {
        // If no active terms of a given type exist, treat as accepted (nothing to accept)
        termsAccepted: activeTos ? !!tosAcceptance : true,
        privacyAccepted: activePrivacy ? !!privacyAcceptance : true,
        currentTermsVersion: activeTos?.Version || null,
        currentPrivacyVersion: activePrivacy?.Version || null,
        termsVersionId: activeTos?.Id || null,
        privacyVersionId: activePrivacy?.Id || null,
        tosAcceptedAt: tosAcceptance?.AcceptedAt || null,
        privacyAcceptedAt: privacyAcceptance?.AcceptedAt || null
      }
    });
  } catch (error) {
    logger.error('Error checking terms acceptance status:', error);
    next(error);
  }
});

// POST /api/terms/accept - Record user acceptance of terms version(s)
router.post('/accept', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const { termsVersionIds } = req.body;

    if (!termsVersionIds || !Array.isArray(termsVersionIds) || termsVersionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'termsVersionIds array is required'
        }
      });
    }

    // Validate that all provided version IDs are active terms
    const placeholders = termsVersionIds.map((_: string, i: number) => `@id${i}`).join(', ');
    const params: Record<string, string> = {};
    termsVersionIds.forEach((id: string, i: number) => {
      params[`id${i}`] = id;
    });

    const validVersions = await db.query(
      `SELECT Id, DocumentType, Version FROM dbo.TermsVersions WHERE Id IN (${placeholders}) AND IsActive = 1`,
      params
    );

    if (validVersions.length !== termsVersionIds.length) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TERMS_VERSION',
          message: 'One or more terms version IDs are invalid or not currently active'
        }
      });
    }

    // Get IP and User-Agent for audit trail
    const ipAddress = req.headers['x-forwarded-for'] as string || req.ip || null;
    const userAgent = req.headers['user-agent'] || null;

    // Insert acceptance records (MERGE to handle duplicates gracefully)
    for (const versionId of termsVersionIds) {
      await db.execute(
        `MERGE dbo.UserTermsAcceptance AS target
         USING (SELECT @userId AS UserId, @termsVersionId AS TermsVersionId) AS source
         ON target.UserId = source.UserId AND target.TermsVersionId = source.TermsVersionId
         WHEN NOT MATCHED THEN
           INSERT (UserId, TermsVersionId, AcceptedAt, IpAddress, UserAgent)
           VALUES (@userId, @termsVersionId, GETUTCDATE(), @ipAddress, @userAgent)
         WHEN MATCHED THEN
           UPDATE SET AcceptedAt = GETUTCDATE(), IpAddress = @ipAddress, UserAgent = @userAgent;`,
        {
          userId,
          termsVersionId: versionId,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null
        }
      );
    }

    logger.info('User accepted terms', { userId, termsVersionIds });

    res.json({
      success: true,
      message: 'Terms accepted successfully',
      data: {
        acceptedVersions: validVersions.map((v: any) => ({
          id: v.Id,
          documentType: v.DocumentType,
          version: v.Version
        }))
      }
    });
  } catch (error) {
    logger.error('Error recording terms acceptance:', error);
    next(error);
  }
});

// GET /api/terms/:documentType/:version - Get specific version of a document (public)
router.get('/:documentType/:version', async (req, res, next) => {
  try {
    const { documentType, version } = req.params;

    // Validate document type
    if (!['terms_of_service', 'privacy_policy', 'refund_policy'].includes(documentType)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DOCUMENT_TYPE',
          message: 'Document type must be terms_of_service or privacy_policy'
        }
      });
    }

    const result = await db.query(
      `SELECT Id, DocumentType, Version, Title, Content, Summary, EffectiveDate, CreatedAt
       FROM dbo.TermsVersions
       WHERE DocumentType = @documentType AND Version = @version`,
      { documentType, version }
    );

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Terms version not found'
        }
      });
    }

    res.json({
      success: true,
      data: result[0]
    });
  } catch (error) {
    logger.error('Error fetching terms version:', error);
    next(error);
  }
});

export { router as termsRoutes };
