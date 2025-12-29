import express from 'express';
import EmailAnalyticsService from '../services/EmailAnalyticsService';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

/**
 * Tracking pixel endpoint
 * GET /api/email/track/:token/pixel.gif
 * 
 * Returns a 1x1 transparent GIF and records email open
 */
router.get('/track/:token/pixel.gif', async (req, res) => {
  const { token } = req.params;
  const userAgent = req.get('user-agent');
  const ipAddress = req.ip || req.socket.remoteAddress;

  // Record open event (non-blocking)
  EmailAnalyticsService.recordEmailOpen(token, userAgent, ipAddress).catch(err => {
    console.error('Error recording email open:', err);
  });

  // Return 1x1 transparent GIF
  const pixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );

  res.set({
    'Content-Type': 'image/gif',
    'Content-Length': pixel.length,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  res.send(pixel);
});

/**
 * Click tracking endpoint
 * GET /api/email/track/:token/click
 * 
 * Records click and redirects to target URL
 */
router.get('/track/:token/click', async (req, res) => {
  const { token } = req.params;
  const { url } = req.query;
  const userAgent = req.get('user-agent');
  const ipAddress = req.ip || req.socket.remoteAddress;

  if (!url || typeof url !== 'string') {
    return res.status(400).send('Missing or invalid URL parameter');
  }

  // Record click event (non-blocking)
  EmailAnalyticsService.recordEmailClick(token, url, userAgent, ipAddress).catch(err => {
    console.error('Error recording email click:', err);
  });

  // Redirect to target URL
  res.redirect(url);
});

/**
 * Unsubscribe page
 * GET /api/email/unsubscribe/:token
 * 
 * Displays unsubscribe confirmation page
 */
router.get('/unsubscribe/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const result = await EmailAnalyticsService.processUnsubscribe(token);

    if (result.success) {
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Unsubscribed - Mishin Learn</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 12px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.1);
              max-width: 500px;
              padding: 40px;
              text-align: center;
            }
            .icon {
              font-size: 48px;
              margin-bottom: 20px;
            }
            h1 {
              color: #333;
              font-size: 28px;
              margin: 0 0 16px;
            }
            p {
              color: #666;
              font-size: 16px;
              line-height: 1.6;
              margin: 0 0 24px;
            }
            .email {
              background: #f5f5f5;
              border-radius: 6px;
              padding: 12px;
              font-family: monospace;
              color: #333;
              margin-bottom: 24px;
            }
            .btn {
              background: #667eea;
              color: white;
              border: none;
              border-radius: 6px;
              padding: 12px 24px;
              font-size: 16px;
              cursor: pointer;
              text-decoration: none;
              display: inline-block;
              transition: background 0.3s;
            }
            .btn:hover {
              background: #5568d3;
            }
            .footer {
              margin-top: 32px;
              font-size: 14px;
              color: #999;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">✅</div>
            <h1>Successfully Unsubscribed</h1>
            <p>${result.message}</p>
            ${result.email ? `<div class="email">${result.email}</div>` : ''}
            <p>You can update your email preferences anytime by logging into your account.</p>
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}" class="btn">Return to Mishin Learn</a>
            <div class="footer">
              <p>Mishin Learn Platform<br>© ${new Date().getFullYear()}</p>
            </div>
          </div>
        </body>
        </html>
      `);
    } else {
      res.status(400).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Error - Mishin Learn</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 12px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.1);
              max-width: 500px;
              padding: 40px;
              text-align: center;
            }
            .icon {
              font-size: 48px;
              margin-bottom: 20px;
            }
            h1 {
              color: #333;
              font-size: 28px;
              margin: 0 0 16px;
            }
            p {
              color: #666;
              font-size: 16px;
              line-height: 1.6;
            }
            .btn {
              background: #667eea;
              color: white;
              border: none;
              border-radius: 6px;
              padding: 12px 24px;
              font-size: 16px;
              cursor: pointer;
              text-decoration: none;
              display: inline-block;
              margin-top: 24px;
              transition: background 0.3s;
            }
            .btn:hover {
              background: #5568d3;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">❌</div>
            <h1>Error</h1>
            <p>${result.message}</p>
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}" class="btn">Return to Mishin Learn</a>
          </div>
        </body>
        </html>
      `);
    }
  } catch (error) {
    console.error('Error processing unsubscribe:', error);
    res.status(500).send('An error occurred processing your request');
  }
});

/**
 * Get user email analytics (authenticated)
 * GET /api/email/analytics/me
 */
router.get('/analytics/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const stats = await EmailAnalyticsService.getUserEmailStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching user email analytics:', error);
    res.status(500).json({ error: 'Failed to fetch email analytics' });
  }
});

/**
 * Get system-wide email analytics (admin only)
 * GET /api/email/analytics/system?days=30
 */
router.get('/analytics/system', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userRole = req.user?.role;
    
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const days = parseInt(req.query.days as string) || 30;
    const stats = await EmailAnalyticsService.getSystemEmailStats(days);
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching system email analytics:', error);
    res.status(500).json({ error: 'Failed to fetch system analytics' });
  }
});

export default router;
