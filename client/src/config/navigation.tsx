/**
 * Navigation Configuration
 * Centralized configuration for all navigation items
 */

import {
  Dashboard as DashboardIcon,
  School as SchoolIcon,
  Book as BookIcon,
  PlayCircleOutline as LearningIcon,
  TrendingUp as ProgressIcon,
  VideoCall as LiveSessionIcon,
  Groups as StudyGroupIcon,
  AccessTime as OfficeHoursIcon,
  Psychology as AITutoringIcon,
  Chat as ChatIcon,
  People as PeopleIcon,
  Analytics as AnalyticsIcon,
  AccountCircle as ProfileIcon,
  EmojiEvents as CertificatesIcon,
  Receipt as TransactionsIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
  Home as HomeIcon,
  Menu as MenuIcon,
  MenuBook as CoursesIcon,
} from '@mui/icons-material';
import type { NavigationConfig, NavGroup, StandaloneNavItem, MobileNavItem, ProfileMenuItem } from '../types/navigation';

/**
 * Standalone navigation items (always visible in header)
 */
export const standaloneItems: StandaloneNavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: <DashboardIcon />,
    primary: true,
    testId: 'header-nav-dashboard',
  },
];

/**
 * Navigation groups for mega menu dropdowns
 */
export const navGroups: NavGroup[] = [
  {
    id: 'learning',
    label: 'Learn',
    icon: <BookIcon />,
    testId: 'nav-group-learning',
    items: [
      {
        id: 'courses',
        label: 'Courses',
        path: '/courses',
        icon: <CoursesIcon />,
        description: 'Explore our course catalog',
        testId: 'header-nav-courses',
      },
      {
        id: 'my-learning',
        label: 'My Learning',
        path: '/my-learning',
        icon: <LearningIcon />,
        description: 'Continue your courses',
        testId: 'header-nav-my-learning',
      },
      {
        id: 'smart-progress',
        label: 'Smart Progress',
        path: '/smart-progress',
        icon: <ProgressIcon />,
        description: 'Track your achievements',
        testId: 'header-nav-smart-progress',
      },
    ],
  },
  {
    id: 'collaboration',
    label: 'Collaborate',
    icon: <PeopleIcon />,
    testId: 'nav-group-collaboration',
    items: [
      {
        id: 'live-sessions',
        label: 'Live Sessions',
        path: '/live-sessions',
        icon: <LiveSessionIcon />,
        description: 'Join real-time classes',
        testId: 'header-nav-live-sessions',
      },
      {
        id: 'study-groups',
        label: 'Study Groups',
        path: '/study-groups',
        icon: <StudyGroupIcon />,
        description: 'Learn with peers',
        testId: 'header-nav-study-groups',
      },
      {
        id: 'office-hours',
        label: 'Office Hours',
        path: '/office-hours',
        icon: <OfficeHoursIcon />,
        description: 'Get instructor support',
        testId: 'header-nav-office-hours',
      },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    icon: <AITutoringIcon />,
    testId: 'nav-group-tools',
    items: [
      {
        id: 'ai-tutoring',
        label: 'AI Tutoring',
        path: '/tutoring',
        icon: <AITutoringIcon />,
        description: 'Get AI-powered help',
        testId: 'header-nav-ai-tutoring',
      },
      {
        id: 'chat',
        label: 'Chat',
        path: '/chat',
        icon: <ChatIcon />,
        description: 'Message classmates',
        testId: 'header-nav-chat',
      },
      {
        id: 'online-users',
        label: 'Online Users',
        path: '/presence',
        icon: <PeopleIcon />,
        description: 'See who\'s online',
        testId: 'header-nav-online-users',
      },
    ],
  },
  {
    id: 'instructor',
    label: 'Instructor',
    icon: <SchoolIcon />,
    roles: ['instructor', 'admin'],
    testId: 'nav-group-instructor',
    items: [
      {
        id: 'instructor-dashboard',
        label: 'Instructor Dashboard',
        path: '/instructor/dashboard',
        icon: <SchoolIcon />,
        description: 'Manage your courses',
        testId: 'header-nav-instructor-dashboard',
      },
      {
        id: 'analytics-hub',
        label: 'Analytics Hub',
        path: '/instructor/analytics-hub',
        icon: <AnalyticsIcon />,
        description: 'View course analytics',
        testId: 'header-nav-analytics-hub',
      },
    ],
  },
];

/**
 * Profile dropdown menu items
 */
export const profileMenuItems: ProfileMenuItem[] = [
  {
    id: 'profile',
    label: 'Profile',
    path: '/profile',
    icon: <ProfileIcon />,
    testId: 'header-profile-menu-item-profile',
  },
  {
    id: 'certificates',
    label: 'My Certificates',
    path: '/my-certificates',
    icon: <CertificatesIcon />,
    testId: 'header-profile-menu-item-certificates',
  },
  {
    id: 'transactions',
    label: 'Transactions',
    path: '/transactions',
    icon: <TransactionsIcon />,
    testId: 'header-profile-menu-item-transactions',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    path: '/notifications',
    icon: <NotificationsIcon />,
    testId: 'header-profile-menu-item-notifications',
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: <SettingsIcon />,
    testId: 'header-profile-menu-item-settings',
  },
  {
    id: 'divider-1',
    label: '',
    icon: null,
    action: 'divider',
  },
  {
    id: 'logout',
    label: 'Logout',
    icon: <LogoutIcon />,
    action: 'logout',
    testId: 'header-profile-menu-item-logout',
  },
];

/**
 * Mobile bottom navigation items (max 5)
 */
export const mobileNavItems: MobileNavItem[] = [
  {
    id: 'home',
    label: 'Home',
    path: '/dashboard',
    icon: <HomeIcon />,
    testId: 'mobile-nav-home',
  },
  {
    id: 'courses',
    label: 'Courses',
    path: '/courses',
    icon: <CoursesIcon />,
    testId: 'mobile-nav-courses',
  },
  {
    id: 'learn',
    label: 'Learn',
    path: '/my-learning',
    icon: <LearningIcon />,
    testId: 'mobile-nav-learn',
  },
  {
    id: 'menu',
    label: 'Menu',
    path: 'menu',
    icon: <MenuIcon />,
    testId: 'mobile-nav-menu',
  },
  {
    id: 'profile',
    label: 'Profile',
    path: '/profile',
    icon: <ProfileIcon />,
    testId: 'mobile-nav-profile',
  },
];

/**
 * Complete navigation configuration
 */
export const navigationConfig: NavigationConfig = {
  standalone: standaloneItems,
  groups: navGroups,
  profile: profileMenuItems,
  mobile: mobileNavItems,
};

/**
 * Get navigation label based on user role
 * Used for dynamic labels like "My Learning" vs "My Teaching"
 */
export const getDynamicLabel = (itemId: string, userRole?: string): string => {
  if (itemId === 'my-learning' && userRole === 'instructor') {
    return 'My Teaching';
  }
  return navGroups
    .flatMap(g => g.items)
    .find(item => item.id === itemId)?.label || '';
};

/**
 * Filter navigation items by user role
 */
export const filterByRole = <T extends { roles?: string[] }>(
  items: T[],
  userRole?: string
): T[] => {
  return items.filter(item => {
    if (!item.roles || item.roles.length === 0) return true;
    if (!userRole) return false;
    return item.roles.includes(userRole);
  });
};

/**
 * Mobile bottom navigation height (for content padding)
 * Use this to add bottom padding on mobile to prevent content from being hidden
 */
export const MOBILE_BOTTOM_NAV_HEIGHT = 64;

/**
 * Get mobile content padding based on breakpoint
 * Usage: sx={{ pb: { xs: `${MOBILE_BOTTOM_NAV_HEIGHT + 16}px`, md: 0 } }}
 */
export const getMobileContentPadding = (additionalPadding: number = 16) => ({
  xs: `${MOBILE_BOTTOM_NAV_HEIGHT + additionalPadding}px`,
  md: 0,
});

export default navigationConfig;
