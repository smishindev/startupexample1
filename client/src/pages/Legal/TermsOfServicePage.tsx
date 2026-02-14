import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Button,
  Breadcrumbs,
} from '@mui/material';
import {
  Gavel as GavelIcon,
  ArrowBack as ArrowBackIcon,
  CalendarToday as CalendarIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { getCurrentTerms, TermsVersion } from '../../services/termsApi';
import { format } from 'date-fns';

const TermsOfServicePage: React.FC = () => {
  const navigate = useNavigate();
  const [terms, setTerms] = useState<TermsVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        setLoading(true);
        const data = await getCurrentTerms();
        setTerms(data.termsOfService);
      } catch (err: any) {
        console.error('Failed to fetch terms of service:', err);
        setError('Failed to load Terms of Service. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchTerms();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!terms) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="info">No Terms of Service available at this time.</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="md">
        {/* Navigation */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Breadcrumbs>
            <Typography
              component={RouterLink}
              to="/"
              color="text.secondary"
              sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              Home
            </Typography>
            <Typography color="text.primary">Terms of Service</Typography>
          </Breadcrumbs>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              startIcon={<PrintIcon />}
              onClick={handlePrint}
              sx={{ display: { xs: 'none', sm: 'flex' } }}
            >
              Print
            </Button>
            <Button
              size="small"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(-1)}
            >
              Back
            </Button>
          </Box>
        </Box>

        <Paper sx={{ p: { xs: 3, md: 5 }, borderRadius: 2 }}>
          {/* Header */}
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <GavelIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h3" component="h1" fontWeight="bold" gutterBottom>
              {terms.Title}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                icon={<CalendarIcon />}
                label={`Effective: ${format(new Date(terms.EffectiveDate), 'MMMM d, yyyy')}`}
                variant="outlined"
                size="small"
              />
              <Chip
                label={`Version ${terms.Version}`}
                color="primary"
                variant="outlined"
                size="small"
              />
            </Box>
          </Box>

          <Divider sx={{ mb: 4 }} />

          {/* Content */}
          <Box
            sx={{
              '& h2': { mt: 4, mb: 2, fontSize: '1.75rem', fontWeight: 600 },
              '& h3': { mt: 3, mb: 1.5, fontSize: '1.3rem', fontWeight: 600 },
              '& h4': { mt: 2, mb: 1, fontSize: '1.1rem', fontWeight: 600 },
              '& p': { mb: 2, lineHeight: 1.7, color: 'text.secondary' },
              '& ul': { mb: 2, pl: 3 },
              '& li': { mb: 0.5, lineHeight: 1.6, color: 'text.secondary' },
              '& a': { color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } },
            }}
            dangerouslySetInnerHTML={{ __html: terms.Content }}
          />

          <Divider sx={{ my: 4 }} />

          {/* Footer links */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              See also:{' '}
              <Typography
                component={RouterLink}
                to="/privacy"
                variant="body2"
                color="primary"
                sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                Privacy Policy
              </Typography>
              {' · '}
              <Typography
                component={RouterLink}
                to="/refund-policy"
                variant="body2"
                color="primary"
                sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                Refund Policy
              </Typography>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Last updated: {format(new Date(terms.CreatedAt), 'MMMM d, yyyy')}
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default TermsOfServicePage;
