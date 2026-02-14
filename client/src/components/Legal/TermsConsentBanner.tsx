import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  Alert,
  CircularProgress,
  Divider,
  Link,
} from '@mui/material';
import {
  Gavel as GavelIcon,
  Security as SecurityIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { getTermsAcceptanceStatus, acceptTerms, TermsStatus } from '../../services/termsApi';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';

interface TermsConsentBannerProps {
  onAccepted?: () => void;
}

const TermsConsentBanner: React.FC<TermsConsentBannerProps> = ({ onAccepted }) => {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  const [status, setStatus] = useState<TermsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [needsAcceptance, setNeedsAcceptance] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      setNeedsAcceptance(false);
      return;
    }

    const checkStatus = async () => {
      try {
        const data = await getTermsAcceptanceStatus();
        setStatus(data);
        const needs = !data.termsAccepted || !data.privacyAccepted;
        setNeedsAcceptance(needs);
        if (needs) {
          setShowDialog(true);
        }
      } catch (err) {
        console.error('Failed to check terms acceptance status:', err);
        // Don't block user if check fails
        setNeedsAcceptance(false);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, [isAuthenticated]);

  const handleAccept = async () => {
    if (!status) return;

    const versionIds: string[] = [];
    if (!status.termsAccepted && status.termsVersionId) {
      versionIds.push(status.termsVersionId);
    }
    if (!status.privacyAccepted && status.privacyVersionId) {
      versionIds.push(status.privacyVersionId);
    }

    if (versionIds.length === 0) return;

    setAccepting(true);
    try {
      await acceptTerms(versionIds);
      setNeedsAcceptance(false);
      setShowDialog(false);
      toast.success('Terms accepted successfully');
      onAccepted?.();
    } catch (err) {
      console.error('Failed to accept terms:', err);
      toast.error('Failed to accept terms. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  // Don't render anything if loading, not authenticated, terms are accepted,
  // or user is on legal pages (so they can read the documents the dialog links to)
  const isOnLegalPage = location.pathname === '/terms' || location.pathname === '/privacy' || location.pathname === '/refund-policy';
  if (loading || !isAuthenticated || !needsAcceptance || isOnLegalPage) {
    return null;
  }

  const needsTos = status && !status.termsAccepted;
  const needsPrivacy = status && !status.privacyAccepted;
  const canAccept = (!needsTos || termsChecked) && (!needsPrivacy || privacyChecked);

  return (
    <>
      {/* Persistent banner at top of page */}
      <Alert
        severity="warning"
        sx={{
          borderRadius: 0,
          '& .MuiAlert-message': { width: '100%' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="body2">
            Our terms have been updated. Please review and accept to continue using the platform.
          </Typography>
          <Button
            variant="contained"
            size="small"
            onClick={() => setShowDialog(true)}
          >
            Review & Accept
          </Button>
        </Box>
      </Alert>

      {/* Acceptance Dialog */}
      <Dialog
        open={showDialog}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown
        onClose={(_, reason) => {
          // Only close via accept button, not backdrop click
          if (reason === 'backdropClick') return;
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GavelIcon color="primary" />
          Updated Terms & Conditions
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            We have updated our legal agreements. Please review and accept to continue.
          </Typography>

          {needsTos && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <GavelIcon fontSize="small" color="action" />
                <Typography variant="subtitle2">
                  Terms of Service {status?.currentTermsVersion ? `(v${status.currentTermsVersion})` : ''}
                </Typography>
                <Link
                  component={RouterLink}
                  to="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}
                >
                  <Typography variant="body2" sx={{ mr: 0.5 }}>Read</Typography>
                  <OpenInNewIcon fontSize="small" />
                </Link>
              </Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={termsChecked}
                    onChange={(e) => setTermsChecked(e.target.checked)}
                    disabled={accepting}
                    data-testid="terms-consent-tos-checkbox"
                  />
                }
                label={
                  <Typography variant="body2" color="text.secondary">
                    I have read and agree to the Terms of Service
                  </Typography>
                }
              />
            </Box>
          )}

          {needsTos && needsPrivacy && <Divider sx={{ my: 1 }} />}

          {needsPrivacy && (
            <Box sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <SecurityIcon fontSize="small" color="action" />
                <Typography variant="subtitle2">
                  Privacy Policy {status?.currentPrivacyVersion ? `(v${status.currentPrivacyVersion})` : ''}
                </Typography>
                <Link
                  component={RouterLink}
                  to="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}
                >
                  <Typography variant="body2" sx={{ mr: 0.5 }}>Read</Typography>
                  <OpenInNewIcon fontSize="small" />
                </Link>
              </Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={privacyChecked}
                    onChange={(e) => setPrivacyChecked(e.target.checked)}
                    disabled={accepting}
                    data-testid="terms-consent-privacy-checkbox"
                  />
                }
                label={
                  <Typography variant="body2" color="text.secondary">
                    I have read and agree to the Privacy Policy
                  </Typography>
                }
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="contained"
            onClick={handleAccept}
            disabled={!canAccept || accepting}
            data-testid="terms-consent-accept-button"
          >
            {accepting ? (
              <>
                <CircularProgress size={18} sx={{ mr: 1 }} />
                Accepting...
              </>
            ) : (
              'Accept & Continue'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TermsConsentBanner;
