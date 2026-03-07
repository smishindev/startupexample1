import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Grid,
  Paper,
  Chip,
  Skeleton,
  Alert,
  Rating,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  People as PeopleIcon,
  MenuBook as MenuBookIcon,
  Star as StarIcon,
  RateReview as ReviewIcon,
  Language as WebsiteIcon,
  CalendarToday as CalendarIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { PageContainer } from '../../components/Responsive';
import { CourseCard, Course } from '../../components/Course/CourseCard';
import { useAuthStore } from '../../stores/authStore';
import instructorProfileApi, { InstructorPublicProfile, InstructorPublicCourse } from '../../services/instructorProfileApi';
import { formatCategory } from '../../utils/courseHelpers';

// LinkedIn icon as inline SVG (MUI doesn't ship LinkedIn in all icon sets)
const LinkedInIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
  </svg>
);

const TwitterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

/**
 * Convert an InstructorPublicCourse to the Course shape expected by CourseCard
 */
function toCourseCardData(c: InstructorPublicCourse, instructorName: string, instructorId: string, instructorAvatar: string | null): Course {
  const hours = Math.floor((c.duration || 0) / 60);
  const mins = (c.duration || 0) % 60;
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    instructor: { id: instructorId, name: instructorName, avatar: instructorAvatar || undefined },
    thumbnail: c.thumbnail || '',
    duration: hours > 0 ? `${hours}h ${mins}m` : `${mins}m`,
    level: (c.level.charAt(0).toUpperCase() + c.level.slice(1)) as Course['level'],
    rating: c.rating || 0,
    reviewCount: c.ratingCount || 0,
    enrolledStudents: c.enrollmentCount || 0,
    price: c.price || 0,
    category: formatCategory(c.category || 'General'),
    tags: []
  };
}

const InstructorProfilePage: React.FC = () => {
  const { instructorId } = useParams<{ instructorId: string }>();
  const navigate = useNavigate();
  const { user: authUser } = useAuthStore();
  const isAuthenticated = !!authUser;

  const [profile, setProfile] = useState<InstructorPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (instructorId) {
      loadProfile(instructorId);
    }
  }, [instructorId]);

  const loadProfile = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await instructorProfileApi.getPublicProfile(id);
      setProfile(data);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 404) {
        setError('Instructor not found.');
      } else {
        setError('Failed to load instructor profile. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCourseClick = (courseId: string) => {
    navigate(`/courses/${courseId}`);
  };

  // Loading skeleton
  if (loading) {
    return (
      <PageContainer disableBottomPad={!isAuthenticated} sx={{ pt: 2 }}>
        {/* Hero skeleton */}
        <Paper elevation={0} sx={{ p: { xs: 3, sm: 4 }, mb: 4, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3, alignItems: { xs: 'center', sm: 'flex-start' } }}>
            <Skeleton variant="circular" width={120} height={120} />
            <Box sx={{ flex: 1, width: '100%' }}>
              <Skeleton variant="text" width="60%" height={40} />
              <Skeleton variant="text" width="40%" height={24} />
              <Skeleton variant="text" width="80%" height={20} sx={{ mt: 1 }} />
            </Box>
          </Box>
        </Paper>
        {/* Stats skeleton */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={6} sm={6} md={3} key={i}>
              <Skeleton variant="rounded" height={100} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
        {/* Courses skeleton */}
        <Skeleton variant="text" width={200} height={36} sx={{ mb: 2 }} />
        <Grid container spacing={3}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rounded" height={320} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </PageContainer>
    );
  }

  // Error state
  if (error || !profile) {
    return (
      <PageContainer disableBottomPad={!isAuthenticated} sx={{ pt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <IconButton onClick={() => navigate(-1)} size="small">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6">Instructor Profile</Typography>
        </Box>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error || 'Instructor not found.'}
        </Alert>
      </PageContainer>
    );
  }

  const fullName = `${profile.firstName} ${profile.lastName}`;
  const hasSocialLinks = profile.websiteUrl || profile.linkedInUrl || profile.twitterUrl;
  const joinedDate = new Date(profile.joinedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const statCards = [
    { label: 'Total Students', value: profile.stats.totalStudents.toLocaleString(), icon: <PeopleIcon sx={{ fontSize: { xs: 28, sm: 36 }, color: 'primary.main' }} /> },
    { label: 'Courses', value: profile.stats.totalCourses.toString(), icon: <MenuBookIcon sx={{ fontSize: { xs: 28, sm: 36 }, color: 'success.main' }} /> },
    { label: 'Avg Rating', value: profile.stats.averageRating > 0 ? profile.stats.averageRating.toFixed(1) : '—', icon: <StarIcon sx={{ fontSize: { xs: 28, sm: 36 }, color: 'warning.main' }} /> },
    { label: 'Reviews', value: profile.stats.totalReviews.toLocaleString(), icon: <ReviewIcon sx={{ fontSize: { xs: 28, sm: 36 }, color: 'info.main' }} /> }
  ];

  const courses: Course[] = profile.courses.map((c) =>
    toCourseCardData(c, fullName, profile.id, profile.avatar)
  );

  return (
    <PageContainer disableBottomPad={!isAuthenticated} sx={{ pt: 2 }}>
      {/* Back button */}
      <Box sx={{ mb: 2 }}>
        <IconButton onClick={() => navigate(-1)} size="small" sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
      </Box>

      {/* Hero Section */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 4, md: 5 },
          mb: 4,
          borderRadius: 3,
          background: (theme) =>
            `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Decorative circle */}
        <Box
          sx={{
            position: 'absolute',
            top: -60,
            right: -60,
            width: 200,
            height: 200,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.06)',
            display: { xs: 'none', md: 'block' }
          }}
        />

        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 3 },
          alignItems: { xs: 'center', sm: 'flex-start' },
          textAlign: { xs: 'center', sm: 'left' }
        }}>
          <Avatar
            src={profile.avatar || undefined}
            sx={{
              width: { xs: 100, sm: 120 },
              height: { xs: 100, sm: 120 },
              border: '4px solid rgba(255,255,255,0.3)',
              fontSize: { xs: '2.5rem', sm: '3rem' }
            }}
          >
            {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
          </Avatar>

          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
              {fullName}
            </Typography>

            {profile.headline && (
              <Typography variant="h6" sx={{ fontWeight: 400, opacity: 0.9, mb: 1, fontSize: { xs: '0.95rem', sm: '1.15rem' } }}>
                {profile.headline}
              </Typography>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, justifyContent: { xs: 'center', sm: 'flex-start' }, flexWrap: 'wrap' }}>
              <Chip
                label="Instructor"
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600 }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CalendarIcon sx={{ fontSize: 16, opacity: 0.8 }} />
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Joined {joinedDate}
                </Typography>
              </Box>
            </Box>

            {/* Average rating */}
            {profile.stats.averageRating > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                <Rating value={profile.stats.averageRating} precision={0.1} readOnly size="small" sx={{ '& .MuiRating-iconFilled': { color: '#ffd700' }, '& .MuiRating-iconEmpty': { color: 'rgba(255,255,255,0.3)' } }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {profile.stats.averageRating.toFixed(1)} ({profile.stats.totalReviews} reviews)
                </Typography>
              </Box>
            )}

            {/* Social links */}
            {hasSocialLinks && (
              <Box sx={{ display: 'flex', gap: 1, mt: 1.5, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                {profile.websiteUrl && (
                  <Tooltip title="Website">
                    <IconButton
                      size="small"
                      href={profile.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}
                    >
                      <WebsiteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {profile.linkedInUrl && (
                  <Tooltip title="LinkedIn">
                    <IconButton
                      size="small"
                      href={profile.linkedInUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}
                    >
                      <LinkedInIcon />
                    </IconButton>
                  </Tooltip>
                )}
                {profile.twitterUrl && (
                  <Tooltip title="X / Twitter">
                    <IconButton
                      size="small"
                      href={profile.twitterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}
                    >
                      <TwitterIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Stat Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {statCards.map((stat) => (
          <Grid item xs={6} sm={6} md={3} key={stat.label}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 2.5 },
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                textAlign: 'center'
              }}
            >
              <Box sx={{ mb: 1 }}>
                {stat.icon}
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                {stat.value}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {stat.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Bio Section */}
      {profile.bio && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3, md: 4 },
            mb: 4,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            About {profile.firstName}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-line', lineHeight: 1.8 }}>
            {profile.bio}
          </Typography>
        </Paper>
      )}

      {/* Published Courses */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
          {profile.stats.totalCourses > 0
            ? `Courses by ${profile.firstName} (${profile.stats.totalCourses})`
            : 'No courses published yet'}
        </Typography>

        {courses.length > 0 ? (
          <Grid container spacing={3}>
            {courses.map((course) => (
              <Grid item xs={12} sm={6} md={4} key={course.id}>
                <CourseCard
                  course={course}
                  variant="default"
                  onClick={handleCourseClick}
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Paper
            elevation={0}
            sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <MenuBookIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body1" color="text.secondary">
              This instructor hasn't published any courses yet.
            </Typography>
          </Paper>
        )}
      </Box>
    </PageContainer>
  );
};

export default InstructorProfilePage;
