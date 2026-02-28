import React from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip
} from '@mui/material';
import {
  SmartToy as AIIcon,
  CheckCircle as CheckIcon,
  AutoAwesome as SparkleIcon,
  Psychology as BrainIcon,
  Speed as FastIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const AITutoringDemo: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <BrainIcon color="primary" />,
      title: 'Context-Aware Learning',
      description: 'AI understands your current course and lesson context for personalized help'
    },
    {
      icon: <FastIcon color="primary" />,
      title: 'Instant Responses',
      description: 'Get immediate answers to your programming questions and coding challenges'
    },
    {
      icon: <SparkleIcon color="primary" />,
      title: 'Smart Suggestions',
      description: 'Receive follow-up questions and learning recommendations tailored to you'
    },
    {
      icon: <SchoolIcon color="primary" />,
      title: 'Adaptive Teaching',
      description: 'Teaching style adapts to your learning pace and preferences'
    }
  ];

  const improvements = [
    'Real OpenAI GPT-4 integration for advanced conversations',
    'Course and lesson context awareness',
    'Personalized learning recommendations',
    'Interactive code explanations with examples',
    'Smart follow-up suggestions for deeper learning',
    'Progress tracking and learning analytics',
    'Support for multiple programming languages',
    'Debugging assistance and code review'
  ];

  const demoQuestions = [
    "Explain React hooks with examples",
    "Help me debug this JavaScript function",
    "What's the difference between let and const?",
    "How do I handle async operations in React?",
    "Best practices for CSS styling"
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <AIIcon sx={{ fontSize: { xs: 48, sm: 64 }, color: 'primary.main', mb: 2 }} />
        <Typography variant="h3" component="h1" gutterBottom color="primary" sx={{ fontSize: { xs: '1.75rem', sm: '3rem' } }}>
          AI Tutoring System
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          Intelligent Learning Assistant Powered by OpenAI
        </Typography>
        
        <Alert severity="success" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
          ✨ <strong>Enhancement Complete!</strong> The AI tutoring system has been upgraded with real OpenAI integration and advanced features.
        </Alert>

        <Button
          variant="contained"
          size="large"
          onClick={() => navigate('/tutoring')}
          sx={{ mr: 2 }}
          data-testid="ai-demo-try-button"
        >
          Try AI Tutoring
        </Button>
        <Button
          variant="outlined"
          size="large"
          onClick={() => navigate('/dashboard')}
          data-testid="ai-demo-back-button"
        >
          Back to Dashboard
        </Button>
      </Box>

      <Grid container spacing={4} sx={{ mb: 6 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckIcon color="success" />
                Key Features
              </Typography>
              <Grid container spacing={2}>
                {features.map((feature, index) => (
                  <Grid item xs={12} key={index}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      {feature.icon}
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {feature.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {feature.description}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SparkleIcon color="primary" />
                Implementation Highlights
              </Typography>
              <List dense>
                {improvements.map((improvement, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <CheckIcon color="success" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={improvement}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Try These Sample Questions
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Click on any question below to copy it and try it in the AI tutoring interface:
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {demoQuestions.map((question, index) => (
            <Chip
              key={index}
              label={question}
              variant="outlined"
              onClick={() => {
                navigator.clipboard.writeText(question);
                // Could add a toast notification here
              }}
              sx={{ cursor: 'pointer', mb: 1 }}
              data-testid={`ai-demo-question-${index}`}
            />
          ))}
        </Box>
      </Paper>

      <Paper sx={{ p: 4, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <Typography variant="h5" gutterBottom>
          Technical Implementation
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          The AI tutoring system has been enhanced with the following technical improvements:
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
              Backend Enhancements:
            </Typography>
            <List dense>
              {[
                'OpenAI GPT-4 API integration',
                'Context-aware prompt engineering',
                'Course and lesson context injection',
                'Conversation memory management',
                'Fallback response system'
              ].map((item, index) => (
                <ListItem key={index} sx={{ py: 0.25 }}>
                  <ListItemText
                    primary={item}
                    primaryTypographyProps={{ variant: 'body2', color: 'inherit' }}
                  />
                </ListItem>
              ))}
            </List>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
              Frontend Enhancements:
            </Typography>
            <List dense>
              {[
                'Interactive suggestion chips',
                'Enhanced message formatting',
                'Real-time typing indicators',
                'Improved conversation UI',
                'Better error handling'
              ].map((item, index) => (
                <ListItem key={index} sx={{ py: 0.25 }}>
                  <ListItemText
                    primary={item}
                    primaryTypographyProps={{ variant: 'body2', color: 'inherit' }}
                  />
                </ListItem>
              ))}
            </List>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default AITutoringDemo;