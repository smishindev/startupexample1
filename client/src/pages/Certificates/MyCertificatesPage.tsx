import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Snackbar
} from '@mui/material';
import {
  Verified,
  Download,
  Visibility,
  EmojiEvents,
  School,
  Share
} from '@mui/icons-material';
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
  CourseId: string;
  VerificationCode: string;
}

export default function MyCertificatesPage() {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);

  const { openShareDialog, ShareDialogComponent } = useShare({
    contentType: 'certificate',
    contentId: selectedCertificate?.Id || '',
    generateShareData: () => selectedCertificate ? ShareService.generateCertificateShareData({
      StudentName: selectedCertificate.StudentName,
      CourseTitle: selectedCertificate.CourseTitle,
      CompletionDate: selectedCertificate.CompletionDate,
      VerificationCode: selectedCertificate.VerificationCode,
    }) : { url: '', title: '', text: '' },
    preview: selectedCertificate ? (
      <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
          {selectedCertificate.CourseTitle}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          Awarded to: {selectedCertificate.StudentName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Completed: {format(new Date(selectedCertificate.CompletionDate), 'MMMM dd, yyyy')}
        </Typography>
      </Box>
    ) : undefined,
    metadata: selectedCertificate ? {
      title: selectedCertificate.CourseTitle,
      studentName: selectedCertificate.StudentName,
      completionDate: selectedCertificate.CompletionDate,
      verificationCode: selectedCertificate.VerificationCode,
    } : undefined,
  });

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await certificatesApi.getMyCertificates();
      setCertificates(data.certificates as Certificate[]);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load certificates');
      console.error('Certificate fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} minutes`;
    if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${hours}h ${mins}m`;
  };

  const handleViewCertificate = (verificationCode: string) => {
    navigate(`/certificate/${verificationCode}`);
  };

  const handleShare = (certificate: Certificate) => {
    setSelectedCertificate(certificate);
    // State will be updated before dialog reads it due to React batching
    openShareDialog();
  };

  const handleDownloadPdf = async (verificationCode: string) => {
    if (downloadingId) return;
    
    setDownloadingId(verificationCode);
    const maxRetries = 10;
    let attempts = 0;
    
    const tryDownload = async (): Promise<boolean> => {
      try {
        await certificatesApi.downloadCertificatePdf(verificationCode);
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
        setDownloadingId(null);
        return;
      }
      
      setSnackbar({ open: true, message: 'Generating your PDF certificate... Please wait' });
      
      while (attempts < maxRetries) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const success = await tryDownload();
        if (success) {
          setDownloadingId(null);
          setSnackbar({ open: true, message: 'Certificate downloaded successfully!' });
          return;
        }
      }
      
      setDownloadingId(null);
      setSnackbar({ open: true, message: 'PDF generation is taking longer than expected. Please try again.' });
    } catch (error: any) {
      setDownloadingId(null);
      const errorMsg = error.message || error.response?.data?.message || error.response?.data?.error || 'Failed to download PDF';
      setSnackbar({ open: true, message: errorMsg });
    }
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={60} />
      </Container>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      
      <Container maxWidth="lg" sx={{ py: 4, flex: 1 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <EmojiEvents sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h4" fontWeight="bold">
            My Certificates
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          View and download all your earned course completion certificates
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Statistics */}
      {certificates.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <School color="primary" />
                    <Typography variant="h4" fontWeight="bold">
                      {certificates.length}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Certificates Earned
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Verified color="success" />
                    <Typography variant="h4" fontWeight="bold">
                      {certificates.filter(c => c.FinalScore && c.FinalScore >= 90).length}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    With 90%+ Score
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EmojiEvents sx={{ color: 'warning.main' }} />
                    <Typography variant="h4" fontWeight="bold">
                      {Math.round(certificates.reduce((sum, c) => sum + c.TotalHoursSpent, 0) / 60)}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Hours Learned
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Certificates List */}
      {certificates.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <School sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Certificates Yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Complete courses to earn certificates and showcase your achievements
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/courses')}
            >
              Browse Courses
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {certificates.map((cert) => (
            <Grid item xs={12} md={6} key={cert.Id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  {/* Certificate Icon and Number */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Verified sx={{ fontSize: 32, color: 'white' }} />
                    </Box>
                    <Chip
                      label={cert.CertificateNumber}
                      size="small"
                      sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}
                    />
                  </Box>

                  {/* Course Title */}
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    {cert.CourseTitle}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  {/* Details */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Instructor:
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {cert.InstructorName}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Completed:
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {format(new Date(cert.CompletionDate), 'MMM dd, yyyy')}
                      </Typography>
                    </Box>

                    {cert.FinalScore !== null && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                          Final Score:
                        </Typography>
                        <Chip
                          label={`${cert.FinalScore.toFixed(1)}%`}
                          size="small"
                          color={cert.FinalScore >= 90 ? 'success' : cert.FinalScore >= 70 ? 'primary' : 'default'}
                        />
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Time Invested:
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {formatHours(cert.TotalHoursSpent)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<Visibility />}
                    onClick={() => handleViewCertificate(cert.VerificationCode)}
                  >
                    View Certificate
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Share />}
                    onClick={() => handleShare(cert)}
                  >
                    Share
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={downloadingId === cert.VerificationCode ? <CircularProgress size={16} /> : <Download />}
                    onClick={() => handleDownloadPdf(cert.VerificationCode)}
                    disabled={downloadingId === cert.VerificationCode}
                  >
                    {downloadingId === cert.VerificationCode ? 'Generating...' : 'PDF'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

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
    </Container>
    </Box>
  );
}
