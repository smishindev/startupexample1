/**
 * Navigation System Types
 * Centralized TypeScript definitions for the navigation system
 */

import { ReactNode } from 'react';

/**
 * User roles that can access navigation items
 */
export type UserRole = 'student' | 'instructor' | 'admin';

/**
 * Individual navigation item
 */
export interface NavItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Route path */
  path: string;
  /** MUI icon component */
  icon: ReactNode;
  /** Short description for mega menu */
  description?: string;
  /** Roles that can see this item (empty = all roles) */
  roles?: UserRole[];
  /** Whether to show badge (e.g., notification count) */
  badge?: boolean;
  /** External link (opens in new tab) */
  external?: boolean;
  /** Test ID for automated testing */
  testId?: string;
}

/**
 * Navigation group containing multiple items
 */
export interface NavGroup {
  /** Unique identifier */
  id: string;
  /** Display label for dropdown trigger */
  label: string;
  /** MUI icon for mobile/compact views */
  icon: ReactNode;
  /** Items in this group */
  items: NavItem[];
  /** Roles that can see this group (empty = all roles) */
  roles?: UserRole[];
  /** Test ID for automated testing */
  testId?: string;
}

/**
 * Standalone navigation item (not in a group)
 */
export interface StandaloneNavItem extends NavItem {
  /** Whether this is a primary nav item (always visible) */
  primary?: boolean;
}

/**
 * Mobile bottom navigation item
 */
export interface MobileNavItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Route path or 'menu' for drawer trigger */
  path: string | 'menu';
  /** MUI icon component */
  icon: ReactNode;
  /** Active icon (optional, for filled variant) */
  activeIcon?: ReactNode;
  /** Test ID for automated testing */
  testId?: string;
}

/**
 * Profile menu item
 */
export interface ProfileMenuItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** MUI icon component */
  icon: ReactNode;
  /** Route path or action type */
  path?: string;
  /** Action type for special items like logout */
  action?: 'logout' | 'divider';
  /** Roles that can see this item (empty = all roles) */
  roles?: UserRole[];
  /** Test ID for automated testing */
  testId?: string;
}

/**
 * Complete navigation configuration
 */
export interface NavigationConfig {
  /** Standalone items (Dashboard, etc.) */
  standalone: StandaloneNavItem[];
  /** Grouped items for mega menu */
  groups: NavGroup[];
  /** Profile dropdown items */
  profile: ProfileMenuItem[];
  /** Mobile bottom navigation items */
  mobile: MobileNavItem[];
}
