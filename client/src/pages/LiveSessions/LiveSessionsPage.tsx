/**
 * LiveSessionsPage Component
 * Main page for live sessions with role-based views
 * Phase 2 - Collaborative Features
 */

import React, { useState, useEffect } from 'react';
import { Box, Container, Paper } from '@mui/material';
import { HeaderV4 as Header } from '../../components/Navigation/HeaderV4';
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
          // Fetch instructor's courses
          const instructorCourses = await instructorApi.getCourses();
          console.log('Instructor courses:', instructorCourses);
          setCourses(
            instructorCourses.map((c: any) => ({
              Id: c.Id || c.id,
              Title: c.Title || c.title,
            }))
          );
        } else {
          // Fetch student's enrolled courses
          const enrollments = await enrollmentApi.getMyEnrollments();
          console.log('Student enrollments:', enrollments);
          const mappedCourses = enrollments
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
      
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
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
      </Container>
    </Box>
  );
};
