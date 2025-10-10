import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Paper,
  Tabs,
  Tab,
  Button,
  CircularProgress,
  Alert,
  Pagination,
  Card,
  CardContent,
  Rating,
} from '@mui/material';
import { Search, FilterList } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/Navigation/Header';
import { CourseCard, Course } from '../../components/Course/CourseCard';
import { enrollmentApi } from '../../services/enrollmentApi';
import { coursesApi, Course as ApiCourse, CourseFilters } from '../../services/coursesApi';
import { BookmarkApi } from '../../services/bookmarkApi';
import { useAuthStore } from '../../stores/authStore';
import { ShareDialog } from '../../components/Course/ShareDialog';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
);

// Helper function to convert API course to UI course format
const convertApiCourseToUiCourse = (apiCourse: ApiCourse, isBookmarked: boolean = false): Course => ({
  id: apiCourse.Id,
  title: apiCourse.Title,
  description: apiCourse.Description,
  instructor: {
    name: `${apiCourse.Instructor.FirstName} ${apiCourse.Instructor.LastName}`,
    avatar: apiCourse.Instructor.Avatar || '',
  },
  thumbnail: apiCourse.Thumbnail || '',
  duration: formatDuration(apiCourse.Duration),
  level: apiCourse.Level as 'Beginner' | 'Intermediate' | 'Advanced',
  rating: apiCourse.Rating,
  reviewCount: Math.floor(apiCourse.EnrollmentCount * 0.3), // Estimate reviews from enrollments
  enrolledStudents: apiCourse.EnrollmentCount,
  price: apiCourse.Price,
  category: formatCategory(apiCourse.Category),
  tags: apiCourse.Tags || [],
  isBookmarked: isBookmarked,
  isPopular: apiCourse.EnrollmentCount > 100,
  isNew: isNewCourse(apiCourse.CreatedAt),
});

// Helper function to format duration from minutes to readable format
const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${mins}m`;
  }
};

// Helper function to format category for display
const formatCategory = (category: string): string => {
  return category.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

// Helper function to check if course is new (created within last 30 days)
const isNewCourse = (createdAt: string): boolean => {
  const created = new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - created.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 30;
};

export const CoursesPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [currentPage, setCurrentPage] = useState(1);
  
  // State for API data
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [bookmarkedCourses, setBookmarkedCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryStats, setCategoryStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarksLoading, setBookmarksLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareDialog, setShareDialog] = useState<{
    open: boolean;
    course: Course | null;
  }>({
    open: false,
    course: null,
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0,
    hasNext: false,
    hasPrev: false,
  });

  const levels = ['beginner', 'intermediate', 'advanced'];

  // Load initial data
  useEffect(() => {
    // Add a small delay to ensure auth store has hydrated from localStorage
    const timer = setTimeout(() => {
      loadCourses();
      loadCategories();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [currentPage, searchQuery, selectedCategory, selectedLevel, sortBy, isAuthenticated]);

  // Load bookmarked courses when tab is active and user is authenticated
  useEffect(() => {
    if (tabValue === 2 && isAuthenticated) {
      loadBookmarkedCourses();
    }
  }, [tabValue, isAuthenticated]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: CourseFilters = {
        page: currentPage,
        limit: 12,
      };

      if (searchQuery) filters.search = searchQuery;
      if (selectedCategory) filters.category = selectedCategory;
      if (selectedLevel) filters.level = selectedLevel;

      const response = await coursesApi.getCourses(filters);
      
      // Convert API courses to UI format without bookmark status first
      const uiCourses = response.courses.map(course => convertApiCourseToUiCourse(course));
      
      // Get bookmark statuses for all courses (only if user is logged in)
      if (isAuthenticated) {
        try {
          const courseIds = uiCourses.map(course => course.id);
          const bookmarkStatuses = await BookmarkApi.getBookmarkStatuses(courseIds);
          
          // Update courses with bookmark status
          const coursesWithBookmarks = uiCourses.map(course => ({
            ...course,
            isBookmarked: bookmarkStatuses[course.id] || false
          }));
          
          // Apply sorting (since API doesn't support all sort options yet)
          const sortedCourses = sortCourses(coursesWithBookmarks, sortBy);
          setAllCourses(sortedCourses);
        } catch (bookmarkError) {
          console.warn('Failed to load bookmark statuses:', bookmarkError);
          // Apply sorting without bookmark data
          const sortedCourses = sortCourses(uiCourses, sortBy);
          setAllCourses(sortedCourses);
        }
      } else {
        // User not logged in, skip bookmark status
        const sortedCourses = sortCourses(uiCourses, sortBy);
        setAllCourses(sortedCourses);
      }

      setPagination(response.pagination);

    } catch (err) {
      console.error('Error loading courses:', err);
      setError('Failed to load courses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const categoriesData = await coursesApi.getCategories();
      const categoryNames = categoriesData.map(cat => formatCategory(cat.Category));
      setCategories(categoryNames);
      setCategoryStats(categoriesData);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const sortCourses = (courses: Course[], sortType: string): Course[] => {
    return [...courses].sort((a, b) => {
      switch (sortType) {
        case 'popular':
          return b.enrolledStudents - a.enrolledStudents;
        case 'rating':
          return b.rating - a.rating;
        case 'newest':
          return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        default:
          return 0;
      }
    });
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    if (newValue === 1) {
      loadEnrolledCourses();
    } else if (newValue === 2) {
      loadBookmarkedCourses();
    }
  };

  const loadBookmarkedCourses = async () => {
    try {
      console.log('loadBookmarkedCourses called, isAuthenticated:', isAuthenticated);
      if (!isAuthenticated) {
        console.log('User not authenticated, clearing bookmarks');
        setBookmarkedCourses([]);
        return;
      }

      console.log('Loading bookmarks for authenticated user...');
      setBookmarksLoading(true);
      const response = await BookmarkApi.getBookmarks(1, 50); // Load all bookmarks
      console.log('Bookmarks loaded:', response);
      
      // Convert bookmark data to course format
      const bookmarkedCoursesData: Course[] = response.bookmarks.map(bookmark => ({
        id: bookmark.id,
        title: bookmark.title,
        description: bookmark.description,
        instructor: {
          name: bookmark.instructor.name,
          avatar: bookmark.instructor.avatar,
        },
        thumbnail: bookmark.thumbnail,
        duration: formatDuration(bookmark.duration),
        level: bookmark.level.charAt(0).toUpperCase() + bookmark.level.slice(1).toLowerCase() as 'Beginner' | 'Intermediate' | 'Advanced',
        rating: bookmark.rating,
        reviewCount: Math.floor(bookmark.enrollmentCount * 0.3),
        enrolledStudents: bookmark.enrollmentCount,
        price: bookmark.price,
        category: formatCategory(bookmark.category),
        tags: bookmark.tags,
        isBookmarked: true,
        isPopular: bookmark.enrollmentCount > 100,
        isNew: isNewCourse(bookmark.bookmarkedAt),
      }));
      
      setBookmarkedCourses(bookmarkedCoursesData);
    } catch (err) {
      console.error('Error loading bookmarked courses:', err);
      setBookmarkedCourses([]);
    } finally {
      setBookmarksLoading(false);
    }
  };

  const loadEnrolledCourses = async () => {
    try {
      const enrollments = await enrollmentApi.getMyEnrollments();
      
      // Convert enrollment data to course format
      const enrolledCoursesData: Course[] = enrollments.map(enrollment => ({
        id: enrollment.courseId,
        title: enrollment.Title,
        description: enrollment.Description,
        instructor: {
          name: `${enrollment.instructorFirstName} ${enrollment.instructorLastName}`,
        },
        thumbnail: enrollment.Thumbnail || '',
        duration: enrollment.Duration,
        level: (enrollment.Level.charAt(0).toUpperCase() + enrollment.Level.slice(1).toLowerCase()) as 'Beginner' | 'Intermediate' | 'Advanced',
        price: enrollment.Price,
        rating: 0, // Not available in enrollment data
        reviewCount: 0, // Not available in enrollment data
        enrollmentCount: 0, // Not available in enrollment data
        enrolledStudents: 0, // Not available in enrollment data
        category: 'other', // Not available in enrollment data, defaulting
        tags: [],
        isEnrolled: true,
        progress: enrollment.OverallProgress,
        enrolledAt: enrollment.EnrolledAt,
        lastAccessedAt: enrollment.LastAccessedAt,
      }));
      
      setEnrolledCourses(enrolledCoursesData);
    } catch (err) {
      console.error('Error loading enrolled courses:', err);
      setEnrolledCourses([]);
    }
  };

  const handleEnroll = async (courseId: string) => {
    try {
      await enrollmentApi.enrollInCourse(courseId);
      
      // Update the course in the state to reflect enrollment
      setAllCourses(prev => prev.map(course => 
        course.id === courseId 
          ? { ...course, isEnrolled: true }
          : course
      ));
      
      // Refresh enrolled courses list
      loadEnrolledCourses();
      
      console.log('Successfully enrolled in course:', courseId);
    } catch (error) {
      console.error('Failed to enroll in course:', error);
      setError('Failed to enroll in course. Please try again.');
    }
  };

  const handleBookmark = async (courseId: string, isBookmarked: boolean) => {
    try {
      if (!isAuthenticated) {
        setError('Please log in to bookmark courses.');
        return;
      }

      if (isBookmarked) {
        await BookmarkApi.addBookmark(courseId);
      } else {
        await BookmarkApi.removeBookmark(courseId);
      }
      
      // Update the course in all relevant states
      setAllCourses(prev => prev.map(course => 
        course.id === courseId 
          ? { ...course, isBookmarked: isBookmarked }
          : course
      ));
      
      setEnrolledCourses(prev => prev.map(course => 
        course.id === courseId 
          ? { ...course, isBookmarked: isBookmarked }
          : course
      ));
      
      // If we're on the bookmarked tab and course was unbookmarked, refresh the list
      if (tabValue === 2 && !isBookmarked) {
        loadBookmarkedCourses();
      }
      
      console.log(`Successfully ${isBookmarked ? 'added' : 'removed'} bookmark for course:`, courseId);
    } catch (error) {
      console.error('Failed to update bookmark:', error);
      setError(`Failed to ${isBookmarked ? 'add' : 'remove'} bookmark. Please try again.`);
    }
  };

  const handleShare = (courseId: string) => {
    // Find the course from all courses state
    const course = allCourses.find(c => c.id === courseId) || 
                   enrolledCourses.find(c => c.id === courseId) ||
                   bookmarkedCourses.find(c => c.id === courseId);
    
    if (course) {
      setShareDialog({
        open: true,
        course: course,
      });
    } else {
      console.error('Course not found for sharing:', courseId);
    }
  };

  const handleCloseShareDialog = () => {
    setShareDialog({
      open: false,
      course: null,
    });
  };

  const handleCourseClick = (courseId: string) => {
    navigate(`/courses/${courseId}/preview`);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setCurrentPage(1); // Reset to first page on filter
  };

  const handleLevelChange = (value: string) => {
    setSelectedLevel(value);
    setCurrentPage(1); // Reset to first page on filter
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    setCurrentPage(1); // Reset to first page on sort
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flex: 1 }}>
        {/* Page Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 2 }}>
            Courses
          </Typography>
          
          {/* Tabs */}
          <Paper sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="All Courses" />
              <Tab label="My Courses" />
              <Tab label="Bookmarked" />
            </Tabs>
          </Paper>
        </Box>

        {/* All Courses Tab */}
        <TabPanel value={tabValue} index={0}>
          {/* Course Statistics Overview */}
          {!loading && (
            <Paper sx={{ p: 3, mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Course Overview
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary.main" sx={{ fontWeight: 'bold' }}>
                      {pagination.total}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Courses
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main" sx={{ fontWeight: 'bold' }}>
                      {allCourses.filter(c => c.price === 0).length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Free Courses
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="warning.main" sx={{ fontWeight: 'bold' }}>
                      {categoryStats.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Categories
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="info.main" sx={{ fontWeight: 'bold' }}>
                      {allCourses.reduce((sum, course) => sum + course.enrolledStudents, 0).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Students
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          )}

          {/* Category Statistics */}
          {categoryStats.length > 0 && (
            <Paper sx={{ p: 3, mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Course Categories
              </Typography>
              <Grid container spacing={2}>
                {categoryStats.map((stat, index) => (
                  <Grid item xs={12} sm={6} md={3} key={index}>
                    <Card 
                      sx={{ 
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: 3,
                        },
                        ...(selectedCategory === stat.Category.toLowerCase().replace(' ', '_') && {
                          bgcolor: 'primary.50',
                          borderColor: 'primary.main',
                          borderWidth: 2,
                        })
                      }}
                      onClick={() => setSelectedCategory(
                        selectedCategory === stat.Category.toLowerCase().replace(' ', '_') 
                          ? '' 
                          : stat.Category.toLowerCase().replace(' ', '_')
                      )}
                    >
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="h6" color="primary.main" sx={{ fontWeight: 'bold' }}>
                          {stat.Count}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          {formatCategory(stat.Category)}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Rating value={stat.AverageRating || 0} precision={0.1} readOnly size="small" />
                            <Typography variant="caption">
                              {(stat.AverageRating || 0).toFixed(1)}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            ~{Math.round(stat.AverageEnrollments || 0)} enrolled
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}

          {/* Search and Filters */}
          <Paper sx={{ p: 3, mb: 4 }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={selectedCategory}
                    label="Category"
                    onChange={(e) => handleCategoryChange(e.target.value)}
                  >
                    <MenuItem value="">All Categories</MenuItem>
                    {categories.map((category) => (
                      <MenuItem key={category} value={category.toLowerCase().replace(' ', '_')}>
                        {category}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Level</InputLabel>
                  <Select
                    value={selectedLevel}
                    label="Level"
                    onChange={(e) => handleLevelChange(e.target.value)}
                  >
                    <MenuItem value="">All Levels</MenuItem>
                    {levels.map((level) => (
                      <MenuItem key={level} value={level}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={sortBy}
                    label="Sort By"
                    onChange={(e) => handleSortChange(e.target.value)}
                  >
                    <MenuItem value="popular">Most Popular</MenuItem>
                    <MenuItem value="rating">Highest Rated</MenuItem>
                    <MenuItem value="newest">Newest</MenuItem>
                    <MenuItem value="price-low">Price: Low to High</MenuItem>
                    <MenuItem value="price-high">Price: High to Low</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<FilterList />}
                  sx={{ height: 56 }}
                >
                  Filters
                </Button>
              </Grid>
            </Grid>

            {/* Active Filters */}
            {(selectedCategory || selectedLevel) && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Active filters:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {selectedCategory && (
                    <Chip
                      label={`Category: ${selectedCategory}`}
                      onDelete={() => setSelectedCategory('')}
                      size="small"
                    />
                  )}
                  {selectedLevel && (
                    <Chip
                      label={`Level: ${selectedLevel}`}
                      onDelete={() => setSelectedLevel('')}
                      size="small"
                    />
                  )}
                </Box>
              </Box>
            )}
          </Paper>

          {/* Course Results */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={60} />
            </Box>
          ) : (
            <>
              <Typography variant="h6" sx={{ mb: 3 }}>
                {allCourses.length} courses found
              </Typography>

              <Grid container spacing={3}>
                {allCourses.map((course) => (
                  <Grid item xs={12} sm={6} md={4} key={course.id}>
                    <CourseCard
                      course={course}
                      onEnroll={handleEnroll}
                      onBookmark={handleBookmark}
                      onShare={handleShare}
                      onClick={handleCourseClick}
                    />
                  </Grid>
                ))}
              </Grid>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                  <Pagination
                    count={pagination.pages}
                    page={pagination.current}
                    onChange={handlePageChange}
                    color="primary"
                    size="large"
                    showFirstButton
                    showLastButton
                  />
                </Box>
              )}
            </>
          )}
        </TabPanel>

        {/* My Courses Tab */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" sx={{ mb: 3 }}>
            My Enrolled Courses ({enrolledCourses.length})
          </Typography>
          
          <Grid container spacing={3}>
            {enrolledCourses.map((course) => (
              <Grid item xs={12} sm={6} md={4} key={course.id}>
                <CourseCard
                  course={course}
                  variant="enrolled"
                  onBookmark={handleBookmark}
                  onShare={handleShare}
                  onClick={handleCourseClick}
                />
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Bookmarked Tab */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" sx={{ mb: 3 }}>
            Bookmarked Courses ({bookmarkedCourses.length})
          </Typography>
          
          {!isAuthenticated ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                Please log in to view bookmarked courses
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Sign in to bookmark courses and access them from here.
              </Typography>
              <Button 
                variant="contained" 
                onClick={() => navigate('/login')}
                sx={{ minWidth: 120 }}
              >
                Sign In
              </Button>
            </Box>
          ) : bookmarksLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={60} />
            </Box>
          ) : (
            <Grid container spacing={3}>
              {bookmarkedCourses.map((course) => (
                <Grid item xs={12} sm={6} md={4} key={course.id}>
                  <CourseCard
                    course={course}
                    onEnroll={handleEnroll}
                    onBookmark={handleBookmark}
                    onShare={handleShare}
                    onClick={handleCourseClick}
                  />
                </Grid>
              ))}
              
              {bookmarkedCourses.length === 0 && (
                <Grid item xs={12}>
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                      No bookmarked courses yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Start bookmarking courses you're interested in to see them here.
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          )}
        </TabPanel>
      </Container>

      {/* Share Dialog */}
      {shareDialog.course && (
        <ShareDialog
          open={shareDialog.open}
          onClose={handleCloseShareDialog}
          course={shareDialog.course}
        />
      )}
    </Box>
  );
};