import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  Snackbar
} from '@mui/material';
import { Download, Verified, ArrowBack, Share } from '@mui/icons-material';
import { certificatesApi } from '../../services/certificatesApi';
import { format } from 'date-fns';
import { HeaderV5 as Header } from '../../components/Navigation/HeaderV5';
import { useShare } from '../../hooks/useShare';
import { ShareService } from '../../services/shareService';

interface Certificate {
  Id: string;
  CertificateNumber: string;
  StudentName: string;
  CourseTitle: string;
  InstructorName: string;
  CompletionDate: string;
  FinalScore: number | null;
  TotalHoursSpent: number;
  IssuedAt: string;
  VerificationCode: string;
}

export default function PublicCertificatePage() {
  const { verificationCode } = useParams<{ verificationCode: string }>();
  const navigate = useNavigate();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  const { openShareDialog, ShareDialogComponent } = useShare({
    contentType: 'certificate',
    contentId: certificate?.Id || '',
    generateShareData: () => certificate ? ShareService.generateCertificateShareData({
      StudentName: certificate.StudentName,
      CourseTitle: certificate.CourseTitle,
      CompletionDate: certificate.CompletionDate,
      VerificationCode: certificate.VerificationCode,
    }) : { url: '', title: '', text: '' },
    preview: certificate ? (
      <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
          {certificate.CourseTitle}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          Awarded to: {certificate.StudentName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Completed: {format(new Date(certificate.CompletionDate), 'MMMM dd, yyyy')}
        </Typography>
      </Box>
    ) : undefined,
    metadata: certificate ? {
      title: certificate.CourseTitle,
    } : undefined,
  });

  useEffect(() => {
    if (verificationCode) {
      loadCertificate();
    }
  }, [verificationCode]);

  const loadCertificate = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await certificatesApi.getPublicCertificate(verificationCode!);
      setCertificate(data.certificate as Certificate);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to load certificate';
      setError(errorMsg);
      console.error('Certificate fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!certificate || downloading) return;
    
    setDownloading(true);
    const maxRetries = 10; // Maximum 10 attempts (30 seconds with 3s interval)
    let attempts = 0;
    
    const tryDownload = async (): Promise<boolean> => {
      try {
        await certificatesApi.downloadCertificatePdf(certificate.VerificationCode);
        return true; // Success
      } catch (error: any) {
        // Check if it's a 202 "generating" response
        if (error.message?.includes('being generated') || error.message?.includes('wait')) {
          return false; // Not ready yet, retry
        }
        // Any other error - throw it
        throw error;
      }
    };
    
    try {
      // First attempt
      const success = await tryDownload();
      if (success) {
        setDownloading(false);
        return;
      }
      
      // Show generating message
      setSnackbar({ open: true, message: 'Generating your PDF certificate... Please wait' });
      
      // Auto-retry loop
      while (attempts < maxRetries) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
        
        const success = await tryDownload();
        if (success) {
          setDownloading(false);
          setSnackbar({ open: true, message: 'Certificate downloaded successfully!' });
          return; // Download succeeded
        }
      }
      
      // Max retries exceeded
      setDownloading(false);
      setSnackbar({ open: true, message: 'PDF generation is taking longer than expected. Please try again.' });
    } catch (error: any) {
      setDownloading(false);
      const errorMsg = error.message || error.response?.data?.message || error.response?.data?.error || 'Failed to download PDF';
      setSnackbar({ open: true, message: errorMsg });
    }
  };

  const formatHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} minutes`;
    if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${hours} hour${hours > 1 ? 's' : ''} ${mins} min`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', flex: 1 }}>
          <CircularProgress size={60} />
        </Container>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <Container maxWidth="md" sx={{ py: 4, flex: 1 }}>
          <Alert 
            severity="error" 
            action={
              <Button color="inherit" size="small" onClick={() => navigate('/')}>
                Go Home
              </Button>
            }
          >
            {error === 'Certificate not found' 
              ? 'This certificate does not exist or has been revoked.'
              : error
            }
          </Alert>
        </Container>
      </Box>
    );
  }

  if (!certificate) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <Container maxWidth="md" sx={{ py: 4, flex: 1 }}>
          <Alert severity="info">
            Certificate not found
          </Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      
      <Container maxWidth="lg" sx={{ py: 4, flex: 1 }}>
        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/')}
            variant="outlined"
          >
            Back to Home
          </Button>
          <Button
            startIcon={<Share />}
            onClick={openShareDialog}
            variant="outlined"
            color="primary"
          >
            Share Certificate
          </Button>
          <Button
            startIcon={downloading ? <CircularProgress size={20} color="inherit" /> : <Download />}
            onClick={handleDownload}
            variant="contained"
            color="primary"
            disabled={downloading}
          >
            {downloading ? 'Generating...' : 'Download PDF'}
          </Button>
        </Box>

        {/* Public Certificate Display */}
        <Paper
          elevation={8}
          sx={{
            p: { xs: 3, md: 6 },
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: -50,
              right: -50,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: -30,
              left: -30,
              width: 150,
              height: 150,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
            }
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Verified sx={{ fontSize: 60, mb: 2, opacity: 0.9 }} />
              <Typography variant="h3" fontWeight="bold" gutterBottom>
                Certificate of Completion
              </Typography>
              <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.3)' }} />
            </Box>

            {/* Certificate Content */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, opacity: 0.9 }}>
                This certifies that
              </Typography>
              <Typography variant="h3" fontWeight="bold" sx={{ mb: 3 }}>
                {certificate.StudentName}
              </Typography>
              
              <Typography variant="h6" sx={{ mb: 2, opacity: 0.9 }}>
                has successfully completed
              </Typography>
              <Typography variant="h4" fontWeight="bold" sx={{ mb: 4 }}>
                {certificate.CourseTitle}
              </Typography>

              <Typography variant="body1" sx={{ mb: 1 }}>
                Instructor: <strong>{certificate.InstructorName}</strong>
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                Completion Date: <strong>{format(new Date(certificate.CompletionDate), 'MMMM dd, yyyy')}</strong>
              </Typography>
              {certificate.FinalScore !== null && (
                <Typography variant="body1" sx={{ mb: 1 }}>
                  Final Score: <strong>{certificate.FinalScore.toFixed(1)}%</strong>
                </Typography>
              )}
              <Typography variant="body1">
                Time Invested: {formatHours(certificate.TotalHoursSpent)}
              </Typography>
            </Box>

            {/* Certificate Number and Verification */}
            <Divider sx={{ my: 3, bgcolor: 'rgba(255,255,255,0.3)' }} />
            <Box sx={{ textAlign: 'center' }}>
              <Chip
                label={`Certificate #${certificate.CertificateNumber}`}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  border: '1px solid rgba(255,255,255,0.3)',
                  py: 2.5
                }}
              />
              <Typography variant="caption" display="block" sx={{ mt: 2, opacity: 0.8 }}>
                Issued: {format(new Date(certificate.IssuedAt), 'MMMM dd, yyyy')}
              </Typography>
              <Typography variant="caption" display="block" sx={{ opacity: 0.7, mt: 1 }}>
                Verify authenticity at: {window.location.origin}/verify-certificate
              </Typography>
              <Typography variant="caption" display="block" sx={{ opacity: 0.6, mt: 1, fontStyle: 'italic' }}>
                🔗 This is a publicly shareable certificate
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            🎓 Congratulations on this achievement! This certificate is publicly shareable.
          </Typography>
        </Box>
      </Container>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      {/* Share Dialog */}
      <ShareDialogComponent />
    </Box>
  );
}
