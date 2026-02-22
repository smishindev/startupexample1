import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Button, Alert } from '@mui/material';
import { HeaderV5 as Header } from '../../components/Navigation/HeaderV5';
import { PageContainer } from '../../components/Responsive';
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
    // Don't show immediate navigation dialog - let the results page handle it
    // The AI-enhanced results page will show detailed feedback first
    // Navigation will be handled through the "Back to Course" button on results page
    
    // Store submission data for potential use (though results page handles its own data)
    // Handle both capitalized (from database) and lowercase (from interface) property names
    const score = (submission as any).Score || submission.score || 0;
    const passed = score >= (assessment?.passingScore || 70);
    
    console.log('Assessment completed:', { score, passed, submission });
    
    // Navigation logic is now handled by the AIEnhancedAssessmentResults component
    // through the onBackToCourse callback which will use returnUrl, lessonId, courseId as needed
    if (returnUrl) {
      // Navigate to return URL (lesson page)
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
        <PageContainer maxWidth="xl" sx={{ pt: { xs: 2, md: 4 } }}>
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
        </PageContainer>
      </Box>
    );
  }

  return (
    <Box>
      <Header />
      <PageContainer maxWidth="xl" sx={{ pt: { xs: 2, md: 4 } }}>
        {/* Back to lesson link if available */}
        {returnUrl && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="body2">
                You came from a lesson. Complete this assessment to test your understanding.
              </Typography>
              <Button 
                data-testid="assessment-taking-back-to-lesson-button"
                size="small" 
                onClick={() => navigate(returnUrl)}
                sx={{ ml: { xs: 0, sm: 2 } }}
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
      </PageContainer>
    </Box>
  );
};