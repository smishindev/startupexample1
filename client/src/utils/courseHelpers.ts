/**
 * Course utility functions for consistent formatting and styling across the application
 */

/**
 * Formats category names from snake_case to Title Case
 * @param category - Category string in snake_case format (e.g., 'data_science')
 * @returns Formatted category string (e.g., 'Data Science')
 */
export const formatCategory = (category?: string): string => {
  if (!category) return '';
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Gets the appropriate gradient based on course category
 * @param category - Category string (e.g., 'programming', 'data_science')
 * @returns CSS gradient string
 */
export const getCategoryGradient = (category?: string): string => {
  const cat = category?.toLowerCase() || '';
  
  switch (cat) {
    case 'programming':
      return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    case 'data_science':
      return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
    case 'design':
      return 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
    case 'business':
      return 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)';
    case 'marketing':
      return 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
    case 'language':
      return 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)';
    case 'mathematics':
      return 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)';
    case 'science':
      return 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)';
    case 'arts':
      return 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)';
    case 'other':
      return 'linear-gradient(135deg, #cfd9df 0%, #e2ebf0 100%)';
    default:
      return 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
  }
};

/**
 * Gets the color for a difficulty level badge
 * @param level - Course difficulty level
 * @param theme - MUI theme object
 * @returns Color string from theme
 */
export const getLevelColor = (level: 'Beginner' | 'Intermediate' | 'Advanced', theme: any): string => {
  switch (level) {
    case 'Beginner': 
      return theme.palette.success.main;
    case 'Intermediate': 
      return theme.palette.warning.main;
    case 'Advanced': 
      return theme.palette.error.main;
    default: 
      return theme.palette.grey[500];
  }
};
