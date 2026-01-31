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

export default function CertificatePage() {
  const { courseId } = useParams<{ courseId: string }>();
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
    if (courseId) {
      loadCertificate();
    }
  }, [courseId]);

  const loadCertificate = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await certificatesApi.getCertificateByCourse(courseId!);
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
    const maxRetries = 10;
    let attempts = 0;
    
    const tryDownload = async (): Promise<boolean> => {
      try {
        await certificatesApi.downloadCertificatePdf(certificate.VerificationCode);
        return true;
      } catch (error: any) {
        if (error.message?.includes('being generated') || error.message?.includes('wait')) {
          return false;
        }
        throw error;
      }
    };
    
    try {
      const success = await tryDownload();
      if (success) {
        setDownloading(false);
        return;
      }
      
      setSnackbar({ open: true, message: 'Generating your PDF certificate... Please wait' });
      
      while (attempts < maxRetries) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const success = await tryDownload();
        if (success) {
          setDownloading(false);
          setSnackbar({ open: true, message: 'Certificate downloaded successfully!' });
          return;
        }
      }
      
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
            severity="info" 
            action={
              <Button color="inherit" size="small" onClick={() => navigate(-1)}>
                Go Back
              </Button>
            }
          >
            {error === 'Certificate not found' 
              ? 'Complete the course with a passing grade to earn your certificate!'
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
            Complete the course to earn your certificate!
          </Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      
      <Container maxWidth="lg" sx={{ py: 4, flex: 1 }}>
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          variant="outlined"
        >
          Back
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
        <Button
          startIcon={<Share />}
          onClick={openShareDialog}
          variant="outlined"
        >
          Share
        </Button>
      </Box>

      <Paper
        elevation={8}
        sx={{
          p: { xs: 4, md: 8 },
          textAlign: 'center',
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
            background: 'rgba(255, 255, 255, 0.1)',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: -50,
            left: -50,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
          }
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Verified sx={{ fontSize: 100, mb: 2, opacity: 0.9 }} />
          
          <Typography 
            variant="h3" 
            gutterBottom 
            fontWeight="bold"
            sx={{ 
              fontFamily: 'Georgia, serif',
              textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            Certificate of Completion
          </Typography>
          
          <Divider sx={{ my: 3, bgcolor: 'rgba(255,255,255,0.3)', mx: 'auto', maxWidth: 400 }} />
          
          <Box sx={{ my: 5 }}>
            <Typography variant="h6" gutterBottom sx={{ fontStyle: 'italic', opacity: 0.9 }}>
              This certifies that
            </Typography>
            <Typography 
              variant="h3" 
              fontWeight="bold" 
              gutterBottom 
              sx={{ 
                my: 2,
                fontFamily: 'Georgia, serif',
                textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
              }}
            >
              {certificate.StudentName}
            </Typography>
            <Typography variant="h6" gutterBottom sx={{ fontStyle: 'italic', opacity: 0.9 }}>
              has successfully completed
            </Typography>
            <Typography 
              variant="h3" 
              fontWeight="bold" 
              gutterBottom 
              sx={{ 
                my: 2,
                fontFamily: 'Georgia, serif',
                textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
              }}
            >
              {certificate.CourseTitle}
            </Typography>
          </Box>

          <Divider sx={{ my: 3, bgcolor: 'rgba(255,255,255,0.3)', mx: 'auto', maxWidth: 400 }} />

          <Box sx={{ my: 4, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h6">
              Instructor: <strong>{certificate.InstructorName}</strong>
            </Typography>
            <Typography variant="h6">
              Completion Date: <strong>{format(new Date(certificate.CompletionDate), 'MMMM dd, yyyy')}</strong>
            </Typography>
            {certificate.FinalScore !== null && (
              <Typography variant="h6">
                Final Score: <strong>{certificate.FinalScore.toFixed(1)}%</strong>
              </Typography>
            )}
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Time Invested: {formatHours(certificate.TotalHoursSpent)}
            </Typography>
          </Box>

          <Divider sx={{ my: 3, bgcolor: 'rgba(255,255,255,0.3)', mx: 'auto', maxWidth: 400 }} />

          <Box sx={{ mt: 4 }}>
            <Chip
              label={`Certificate #${certificate.CertificateNumber}`}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '0.9rem',
                px: 2,
                py: 2.5
              }}
            />
            <Typography variant="caption" display="block" sx={{ mt: 2, opacity: 0.8 }}>
              Issued: {format(new Date(certificate.IssuedAt), 'MMMM dd, yyyy')}
            </Typography>
            <Typography variant="caption" display="block" sx={{ opacity: 0.7, mt: 1 }}>
              Verify authenticity at: {window.location.origin}/verify-certificate
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          🎓 Congratulations on your achievement! Share your certificate with potential employers.
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
