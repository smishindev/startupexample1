import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
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
  Alert,
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import {
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Email as EmailIcon,
  Message as MessageIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Check as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { HeaderV5 as Header } from '../../components/Navigation/HeaderV5';
import { studentsApi, Student, StudentAnalytics, StudentFilters } from '../../services/studentsApi';
import { instructorApi, PendingEnrollment } from '../../services/instructorApi';
import { CourseSelector } from '../../components/Common/CourseSelector';
import { toast } from 'sonner';

const StudentManagement: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState<Student[]>([]);
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Tab state (Phase 2)
  const [currentTab, setCurrentTab] = useState<'active' | 'pending'>('active');
  const [pendingEnrollments, setPendingEnrollments] = useState<PendingEnrollment[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  
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
  
  // Approval/Rejection dialog state (Phase 2)
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [selectedEnrollment, setSelectedEnrollment] = useState<PendingEnrollment | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Set courseId from URL parameter and load data
  useEffect(() => {
    const courseIdFromUrl = searchParams.get('courseId');
    if (courseIdFromUrl && courseIdFromUrl !== filters.courseId) {
      setFilters(prev => ({ ...prev, courseId: courseIdFromUrl }));
    } else if (!courseIdFromUrl && filters.courseId === undefined) {
      // Load data immediately on first mount if no courseId in URL
      loadData();
    }
  }, [searchParams]);

  // Load data when filters change
  useEffect(() => {
    // Only load if filters have been initialized (courseId set or confirmed no courseId)
    if (filters.courseId !== undefined) {
      loadData();
      // Also reload pending enrollments if on pending tab
      if (currentTab === 'pending') {
        loadPendingEnrollments();
      }
    }
  }, [filters]);

  // Reload pending enrollments when switching to pending tab
  useEffect(() => {
    if (currentTab === 'pending') {
      loadPendingEnrollments();
    }
  }, [currentTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [studentsData, analyticsData, allCourses] = await Promise.all([
        studentsApi.getStudents(filters),
        studentsApi.getAnalytics(filters.courseId),
        instructorApi.getCoursesForDropdown()
      ]);
      
      setStudents(studentsData);
      setAnalytics(analyticsData);
      setCourses(allCourses);
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
      const result = await studentsApi.updateEnrollmentStatus(
        student.id,
        student.enrollment.id,
        newStatus as any
      );
      
      // If backend overrode the status (e.g., paid course: active → approved)
      if (result.status && result.status !== newStatus) {
        toast.info(`Status set to "${result.status}" — student must complete payment before activation.`);
      } else {
        toast.success(result.message || `Student status updated to ${result.status || newStatus}`);
      }
      
      loadData(); // Refresh data
      setAnchorEl(null);
    } catch (err: any) {
      console.error('Error updating status:', err);
      const errorMsg = err?.response?.data?.error || 'Failed to update student status';
      toast.error(errorMsg);
      setAnchorEl(null);
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
      
      toast.success('Message sent successfully!');
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message');
    }
  };

  // ============= ENROLLMENT APPROVAL HANDLERS (Phase 2) =============
  
  const loadPendingEnrollments = async () => {
    try {
      setPendingLoading(true);
      const result = await instructorApi.getPendingEnrollments(filters.courseId);
      setPendingEnrollments(result.enrollments);
    } catch (err) {
      console.error('Error loading pending enrollments:', err);
      toast.error('Failed to load pending enrollments');
    } finally {
      setPendingLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: 'active' | 'pending') => {
    setCurrentTab(newValue);
    // useEffect will handle loading pending enrollments when tab changes
  };

  const handleApproveClick = (enrollment: PendingEnrollment) => {
    setSelectedEnrollment(enrollment);
    setActionType('approve');
    setActionDialogOpen(true);
  };

  const handleRejectClick = (enrollment: PendingEnrollment) => {
    setSelectedEnrollment(enrollment);
    setActionType('reject');
    setRejectionReason('');
    setActionDialogOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedEnrollment) return;

    try {
      if (actionType === 'approve') {
        await instructorApi.approveEnrollment(selectedEnrollment.EnrollmentId);
        toast.success(`Approved ${selectedEnrollment.FirstName} ${selectedEnrollment.LastName}'s enrollment`);
      } else {
        await instructorApi.rejectEnrollment(selectedEnrollment.EnrollmentId, rejectionReason);
        toast.success(`Rejected ${selectedEnrollment.FirstName} ${selectedEnrollment.LastName}'s enrollment`);
      }
      
      // Refresh pending enrollments
      loadPendingEnrollments();
      setActionDialogOpen(false);
      setSelectedEnrollment(null);
      setRejectionReason('');
    } catch (err: any) {
      console.error('Error processing enrollment:', err);
      toast.error(err.response?.data?.error || 'Failed to process enrollment');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'completed': return 'primary';
      case 'suspended': return 'warning';
      case 'cancelled': return 'error';
      case 'pending': return 'info';
      case 'approved': return 'info';
      case 'rejected': return 'error';
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
    <>
      <Header />
      <Container maxWidth="xl" sx={{ py: 4 }}>
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

      {/* Tabs for Active Students vs Pending Enrollments (Phase 2) */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={currentTab} 
          onChange={handleTabChange}
          aria-label="student management tabs"
        >
          <Tab 
            value="active" 
            label="Active Students" 
            data-testid="tab-active-students"
          />
          <Tab 
            value="pending" 
            label={
              <Badge badgeContent={pendingEnrollments.length} color="error">
                <span style={{ marginRight: pendingEnrollments.length > 0 ? 20 : 0 }}>
                  Pending Approvals
                </span>
              </Badge>
            }
            data-testid="tab-pending-enrollments"
          />
        </Tabs>
      </Paper>

      {/* Filters - Only show for Active Students tab */}
      {currentTab === 'active' && (
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
              data-testid="student-management-search-input"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <CourseSelector
              courses={courses}
              value={filters.courseId || ''}
              onChange={(id: string) => handleFilterChange('courseId', id || undefined)}
              allOption={{ value: '', label: 'All Courses' }}
              label="Course"
              fullWidth
              showHelperText={false}
              testId="student-management-course-select"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                label="Status"
                data-testid="student-management-status-select"
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
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
                data-testid="student-management-sort-select"
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
              data-testid="student-management-send-message-button"
            >
              Send Message
            </Button>
          </Grid>
        </Grid>
      </Paper>
      )}

      {/* Students Table - Active Tab */}
      {currentTab === 'active' && (
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
                          {student.firstName?.[0]?.toUpperCase() || ''}{student.lastName?.[0]?.toUpperCase() || ''}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {student.firstName} {student.lastName}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {student.email || 'Email hidden'}
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
                        data-testid="student-management-more-options-button"
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
          data-testid="student-management-pagination"
        />
      </TableContainer>
      )}

      {/* Pending Enrollments Table - Pending Tab (Phase 2) */}
      {currentTab === 'pending' && (
        <TableContainer component={Paper}>
          {pendingLoading ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <LinearProgress />
              <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                Loading pending enrollments...
              </Typography>
            </Box>
          ) : (
            <>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Student</TableCell>
                    <TableCell>Course</TableCell>
                    <TableCell>Requested</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingEnrollments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Box py={6}>
                          <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                          <Typography variant="h6" color="textSecondary" gutterBottom>
                            No Pending Approvals
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            All enrollment requests have been processed
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingEnrollments.map((enrollment) => (
                      <TableRow key={enrollment.EnrollmentId}>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <Avatar 
                              src={enrollment.ProfilePicture || undefined}
                              sx={{ mr: 2 }}
                            >
                              {enrollment.FirstName[0]}{enrollment.LastName[0]}
                            </Avatar>
                            <Box>
                              <Typography variant="body1">
                                {enrollment.FirstName} {enrollment.LastName}
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                {enrollment.Email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2">
                            {enrollment.CourseTitle}
                          </Typography>
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(enrollment.EnrolledAt)}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {Math.floor((Date.now() - new Date(enrollment.EnrolledAt).getTime()) / (1000 * 60 * 60 * 24))} days ago
                          </Typography>
                        </TableCell>
                        
                        <TableCell>
                          <Box display="flex" gap={1}>
                            <Button
                              variant="contained"
                              color="success"
                              size="small"
                              startIcon={<CheckIcon />}
                              onClick={() => handleApproveClick(enrollment)}
                              data-testid={`approve-enrollment-${enrollment.EnrollmentId}`}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              startIcon={<CloseIcon />}
                              onClick={() => handleRejectClick(enrollment)}
                              data-testid={`reject-enrollment-${enrollment.EnrollmentId}`}
                            >
                              Reject
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </>
          )}
        </TableContainer>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => {
          setMessageDialogOpen(true);
          setAnchorEl(null);
        }} data-testid="student-management-menu-send-message">
          <EmailIcon sx={{ mr: 1 }} />
          Send Message
        </MenuItem>
        <MenuItem onClick={() => handleStatusUpdate(selectedStudent!, 'active')} data-testid="student-management-menu-activate">
          Activate
        </MenuItem>
        <MenuItem onClick={() => handleStatusUpdate(selectedStudent!, 'suspended')} data-testid="student-management-menu-suspend">
          Suspend
        </MenuItem>
        <MenuItem onClick={() => handleStatusUpdate(selectedStudent!, 'cancelled')} data-testid="student-management-menu-cancel">
          Cancel Enrollment
        </MenuItem>
      </Menu>

      {/* Message Dialog */}
      <Dialog open={messageDialogOpen} onClose={() => setMessageDialogOpen(false)} maxWidth="md" fullWidth disableEnforceFocus data-testid="student-management-message-dialog">
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
                data-testid="student-management-message-type-select"
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
              data-testid="student-management-message-subject-input"
            />
            
            <TextField
              fullWidth
              label="Message"
              multiline
              rows={6}
              value={messageForm.message}
              onChange={(e) => setMessageForm(prev => ({ ...prev, message: e.target.value }))}
              data-testid="student-management-message-text-input"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMessageDialogOpen(false)} data-testid="student-management-message-cancel-button">Cancel</Button>
          <Button
            onClick={handleSendMessage}
            variant="contained"
            disabled={!messageForm.message.trim()}
            data-testid="student-management-message-send-button"
          >
            Send
          </Button>
          </DialogActions>
        </Dialog>

        {/* Approval/Rejection Confirmation Dialog (Phase 2) */}
        <Dialog 
          open={actionDialogOpen} 
          onClose={() => setActionDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {actionType === 'approve' ? 'Approve Enrollment' : 'Reject Enrollment'}
          </DialogTitle>
          <DialogContent>
            {selectedEnrollment && (
              <Box sx={{ pt: 1 }}>
                <Alert severity={actionType === 'approve' ? 'info' : 'warning'} sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    {actionType === 'approve' 
                      ? `You are about to approve ${selectedEnrollment.FirstName} ${selectedEnrollment.LastName}'s enrollment in "${selectedEnrollment.CourseTitle}". They will receive access to the course immediately.`
                      : `You are about to reject ${selectedEnrollment.FirstName} ${selectedEnrollment.LastName}'s enrollment request for "${selectedEnrollment.CourseTitle}". They will be notified of your decision.`
                    }
                  </Typography>
                </Alert>
                
                {actionType === 'reject' && (
                  <TextField
                    fullWidth
                    label="Rejection Reason (Optional)"
                    multiline
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Provide a reason for rejection to help the student understand..."
                    helperText="This message will be included in the notification sent to the student"
                    data-testid="enrollment-rejection-reason-input"
                  />
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setActionDialogOpen(false);
                setRejectionReason('');
              }} 
              data-testid="enrollment-action-cancel-button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAction}
              variant="contained"
              color={actionType === 'approve' ? 'success' : 'error'}
              data-testid="enrollment-action-confirm-button"
            >
              {actionType === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
};

export default StudentManagement;