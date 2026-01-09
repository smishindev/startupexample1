import React, { useRef } from 'react';
import { Box, Paper, Typography, Button, Chip } from '@mui/material';
import { CheckCircle, Check } from '@mui/icons-material';
import DOMPurify from 'dompurify';
import { LessonContent } from '../../services/lessonApi';

interface TextContentItemProps {
  content: LessonContent;
  index: number;
  total: number;
  onComplete: () => void;
  isCompleted: boolean;
}

export const TextContentItem: React.FC<TextContentItemProps> = ({
  content,
  index,
  total: _total,
  onComplete,
  isCompleted
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // Calculate read time (200 words per minute)
  const htmlContent = content.data?.html || content.data?.content || '';
  const textOnly = htmlContent.replace(/<[^>]*>/g, '').trim();
  const wordCount = textOnly ? textOnly.split(/\s+/).length : 0;
  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  const handleMarkAsRead = () => {
    onComplete();
  };

  const cleanHtml = DOMPurify.sanitize(htmlContent, {
    ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'a', 'code', 'pre', 'blockquote', 'br', 'img'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title']
  });

  const title = content.data?.title || `Text Content #${index + 1}`;

  return (
    <Paper elevation={2} sx={{ overflow: 'hidden', borderRadius: 2 }}>
      {/* Header */}
      <Box sx={{ p: 2, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {readTimeMinutes} min read • {wordCount} words
            </Typography>
          </Box>
          {isCompleted && (
            <Chip
              icon={<CheckCircle />}
              label="Read"
              color="success"
              size="small"
            />
          )}
        </Box>
      </Box>

      {/* Content */}
      <Box
        ref={contentRef}
        sx={{
          p: 3,
          '& h1': { fontSize: '2rem', fontWeight: 700, mb: 2, mt: 3 },
          '& h2': { fontSize: '1.75rem', fontWeight: 600, mb: 2, mt: 2.5 },
          '& h3': { fontSize: '1.5rem', fontWeight: 600, mb: 1.5, mt: 2 },
          '& p': { mb: 2, lineHeight: 1.7 },
          '& ul, & ol': { mb: 2, pl: 3 },
          '& li': { mb: 1 },
          '& code': { bgcolor: 'grey.100', px: 1, py: 0.5, borderRadius: 0.5, fontSize: '0.875rem' },
          '& pre': { bgcolor: 'grey.100', p: 2, borderRadius: 1, overflow: 'auto', mb: 2 },
          '& blockquote': { borderLeft: 4, borderColor: 'primary.main', pl: 2, ml: 0, fontStyle: 'italic', color: 'text.secondary' },
          '& a': { color: 'primary.main', textDecoration: 'underline' }
        }}
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
      />

      {/* Mark as Read Button */}
      {!isCompleted && (
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
          <Button
            variant="outlined"
            startIcon={<Check />}
            onClick={handleMarkAsRead}
            fullWidth
          >
            Mark as Read
          </Button>
        </Box>
      )}
    </Paper>
  );
};
