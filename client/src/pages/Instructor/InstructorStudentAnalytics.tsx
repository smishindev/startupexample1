import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Psychology as AIIcon,
  TrendingDown as DecliningIcon,
  Warning as RiskIcon,
  CheckCircle as SafeIcon,
  Visibility as ViewIcon,
  Message as InterventionIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { Header } from '../../components/Navigation/Header';
import { instructorApi } from '../../services/instructorApi';

interface StudentRiskData {
  studentId: string;
  studentName: string;
  email: string;
  courseId: string;
  courseName: string;
  riskLevel: 'low' | 'medium' | 'high';
  currentProgress: number;
  lastActivity: string;
  strugglingAreas: string[];
  recommendedActions: string[];
}

export const InstructorStudentAnalytics: React.FC = () => {
  const [students, setStudents] = useState<StudentRiskData[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentRiskData | null>(null);
  const [interventionDialog, setInterventionDialog] = useState(false);
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadStudentData();
  }, []);

  const loadStudentData = async () => {
    try {
      // Get instructor's courses and enrolled students
      await instructorApi.getStats();
      
      // Mock data for demonstration - in real implementation, 
      // this would come from the student progress API
      const mockStudentData: StudentRiskData[] = [
        {
          studentId: '1',
          studentName: 'Alice Johnson',
          email: 'alice@example.com',
          courseId: 'course1',
          courseName: 'Introduction to Programming',
          riskLevel: 'high',
          currentProgress: 35,
          lastActivity: '3 days ago',
          strugglingAreas: ['Loops', 'Functions'],
          recommendedActions: ['Schedule tutoring session', 'Provide additional practice exercises']
        },
        {
          studentId: '2',
          studentName: 'Bob Smith',
          email: 'bob@example.com',
          courseId: 'course1',
          courseName: 'Introduction to Programming',
          riskLevel: 'medium',
          currentProgress: 68,
          lastActivity: '1 day ago',
          strugglingAreas: ['Object-Oriented Programming'],
          recommendedActions: ['Review OOP concepts', 'Complete practice project']
        },
        {
          studentId: '3',
          studentName: 'Carol Davis',
          email: 'carol@example.com',
          courseId: 'course2',
          courseName: 'Advanced Mathematics',
          riskLevel: 'low',
          currentProgress: 89,
          lastActivity: '12 hours ago',
          strugglingAreas: [],
          recommendedActions: ['Consider advanced challenges', 'Peer tutoring opportunities']
        }
      ];

      setStudents(mockStudentData);
    } catch (error) {
      console.error('Error loading student data:', error);
    }
  };

  const handleViewStudentDetails = async (studentId: string) => {
    try {
      // In real implementation, fetch detailed analytics
      const student = students.find(s => s.studentId === studentId);
      if (student) {
        setSelectedStudent(student);
        setInterventionDialog(true);
      }
    } catch (error) {
      console.error('Error loading student details:', error);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      default: return 'success';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return <RiskIcon />;
      case 'medium': return <DecliningIcon />;
      default: return <SafeIcon />;
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesRisk = filterRisk === 'all' || student.riskLevel === filterRisk;
    const matchesSearch = student.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.courseName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRisk && matchesSearch;
  });

  const riskSummary = {
    high: students.filter(s => s.riskLevel === 'high').length,
    medium: students.filter(s => s.riskLevel === 'medium').length,
    low: students.filter(s => s.riskLevel === 'low').length
  };

  return (
    <Box>
      <Header />
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
              Student Analytics & Interventions
            </Typography>
            <Typography variant="h6" color="text.secondary">
              AI-powered insights and intervention recommendations for your students
            </Typography>
          </Box>
          <IconButton onClick={loadStudentData} color="primary" size="large">
            <RefreshIcon />
          </IconButton>
        </Box>

        {/* Risk Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'error.main', mr: 2 }}>
                    <RiskIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">High Risk</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Needs immediate attention
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                  {riskSummary.high}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                    <DecliningIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">Medium Risk</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Monitor closely
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                  {riskSummary.medium}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                    <SafeIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">Low Risk</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Performing well
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                  {riskSummary.low}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                    <AIIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">AI Insights</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active recommendations
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  {students.reduce((sum, s) => sum + s.recommendedActions.length, 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search students or courses"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                variant="outlined"
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Risk Level</InputLabel>
                <Select
                  value={filterRisk}
                  label="Risk Level"
                  onChange={(e) => setFilterRisk(e.target.value)}
                >
                  <MenuItem value="all">All Levels</MenuItem>
                  <MenuItem value="high">High Risk</MenuItem>
                  <MenuItem value="medium">Medium Risk</MenuItem>
                  <MenuItem value="low">Low Risk</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Student Risk Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Student</TableCell>
                <TableCell>Course</TableCell>
                <TableCell>Risk Level</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Last Activity</TableCell>
                <TableCell>Struggling Areas</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.studentId}>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        {student.studentName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {student.email}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {student.courseName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getRiskIcon(student.riskLevel)}
                      label={student.riskLevel.toUpperCase()}
                      color={getRiskColor(student.riskLevel) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">
                        {student.currentProgress}%
                      </Typography>
                      {student.currentProgress < 50 && (
                        <RiskIcon color="error" fontSize="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {student.lastActivity}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {student.strugglingAreas.length > 0 ? (
                      <Box>
                        {student.strugglingAreas.slice(0, 2).map((area, index) => (
                          <Chip
                            key={index}
                            label={area}
                            size="small"
                            color="warning"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                        {student.strugglingAreas.length > 2 && (
                          <Typography variant="caption" color="text.secondary">
                            +{student.strugglingAreas.length - 2} more
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="success.main">
                        No issues detected
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => handleViewStudentDetails(student.studentId)}
                      color="primary"
                      size="small"
                    >
                      <ViewIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Student Details Dialog */}
        <Dialog
          open={interventionDialog}
          onClose={() => setInterventionDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <InterventionIcon />
              Intervention Recommendations - {selectedStudent?.studentName}
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedStudent && (
              <Box>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Current Progress
                    </Typography>
                    <Typography variant="h6">
                      {selectedStudent.currentProgress}%
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Risk Level
                    </Typography>
                    <Chip
                      label={selectedStudent.riskLevel.toUpperCase()}
                      color={getRiskColor(selectedStudent.riskLevel) as any}
                      size="small"
                    />
                  </Grid>
                </Grid>

                <Typography variant="h6" gutterBottom>
                  Recommended Interventions
                </Typography>
                <List>
                  {selectedStudent.recommendedActions.map((action, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <AIIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText primary={action} />
                    </ListItem>
                  ))}
                </List>

                {selectedStudent.strugglingAreas.length > 0 && (
                  <>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                      Struggling Areas
                    </Typography>
                    <Box>
                      {selectedStudent.strugglingAreas.map((area, index) => (
                        <Chip
                          key={index}
                          label={area}
                          color="warning"
                          sx={{ mr: 1, mb: 1 }}
                        />
                      ))}
                    </Box>
                  </>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setInterventionDialog(false)}>
              Close
            </Button>
            <Button variant="contained" color="primary">
              Send Message to Student
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};