import React from 'react'
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Stack,
} from '@mui/material'
import {
  School as SchoolIcon,
  Psychology as PsychologyIcon,
  Analytics as AnalyticsIcon,
  Chat as ChatIcon,
  TrendingUp as TrendingUpIcon,
  EmojiObjects as EmojiObjectsIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'

const LandingPage: React.FC = () => {
  const navigate = useNavigate()

  const features = [
    {
      icon: <PsychologyIcon sx={{ fontSize: 40 }} />,
      title: 'AI-Powered Tutoring',
      description: 'Get personalized help from our intelligent AI tutor that adapts to your learning style.',
    },
    {
      icon: <SchoolIcon sx={{ fontSize: 40 }} />,
      title: 'Adaptive Learning',
      description: 'Courses that evolve based on your progress and understanding level.',
    },
    {
      icon: <AnalyticsIcon sx={{ fontSize: 40 }} />,
      title: 'Progress Analytics',
      description: 'Detailed insights into your learning journey with comprehensive analytics.',
    },
    {
      icon: <ChatIcon sx={{ fontSize: 40 }} />,
      title: 'Real-time Collaboration',
      description: 'Connect with peers and instructors through live chat and study groups.',
    },
    {
      icon: <TrendingUpIcon sx={{ fontSize: 40 }} />,
      title: 'Skill Tracking',
      description: 'Monitor your skill development with precise tracking and recommendations.',
    },
    {
      icon: <EmojiObjectsIcon sx={{ fontSize: 40 }} />,
      title: 'Smart Recommendations',
      description: 'Discover new courses and topics tailored to your interests and goals.',
    },
  ]

  return (
    <Box>
      {/* Header */}
      <Box
        component="header"
        sx={{
          position: 'sticky',
          top: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          zIndex: 1000,
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 2,
            }}
          >
            <Typography
              variant="h5"
              fontWeight="bold"
              sx={{
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Mishin Learn
            </Typography>
            
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                onClick={() => navigate('/login')}
                sx={{ borderRadius: 3 }}
                data-testid="landing-signin-button"
              >
                Sign In
              </Button>
              <Button
                variant="contained"
                onClick={() => navigate('/register')}
                sx={{ borderRadius: 3 }}
                data-testid="landing-getstarted-button"
              >
                Get Started
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          py: { xs: 8, md: 12 },
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '2.5rem', md: '4rem' },
              fontWeight: 800,
              mb: 3,
              lineHeight: 1.2,
            }}
          >
            Smart Learning
            <br />
            <Box component="span" sx={{ color: '#FFD700' }}>
              Powered by AI
            </Box>
          </Typography>
          
          <Typography
            variant="h5"
            sx={{
              mb: 4,
              opacity: 0.9,
              fontWeight: 300,
              lineHeight: 1.6,
            }}
          >
            Experience personalized education with adaptive AI tutoring,
            real-time progress tracking, and intelligent course recommendations.
          </Typography>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            justifyContent="center"
            sx={{ mb: 6 }}
          >
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/register')}
              data-testid="landing-start-learning-button"
              sx={{
                bgcolor: 'white',
                color: 'primary.main',
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
                borderRadius: 3,
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                },
              }}
            >
              Start Learning Free
            </Button>
            <Button
              variant="outlined"
              size="large"
              sx={{
                borderColor: 'white',
                color: 'white',
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
                borderRadius: 3,
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
              data-testid="landing-watch-demo-button"
            >
              Watch Demo
            </Button>
          </Stack>

          <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
            <Chip label="AI Tutoring" sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', color: 'white' }} />
            <Chip label="Progress Analytics" sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', color: 'white' }} />
            <Chip label="Live Collaboration" sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', color: 'white' }} />
          </Stack>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: '2rem', md: '3rem' },
              fontWeight: 700,
              mb: 3,
              color: 'text.primary',
            }}
          >
            Why Choose Mishin Learn?
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ maxWidth: 600, mx: 'auto', lineHeight: 1.7 }}
          >
            Our platform combines cutting-edge AI technology with proven educational
            methodologies to create the most effective learning experience.
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <Card
                sx={{
                  height: '100%',
                  p: 3,
                  textAlign: 'center',
                  borderRadius: 4,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 12px 24px rgba(99, 102, 241, 0.15)',
                  },
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: 'primary.main',
                    width: 80,
                    height: 80,
                    mx: 'auto',
                    mb: 3,
                  }}
                >
                  {feature.icon}
                </Avatar>
                <CardContent sx={{ p: 0 }}>
                  <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
                    {feature.title}
                  </Typography>
                  <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          color: 'white',
          py: { xs: 8, md: 12 },
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Typography
            variant="h3"
            sx={{
              fontSize: { xs: '2rem', md: '2.5rem' },
              fontWeight: 700,
              mb: 3,
            }}
          >
            Ready to Transform Your Learning?
          </Typography>
          <Typography
            variant="h6"
            sx={{
              mb: 4,
              opacity: 0.9,
              lineHeight: 1.6,
            }}
          >
            Join thousands of learners already using AI-powered education
            to achieve their goals faster and more effectively.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/register')}
            sx={{
              bgcolor: 'primary.main',
              px: 6,
              py: 2,
              fontSize: '1.2rem',
              fontWeight: 600,
              borderRadius: 3,
            }}
            data-testid="landing-cta-button"
          >
            Start Your Journey Today
          </Button>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          py: 4,
          textAlign: 'center',
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="h6"
            fontWeight="bold"
            sx={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2,
            }}
          >
            Mishin Learn
          </Typography>
          <Typography variant="body2" color="text.secondary">
            © 2024 Mishin Learn. All rights reserved. Built with ❤️ for learners everywhere.
          </Typography>
        </Container>
      </Box>
    </Box>
  )
}

export default LandingPage