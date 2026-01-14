import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

/**
 * Redirect component for legacy lessons route
 * Redirects /instructor/courses/:courseId/lessons to /instructor/courses/:courseId/edit?tab=1
 */
export const LessonsRedirect: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (courseId) {
      navigate(`/instructor/courses/${courseId}/edit?tab=1`, { replace: true });
    }
  }, [courseId, navigate]);

  return null;
};
