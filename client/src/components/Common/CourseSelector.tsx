/**
 * CourseSelector — Reusable course dropdown with lazy rendering, type-to-search,
 * infinite scroll, and keyboard navigation.
 *
 * Replaces 9 independent course dropdown implementations across the platform
 * with a single, consistent component.
 *
 * Created: February 19, 2026
 *
 * Features:
 * - MUI Autocomplete with IntersectionObserver + scroll-based lazy rendering
 * - Client-side type-to-search across the full course list
 * - Single-select and multi-select modes
 * - Optional "All Courses" / synthetic first option
 * - Custom renderOption override for rich item rendering (e.g., Tutoring page)
 * - Accepts both PascalCase ({Id, Title}) and camelCase ({id, title}) course objects
 * - Preserves per-page test IDs
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  Chip,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import type { AutocompleteRenderOptionState } from '@mui/material';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Normalised internal course shape — always PascalCase */
export interface CourseOption {
  Id: string;
  Title: string;
  /** Passthrough for the raw source object so consumers can read extra fields */
  _raw?: any;
}

/** Props accepted by the component */
export interface CourseSelectorProps {
  /** Full course list (PascalCase or camelCase — auto-normalised) */
  courses: any[];

  // --- Value ---
  /** Currently selected course id(s).  string for single, string[] for multiple */
  value: string | string[] | null | undefined;
  /** Fires with the new id (single) or id[] (multiple) */
  onChange: (value: any) => void;

  // --- Behaviour ---
  /** Allow selecting multiple courses (chips). Default: false */
  multiple?: boolean;
  /** Disable the component */
  disabled?: boolean;
  /** If true, the field cannot be cleared (disableClearable). Default: false */
  required?: boolean;

  // --- Special options ---
  /**
   * Synthetic first option shown at the top (e.g. "All Courses Overview").
   * In single mode, when this option is selected, onChange fires its `value`.
   */
  allOption?: { value: string; label: string };

  // --- Exclude ---
  /** Course IDs to exclude from the options list */
  excludeIds?: string[];

  // --- Appearance ---
  label?: string;
  placeholder?: string;
  size?: 'small' | 'medium';
  /** Show helper text with "X of Y courses loaded" */
  showHelperText?: boolean;
  sx?: SxProps<Theme>;
  /** Wrapper FormControl fullWidth — defaults to true */
  fullWidth?: boolean;

  // --- Testing ---
  testId?: string;
  inputTestId?: string;

  // --- Custom rendering ---
  /**
   * Override the default option renderer.
   * Receives the normalised CourseOption plus the raw source object.
   */
  renderCourseOption?: (
    props: React.HTMLAttributes<HTMLLIElement>,
    option: CourseOption,
    state: AutocompleteRenderOptionState,
  ) => React.ReactNode;

  /**
   * Custom chip renderer for multi-select mode.
   * If not provided, default Chip with option.Title is rendered.
   */
  renderTag?: (option: CourseOption, index: number, getTagProps: any) => React.ReactNode;

  // --- Lazy rendering tuning ---
  /** How many items to render initially (default 50) */
  initialDisplayCount?: number;
  /** How many items to add per scroll/intersection load (default 12) */
  loadMoreCount?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalise any course-like object to {Id, Title, _raw} */
const normaliseCourse = (c: any): CourseOption => {
  const id = c.Id ?? c.id ?? '';
  const title = c.Title ?? c.title ?? '';
  return { Id: String(id), Title: String(title), _raw: c };
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const CourseSelector: React.FC<CourseSelectorProps> = ({
  courses,
  value,
  onChange,
  multiple = false,
  disabled = false,
  required = false,
  allOption,
  excludeIds,
  label,
  placeholder = 'Search courses...',
  size = 'medium',
  showHelperText = true,
  sx,
  fullWidth = true,
  testId,
  inputTestId,
  renderCourseOption,
  renderTag,
  initialDisplayCount = 50,
  loadMoreCount = 12,
}) => {
  // --- Normalise courses once ---
  const normalised = React.useMemo(() => {
    let list = courses.map(normaliseCourse);
    if (excludeIds && excludeIds.length > 0) {
      const set = new Set(excludeIds);
      list = list.filter((c) => !set.has(c.Id));
    }
    return list;
  }, [courses, excludeIds]);

  // --- Lazy rendering state ---
  const [displayCount, setDisplayCount] = useState(initialDisplayCount);

  // Reset display count when courses change (e.g. modal reopens)
  useEffect(() => {
    setDisplayCount(initialDisplayCount);
  }, [normalised, initialDisplayCount]);

  const displayedCourses = React.useMemo(
    () => normalised.slice(0, displayCount),
    [normalised, displayCount],
  );

  // --- Synthetic "all" option (memoised on primitive values to keep dep arrays stable) ---
  const allOpt = React.useMemo<CourseOption | null>(
    () => allOption ? { Id: allOption.value, Title: allOption.label } : null,
    [allOption?.value, allOption?.label],
  );

  // --- Build visible options ---
  const visibleOptions = React.useMemo(() => {
    const opts: CourseOption[] = [];

    // Prepend allOption if provided (single mode only)
    if (allOpt && !multiple) {
      opts.push(allOpt);
    }

    // Ensure currently-selected course(s) are always in the list
    if (multiple) {
      const ids = (value as string[]) || [];
      ids.forEach((id) => {
        if (!displayedCourses.find((c) => c.Id === id)) {
          const found = normalised.find((c) => c.Id === id);
          if (found) opts.push(found);
        }
      });
    } else {
      const selectedId = value as string;
      if (
        selectedId &&
        selectedId !== allOpt?.Id &&
        !displayedCourses.find((c) => c.Id === selectedId)
      ) {
        const found = normalised.find((c) => c.Id === selectedId);
        if (found) opts.push(found);
      }
    }

    opts.push(...displayedCourses);
    return opts;
  }, [displayedCourses, normalised, value, allOpt, multiple]);

  // --- Resolve value → option(s) ---
  const resolvedValue = React.useMemo(() => {
    if (multiple) {
      const ids = (value as string[]) || [];
      return normalised.filter((c) => ids.includes(c.Id));
    }
    const id = value as string;
    if (allOpt && id === allOpt.Id) return allOpt;
    return normalised.find((c) => c.Id === id) ?? null;
  }, [value, normalised, allOpt, multiple]);

  // --- Load-more callback ---
  const loadMore = useCallback(() => {
    setDisplayCount((prev) => Math.min(prev + loadMoreCount, normalised.length));
  }, [loadMoreCount, normalised.length]);

  // Ref to avoid stale closure in IntersectionObserver callback
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

  const canLoadMore = displayCount < normalised.length;

  // --- onChange handler ---
  const handleChange = (_event: any, newValue: any) => {
    if (multiple) {
      const selected = (newValue as CourseOption[]) || [];
      onChange(selected.map((c) => c.Id));
    } else {
      const selected = newValue as CourseOption | null;
      if (!selected) {
        // Cleared — fallback to allOption value or empty
        onChange(allOpt ? allOpt.Id : '');
      } else {
        onChange(selected.Id);
      }
    }
  };

  // --- filterOptions: search ALL normalised courses when user types ---
  const filterOptions = useCallback(
    (options: CourseOption[], state: { inputValue: string }) => {
      const query = state.inputValue.trim().toLowerCase();
      if (!query) return options; // No search — show lazy-loaded subset

      const results: CourseOption[] = [];
      // Keep allOption at top when searching
      if (allOpt && !multiple) {
        results.push(allOpt);
      }
      const matches = normalised.filter((c) =>
        c.Title.toLowerCase().includes(query),
      );
      results.push(...matches.slice(0, 100));
      return results;
    },
    [normalised, allOpt, multiple],
  );

  // --- Helper text (only shown when there are more courses than currently visible) ---
  const helperText =
    showHelperText && normalised.length > displayCount
      ? `${displayCount} of ${normalised.length} courses loaded — type to search or scroll for more`
      : undefined;

  // --- Render ---
  return (
    <Autocomplete
      multiple={multiple as any}
      options={visibleOptions}
      getOptionLabel={(option: CourseOption) => option.Title}
      value={resolvedValue as any}
      onChange={handleChange}
      isOptionEqualToValue={(a: CourseOption, b: CourseOption) => a.Id === b.Id}
      disabled={disabled}
      disableClearable={required}
      filterOptions={filterOptions}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          size={size}
          helperText={helperText}
          data-testid={inputTestId}
        />
      )}
      renderOption={
        renderCourseOption
          ? (props, option, state) => {
              // Attach IntersectionObserver sentinel after last item even with custom renderer
              const isLast =
                !allOpt
                  ? state.index === visibleOptions.length - 1
                  : state.index === visibleOptions.length - 1 && option.Id !== allOpt.Id;
              const node = renderCourseOption(props, option, state);
              if (isLast && canLoadMore) {
                return (
                  <React.Fragment key={`${option.Id}-wrap`}>
                    {node}
                    <li
                      aria-hidden
                      style={{ height: 1, padding: 0, margin: 0, overflow: 'hidden' }}
                      ref={(el) => {
                        if (!el) return;
                        const observer = new IntersectionObserver(
                          (entries) => {
                            if (entries[0].isIntersecting) {
                              loadMoreRef.current();
                              observer.disconnect();
                            }
                          },
                          { threshold: 0.1 },
                        );
                        observer.observe(el);
                      }}
                    />
                  </React.Fragment>
                );
              }
              return node;
            }
          : (props, option, state) => {
              // Default option renderer with IntersectionObserver on last item
              const isLast =
                !allOpt
                  ? state.index === visibleOptions.length - 1
                  : state.index === visibleOptions.length - 1 && option.Id !== allOpt.Id;

              return (
                <li
                  {...props}
                  key={option.Id}
                  ref={
                    isLast && canLoadMore
                      ? (el) => {
                          if (!el) return;
                          const observer = new IntersectionObserver(
                            (entries) => {
                              if (entries[0].isIntersecting) {
                                loadMoreRef.current();
                                observer.disconnect();
                              }
                            },
                            { threshold: 0.1 },
                          );
                          observer.observe(el);
                        }
                      : undefined
                  }
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <Typography variant="body2">{option.Title}</Typography>
                    {option.Id !== allOpt?.Id && (
                      <Typography variant="caption" color="text.secondary">
                        ID: {option.Id}
                      </Typography>
                    )}
                  </Box>
                </li>
              );
            }
      }
      renderTags={
        multiple
          ? renderTag
            ? (value: CourseOption[], getTagProps: any) =>
                value.map((option, index) => renderTag(option, index, getTagProps))
            : (value: CourseOption[], getTagProps: any) =>
                value.map((option, index) => {
                  const { key, ...tagProps } = getTagProps({ index });
                  return <Chip key={key} label={option.Title} {...tagProps} />;
                })
          : undefined
      }
      ListboxProps={{
        onScroll: (event: React.SyntheticEvent) => {
          if (!canLoadMore) return;
          const node = event.currentTarget;
          if (node.scrollTop + node.clientHeight >= node.scrollHeight - 50) {
            loadMore();
          }
        },
        style: { maxHeight: '300px' },
      }}
      fullWidth={fullWidth}
      clearOnBlur
      selectOnFocus
      handleHomeEndKeys
      sx={sx}
      data-testid={testId}
    />
  );
};

export default CourseSelector;
