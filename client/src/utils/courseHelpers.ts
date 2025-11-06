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
 * @param category - Category string
 * @returns CSS gradient string
 */
export const getCategoryGradient = (category?: string): string => {
  const cat = category?.toLowerCase() || '';
  
  if (cat.includes('programming') || cat.includes('web') || cat.includes('development')) {
    return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  } else if (cat.includes('data') || cat.includes('science')) {
    return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
  } else if (cat.includes('design') || cat.includes('ui')) {
    return 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
  } else if (cat.includes('business') || cat.includes('marketing')) {
    return 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)';
  } else if (cat.includes('mobile')) {
    return 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
  } else if (cat.includes('devops') || cat.includes('cloud')) {
    return 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)';
  } else if (cat.includes('machine') || cat.includes('ai') || cat.includes('ml')) {
    return 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)';
  }
  
  // Default gradient
  return 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
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
