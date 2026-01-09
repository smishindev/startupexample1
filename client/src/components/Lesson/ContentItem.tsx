import React from 'react';
import { VideoContentItem } from './VideoContentItem';
import { TextContentItem } from './TextContentItem';
import { QuizContentItem } from './QuizContentItem';
import { Alert } from '@mui/material';
import { LessonContent } from '../../services/lessonApi';

interface ContentItemProps {
  content: LessonContent;
  index: number;
  total: number;
  lessonId: string;
  courseId: string;
  isInstructorPreview: boolean;
  onComplete: () => void;
  isCompleted: boolean;
  progressData?: any;
}

/**
 * ContentItem - Router component that renders the appropriate content type
 * Supports: video, text, quiz
 */
export const ContentItem: React.FC<ContentItemProps> = (props) => {
  const { content } = props;

  switch (content.type) {
    case 'video':
      return <VideoContentItem {...props} />;
    case 'text':
      return <TextContentItem {...props} />;
    case 'quiz':
      return <QuizContentItem {...props} />;
    default:
      return (
        <Alert severity="warning">
          Unknown content type: {(content as any).type}
        </Alert>
      );
  }
};
