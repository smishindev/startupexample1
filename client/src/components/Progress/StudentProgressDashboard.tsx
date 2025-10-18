import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  LinearProgress,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  IconButton,
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  PlayArrow as PlayArrowIcon,
  Refresh as RefreshIcon,
  Psychology as PsychologyIcon,
  Timeline as TimelineIcon,
  EmojiEvents as AchievementIcon,
  School as SkillIcon,
  Lightbulb as RecommendationIcon,
  Star as StarIcon
} from '@mui/icons-material';

import { studentProgressApi, type StudentProgressAnalytics, type LearningRecommendation } from '../../services/studentProgressApi';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`progress-tabpanel-${index}`}
      aria-labelledby={`progress-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export const StudentProgressDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<StudentProgressAnalytics | null>(null);
  const [recommendations, setRecommendations] = useState<LearningRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [analyticsData, recommendationsData] = await Promise.all([
        studentProgressApi.getStudentProgressAnalytics(),
        studentProgressApi.getPersonalizedRecommendations()
      ]);
      
      setAnalytics(analyticsData);
      setRecommendations(recommendationsData);
    } catch (err) {
      console.error('Error loading progress data:', err);
      setError('Failed to load progress data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRecommendation = async (recommendationId: string) => {
    try {
      await studentProgressApi.completeRecommendation(recommendationId);
      // Remove completed recommendation from list
      setRecommendations(prev => prev.filter(r => r.id !== recommendationId));
    } catch (err) {
      console.error('Error completing recommendation:', err);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUpIcon color="success" />;
      case 'declining': return <TrendingDownIcon color="error" />;
      default: return <TrendingFlatIcon color="primary" />;
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      default: return 'success';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      default: return 'info';
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading your progress analytics...</Typography>
        <LinearProgress sx={{ mt: 2 }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={loadProgressData}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!analytics) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">No progress data available yet. Start taking some courses!</Alert>
      </Box>
    );
  }

  const { basicProgress, performanceInsights, achievementMilestones } = analytics;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
            Your Learning Journey
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Personalized insights and intelligent recommendations
          </Typography>
        </Box>
        <IconButton onClick={loadProgressData} color="primary" size="large">
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Progress Overview */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <TimelineIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" component="h2">
                    Course Progress
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {basicProgress.averageCompletion}% average completion
                  </Typography>
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                {basicProgress.completedCourses}/{basicProgress.totalCourses}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Courses completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Insights */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: getRiskColor(performanceInsights.riskLevel) + '.main', mr: 2 }}>
                  {getTrendIcon(performanceInsights.overallTrend)}
                </Avatar>
                <Box>
                  <Typography variant="h6" component="h2">
                    Performance
                  </Typography>
                  <Chip 
                    label={performanceInsights.overallTrend} 
                    size="small"
                    color={performanceInsights.overallTrend === 'improving' ? 'success' : 
                           performanceInsights.overallTrend === 'declining' ? 'error' : 'default'}
                  />
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                {Math.round(performanceInsights.engagementScore)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Engagement Score
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Learning Velocity */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <PsychologyIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" component="h2">
                    Learning Pace
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Weekly activity
                  </Typography>
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                {performanceInsights.learningVelocity}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Assessments per week
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Risk Assessment */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: getRiskColor(performanceInsights.riskLevel) + '.main', mr: 2 }}>
                  {performanceInsights.riskLevel === 'high' ? <WarningIcon /> : <CheckCircleIcon />}
                </Avatar>
                <Box>
                  <Typography variant="h6" component="h2">
                    Risk Level
                  </Typography>
                  <Chip 
                    label={performanceInsights.riskLevel} 
                    size="small"
                    color={getRiskColor(performanceInsights.riskLevel) as any}
                  />
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                {Math.round(performanceInsights.consistencyScore)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Consistency Score
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alert for High Risk */}
      {performanceInsights.riskLevel === 'high' && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={() => setTabValue(1)}>
              View Recommendations
            </Button>
          }
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            Attention Needed
          </Typography>
          Your learning progress indicates some challenges. Check out our personalized recommendations to get back on track.
        </Alert>
      )}

      {/* Tabbed Content */}
      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimelineIcon />
                Progress Details
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Badge badgeContent={recommendations.length} color="error">
                  <RecommendationIcon />
                </Badge>
                Smart Recommendations
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SkillIcon />
                Skills & Strengths
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AchievementIcon />
                Achievements
              </Box>
            } 
          />
        </Tabs>

        {/* Progress Details Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            {/* Time Spent */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Learning Statistics
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Total Time Invested
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      {Math.round(basicProgress.totalTimeSpent)} hours
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Active Courses
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      {basicProgress.inProgressCourses}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Performance Breakdown */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Performance Insights
                  </Typography>
                  
                  {/* Strengths */}
                  {performanceInsights.strengthAreas.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="success.main" sx={{ mb: 1 }}>
                        ✅ Your Strengths
                      </Typography>
                      {performanceInsights.strengthAreas.map((strength, index) => (
                        <Chip
                          key={index}
                          label={strength}
                          size="small"
                          color="success"
                          sx={{ mr: 1, mb: 1 }}
                        />
                      ))}
                    </Box>
                  )}

                  {/* Areas for Improvement */}
                  {performanceInsights.strugglingAreas.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" color="warning.main" sx={{ mb: 1 }}>
                        📈 Focus Areas
                      </Typography>
                      {performanceInsights.strugglingAreas.map((area, index) => (
                        <Chip
                          key={index}
                          label={area}
                          size="small"
                          color="warning"
                          sx={{ mr: 1, mb: 1 }}
                        />
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Recommendations Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Personalized Learning Recommendations
            </Typography>
            <Typography variant="body2" color="text.secondary">
              AI-powered suggestions based on your learning patterns and performance
            </Typography>
          </Box>

          {recommendations.length === 0 ? (
            <Alert severity="info">
              Great job! You're on track. Keep up the excellent work!
            </Alert>
          ) : (
            <List>
              {recommendations.map((recommendation, index) => (
                <React.Fragment key={recommendation.id}>
                  <ListItem
                    sx={{
                      bgcolor: 'background.paper',
                      borderRadius: 1,
                      mb: 1,
                      border: 1,
                      borderColor: 'divider'
                    }}
                  >
                    <ListItemIcon>
                      <Avatar sx={{ 
                        bgcolor: getPriorityColor(recommendation.priority) + '.main',
                        width: 40,
                        height: 40 
                      }}>
                        <RecommendationIcon />
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {recommendation.title}
                          </Typography>
                          <Chip 
                            label={recommendation.priority} 
                            size="small" 
                            color={getPriorityColor(recommendation.priority) as any}
                          />
                          <Chip 
                            label={recommendation.type} 
                            size="small" 
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            {recommendation.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            💡 {recommendation.reason}
                          </Typography>
                          {recommendation.estimatedTime && (
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                              ⏱️ ~{recommendation.estimatedTime} minutes
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <Box>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<PlayArrowIcon />}
                        onClick={() => handleCompleteRecommendation(recommendation.id)}
                        sx={{ mb: 1 }}
                      >
                        {recommendation.actionText}
                      </Button>
                    </Box>
                  </ListItem>
                  {index < recommendations.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </TabPanel>

        {/* Skills Tab */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Skills Development
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Track your skill progression across different areas
          </Typography>

          <Alert severity="info">
            Skill tracking feature coming soon! This will show your progress in different subject areas and recommend skill-building exercises.
          </Alert>
        </TabPanel>

        {/* Achievements Tab */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <AchievementIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                  <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                    {achievementMilestones.completed}
                  </Typography>
                  <Typography variant="body1">
                    Courses Completed
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <StarIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {achievementMilestones.inProgress}
                  </Typography>
                  <Typography variant="body1">
                    In Progress
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <TimelineIcon sx={{ fontSize: 48, color: 'info.main', mb: 2 }} />
                  <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                    {achievementMilestones.upcoming}
                  </Typography>
                  <Typography variant="body1">
                    Upcoming Goals
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>
    </Box>
  );
};