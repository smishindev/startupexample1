import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Avatar,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  IconButton,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Email as EmailIcon,
  Message as MessageIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { studentsApi, Student, StudentAnalytics, StudentFilters } from '../../services/studentsApi';
import { instructorApi } from '../../services/instructorApi';

const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters and pagination
  const [filters, setFilters] = useState<StudentFilters>({
    sortBy: 'enrolledAt',
    sortOrder: 'desc'
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  
  // UI state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageForm, setMessageForm] = useState({
    subject: '',
    message: '',
    type: 'message' as 'message' | 'announcement'
  });

  // Load data
  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [studentsData, analyticsData, coursesData] = await Promise.all([
        studentsApi.getStudents(filters),
        studentsApi.getAnalytics(filters.courseId),
        instructorApi.getCourses()
      ]);
      
      console.log('[Student Management] Loaded data:', { 
        students: studentsData.length, 
        analytics: analyticsData,
        courses: coursesData.length 
      });
      
      setStudents(studentsData);
      setAnalytics(analyticsData);
      setCourses(coursesData);
    } catch (err: any) {
      console.error('Error loading student data:', err);
      
      // More specific error handling
      if (err?.response?.status === 404) {
        setError('Student management endpoints not found. Please check server configuration.');
      } else if (err?.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else {
        setError(`Failed to load student data: ${err?.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof StudentFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0); // Reset to first page when filtering
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    // Debounce search
    setTimeout(() => {
      handleFilterChange('search', value || undefined);
    }, 500);
  };

  const handleStatusUpdate = async (student: Student, newStatus: string) => {
    try {
      await studentsApi.updateEnrollmentStatus(
        student.id,
        student.enrollment.id,
        newStatus as any
      );
      loadData(); // Refresh data
      setAnchorEl(null);
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update student status');
    }
  };

  const handleSendMessage = async () => {
    try {
      if (!filters.courseId) {
        setError('Please select a course first');
        return;
      }

      await studentsApi.sendMessage({
        courseId: filters.courseId,
        studentIds: selectedStudent ? [selectedStudent.id] : undefined,
        subject: messageForm.subject,
        message: messageForm.message,
        type: messageForm.type
      });

      setMessageDialogOpen(false);
      setMessageForm({ subject: '', message: '', type: 'message' });
      setSelectedStudent(null);
      
      // Show success message (you could use a snackbar here)
      alert('Message sent successfully!');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'completed': return 'primary';
      case 'suspended': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading && students.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Student Management</Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Student Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Analytics Cards */}
      {analytics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <PeopleIcon color="primary" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h6">{analytics.totalStudents}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Students
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h6">{analytics.activeStudents}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Active Students
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <TrendingUpIcon color="info" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h6">{analytics.averageProgress}%</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Avg Progress
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <ScheduleIcon color="warning" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h6">{formatTime(analytics.averageTimeSpent)}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Avg Time Spent
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              placeholder="Search students..."
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              onChange={handleSearch}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Course</InputLabel>
              <Select
                value={filters.courseId || ''}
                onChange={(e) => handleFilterChange('courseId', e.target.value || undefined)}
                label="Course"
              >
                <MenuItem value="">All Courses</MenuItem>
                {courses.map((course) => (
                  <MenuItem key={course.id} value={course.id}>
                    {course.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                label="Status"
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={filters.sortBy || 'enrolledAt'}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                label="Sort By"
              >
                <MenuItem value="enrolledAt">Enrolled Date</MenuItem>
                <MenuItem value="lastName">Name</MenuItem>
                <MenuItem value="progress">Progress</MenuItem>
                <MenuItem value="lastAccessed">Last Access</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <Button
              variant="outlined"
              startIcon={<MessageIcon />}
              onClick={() => setMessageDialogOpen(true)}
              disabled={!filters.courseId}
              fullWidth
            >
              Send Message
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Students Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Student</TableCell>
              <TableCell>Course</TableCell>
              <TableCell>Enrolled</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Progress</TableCell>
              <TableCell>Time Spent</TableCell>
              <TableCell>Last Access</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Box py={6}>
                    <Typography variant="h6" color="textSecondary" gutterBottom>
                      No Students Enrolled
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {filters.courseId ? 
                        'No students enrolled in the selected course.' : 
                        'No students are enrolled in your courses yet.'
                      }
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              students
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((student) => (
                  <TableRow key={`${student.id}-${student.enrollment.id}`}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Avatar sx={{ mr: 2 }}>
                          {student.firstName[0]}{student.lastName[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {student.firstName} {student.lastName}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {student.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2">
                        {student.enrollment.courseTitle}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(student.enrollment.enrolledAt)}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Chip 
                        label={student.enrollment.status}
                        color={getStatusColor(student.enrollment.status) as any}
                        size="small"
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Box>
                        <LinearProgress
                          variant="determinate"
                          value={student.progress.overall}
                          sx={{ width: 100, mb: 0.5 }}
                        />
                        <Typography variant="caption">
                          {student.progress.overall}%
                        </Typography>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2">
                        {formatTime(student.progress.timeSpent)}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2">
                        {student.progress.lastAccessedAt 
                          ? formatDate(student.progress.lastAccessedAt)
                          : 'Never'
                        }
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <IconButton
                        onClick={(event) => {
                          setAnchorEl(event.currentTarget);
                          setSelectedStudent(student);
                        }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
        
        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={students.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => {
          setMessageDialogOpen(true);
          setAnchorEl(null);
        }}>
          <EmailIcon sx={{ mr: 1 }} />
          Send Message
        </MenuItem>
        <MenuItem onClick={() => handleStatusUpdate(selectedStudent!, 'active')}>
          Activate
        </MenuItem>
        <MenuItem onClick={() => handleStatusUpdate(selectedStudent!, 'suspended')}>
          Suspend
        </MenuItem>
        <MenuItem onClick={() => handleStatusUpdate(selectedStudent!, 'cancelled')}>
          Cancel Enrollment
        </MenuItem>
      </Menu>

      {/* Message Dialog */}
      <Dialog open={messageDialogOpen} onClose={() => setMessageDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Send {messageForm.type === 'announcement' ? 'Announcement' : 'Message'}
          {selectedStudent && ` to ${selectedStudent.firstName} ${selectedStudent.lastName}`}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={messageForm.type}
                onChange={(e) => setMessageForm(prev => ({ 
                  ...prev, 
                  type: e.target.value as 'message' | 'announcement' 
                }))}
                label="Type"
              >
                <MenuItem value="message">Message</MenuItem>
                <MenuItem value="announcement">Announcement</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="Subject"
              value={messageForm.subject}
              onChange={(e) => setMessageForm(prev => ({ ...prev, subject: e.target.value }))}
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="Message"
              multiline
              rows={6}
              value={messageForm.message}
              onChange={(e) => setMessageForm(prev => ({ ...prev, message: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMessageDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSendMessage}
            variant="contained"
            disabled={!messageForm.message.trim()}
          >
            Send
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudentManagement;