/**
 * MegaMenuDropdown Component
 * Displays a dropdown menu with grouped navigation items
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Popper,
  Paper,
  Fade,
  Typography,
  Grid,
  ButtonBase,
  ClickAwayListener,
  useTheme,
  alpha,
} from '@mui/material';
import { KeyboardArrowDown as ArrowDownIcon } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import type { NavGroup, NavItem } from '../../types/navigation';

interface MegaMenuDropdownProps {
  /** Navigation group to display */
  group: NavGroup;
  /** Dynamic label override (e.g., "My Teaching" for instructors) */
  dynamicLabels?: Record<string, string>;
}

interface MenuItemCardProps {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
  dynamicLabel?: string;
}

/**
 * Individual menu item card with icon, label, and description
 */
const MenuItemCard: React.FC<MenuItemCardProps> = ({ 
  item, 
  isActive, 
  onClick,
  dynamicLabel,
}) => {
  const theme = useTheme();
  
  return (
    <ButtonBase
      onClick={onClick}
      data-testid={item.testId}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        p: 1.5,
        borderRadius: 2,
        width: '100%',
        textAlign: 'left',
        transition: 'all 0.2s ease',
        backgroundColor: isActive 
          ? alpha(theme.palette.primary.main, 0.08)
          : 'transparent',
        border: isActive
          ? `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
          : '1px solid transparent',
        '&:hover': {
          backgroundColor: alpha(theme.palette.primary.main, 0.08),
          transform: 'translateY(-2px)',
          boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`,
        },
        '&:focus-visible': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: 2,
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: 1.5,
          backgroundColor: isActive
            ? alpha(theme.palette.primary.main, 0.15)
            : alpha(theme.palette.primary.main, 0.08),
          color: isActive
            ? theme.palette.primary.main
            : theme.palette.primary.dark,
          flexShrink: 0,
          transition: 'all 0.2s ease',
        }}
      >
        {item.icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: isActive ? 600 : 500,
            color: isActive 
              ? theme.palette.primary.main 
              : theme.palette.text.primary,
            mb: 0.25,
          }}
        >
          {dynamicLabel || item.label}
        </Typography>
        {item.description && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'block',
              lineHeight: 1.3,
            }}
          >
            {item.description}
          </Typography>
        )}
      </Box>
    </ButtonBase>
  );
};

/**
 * Mega menu dropdown component
 */
export const MegaMenuDropdown: React.FC<MegaMenuDropdownProps> = ({ 
  group,
  dynamicLabels = {},
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if any item in this group is active
  const isGroupActive = group.items.some(
    item => location.pathname === item.path || 
            location.pathname.startsWith(item.path + '/')
  );

  // Handle mouse enter with delay
  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setOpen(true);
  };

  // Handle mouse leave with delay
  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 150);
  };

  // Handle click (for touch devices)
  const handleClick = () => {
    setOpen(prev => !prev);
  };

  // Handle item click
  const handleItemClick = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setOpen(false);
      anchorRef.current?.focus();
    } else if (event.key === 'ArrowDown' && !open) {
      setOpen(true);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        sx={{ display: 'inline-flex' }}
      >
        <Button
          ref={anchorRef}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          data-testid={group.testId}
          aria-expanded={open}
          aria-haspopup="true"
          endIcon={
            <ArrowDownIcon 
              sx={{ 
                fontSize: '1.2rem !important',
                transition: 'transform 0.2s ease',
                transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              }} 
            />
          }
          sx={{
            color: 'white',
            textTransform: 'none',
            px: 2,
            py: 1,
            fontSize: '0.9rem',
            fontWeight: isGroupActive ? 600 : 500,
            borderRadius: 2,
            backgroundColor: isGroupActive || open
              ? 'rgba(255, 255, 255, 0.15)'
              : 'transparent',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            },
          }}
        >
          {group.label}
        </Button>

        <Popper
          open={open}
          anchorEl={anchorRef.current}
          placement="bottom-start"
          transition
          disablePortal={false}
          modifiers={[
            {
              name: 'offset',
              options: {
                offset: [0, 8],
              },
            },
            {
              name: 'preventOverflow',
              options: {
                padding: 16,
              },
            },
          ]}
          sx={{ zIndex: theme.zIndex.modal }}
        >
          {({ TransitionProps }) => (
            <Fade {...TransitionProps} timeout={200}>
              <Paper
                elevation={8}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                sx={{
                  mt: 0.5,
                  borderRadius: 3,
                  overflow: 'hidden',
                  minWidth: 280,
                  maxWidth: 320,
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.12)}`,
                }}
              >
                {/* Header */}
                <Box
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    backgroundColor: alpha(theme.palette.primary.main, 0.03),
                  }}
                >
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{ fontWeight: 600, letterSpacing: 1 }}
                  >
                    {group.label}
                  </Typography>
                </Box>

                {/* Menu Items */}
                <Box sx={{ p: 1 }}>
                  <Grid container spacing={0.5}>
                    {group.items.map((item) => (
                      <Grid item xs={12} key={item.id}>
                        <MenuItemCard
                          item={item}
                          isActive={
                            location.pathname === item.path ||
                            location.pathname.startsWith(item.path + '/')
                          }
                          onClick={() => handleItemClick(item.path)}
                          dynamicLabel={dynamicLabels[item.id]}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Paper>
            </Fade>
          )}
        </Popper>
      </Box>
    </ClickAwayListener>
  );
};

export default MegaMenuDropdown;
