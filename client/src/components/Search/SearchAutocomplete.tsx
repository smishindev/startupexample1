/**
 * SearchAutocomplete Component
 * Udemy-style live search dropdown that shows matching courses as the user types.
 * Used in PublicHeader and LandingPage hero search.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  InputBase,
  Paper,
  CircularProgress,
  Avatar,
  Rating,
  Popper,
  ClickAwayListener,
  Fade,
  alpha,
  Button,
  Chip,
} from '@mui/material';
import {
  Search as SearchIcon,
  ArrowForward as ArrowForwardIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { coursesApi, Course } from '../../services/coursesApi';

// ─── Styled Components ────────────────────────────────────────────────

const SearchContainer = styled('div')<{ variant: 'header' | 'hero' }>(
  ({ theme, variant }) => ({
    position: 'relative',
    width: '100%',
    ...(variant === 'header'
      ? {
          maxWidth: 480,
          borderRadius: theme.shape.borderRadius * 3,
          backgroundColor: alpha(theme.palette.common.white, 0.9),
          border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: alpha(theme.palette.common.white, 1),
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          },
          '&:focus-within': {
            backgroundColor: alpha(theme.palette.common.white, 1),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.5)}`,
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
          },
        }
      : {
          maxWidth: 600,
          margin: '0 auto',
          borderRadius: theme.shape.borderRadius * 4,
          backgroundColor: 'rgba(255, 255, 255, 1)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          overflow: 'visible',
        }),
  })
);

const SearchInputWrapper = styled('div')<{ variant: 'header' | 'hero' }>(
  ({ variant }) => ({
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    ...(variant === 'hero'
      ? { borderRadius: '24px', overflow: 'hidden' }
      : {}),
  })
);

const StyledInput = styled(InputBase, {
  shouldForwardProp: (prop) => prop !== 'searchVariant',
})<{ searchVariant?: 'header' | 'hero' }>(
  ({ theme, searchVariant }) => ({
    color: theme.palette.text.primary,
    flex: 1,
    '& .MuiInputBase-input': {
      ...(searchVariant === 'hero'
        ? {
            padding: theme.spacing(1.8, 2, 1.8, 2.5),
            fontSize: '1.05rem',
          }
        : {
            padding: theme.spacing(1, 1, 1, 0),
            paddingLeft: `calc(1em + ${theme.spacing(3)})`,
            fontSize: '0.9rem',
          }),
      '&::placeholder': {
        color: theme.palette.text.secondary,
        opacity: searchVariant === 'hero' ? 0.7 : 0.8,
      },
    },
  })
);

// ─── Result Item ──────────────────────────────────────────────────────

const ResultItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  padding: theme.spacing(1.2, 2),
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.06),
  },
  '&[data-focused="true"]': {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
  },
}));

// ─── Props ────────────────────────────────────────────────────────────

interface SearchAutocompleteProps {
  /** Visual variant: compact for header, larger for hero section */
  variant: 'header' | 'hero';
  /** Placeholder text */
  placeholder?: string;
  /** Called on form submission (Enter key) with the query string */
  onSubmit?: (query: string) => void;
  /** Additional test ID prefix */
  testIdPrefix?: string;
  /** Show the "Search" button (hero variant) */
  showButton?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────

export const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({
  variant,
  placeholder = 'What do you want to learn?',
  onSubmit,
  testIdPrefix = 'search-autocomplete',
  showButton = false,
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0); // Guard against stale responses from out-of-order API calls

  // Debounced search with staleness guard
  const doSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const thisRequestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const courses = await coursesApi.searchCourses(searchQuery.trim(), 6);
      // Only apply results if this is still the latest request (prevents stale overwrites)
      if (thisRequestId === requestIdRef.current) {
        setResults(courses);
      }
    } catch (err) {
      if (thisRequestId === requestIdRef.current) {
        console.error('Search autocomplete error:', err);
        setResults([]);
      }
    } finally {
      if (thisRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setFocusedIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length >= 2) {
      setIsOpen(true);
      setLoading(true);
      debounceRef.current = setTimeout(() => {
        doSearch(value);
      }, 300);
    } else {
      setResults([]);
      setIsOpen(false);
      setLoading(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;

    // Cancel any pending debounced search — user is navigating away
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setIsOpen(false);
    if (onSubmit) {
      onSubmit(query.trim());
    } else {
      navigate(`/courses?search=${encodeURIComponent(query.trim())}`);
    }
    setQuery('');
  };

  const handleResultClick = (courseId: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setIsOpen(false);
    setQuery('');
    navigate(`/courses/${courseId}`);
  };

  const handleViewAll = () => {
    if (!query.trim()) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setIsOpen(false);
    navigate(`/courses?search=${encodeURIComponent(query.trim())}`);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' && query.trim().length >= 2) {
        setIsOpen(true);
      }
      return;
    }

    const totalItems = results.length + (results.length > 0 ? 1 : 0); // +1 for "View all"

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (totalItems > 0) {
          setFocusedIndex((prev) => (prev + 1) % totalItems);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (totalItems > 0) {
          setFocusedIndex((prev) => (prev - 1 + totalItems) % totalItems);
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < results.length) {
          handleResultClick(results[focusedIndex].Id);
        } else if (focusedIndex === results.length) {
          handleViewAll();
        } else {
          handleSubmit();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
    }
  };

  const handleFocus = () => {
    if (query.trim().length >= 2 && (results.length > 0 || loading)) {
      setIsOpen(true);
    }
  };

  const handleClickAway = () => {
    setIsOpen(false);
    setFocusedIndex(-1);
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const showDropdown = isOpen && (loading || results.length > 0 || (query.trim().length >= 2 && !loading && results.length === 0));

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <SearchContainer ref={containerRef} variant={variant}>
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <SearchInputWrapper variant={variant}>
            {/* Search Icon */}
            {variant === 'header' ? (
              <Box
                sx={{
                  padding: '0 12px',
                  height: '100%',
                  position: 'absolute',
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'text.secondary',
                }}
              >
                <SearchIcon fontSize="small" />
              </Box>
            ) : (
              <SearchIcon sx={{ ml: 2.5, color: 'text.secondary' }} />
            )}

            {/* Input */}
            <StyledInput
              inputRef={inputRef}
              placeholder={placeholder}
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              searchVariant={variant}
              inputProps={{
                'aria-label': 'search courses',
                'data-testid': `${testIdPrefix}-input`,
                autoComplete: 'off',
              }}
            />

            {/* Loading spinner inside input */}
            {loading && (
              <CircularProgress
                size={18}
                sx={{ mr: variant === 'hero' ? 1 : 1.5, color: 'text.secondary' }}
              />
            )}

            {/* Search button (hero variant) */}
            {showButton && (
              <Button
                type="submit"
                variant="contained"
                sx={{
                  borderRadius: '0 24px 24px 0',
                  px: 3,
                  py: 1.8,
                  textTransform: 'none',
                  fontWeight: 600,
                  minWidth: 100,
                  boxShadow: 'none',
                }}
                data-testid={`${testIdPrefix}-button`}
              >
                Search
              </Button>
            )}
          </SearchInputWrapper>
        </form>

        {/* Dropdown Results */}
        <Popper
          open={showDropdown}
          anchorEl={containerRef.current}
          placement="bottom-start"
          transition
          disablePortal
          style={{
            width: (() => {
              const containerWidth = containerRef.current?.offsetWidth ?? 240;
              if (variant === 'header') {
                return Math.min(Math.max(containerWidth, 400), window.innerWidth - 16);
              }
              return containerWidth || 'auto';
            })(),
            zIndex: 1300,
          }}
          modifiers={[
            {
              name: 'offset',
              options: { offset: [0, 4] },
            },
          ]}
        >
          {({ TransitionProps }) => (
            <Fade {...TransitionProps} timeout={200}>
              <Paper
                elevation={8}
                sx={{
                  maxHeight: 420,
                  overflowY: 'auto',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  mt: 0.5,
                }}
                data-testid={`${testIdPrefix}-dropdown`}
              >
                {/* Loading state */}
                {loading && results.length === 0 && (
                  <Box sx={{ py: 3, textAlign: 'center' }}>
                    <CircularProgress size={24} sx={{ mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Searching courses...
                    </Typography>
                  </Box>
                )}

                {/* No results */}
                {!loading && results.length === 0 && query.trim().length >= 2 && (
                  <Box sx={{ py: 3, px: 2, textAlign: 'center' }}>
                    <SchoolIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      No courses found for "<strong>{query.trim()}</strong>"
                    </Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                      Try different keywords or browse all courses
                    </Typography>
                  </Box>
                )}

                {/* Course results */}
                {results.map((course, index) => (
                  <ResultItem
                    key={course.Id}
                    onClick={() => handleResultClick(course.Id)}
                    data-focused={focusedIndex === index ? 'true' : 'false'}
                    data-testid={`${testIdPrefix}-result-${index}`}
                  >
                    {/* Thumbnail */}
                    <Avatar
                      variant="rounded"
                      src={course.Thumbnail}
                      sx={{
                        width: 48,
                        height: 36,
                        borderRadius: 1,
                        bgcolor: 'grey.200',
                        fontSize: '0.7rem',
                      }}
                    >
                      {course.Title?.charAt(0)}
                    </Avatar>

                    {/* Course info */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        noWrap
                        sx={{ lineHeight: 1.3 }}
                      >
                        {highlightMatch(course.Title, query)}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {course.Instructor.FirstName} {course.Instructor.LastName}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">·</Typography>
                        <Rating
                          value={course.Rating}
                          readOnly
                          precision={0.1}
                          size="small"
                          sx={{ fontSize: '0.75rem' }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {course.Rating > 0 ? course.Rating.toFixed(1) : ''}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Price / Level chip */}
                    <Box sx={{ flexShrink: 0, textAlign: 'right' }}>
                      {course.Price > 0 ? (
                        <Typography variant="body2" fontWeight={700} color="text.primary">
                          ${course.Price.toFixed(2)}
                        </Typography>
                      ) : (
                        <Chip
                          label="Free"
                          size="small"
                          color="success"
                          sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600 }}
                        />
                      )}
                    </Box>
                  </ResultItem>
                ))}

                {/* "View all results" link */}
                {results.length > 0 && (
                  <Box
                    onClick={handleViewAll}
                    data-focused={focusedIndex === results.length ? 'true' : 'false'}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 0.5,
                      py: 1.5,
                      cursor: 'pointer',
                      borderTop: '1px solid',
                      borderColor: 'divider',
                      color: 'primary.main',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      transition: 'background-color 0.15s ease',
                      '&:hover': { bgcolor: 'action.hover' },
                      ...(focusedIndex === results.length
                        ? { bgcolor: (theme: any) => alpha(theme.palette.primary.main, 0.08) }
                        : {}),
                    }}
                    data-testid={`${testIdPrefix}-view-all`}
                  >
                    View all results for "{query.trim()}"
                    <ArrowForwardIcon sx={{ fontSize: 16 }} />
                  </Box>
                )}
              </Paper>
            </Fade>
          )}
        </Popper>
      </SearchContainer>
    </ClickAwayListener>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────

/** Highlight matching text in course title */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const splitRegex = new RegExp(`(${escapeRegex(query.trim())})`, 'gi');
  const parts = text.split(splitRegex);
  // Use a separate regex WITHOUT the g flag for .test() — global flag maintains
  // lastIndex state across calls, causing alternating true/false results.
  const matchRegex = new RegExp(`^${escapeRegex(query.trim())}$`, 'i');

  return parts.map((part, i) =>
    matchRegex.test(part) ? (
      <Box component="span" key={i} sx={{ fontWeight: 800, color: 'primary.main' }}>
        {part}
      </Box>
    ) : (
      part
    )
  );
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
