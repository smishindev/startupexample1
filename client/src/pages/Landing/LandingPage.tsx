import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Avatar,
  Chip,
  Stack,
  Skeleton,
  Rating,
  alpha,
} from '@mui/material'
import {
  School as SchoolIcon,
  Psychology as PsychologyIcon,
  Analytics as AnalyticsIcon,
  Chat as ChatIcon,
  TrendingUp as TrendingUpIcon,
  EmojiObjects as EmojiObjectsIcon,
  Code as CodeIcon,
  BarChart as DataScienceIcon,
  Brush as DesignIcon,
  Business as BusinessIcon,
  Campaign as MarketingIcon,
  Translate as LanguageIcon,
  Functions as MathIcon,
  Science as ScienceIcon,
  Palette as ArtsIcon,
  Category as OtherIcon,
  People as PeopleIcon,
  MenuBook as MenuBookIcon,
  Star as StarIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { PublicHeader } from '../../components/Navigation/PublicHeader'
import { PublicFooter } from '../../components/Layout/PublicFooter'
import { SearchAutocomplete } from '../../components/Search/SearchAutocomplete'
import { coursesApi, Course as ApiCourse } from '../../services/coursesApi'
import { useAuthStore } from '../../stores/authStore'

// Category icon mapping
const categoryIcons: Record<string, React.ReactElement> = {
  programming: <CodeIcon />,
  data_science: <DataScienceIcon />,
  design: <DesignIcon />,
  business: <BusinessIcon />,
  marketing: <MarketingIcon />,
  language: <LanguageIcon />,
  mathematics: <MathIcon />,
  science: <ScienceIcon />,
  arts: <ArtsIcon />,
  other: <OtherIcon />,
}

const categoryLabels: Record<string, string> = {
  programming: 'Programming',
  data_science: 'Data Science',
  design: 'Design',
  business: 'Business',
  marketing: 'Marketing',
  language: 'Language',
  mathematics: 'Mathematics',
  science: 'Science',
  arts: 'Arts',
  other: 'Other',
}

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

interface PlatformStats {
  TotalCourses: number
  FreeCourses: number
  TotalStudents: number
  TotalCategories: number
}

interface CourseCardData {
  id: string
  title: string
  thumbnail?: string
  instructorName: string
  rating: number
  ratingCount: number
  enrollmentCount: number
  price: number
  level: string
  category: string
}

const LandingPage: React.FC = () => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [categories, setCategories] = useState<{ Category: string; Count: number }[]>([])
  const [featuredCourses, setFeaturedCourses] = useState<CourseCardData[]>([])
  const [popularCourses, setPopularCourses] = useState<CourseCardData[]>([])
  const [loadingCourses, setLoadingCourses] = useState(true)

  // Redirect authenticated users to dashboard — landing page is for guests
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, navigate])

  // Fetch platform data on mount (skip if authenticated — redirect is pending)
  useEffect(() => {
    if (isAuthenticated) return

    const loadData = async () => {
      try {
        const [statsData, categoriesData, featured, popular] = await Promise.all([
          coursesApi.getStats().catch(() => null),
          coursesApi.getCategories().catch(() => []),
          coursesApi.getFeaturedCourses(8).catch(() => []),
          coursesApi.getPopularCourses(8).catch(() => []),
        ])

        if (statsData) setStats(statsData)
        setCategories(categoriesData)
        
        const mapCourse = (c: ApiCourse): CourseCardData => ({
          id: c.Id,
          title: c.Title,
          thumbnail: c.Thumbnail,
          instructorName: `${c.Instructor.FirstName} ${c.Instructor.LastName}`,
          rating: c.Rating,
          ratingCount: c.RatingCount,
          enrollmentCount: c.EnrollmentCount,
          price: c.Price,
          level: c.Level,
          category: c.Category,
        })

        setFeaturedCourses(featured.map(mapCourse))
        setPopularCourses(popular.map(mapCourse))
      } catch (err) {
        console.error('Failed to load landing page data:', err)
      } finally {
        setLoadingCourses(false)
      }
    }

    loadData()
  }, [isAuthenticated])

  // Prevent flash of landing page content while redirect is pending
  if (isAuthenticated) return null

  const handleHeroSearch = (query: string) => {
    navigate(`/courses?search=${encodeURIComponent(query)}`)
  }

  const popularSearches = ['Python', 'Web Development', 'Data Science', 'JavaScript', 'Machine Learning', 'Design']

  return (
    <Box>
      {/* Public Header - with hideSearch since hero has its own */}
      <PublicHeader hideSearch />

      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          py: { xs: 7, md: 10 },
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '2.2rem', md: '3.5rem' },
              fontWeight: 800,
              mb: 2,
              lineHeight: 1.2,
            }}
          >
            Learn Without Limits
          </Typography>

          <Typography
            variant="h5"
            sx={{
              mb: 4,
              opacity: 0.9,
              fontWeight: 300,
              lineHeight: 1.6,
              fontSize: { xs: '1rem', md: '1.25rem' },
            }}
          >
            Explore courses from expert instructors with AI-powered tutoring
            and personalized learning paths.
          </Typography>

          {/* Hero Search Bar with live autocomplete */}
          <Box sx={{ mb: 3 }}>
            <SearchAutocomplete
              variant="hero"
              placeholder="What do you want to learn?"
              onSubmit={handleHeroSearch}
              showButton
              testIdPrefix="landing-hero-search"
            />
          </Box>

          {/* Popular Search Chips */}
          <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
            <Typography variant="body2" sx={{ opacity: 0.8, display: 'flex', alignItems: 'center', mr: 0.5 }}>
              Popular:
            </Typography>
            {popularSearches.map((term) => (
              <Chip
                key={term}
                label={term}
                size="small"
                clickable
                onClick={() => navigate(`/courses?search=${encodeURIComponent(term)}`)}
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.35)' },
                  backdropFilter: 'blur(4px)',
                }}
              />
            ))}
          </Stack>
        </Container>
      </Box>

      {/* Platform Stats Banner */}
      {stats && (
        <Box
          sx={{
            bgcolor: '#f8fafc',
            borderBottom: '1px solid',
            borderColor: 'divider',
            py: { xs: 3, md: 4 },
          }}
          data-testid="landing-stats-banner"
        >
          <Container maxWidth="lg">
            <Grid container spacing={3} justifyContent="center">
              {[
                { icon: <MenuBookIcon sx={{ color: '#6366f1' }} />, value: stats.TotalCourses, label: 'Courses' },
                { icon: <PeopleIcon sx={{ color: '#6366f1' }} />, value: stats.TotalStudents, label: 'Students Enrolled' },
                { icon: <SchoolIcon sx={{ color: '#6366f1' }} />, value: stats.FreeCourses, label: 'Free Courses' },
                { icon: <StarIcon sx={{ color: '#f59e0b' }} />, value: stats.TotalCategories, label: 'Categories' },
              ].map((stat, i) => (
                <Grid item xs={6} md={3} key={i}>
                  <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
                    <Avatar sx={{ bgcolor: alpha('#6366f1', 0.1), width: 48, height: 48 }}>
                      {stat.icon}
                    </Avatar>
                    <Box>
                      <Typography variant="h5" fontWeight="bold" color="text.primary">
                        {stat.value.toLocaleString()}+
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {stat.label}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>
      )}

      {/* Browse by Category Section */}
      {categories.length > 0 && (
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
          <Box sx={{ textAlign: 'center', mb: 5 }}>
            <Typography variant="h3" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, fontWeight: 700, mb: 1 }}>
              Browse by Category
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Explore courses across a wide range of topics
            </Typography>
          </Box>

          <Grid container spacing={2} justifyContent="center">
            {categories.map((cat) => (
              <Grid item xs={6} sm={4} md={3} lg={2.4} key={cat.Category}>
                <Card
                  onClick={() => navigate(`/courses?category=${cat.Category}`)}
                  sx={{
                    textAlign: 'center',
                    p: 2.5,
                    cursor: 'pointer',
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: 'none',
                    transition: 'all 0.25s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 20px rgba(99, 102, 241, 0.12)',
                    },
                  }}
                  data-testid={`landing-category-${cat.Category}`}
                >
                  <Avatar
                    sx={{
                      bgcolor: alpha('#6366f1', 0.1),
                      color: '#6366f1',
                      width: 56,
                      height: 56,
                      mx: 'auto',
                      mb: 1.5,
                    }}
                  >
                    {categoryIcons[cat.Category] || <OtherIcon />}
                  </Avatar>
                  <Typography variant="subtitle2" fontWeight={600} noWrap>
                    {categoryLabels[cat.Category] || cat.Category}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {cat.Count} course{cat.Count !== 1 ? 's' : ''}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      )}

      {/* Featured Courses Section */}
      {(loadingCourses || featuredCourses.length > 0) && (
        <Box sx={{ bgcolor: '#f8fafc', py: { xs: 6, md: 8 } }}>
          <Container maxWidth="lg">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
              <Box>
                <Typography variant="h3" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, fontWeight: 700, mb: 0.5 }}>
                  Top Rated Courses
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Highly rated courses loved by students
                </Typography>
              </Box>
              <Button
                onClick={() => navigate('/courses')}
                endIcon={<ArrowForwardIcon />}
                sx={{ textTransform: 'none', fontWeight: 500, display: { xs: 'none', sm: 'flex' } }}
              >
                View All
              </Button>
            </Box>

            <Grid container spacing={3}>
              {loadingCourses
                ? Array.from({ length: 4 }).map((_, i) => (
                    <Grid item xs={12} sm={6} md={3} key={i}>
                      <Skeleton variant="rounded" height={280} sx={{ borderRadius: 3 }} />
                    </Grid>
                  ))
                : featuredCourses.slice(0, 4).map((course) => (
                    <Grid item xs={12} sm={6} md={3} key={course.id}>
                      <LandingCourseCard course={course} onClick={() => navigate(`/courses/${course.id}`)} />
                    </Grid>
                  ))}
            </Grid>

            {/* Mobile "View All" button */}
            <Box sx={{ textAlign: 'center', mt: 3, display: { xs: 'block', sm: 'none' } }}>
              <Button onClick={() => navigate('/courses')} endIcon={<ArrowForwardIcon />} sx={{ textTransform: 'none' }}>
                View All Courses
              </Button>
            </Box>
          </Container>
        </Box>
      )}

      {/* Popular Courses Section */}
      {(loadingCourses || popularCourses.length > 0) && (
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box>
              <Typography variant="h3" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, fontWeight: 700, mb: 0.5 }}>
                Most Popular
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Courses our students love the most
              </Typography>
            </Box>
            <Button
              onClick={() => navigate('/courses')}
              endIcon={<ArrowForwardIcon />}
              sx={{ textTransform: 'none', fontWeight: 500, display: { xs: 'none', sm: 'flex' } }}
            >
              Browse All
            </Button>
          </Box>

          <Grid container spacing={3}>
            {loadingCourses
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Grid item xs={12} sm={6} md={3} key={i}>
                    <Skeleton variant="rounded" height={280} sx={{ borderRadius: 3 }} />
                  </Grid>
                ))
              : popularCourses.slice(0, 4).map((course) => (
                  <Grid item xs={12} sm={6} md={3} key={course.id}>
                    <LandingCourseCard course={course} onClick={() => navigate(`/courses/${course.id}`)} />
                  </Grid>
                ))}
          </Grid>

          <Box sx={{ textAlign: 'center', mt: 3, display: { xs: 'block', sm: 'none' } }}>
            <Button onClick={() => navigate('/courses')} endIcon={<ArrowForwardIcon />} sx={{ textTransform: 'none' }}>
              Browse All Courses
            </Button>
          </Box>
        </Container>
      )}

      {/* Features Section */}
      <Box sx={{ bgcolor: '#f8fafc', py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography
              variant="h3"
              sx={{
                fontSize: { xs: '1.75rem', md: '2.5rem' },
                fontWeight: 700,
                mb: 2,
                color: 'text.primary',
              }}
            >
              Why Choose Mishin Learn?
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ maxWidth: 600, mx: 'auto', lineHeight: 1.7 }}
            >
              Our platform combines cutting-edge AI technology with proven educational
              methodologies to create the most effective learning experience.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <Card
                  sx={{
                    height: '100%',
                    p: 3,
                    textAlign: 'center',
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-6px)',
                      boxShadow: '0 12px 24px rgba(99, 102, 241, 0.12)',
                      borderColor: 'primary.light',
                    },
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor: alpha('#6366f1', 0.1),
                      color: '#6366f1',
                      width: 72,
                      height: 72,
                      mx: 'auto',
                      mb: 2.5,
                    }}
                  >
                    {feature.icon}
                  </Avatar>
                  <CardContent sx={{ p: 0 }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 1.5 }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          color: 'white',
          py: { xs: 7, md: 10 },
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Typography
            variant="h3"
            sx={{
              fontSize: { xs: '1.75rem', md: '2.5rem' },
              fontWeight: 700,
              mb: 2,
            }}
          >
            Ready to Start Learning?
          </Typography>
          <Typography
            variant="h6"
            sx={{
              mb: 4,
              opacity: 0.9,
              lineHeight: 1.6,
              fontWeight: 300,
            }}
          >
            Join thousands of learners already using AI-powered education
            to achieve their goals faster.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/register')}
              sx={{
                bgcolor: '#6366f1',
                px: 5,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
                borderRadius: 3,
                '&:hover': { bgcolor: '#4f46e5' },
              }}
              data-testid="landing-cta-button"
            >
              Get Started Free
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/courses')}
              sx={{
                borderColor: 'rgba(255,255,255,0.5)',
                color: 'white',
                px: 5,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 500,
                borderRadius: 3,
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: 'rgba(255,255,255,0.08)',
                },
              }}
              data-testid="landing-browse-courses-button"
            >
              Browse Courses
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* Footer */}
      <PublicFooter />
    </Box>
  )
}

/**
 * Lightweight course card for the landing page.
 * Simpler than the full CourseCard component — no enroll/bookmark actions.
 */
const LandingCourseCard: React.FC<{ course: CourseCardData; onClick: () => void }> = ({ course, onClick }) => {
  const formatLevel = (level: string) => level.charAt(0).toUpperCase() + level.slice(1).toLowerCase()
  
  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 'none',
        transition: 'all 0.25s ease',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
          borderColor: 'primary.light',
        },
      }}
      data-testid={`landing-course-card-${course.id}`}
    >
      {/* Thumbnail */}
      <CardMedia
        component="div"
        sx={{
          height: 140,
          bgcolor: 'grey.100',
          backgroundImage: course.thumbnail ? `url(${course.thumbnail})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          p: 1,
        }}
      >
        {course.price === 0 ? (
          <Chip label="Free" size="small" sx={{ bgcolor: '#10b981', color: 'white', fontWeight: 600, fontSize: '0.7rem' }} />
        ) : (
          <Chip label={`$${course.price}`} size="small" sx={{ bgcolor: 'rgba(0,0,0,0.7)', color: 'white', fontWeight: 600, fontSize: '0.7rem' }} />
        )}
      </CardMedia>

      <CardContent sx={{ flex: 1, p: 2, pb: '12px !important', display: 'flex', flexDirection: 'column' }}>
        {/* Title */}
        <Typography
          variant="subtitle2"
          fontWeight={600}
          sx={{
            mb: 0.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.3,
            minHeight: '2.6em',
          }}
        >
          {course.title}
        </Typography>

        {/* Instructor */}
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75 }}>
          {course.instructorName}
        </Typography>

        {/* Rating */}
        {course.ratingCount > 0 && (
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.75 }}>
            <Typography variant="body2" fontWeight={700} sx={{ color: '#b45309' }}>
              {course.rating.toFixed(1)}
            </Typography>
            <Rating value={course.rating} precision={0.5} size="small" readOnly sx={{ '& .MuiRating-icon': { fontSize: '0.9rem' } }} />
            <Typography variant="caption" color="text.secondary">
              ({course.ratingCount.toLocaleString()})
            </Typography>
          </Stack>
        )}

        {/* Spacer */}
        <Box sx={{ flex: 1 }} />

        {/* Level + Enrollment */}
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Chip
            label={formatLevel(course.level)}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.65rem', height: 22 }}
          />
          <Typography variant="caption" color="text.secondary">
            {course.enrollmentCount.toLocaleString()} students
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default LandingPage