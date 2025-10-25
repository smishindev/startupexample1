import { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper, Alert } from '@mui/material';
import { ErrorOutline, Refresh } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class VideoErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Video Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <Paper
          elevation={2}
          sx={{
            p: 4,
            backgroundColor: '#f5f5f5',
            minHeight: 300,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <ErrorOutline sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
          
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
            Video Player Error
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 500 }}>
            We encountered an error while loading the video player. This could be due to a network issue, 
            unsupported video format, or browser compatibility problem.
          </Typography>

          {this.state.error && (
            <Alert severity="error" sx={{ mb: 3, maxWidth: 600, textAlign: 'left' }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-word' }}>
                {this.state.error.message}
              </Typography>
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={this.handleRetry}
              size="large"
            >
              Retry
            </Button>
            
            <Button
              variant="outlined"
              onClick={() => window.location.reload()}
              size="large"
            >
              Reload Page
            </Button>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 3 }}>
            If the problem persists, please contact support or try a different browser.
          </Typography>
        </Paper>
      );
    }

    return this.props.children;
  }
}
