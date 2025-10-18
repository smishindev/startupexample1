import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Container, Button, Alert } from '@mui/material';
import { Header } from '../../components/Navigation/Header';
import QuizTaker from '../../components/Assessment/QuizTaker';
import { assessmentApi, AssessmentSubmission } from '../../services/assessmentApi';

export const AssessmentTakingPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [assessment, setAssessment] = useState<any>(null);
  
  // Get return URL from query params (e.g., from lesson page)
  const returnUrl = searchParams.get('returnUrl');
  const courseId = searchParams.get('courseId');
  const lessonId = searchParams.get('lessonId');

  useEffect(() => {
    const fetchAssessment = async () => {
      if (assessmentId) {
        try {
          const assessmentData = await assessmentApi.getAssessmentWithProgress(assessmentId);
          setAssessment(assessmentData);
        } catch (error) {
          console.error('Failed to fetch assessment:', error);
        }
      }
    };

    fetchAssessment();
  }, [assessmentId]);

  const handleAssessmentComplete = (submission: AssessmentSubmission) => {
    // Show completion message and navigation options
    // Handle both capitalized (from database) and lowercase (from interface) property names
    const score = (submission as any).Score || submission.score || 0;
    const passed = score >= (assessment?.passingScore || 70);
    
    const message = passed 
      ? `Congratulations! You passed with ${score}%! ${returnUrl ? 'Would you like to return to the lesson?' : ''}`
      : `You scored ${score}%. ${returnUrl ? 'Would you like to return to the lesson to review the material?' : ''}`;
    
    if (returnUrl && window.confirm(message)) {
      navigate(returnUrl);
    } else if (lessonId && courseId) {
      // Fallback navigation to lesson
      navigate(`/courses/${courseId}/lessons/${lessonId}`);
    } else {
      // Navigate to courses page
      navigate('/courses');
    }
  };

  if (!assessmentId) {
    return (
      <Box>
        <Header />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h5" color="error">
                Assessment ID not found
              </Typography>
              <Typography variant="body1">
                Please navigate to a valid assessment to begin.
              </Typography>
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

  return (
    <Box>
      <Header />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Back to lesson link if available */}
        {returnUrl && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2">
                You came from a lesson. Complete this assessment to test your understanding.
              </Typography>
              <Button 
                size="small" 
                onClick={() => navigate(returnUrl)}
                sx={{ ml: 2 }}
              >
                Back to Lesson
              </Button>
            </Box>
          </Alert>
        )}
        
        <QuizTaker 
          assessmentId={assessmentId} 
          onComplete={handleAssessmentComplete}
        />
      </Container>
    </Box>
  );
};