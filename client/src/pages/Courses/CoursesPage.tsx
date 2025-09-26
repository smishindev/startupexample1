import React, { useState } from 'react';
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
} from '@mui/material';
import { Search, FilterList } from '@mui/icons-material';
import { Header } from '../../components/Navigation/Header';
import { CourseCard, Course } from '../../components/Course/CourseCard';

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

export const CoursesPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [sortBy, setSortBy] = useState('popular');

  // Mock course data
  const [allCourses] = useState<Course[]>([
    {
      id: '1',
      title: 'Advanced React Development',
      description: 'Master modern React patterns, hooks, and best practices',
      instructor: { name: 'Sarah Johnson', avatar: '' },
      thumbnail: '',
      duration: '8h 30m',
      level: 'Advanced',
      rating: 4.8,
      reviewCount: 324,
      enrolledStudents: 2150,
      price: 79.99,
      originalPrice: 129.99,
      category: 'Web Development',
      tags: ['React', 'JavaScript', 'Frontend'],
      isPopular: true,
      isBookmarked: false,
    },
    {
      id: '2',
      title: 'Machine Learning Fundamentals',
      description: 'Introduction to ML algorithms and practical applications',
      instructor: { name: 'Dr. Michael Chen', avatar: '' },
      thumbnail: '',
      duration: '12h 45m',
      level: 'Intermediate',
      rating: 4.9,
      reviewCount: 567,
      enrolledStudents: 3200,
      price: 0,
      category: 'Data Science',
      tags: ['Machine Learning', 'Python', 'AI'],
      isNew: true,
      isBookmarked: true,
    },
    {
      id: '3',
      title: 'UI/UX Design Principles',
      description: 'Learn design thinking and create beautiful user experiences',
      instructor: { name: 'Emma Rodriguez', avatar: '' },
      thumbnail: '',
      duration: '6h 15m',
      level: 'Beginner',
      rating: 4.7,
      reviewCount: 189,
      enrolledStudents: 1450,
      price: 49.99,
      category: 'Design',
      tags: ['UI/UX', 'Design', 'Figma'],
      isBookmarked: false,
    },
    {
      id: '4',
      title: 'Node.js Backend Mastery',
      description: 'Build scalable server applications with Node.js and Express',
      instructor: { name: 'James Wilson', avatar: '' },
      thumbnail: '',
      duration: '10h 20m',
      level: 'Intermediate',
      rating: 4.6,
      reviewCount: 298,
      enrolledStudents: 1800,
      price: 69.99,
      originalPrice: 99.99,
      category: 'Backend Development',
      tags: ['Node.js', 'Express', 'API'],
      isBookmarked: false,
    },
    {
      id: '5',
      title: 'Data Structures and Algorithms',
      description: 'Master DSA for coding interviews and problem solving',
      instructor: { name: 'Alex Kumar', avatar: '' },
      thumbnail: '',
      duration: '15h 30m',
      level: 'Intermediate',
      rating: 4.8,
      reviewCount: 445,
      enrolledStudents: 2700,
      price: 89.99,
      category: 'Computer Science',
      tags: ['Algorithms', 'Data Structures', 'Coding'],
      isPopular: true,
      isBookmarked: true,
    },
    {
      id: '6',
      title: 'TypeScript Complete Guide',
      description: 'From JavaScript to TypeScript mastery',
      instructor: { name: 'Lisa Park', avatar: '' },
      thumbnail: '',
      duration: '7h 45m',
      level: 'Beginner',
      rating: 4.5,
      reviewCount: 156,
      enrolledStudents: 980,
      price: 39.99,
      category: 'Programming Languages',
      tags: ['TypeScript', 'JavaScript'],
      isNew: true,
      isBookmarked: false,
    },
  ]);

  // Mock enrolled courses
  const [enrolledCourses] = useState<Course[]>([
    {
      ...allCourses[0],
      isEnrolled: true,
      progress: 75,
      lastAccessed: '2 hours ago',
    },
    {
      ...allCourses[1],
      isEnrolled: true,
      progress: 45,
      lastAccessed: '1 day ago',
    },
    {
      ...allCourses[2],
      isEnrolled: true,
      progress: 30,
      lastAccessed: '3 days ago',
    },
  ]);

  const categories = ['Web Development', 'Data Science', 'Design', 'Backend Development', 'Computer Science', 'Programming Languages'];
  const levels = ['Beginner', 'Intermediate', 'Advanced'];

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleEnroll = (courseId: string) => {
    console.log('Enrolling in course:', courseId);
    // Handle course enrollment
  };

  const handleBookmark = (courseId: string, isBookmarked: boolean) => {
    console.log('Bookmark course:', courseId, isBookmarked);
    // Handle bookmark toggle
  };

  const handleShare = (courseId: string) => {
    console.log('Sharing course:', courseId);
    // Handle course sharing
  };

  const handleCourseClick = (courseId: string) => {
    console.log('Opening course:', courseId);
    // Handle course navigation
  };

  const filteredCourses = allCourses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || course.category === selectedCategory;
    const matchesLevel = !selectedLevel || course.level === selectedLevel;
    
    return matchesSearch && matchesCategory && matchesLevel;
  });

  const sortedCourses = [...filteredCourses].sort((a, b) => {
    switch (sortBy) {
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
          {/* Search and Filters */}
          <Paper sx={{ p: 3, mb: 4 }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <MenuItem value="">All Categories</MenuItem>
                    {categories.map((category) => (
                      <MenuItem key={category} value={category}>
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
                    onChange={(e) => setSelectedLevel(e.target.value)}
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
                    onChange={(e) => setSortBy(e.target.value)}
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
          <Typography variant="h6" sx={{ mb: 3 }}>
            {sortedCourses.length} courses found
          </Typography>

          <Grid container spacing={3}>
            {sortedCourses.map((course) => (
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
            Bookmarked Courses
          </Typography>
          
          <Grid container spacing={3}>
            {allCourses
              .filter(course => course.isBookmarked)
              .map((course) => (
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
        </TabPanel>
      </Container>
    </Box>
  );
};