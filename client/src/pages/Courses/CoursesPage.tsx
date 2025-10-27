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
import { coursesApi, Course as ApiCourse, CourseFilters, CourseCategory, CourseLevel } from '../../services/coursesApi';
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
const convertApiCourseToUiCourse = (apiCourse: ApiCourse, isBookmarked: boolean = false, isEnrolled: boolean = false): Course => ({
  id: apiCourse.Id,
  title: apiCourse.Title,
  description: apiCourse.Description,
  instructor: {
    id: apiCourse.Instructor.Id, // Added instructor ID
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
  isEnrolled: isEnrolled,
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
  const { isAuthenticated, user } = useAuthStore();
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [currentPage, setCurrentPage] = useState(1);
  
  // State for API data
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [bookmarkedCourses, setBookmarkedCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryStats, setCategoryStats] = useState<CourseCategory[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [levelStats, setLevelStats] = useState<CourseLevel[]>([]);
  const [overallStats, setOverallStats] = useState({
    TotalCourses: 0,
    FreeCourses: 0,
    TotalStudents: 0,
    TotalCategories: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
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

  // Debounce search query to prevent excessive API calls and flickering
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      // Reset to first page when search query changes
      if (searchQuery !== debouncedSearchQuery) {
        setCurrentPage(1);
      }
    }, 300); // 300ms delay for debouncing

    return () => clearTimeout(timer);
  }, [searchQuery, debouncedSearchQuery]);

  // Load initial data
  useEffect(() => {
    // Add a small delay to ensure auth store has hydrated from localStorage
    const timer = setTimeout(() => {
      // Determine if this is a search operation
      const isSearch = debouncedSearchQuery !== '';
      loadCourses(isSearch);
      
      // Only load categories and levels on initial load, not on search
      if (!isSearch) {
        loadCategories();
        loadLevels();
        loadOverallStats();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [currentPage, debouncedSearchQuery, selectedCategory, selectedLevel, sortBy, isAuthenticated]);

  // Load bookmarked courses when tab is active and user is authenticated
  useEffect(() => {
    if (tabValue === 2 && isAuthenticated) {
      loadBookmarkedCourses();
    }
  }, [tabValue, isAuthenticated]);

  const loadCourses = async (isSearch = false) => {
    try {
      // Only show full loading for initial load, use search loading for searches
      if (isSearch) {
        setSearchLoading(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const filters: CourseFilters = {
        page: currentPage,
        limit: 12,
      };

      if (debouncedSearchQuery) filters.search = debouncedSearchQuery;
      if (selectedCategory) filters.category = selectedCategory;
      if (selectedLevel) filters.level = selectedLevel;

      const response = await coursesApi.getCourses(filters);
      
      // Convert API courses to UI format without bookmark status first
      const uiCourses = response.courses.map(course => convertApiCourseToUiCourse(course));
      
      // Get bookmark statuses and enrollment statuses for all courses (only if user is logged in)
      if (isAuthenticated) {
        try {
          const courseIds = uiCourses.map(course => course.id);
          
          // Get both bookmark and enrollment statuses in parallel
          const [bookmarkStatuses, enrolledCoursesList] = await Promise.all([
            BookmarkApi.getBookmarkStatuses(courseIds),
            enrollmentApi.getMyEnrollments()
          ]);
          
          // Create a set of enrolled course IDs for quick lookup (exclude courses where user is teaching)
          const enrolledCourseIds = new Set(
            enrolledCoursesList
              .filter(enrolled => enrolled.Status !== 'teaching') // Exclude courses instructor is teaching
              .map(enrolled => enrolled.courseId)
          );
          
          // Update courses with both bookmark and enrollment status
          const coursesWithStatuses = uiCourses.map(course => ({
            ...course,
            isBookmarked: bookmarkStatuses[course.id] || false,
            isEnrolled: enrolledCourseIds.has(course.id)
          }));
          
          // Apply sorting
          const sortedCourses = sortCourses(coursesWithStatuses, sortBy);
          setAllCourses(sortedCourses);
        } catch (error) {
          console.warn('Failed to load bookmark/enrollment statuses:', error);
          // Apply sorting without bookmark/enrollment data
          const sortedCourses = sortCourses(uiCourses, sortBy);
          setAllCourses(sortedCourses);
        }
      } else {
        // User not logged in, skip bookmark and enrollment status
        const sortedCourses = sortCourses(uiCourses, sortBy);
        setAllCourses(sortedCourses);
      }

      setPagination(response.pagination);

    } catch (err) {
      console.error('Error loading courses:', err);
      setError('Failed to load courses. Please try again.');
    } finally {
      setLoading(false);
      setSearchLoading(false);
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

  const loadLevels = async () => {
    try {
      const levelsData = await coursesApi.getLevels();
      const levelNames = levelsData.map(level => level.Level);
      setLevels(levelNames);
      setLevelStats(levelsData);
    } catch (err) {
      console.error('Error loading levels:', err);
    }
  };

  const loadOverallStats = async () => {
    try {
      const statsData = await coursesApi.getStats();
      setOverallStats(statsData);
    } catch (err) {
      console.error('Error loading overall stats:', err);
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
      
      console.log('Raw enrollments from API:', enrollments);
      console.log('Number of enrollments:', enrollments.length);
      
      // Check for duplicate courseIds
      const courseIds = enrollments.map((e: any) => e.courseId);
      const duplicates = courseIds.filter((id: string, index: number) => courseIds.indexOf(id) !== index);
      if (duplicates.length > 0) {
        console.warn('Duplicate courseIds detected in enrollments:', duplicates);
      }
      
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
      
      // Remove duplicates based on course ID (keep the most recent enrollment)
      const uniqueCoursesMap = new Map<string, Course>();
      enrolledCoursesData.forEach(course => {
        if (!uniqueCoursesMap.has(course.id)) {
          uniqueCoursesMap.set(course.id, course);
        }
      });
      const uniqueEnrolledCourses = Array.from(uniqueCoursesMap.values());
      
      console.log('Converted enrolledCoursesData:', enrolledCoursesData);
      console.log('Unique enrolled courses:', uniqueEnrolledCourses);
      
      // Fetch bookmark statuses for enrolled courses (only if user is logged in)
      if (isAuthenticated && uniqueEnrolledCourses.length > 0) {
        try {
          const courseIds = uniqueEnrolledCourses.map(course => course.id);
          const bookmarkStatuses = await BookmarkApi.getBookmarkStatuses(courseIds);
          
          // Update courses with bookmark status
          const coursesWithBookmarks = uniqueEnrolledCourses.map(course => ({
            ...course,
            isBookmarked: bookmarkStatuses[course.id] || false
          }));
          
          setEnrolledCourses(coursesWithBookmarks);
        } catch (error) {
          console.warn('Failed to load bookmark statuses for enrolled courses:', error);
          // Set enrolled courses without bookmark data
          setEnrolledCourses(uniqueEnrolledCourses);
        }
      } else {
        setEnrolledCourses(uniqueEnrolledCourses);
      }
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
    } catch (error: any) {
      console.error('Failed to enroll in course:', error);
      
      // Handle specific error cases
      let errorMessage = 'Failed to enroll in course. Please try again.';
      
      try {
        const errorData = JSON.parse(error.message);
        if (errorData.code === 'ALREADY_ENROLLED') {
          // User is already enrolled, update the UI to reflect this
          setAllCourses(prev => prev.map(course => 
            course.id === courseId 
              ? { ...course, isEnrolled: true }
              : course
          ));
          loadEnrolledCourses();
          errorMessage = 'You are already enrolled in this course.';
        }
      } catch (parseError) {
        // If we can't parse the error, use the default message
      }
      
      setError(errorMessage);
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
                      {overallStats.TotalCourses}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Courses
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main" sx={{ fontWeight: 'bold' }}>
                      {overallStats.FreeCourses}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Free Courses
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="warning.main" sx={{ fontWeight: 'bold' }}>
                      {overallStats.TotalCategories}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Categories
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="info.main" sx={{ fontWeight: 'bold' }}>
                      {overallStats.TotalStudents.toLocaleString()}
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

          {/* Level Statistics */}
          {levelStats.length > 0 && (
            <Paper sx={{ p: 3, mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Course Levels
              </Typography>
              <Grid container spacing={2}>
                {levelStats.map((stat, index) => (
                  <Grid item xs={12} sm={4} md={4} key={index}>
                    <Card 
                      sx={{ 
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: 3,
                        },
                        ...(selectedLevel === stat.Level && {
                          bgcolor: 'primary.50',
                          borderColor: 'primary.main',
                          borderWidth: 2,
                        })
                      }}
                      onClick={() => setSelectedLevel(
                        selectedLevel === stat.Level 
                          ? '' 
                          : stat.Level
                      )}
                    >
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="h6" color="primary.main" sx={{ fontWeight: 'bold' }}>
                          {stat.Count}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          {stat.Level}
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
                        {level}
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
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                  {allCourses.length} courses found
                </Typography>
                {searchLoading && (
                  <CircularProgress size={20} sx={{ ml: 2 }} />
                )}
              </Box>

              {allCourses.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                    No courses available yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {searchQuery || selectedCategory || selectedLevel
                      ? 'Try adjusting your filters or search terms.'
                      : 'New courses will appear here as they are added.'}
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={3}>
                  {allCourses.map((course) => (
                    <Grid item xs={12} sm={6} md={4} key={course.id}>
                      <CourseCard
                        course={course}
                        currentUserId={user?.id}
                        onEnroll={handleEnroll}
                        onBookmark={handleBookmark}
                        onShare={handleShare}
                        onClick={handleCourseClick}
                      />
                    </Grid>
                  ))}
                </Grid>
              )}

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
          
          {enrolledCourses.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                No enrolled courses yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Browse the course catalog and enroll in courses to start learning!
              </Typography>
              <Button 
                variant="contained" 
                onClick={() => setTabValue(0)}
                sx={{ minWidth: 120 }}
              >
                Browse Courses
              </Button>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {enrolledCourses.map((course) => (
                <Grid item xs={12} sm={6} md={4} key={course.id}>
                  <CourseCard
                    course={course}
                    variant="enrolled"
                    currentUserId={user?.id}
                    onBookmark={handleBookmark}
                    onShare={handleShare}
                    onClick={handleCourseClick}
                  />
                </Grid>
              ))}
            </Grid>
          )}
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
                    currentUserId={user?.id}
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