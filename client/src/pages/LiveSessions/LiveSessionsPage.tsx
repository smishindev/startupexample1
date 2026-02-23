/**
 * LiveSessionsPage Component
 * Main page for live sessions with role-based views
 * Phase 2 - Collaborative Features
 */

import React, { useState, useEffect } from 'react';
import { Box, Paper } from '@mui/material';
import { HeaderV5 as Header } from '../../components/Navigation/HeaderV5';
import { PageContainer } from '../../components/Responsive';
import { InstructorSessionsList } from '../../components/LiveSessions/InstructorSessionsList';
import { StudentSessionsList } from '../../components/LiveSessions/StudentSessionsList';
import { useAuthStore } from '../../stores/authStore';
import { instructorApi } from '../../services/instructorApi';
import { enrollmentApi } from '../../services/enrollmentApi';

interface Course {
  Id: string;
  Title: string;
}

export const LiveSessionsPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const isInstructor = user?.role === 'instructor';

  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        if (isInstructor) {
          // Fetch instructor's own courses (all of them)
          const response = await instructorApi.getCourses(undefined, 1, 9999);
          console.log('Instructor courses:', response);
          setCourses(
            response.courses.map((c: any) => ({
              Id: c.Id || c.id,
              Title: c.Title || c.title,
            }))
          );
        } else {
          // Fetch student's enrolled courses
          const response = await enrollmentApi.getMyEnrollments(1, 10000);
          console.log('Student enrollments:', response);
          const mappedCourses = response.enrollments
            .filter((e: any) => e.courseId || e.CourseId)
            .map((e: any) => ({
              Id: e.courseId || e.CourseId,
              Title: e.Title || e.courseTitle || 'Untitled Course',
            }));
          console.log('Mapped courses:', mappedCourses);
          setCourses(mappedCourses);
        }
      } catch (error) {
        console.error('Failed to fetch courses:', error);
      }
    };

    fetchCourses();
  }, [isInstructor]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: (theme) => theme.palette.background.default,
      }}
    >
      <Header />
      
      <PageContainer>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3, md: 4 },
            borderRadius: 3,
            backgroundColor: (theme) => theme.palette.background.paper,
          }}
        >
          {isInstructor ? (
            <InstructorSessionsList courses={courses} />
          ) : (
            <StudentSessionsList enrolledCourses={courses} />
          )}
        </Paper>
      </PageContainer>
    </Box>
  );
};
