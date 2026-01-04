# Missing Test Identifiers - Comprehensive Analysis

## Executive Summary
This document catalogues all interactive UI elements across the project that lack unique test identifiers (data-testid, id, aria-label, etc.). These elements need test IDs for reliable automated testing with Playwright.

**Total Files Analyzed:** 100+ component and page files
**Critical Elements Missing IDs:** Listed below by category and file

---

## 🔴 **AUTH COMPONENTS** - HIGH PRIORITY (User flows require reliable testing)

### LoginForm.tsx
**File:** `client/src/components/Auth/LoginForm.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 185-195 | IconButton | `aria-label="toggle password visibility"` | Has aria-label but missing data-testid | `login-toggle-password-visibility` |
| 207 | Checkbox | No identifier | Cannot reliably select "Remember Me" checkbox | `login-remember-me-checkbox` |
| 220 | Button (Submit) | `type="submit"` only | Cannot distinguish from other submit buttons | `login-submit-button` |
| 240 | Link | RouterLink to="/forgot-password" | No unique identifier | `login-forgot-password-link` |
| 256 | Link | RouterLink to="/register" | No unique identifier | `login-register-link` |

**Why Critical:** Login is the primary entry point - reliable test IDs essential for auth flow testing.

---

### RegisterForm.tsx
**File:** `client/src/components/Auth/RegisterForm.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 266 | TextField | `id="firstName"` | Has ID but data-testid preferred for consistency | `register-first-name-input` |
| 284 | TextField | `id="lastName"` | Has ID but data-testid preferred | `register-last-name-input` |
| 302-312 | TextField (Select) | `id="role"` | Role selector needs data-testid | `register-role-select` |
| 318 | MenuItem | `value="student"` | Individual menu items need IDs | `register-role-student-option` |
| 322 | MenuItem | `value="instructor"` | No identifier | `register-role-instructor-option` |
| 343 | TextField | `id="email"` | Has ID but data-testid preferred | `register-email-input` |
| 364 | TextField | `id="username"` | Has ID but data-testid preferred | `register-username-input` |
| 385-395 | IconButton | `aria-label="toggle password visibility"` | Missing data-testid | `register-toggle-password-visibility` |
| 401 | TextField | `id="password"` | Has ID but data-testid preferred | `register-password-input` |
| 420-430 | IconButton | `aria-label="toggle confirm password visibility"` | Missing data-testid | `register-toggle-confirm-password-visibility` |
| 438 | TextField | `id="confirmPassword"` | Has ID but data-testid preferred | `register-confirm-password-input` |
| 455-465 | TextField (Select) | `id="learningStyle"` | Learning style selector | `register-learning-style-select` |
| 467-472 | MenuItem | Various learning styles | No identifiers on options | `register-learning-style-{value}` |
| 534 | Button | `type="button"` | Back button | `register-back-button` |
| 545-555 | Button | `type="submit"` | Final submit button | `register-submit-button` |
| 564-572 | Button | `onClick={handleNext}` | Next button | `register-next-button` |
| 588 | Link | RouterLink to="/login" | No identifier | `register-login-link` |
| 600-628 | Dialog | Verification dialog | No identifier on dialog | `register-verification-dialog` |
| 618 | Button | "Verify Later" | No identifier | `register-verify-later-button` |
| 621-627 | Button | "Verify Now" | No identifier | `register-verify-now-button` |

**Stepper Component:**
- Line 515-520: Stepper has no data-testid
- Individual Step components lack identifiers

**Why Critical:** Registration is multi-step with complex validation - needs granular test IDs.

---

### ForgotPasswordForm.tsx
**File:** `client/src/components/Auth/ForgotPasswordForm.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 161 | TextField | `id="email"` | Has ID but data-testid preferred | `forgot-password-email-input` |
| 201 | Button | `type="submit"` | Submit button | `forgot-password-submit-button` |
| 216 | Link | RouterLink to="/login" | Back to login | `forgot-password-back-to-login-link` |
| 123 | Button | "Enter Reset Code" | Success screen button | `forgot-password-enter-code-button` |
| 132 | Link | Back to login | Success screen link | `forgot-password-success-back-link` |

**Why Critical:** Password reset flow must be testable end-to-end.

---

### ResetPasswordForm.tsx
**File:** `client/src/components/Auth/ResetPasswordForm.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 198 | TextField | `id="email"` | Email field | `reset-password-email-input` |
| 213 | TextField | `id="token"` | Reset code field | `reset-password-token-input` |
| 225 | TextField | `id="newPassword"` | New password field | `reset-password-new-password-input` |
| 241-249 | IconButton | Password visibility toggle | Missing data-testid | `reset-password-toggle-new-password-visibility` |
| 257 | TextField | `id="confirmPassword"` | Confirm password field | `reset-password-confirm-password-input` |
| 274-282 | IconButton | Confirm password visibility | Missing data-testid | `reset-password-toggle-confirm-password-visibility` |
| 290 | Button | `type="submit"` | Submit button | `reset-password-submit-button` |
| 304 | Link | "Didn't receive a code?" | Resend link | `reset-password-resend-link` |
| 311 | Link | "Back to Login" | Back link | `reset-password-back-to-login-link` |
| 155 | Button | "Go to Login" (success) | Success button | `reset-password-success-button` |

---

### EmailVerificationBanner.tsx
**File:** `client/src/components/Auth/EmailVerificationBanner.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 27 | Alert | Alert component | No identifier | `email-verification-banner-alert` |
| 40 | Button | "Verify Now" | No identifier | `email-verification-verify-now-button` |
| 47 | IconButton | Close button | No identifier | `email-verification-close-button` |

---

## 🟠 **NAVIGATION COMPONENTS** - HIGH PRIORITY

### HeaderV4.tsx
**File:** `client/src/components/Navigation/HeaderV4.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 185 | IconButton | Mobile menu close | No identifier | `header-mobile-menu-close-button` |
| 323-327 | IconButton | Mobile menu open | `edge="start"` only | `header-mobile-menu-button` |
| 374 | IconButton | Search close | No identifier | `header-search-close-button` |
| 379-385 | IconButton | Search expand | No identifier | `header-search-expand-button` |
| 411-417 | IconButton | Profile menu | No identifier | `header-profile-menu-button` |
| ~225-295 | Drawer (Mobile Menu) | No identifier | Cannot test mobile navigation | `header-mobile-drawer` |
| ~195-280 | ListItem (Nav Items) | No identifiers | Cannot select specific nav items | `header-nav-{path}` |

**Profile Menu Items** (Lines 173-177):
- Line 173: Profile → `header-profile-menu-item-profile`
- Line 174: Notifications → `header-profile-menu-item-notifications`
- Line 175: Settings → `header-profile-menu-item-settings`
- Line 176: Logout → `header-profile-menu-item-logout`

**Mobile Submenu Toggles:**
- Learning Section Toggle → `header-mobile-learning-toggle`
- Collaboration Section Toggle → `header-mobile-collaboration-toggle`
- Tools Section Toggle → `header-mobile-tools-toggle`
- Instructor Section Toggle → `header-mobile-instructor-toggle`

**Why Critical:** Primary navigation used on every page - must be reliably testable.

---

## 🟡 **COURSE COMPONENTS** - MEDIUM PRIORITY

### CourseCard.tsx
**File:** `client/src/components/Course/CourseCard.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 265-275 | IconButton | Bookmark button | `onClick={handleBookmarkClick}` | `course-card-bookmark-button-{course.id}` |
| 281-289 | IconButton | Share button | `onClick={handleShareClick}` | `course-card-share-button-{course.id}` |
| 120-180 | Card (Compact) | Entire card | `onClick={handleCardClick}` | `course-card-compact-{course.id}` |
| 220+ | Card (Default) | Entire card | `onClick={handleCardClick}` | `course-card-{course.id}` |
| ~350 | Button | "Enroll Now" / "Continue" | No identifier | `course-card-action-button-{course.id}` |
| ~245 | Chip | "New" badge | No identifier | `course-card-new-badge` |
| ~258 | Chip | "Popular" badge | No identifier | `course-card-popular-badge` |

**Why Important:** Course cards are the main interaction point for browsing - need IDs for click/enrollment testing.

---

### ShareDialog.tsx
**File:** `client/src/components/Course/ShareDialog.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 166 | IconButton | Close dialog | No identifier | `share-dialog-close-button` |
| ~85-100 | Button | Copy link | No identifier | `share-dialog-copy-link-button` |
| ~110-125 | IconButton | Social share buttons | No identifiers | `share-dialog-{platform}-button` |

---

## 🟢 **NOTIFICATION COMPONENTS** - MEDIUM PRIORITY

### NotificationBell.tsx
**File:** `client/src/components/Notifications/NotificationBell.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 227-235 | IconButton | Notification bell | `aria-label` present | `notification-bell-button` |
| 245+ | Menu | Notification dropdown | No identifier | `notification-bell-menu` |
| 281-287 | IconButton | Settings icon | No identifier | `notification-bell-settings-button` |
| 291 | Button | "Mark all read" | No identifier | `notification-bell-mark-all-read-button` |
| 356-364 | IconButton | Delete notification | Per notification | `notification-bell-delete-{id}` |
| ~340 | MenuItem | Individual notification | No identifier | `notification-bell-item-{id}` |

---

## 🔵 **DASHBOARD & PROFILE PAGES** - MEDIUM PRIORITY

### Dashboard.tsx
**File:** `client/src/components/Dashboard.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 159 | Button | Smart Progress | `startIcon={<Psychology />}` | `dashboard-smart-progress-button` |
| 166 | Button | Logout | No identifier | `dashboard-logout-button` |
| ~195-220 | Card | Stats cards | No identifiers | `dashboard-stat-card-{index}` |
| ~280-350 | Card | Course cards | No identifiers | `dashboard-course-card-{courseId}` |
| ~310 | Button | Continue learning | No identifier | `dashboard-continue-course-{courseId}` |

---

### ProfilePage.tsx
**File:** `client/src/pages/Profile/ProfilePage.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 286 | IconButton | Edit profile photo | No identifier | `profile-edit-photo-button` |
| 369 | TextField | First name | No identifier | `profile-first-name-input` |
| 378 | TextField | Last name | No identifier | `profile-last-name-input` |
| 387 | TextField | Email | No identifier | `profile-email-input` |
| 397 | TextField | Bio | No identifier | `profile-bio-input` |
| 408-417 | Select | Learning style | No identifier | `profile-learning-style-select` |
| 422 | Button | Save profile | No identifier | `profile-save-button` |
| 444-456 | TextField | Current password | No identifier | `profile-current-password-input` |
| 453-461 | IconButton | Toggle password | No identifier | `profile-toggle-current-password` |
| 465-476 | TextField | New password | No identifier | `profile-new-password-input` |
| 474-482 | IconButton | Toggle new password | No identifier | `profile-toggle-new-password` |
| 486-493 | TextField | Confirm password | No identifier | `profile-confirm-password-input` |
| 501 | Button | Change password | No identifier | `profile-change-password-button` |

---

## 🟣 **SETTINGS PAGES** - MEDIUM PRIORITY

### SettingsPage.tsx
**File:** `client/src/pages/Settings/SettingsPage.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 186-193 | Select | Profile visibility | No identifier | `settings-profile-visibility-select` |
| 191-193 | MenuItem | Visibility options | No identifiers | `settings-visibility-{value}` |
| 206 | Switch | Show email | No identifier | `settings-show-email-switch` |
| 224 | Switch | Show progress | No identifier | `settings-show-progress-switch` |
| 242 | Switch | Allow messages | No identifier | `settings-allow-messages-switch` |
| 258 | Button | Save privacy | No identifier | `settings-save-privacy-button` |
| 289-296 | Select | Theme | No identifier | `settings-theme-select` |
| 313-322 | Select | Language | No identifier | `settings-language-select` |
| 339-346 | Select | Font size | No identifier | `settings-font-size-select` |
| 355 | Button | Save preferences | No identifier | `settings-save-preferences-button` |
| 388 | Button | Export data | No identifier | `settings-export-data-button` |
| 418 | Button | Delete account | No identifier | `settings-delete-account-button` |
| 434+ | Dialog | Delete confirmation | No identifier | `settings-delete-confirmation-dialog` |
| 459 | Button | Cancel delete | No identifier | `settings-delete-cancel-button` |
| 462 | Button | Confirm delete | No identifier | `settings-delete-confirm-button` |

---

### NotificationSettingsPage.tsx
**File:** `client/src/pages/Settings/NotificationSettingsPage.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 453 | Switch | Email notifications | No identifier | `notification-settings-email-enabled` |
| 472 | Switch | Push notifications | No identifier | `notification-settings-push-enabled` |
| 491-498 | Select | Notification frequency | No identifier | `notification-settings-frequency-select` |
| 530 | Switch | Progress notifications | No identifier | `notification-settings-progress-enabled` |
| 569 | Switch | Email progress | No identifier | `notification-settings-progress-email` |
| 591 | Switch | Push progress | No identifier | `notification-settings-progress-push` |
| 621 | Switch | Risk notifications | No identifier | `notification-settings-risk-enabled` |
| 659 | Switch | Email risk | No identifier | `notification-settings-risk-email` |
| 679 | Switch | Push risk | No identifier | `notification-settings-risk-push` |
| 708 | Switch | Intervention enabled | No identifier | `notification-settings-intervention-enabled` |
| 746 | Switch | Email intervention | No identifier | `notification-settings-intervention-email` |
| 766 | Switch | Push intervention | No identifier | `notification-settings-intervention-push` |
| 795 | Switch | Achievement enabled | No identifier | `notification-settings-achievement-enabled` |
| 833 | Switch | Email achievement | No identifier | `notification-settings-achievement-email` |
| 853 | Switch | Push achievement | No identifier | `notification-settings-achievement-push` |
| 882 | Switch | Assignment enabled | No identifier | `notification-settings-assignment-enabled` |
| 920 | Switch | Email assignment | No identifier | `notification-settings-assignment-email` |
| 942 | Switch | Push assignment | No identifier | `notification-settings-assignment-push` |
| 972 | Button | Save settings | No identifier | `notification-settings-save-button` |

---

## 🔴 **COURSE PAGES** - HIGH PRIORITY

### CoursesPage.tsx
**File:** `client/src/pages/Courses/CoursesPage.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| ~115-120 | Tabs | Tab navigation | No identifier | `courses-tabs` |
| ~116 | Tab | "All Courses" | No identifier | `courses-tab-all` |
| ~117 | Tab | "My Courses" | No identifier | `courses-tab-enrolled` |
| ~118 | Tab | "Bookmarks" | No identifier | `courses-tab-bookmarks` |
| 323-330 | TextField | Search input | No identifier | `courses-search-input` |
| 342-351 | Select | Category filter | No identifier | `courses-category-filter` |
| ~365 | Select | Level filter | No identifier | `courses-level-filter` |
| ~380 | Select | Sort by | No identifier | `courses-sort-select` |
| 359 | Button | Search button | No identifier | `courses-search-button` |
| ~450 | Pagination | Page navigation | No identifier | `courses-pagination` |

---

### CourseDetailPage.tsx
**File:** `client/src/pages/Course/CourseDetailPage.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 1042-1048 | IconButton | Bookmark course | No identifier | `course-detail-bookmark-button` |
| 1059-1065 | IconButton | Share course | No identifier | `course-detail-share-button` |
| ~650 | Button | Enroll button | No identifier | `course-detail-enroll-button` |
| ~700 | Button | Start course | No identifier | `course-detail-start-button` |
| ~850 | Tabs | Course content tabs | No identifier | `course-detail-tabs` |
| ~900+ | Accordion | Curriculum sections | No identifiers | `course-detail-section-{id}` |

---

### LessonDetailPage.tsx
**File:** `client/src/pages/Course/LessonDetailPage.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 485-492 | IconButton | Previous lesson | No identifier | `lesson-detail-previous-button` |
| 510-517 | IconButton | Next lesson | No identifier | `lesson-detail-next-button` |
| 786-792 | IconButton | Like lesson | No identifier | `lesson-detail-like-button` |
| 796-802 | IconButton | Bookmark lesson | No identifier | `lesson-detail-bookmark-button` |
| 1229 | IconButton | Resource download | No identifier | `lesson-detail-resource-{id}` |
| 1386 | IconButton | Close TOC | No identifier | `lesson-detail-close-toc-button` |
| ~600 | Button | Mark complete | No identifier | `lesson-detail-mark-complete-button` |
| ~750 | Tabs | Lesson tabs | No identifier | `lesson-detail-tabs` |

---

## 🟠 **INSTRUCTOR PAGES** - MEDIUM PRIORITY

### InstructorDashboard.tsx
**File:** `client/src/pages/Instructor/InstructorDashboard.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 166 | Button | Create course | No identifier | `instructor-create-course-button` |
| 326 | Button | View course | No identifier | `instructor-view-course-button-{id}` |
| 333 | Button | Edit course | No identifier | `instructor-edit-course-button-{id}` |
| 341 | Button | Manage students | No identifier | `instructor-manage-students-button-{id}` |
| 349 | Button | View analytics | No identifier | `instructor-view-analytics-button-{id}` |
| 357 | Button | Manage lessons | No identifier | `instructor-manage-lessons-button-{id}` |
| 511-517 | IconButton | Course menu | No identifier | `instructor-course-menu-button-{id}` |
| 697+ | Menu | Course actions menu | No identifier | `instructor-course-menu-{id}` |
| 702 | MenuItem | Edit option | No identifier | `instructor-course-menu-edit-{id}` |
| 709 | MenuItem | Duplicate option | No identifier | `instructor-course-menu-duplicate-{id}` |
| 716 | MenuItem | Archive option | No identifier | `instructor-course-menu-archive-{id}` |
| 723 | MenuItem | Delete option | No identifier | `instructor-course-menu-delete-{id}` |
| 733+ | Dialog | Create course dialog | No identifier | `instructor-create-course-dialog` |

---

### StudentManagement.tsx
**File:** `client/src/pages/Instructor/StudentManagement.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 285 | TextField | Search students | No identifier | `student-management-search-input` |
| 298-305 | Select | Course filter | No identifier | `student-management-course-filter` |
| 316-325 | Select | Status filter | No identifier | `student-management-status-filter` |
| 333-341 | Select | Sort by | No identifier | `student-management-sort-select` |
| 347 | Button | Export CSV | No identifier | `student-management-export-button` |
| 462 | IconButton | Student actions | No identifier | `student-management-actions-{studentId}` |

---

### CourseCreationForm.tsx
**File:** `client/src/pages/Instructor/CourseCreationForm.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 976 | IconButton | Remove lesson | No identifier | `course-creation-remove-lesson-{id}` |
| 1004 | IconButton | Remove requirement | No identifier | `course-creation-remove-requirement-{index}` |
| 1033 | IconButton | Remove learning point | No identifier | `course-creation-remove-learning-point-{index}` |
| ~450 | TextField | Course title | No identifier | `course-creation-title-input` |
| ~475 | TextField | Course description | No identifier | `course-creation-description-input` |
| ~500 | Select | Category | No identifier | `course-creation-category-select` |
| ~525 | Select | Level | No identifier | `course-creation-level-select` |
| ~550 | TextField | Price | No identifier | `course-creation-price-input` |
| ~900 | Button | Add lesson | No identifier | `course-creation-add-lesson-button` |
| ~1050 | Button | Save course | No identifier | `course-creation-save-button` |

---

### CurriculumBuilder.tsx
**File:** `client/src/pages/Instructor/CurriculumBuilder.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 335-341 | IconButton | Edit lesson | No identifier | `curriculum-edit-lesson-{id}` |
| 347-353 | IconButton | Delete lesson | No identifier | `curriculum-delete-lesson-{id}` |
| 359-365 | IconButton | Add section | No identifier | `curriculum-add-section-button` |

---

### InterventionDashboard.tsx
**File:** `client/src/pages/Instructor/InterventionDashboard.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 346-352 | IconButton | View student | No identifier | `intervention-view-student-{id}` |
| 416-422 | IconButton | Intervention actions | No identifier | `intervention-actions-{studentId}` |
| 425-431 | IconButton | Send message | No identifier | `intervention-send-message-{studentId}` |
| 498-504 | IconButton | Expand details | No identifier | `intervention-expand-{studentId}` |

---

## 🟡 **ASSESSMENT COMPONENTS** - MEDIUM PRIORITY

### AssessmentManager.tsx
**File:** `client/src/components/Assessment/AssessmentManager.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 244-250 | IconButton | Edit assessment | No identifier | `assessment-edit-button-{id}` |
| 366-372 | IconButton | Delete assessment | No identifier | `assessment-delete-button-{id}` |
| ~180 | Button | Create assessment | No identifier | `assessment-create-button` |

---

### QuizTaker.tsx
**File:** `client/src/components/Assessment/QuizTaker.tsx`

**Note:** This component needs comprehensive test IDs:
- Question navigation buttons
- Answer selection radio buttons/checkboxes
- Submit quiz button
- Previous/Next question buttons
- Timer display
- Progress indicator

---

### QuizCreator.tsx
**File:** `client/src/components/Assessment/QuizCreator.tsx`

**Note:** This component needs comprehensive test IDs:
- Add question button
- Question type selector
- Answer input fields
- Add answer option button
- Remove answer button
- Save quiz button

---

## 🔵 **VIDEO & MEDIA COMPONENTS** - MEDIUM PRIORITY

### VideoPlayer.tsx
**File:** `client/src/components/Video/VideoPlayer.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 424-430 | IconButton | Closed captions | No identifier | `video-player-cc-button` |
| 478-482 | IconButton | Skip backward | No identifier | `video-player-skip-backward-button` |
| 484-488 | IconButton | Play/pause | No identifier | `video-player-play-pause-button` |
| 490-494 | IconButton | Skip forward | No identifier | `video-player-skip-forward-button` |
| 497-502 | IconButton | Mute/unmute | No identifier | `video-player-mute-button` |
| 524-528 | IconButton | Settings | No identifier | `video-player-settings-button` |
| 530-534 | IconButton | Keyboard shortcuts | No identifier | `video-player-shortcuts-button` |
| 536-540 | IconButton | Picture-in-picture | No identifier | `video-player-pip-button` |
| 542-547 | IconButton | Fullscreen | No identifier | `video-player-fullscreen-button` |
| ~450 | Slider | Volume slider | No identifier | `video-player-volume-slider` |
| ~395 | Slider | Progress slider | No identifier | `video-player-progress-slider` |

---

### VideoTranscript.tsx
**File:** `client/src/components/Video/VideoTranscript.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 144 | IconButton | Clear search | No identifier | `video-transcript-clear-search-button` |
| ~90 | TextField | Search transcript | No identifier | `video-transcript-search-input` |
| ~180 | Box | Transcript item | No identifier per item | `video-transcript-item-{timestamp}` |

---

## 🟢 **COLLABORATION FEATURES** - LOW PRIORITY

### Chat.tsx
**File:** `client/src/pages/Chat/Chat.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 336 | IconButton | Create room | No identifier | `chat-create-room-button` |
| 414 | IconButton | Room settings | No identifier | `chat-room-settings-button` |
| 510 | IconButton | User options | No identifier | `chat-user-options-button-{userId}` |
| 513 | IconButton | Send message | No identifier | `chat-send-message-button` |
| ~250 | TextField | Message input | No identifier | `chat-message-input` |
| ~180 | List | Room list | No identifier | `chat-room-list` |
| ~185 | ListItem | Individual room | No identifier per room | `chat-room-item-{roomId}` |

---

### Tutoring.tsx
**File:** `client/src/pages/Tutoring/Tutoring.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 255 | Button | Start session | No identifier | `tutoring-start-session-button` |
| 340-348 | Select | AI model selector | No identifier | `tutoring-model-select` |
| 436-443 | TextField | Chat input | No identifier | `tutoring-chat-input` |
| 446-452 | IconButton | Send message | No identifier | `tutoring-send-message-button` |
| 473+ | Dialog | Create session dialog | No identifier | `tutoring-create-session-dialog` |
| 476-485 | TextField | Session title | No identifier | `tutoring-session-title-input` |
| 489-501 | Select | Topic selector | No identifier | `tutoring-topic-select` |
| 506 | Button | Cancel | No identifier | `tutoring-create-cancel-button` |
| 507 | Button | Create | No identifier | `tutoring-create-confirm-button` |

---

### StudyGroupsPage.tsx
**File:** `client/src/pages/StudyGroups/StudyGroupsPage.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 301 | Button | Create group | No identifier | `study-groups-create-button` |
| 323-330 | TextField | Search input | No identifier | `study-groups-search-input` |
| 342-351 | Select | Course filter | No identifier | `study-groups-course-filter` |
| 359 | Button | Search | No identifier | `study-groups-search-button` |
| ~450 | Card | Study group card | No identifier per group | `study-group-card-{groupId}` |
| ~500 | Button | Join group | No identifier per group | `study-group-join-button-{groupId}` |

---

### OfficeHoursPage.tsx
**File:** `client/src/pages/OfficeHours/OfficeHoursPage.tsx`

**Note:** This component needs comprehensive test IDs for:
- Join queue button
- Leave queue button
- Schedule display
- Queue position display
- Notification settings

---

### LiveSessionsPage.tsx
**File:** `client/src/pages/LiveSessions/LiveSessionsPage.tsx`

**Note:** This component needs comprehensive test IDs for:
- Create session button
- Join session button
- Session cards
- Session filters
- Upcoming/Past session tabs

---

## 🟣 **PAYMENT & TRANSACTIONS** - HIGH PRIORITY

### CourseCheckoutPage.tsx
**File:** `client/src/pages/Payment/CourseCheckoutPage.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 133 | Button | Back to courses | No identifier | `checkout-back-button` |
| 285 | Button | Return to courses | No identifier | `checkout-return-button` |
| ~200 | Button | Complete payment | No identifier | `checkout-complete-payment-button` |
| ~150 | Card | Order summary | No identifier | `checkout-order-summary` |

---

### PaymentSuccessPage.tsx
**File:** `client/src/pages/Payment/PaymentSuccessPage.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 154 | Button | Go to dashboard | No identifier | `payment-success-dashboard-button` |
| 217-223 | IconButton | Print receipt | No identifier | `payment-success-print-button` |
| 225-231 | IconButton | Download receipt | No identifier | `payment-success-download-button` |
| 233-239 | IconButton | Email receipt | No identifier | `payment-success-email-button` |
| 266-272 | Button | View course | No identifier | `payment-success-view-course-button` |
| 285-291 | Button | Download invoice | No identifier | `payment-success-download-invoice-button` |
| 296-302 | Button | Continue shopping | No identifier | `payment-success-continue-shopping-button` |

---

### TransactionsPage.tsx
**File:** `client/src/pages/Profile/TransactionsPage.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 233 | Button | Export transactions | No identifier | `transactions-export-button` |
| 257 | Button | Browse courses | No identifier | `transactions-browse-courses-button` |
| 299-305 | IconButton | Download invoice | No identifier | `transactions-download-invoice-{id}` |
| 311-317 | Button | View course | No identifier | `transactions-view-course-{id}` |
| 324-330 | Button | Request refund | No identifier | `transactions-request-refund-{id}` |
| 335-341 | Button | Contact support | No identifier | `transactions-contact-support-{id}` |
| 364+ | Dialog | Refund dialog | No identifier | `transactions-refund-dialog` |
| 467-475 | TextField | Refund reason | No identifier | `transactions-refund-reason-input` |
| 487 | Button | Cancel refund | No identifier | `transactions-refund-cancel-button` |
| 490-496 | Button | Submit refund | No identifier | `transactions-refund-submit-button` |

---

## 🔴 **NOTIFICATIONS PAGE** - MEDIUM PRIORITY

### NotificationsPage.tsx
**File:** `client/src/pages/Notifications/NotificationsPage.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 106 | Button | Mark as read | No identifier per notification | `notifications-mark-read-{id}` |
| 110 | IconButton | Delete notification | No identifier per notification | `notifications-delete-{id}` |
| 276-282 | Button | Notification settings | No identifier | `notifications-settings-button` |
| 284 | Button | Mark all read | No identifier | `notifications-mark-all-read-button` |
| 287 | Button | Refresh | No identifier | `notifications-refresh-button` |
| 305-312 | Select | Type filter | No identifier | `notifications-type-filter` |
| 318-323 | Select | Priority filter | No identifier | `notifications-priority-filter` |

---

## 🟠 **LEARNING & PROGRESS PAGES** - MEDIUM PRIORITY

### MyLearningPage.tsx
**File:** `client/src/pages/Learning/MyLearningPage.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 204-210 | Button | View all courses | No identifier | `my-learning-view-all-button` |
| 212-218 | Button | Browse courses | No identifier | `my-learning-browse-button` |
| 481-487 | Button | Continue learning | No identifier per course | `my-learning-continue-{courseId}` |
| 502-508 | Button | View certificate | No identifier per course | `my-learning-certificate-{courseId}` |
| 520-526 | Button | Review course | No identifier per course | `my-learning-review-{courseId}` |
| 539-545 | Button | Retake assessment | No identifier per course | `my-learning-retake-{courseId}` |
| 553-559 | Button | View details | No identifier per course | `my-learning-details-{courseId}` |

---

### StudentProgressPage.tsx
**File:** `client/src/pages/Progress/StudentProgressPage.tsx`

**Note:** This component needs comprehensive test IDs for:
- Progress charts
- Filter controls
- Time period selector
- Course selector
- Export button

---

## 🟢 **ANALYTICS & REPORTING** - LOW PRIORITY

### CourseAnalyticsDashboard.tsx
**File:** `client/src/pages/Instructor/CourseAnalyticsDashboard.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 144-152 | Select | Course selector | No identifier | `analytics-course-select` |
| ~200 | Button | Export data | No identifier | `analytics-export-button` |
| ~250 | DatePicker | Date range | No identifier | `analytics-date-range-picker` |

---

### VideoAnalyticsPage.tsx
**File:** `client/src/pages/Instructor/VideoAnalyticsPage.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 191-197 | Select | Course filter | No identifier | `video-analytics-course-select` |
| 220 | Button | Export analytics | No identifier | `video-analytics-export-button` |

---

### AnalyticsHubPage.tsx
**File:** `client/src/pages/Instructor/AnalyticsHubPage.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 147 | IconButton | Refresh data | No identifier | `analytics-hub-refresh-button` |
| ~200 | Tabs | Analytics tabs | No identifier | `analytics-hub-tabs` |

---

## 🟡 **PRESENCE & ONLINE USERS** - LOW PRIORITY

### PresencePage.tsx
**File:** `client/src/pages/Presence/PresencePage.tsx`

**Note:** This component needs test IDs for:
- User list items
- Filter controls
- Status indicators
- Message buttons

---

### PresenceStatusSelector.tsx
**File:** `client/src/components/Presence/PresenceStatusSelector.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 82-88 | IconButton | Status selector | No identifier | `presence-status-button` |
| ~95+ | Menu | Status menu | No identifier | `presence-status-menu` |
| ~100+ | MenuItem | Status options | No identifier per option | `presence-status-option-{status}` |

---

## 🔵 **UPLOAD & FILE MANAGEMENT** - LOW PRIORITY

### FileUpload.tsx
**File:** `client/src/components/Upload/FileUpload.tsx`

| Line | Element Type | Current State | Issue | Suggested data-testid |
|------|--------------|---------------|-------|----------------------|
| 456-462 | IconButton | Remove file | No identifier per file | `file-upload-remove-{fileIndex}` |
| 537-543 | IconButton | Upload files | No identifier | `file-upload-submit-button` |
| ~200 | Button | Select files | No identifier | `file-upload-select-button` |
| ~250 | Box | Drop zone | No identifier | `file-upload-drop-zone` |

---

## 📊 **SUMMARY STATISTICS**

### By Priority Level:
- 🔴 **HIGH PRIORITY (Critical User Flows):** ~180 elements
  - Authentication (Login, Register, Password Reset)
  - Navigation (Header, Mobile Menu)
  - Course Enrollment & Payment
  - Core Course Interactions

- 🟠 **MEDIUM PRIORITY (Important Features):** ~220 elements
  - Profile & Settings
  - Instructor Dashboard & Management
  - Notifications
  - Course Content & Lessons

- 🟡 **LOW PRIORITY (Secondary Features):** ~150 elements
  - Collaboration (Chat, Study Groups)
  - Analytics & Reporting
  - File Uploads
  - Presence Features

### By Component Type:
- IconButtons: ~120 instances
- Buttons: ~180 instances
- TextFields/Inputs: ~95 instances
- Select/Dropdowns: ~55 instances
- Dialogs/Modals: ~35 instances
- Menu/MenuItem: ~45 instances
- Checkboxes/Switches: ~42 instances
- Tabs: ~18 instances
- Links: ~25 instances
- Cards (clickable): ~45 instances

### Total Interactive Elements Needing Test IDs: **~550 elements**

---

## 📝 **RECOMMENDED IMPLEMENTATION STRATEGY**

### Phase 1: Critical Auth & Navigation (Week 1)
1. All LoginForm.tsx elements
2. All RegisterForm.tsx elements
3. All ForgotPasswordForm.tsx elements
4. All ResetPasswordForm.tsx elements
5. HeaderV4.tsx navigation elements
6. EmailVerificationBanner.tsx

### Phase 2: Core Course Functionality (Week 2)
1. CourseCard.tsx elements
2. CoursesPage.tsx filters and navigation
3. CourseDetailPage.tsx interactions
4. LessonDetailPage.tsx controls
5. Payment flows (Checkout, Success, Transactions)

### Phase 3: Dashboard & Profile (Week 3)
1. Dashboard.tsx elements
2. ProfilePage.tsx forms
3. SettingsPage.tsx controls
4. NotificationSettingsPage.tsx switches
5. MyLearningPage.tsx buttons

### Phase 4: Instructor Features (Week 4)
1. InstructorDashboard.tsx elements
2. CourseCreationForm.tsx inputs
3. StudentManagement.tsx filters
4. CurriculumBuilder.tsx controls
5. InterventionDashboard.tsx actions

### Phase 5: Assessments & Media (Week 5)
1. AssessmentManager.tsx elements
2. QuizTaker.tsx controls
3. QuizCreator.tsx inputs
4. VideoPlayer.tsx controls
5. VideoTranscript.tsx elements

### Phase 6: Collaboration & Secondary Features (Week 6)
1. Chat.tsx elements
2. Tutoring.tsx controls
3. StudyGroupsPage.tsx elements
4. NotificationsPage.tsx filters
5. PresenceStatusSelector.tsx

---

## 🎯 **NAMING CONVENTIONS**

### Standard Pattern:
```
{component-context}-{element-purpose}-{action/type}[-{unique-id}]
```

### Examples:
- `login-email-input`
- `register-submit-button`
- `course-card-bookmark-button-123`
- `header-profile-menu-button`
- `notification-bell-delete-456`

### Best Practices:
1. Use kebab-case for all test IDs
2. Include component context prefix
3. Be descriptive but concise
4. Include unique identifiers for list items (course IDs, notification IDs, etc.)
5. Maintain consistency across similar components
6. Avoid implementation details (e.g., don't use `IconButton` in the ID)
7. Focus on user intent (e.g., `bookmark-button` not `icon-button-23`)

---

## 🚀 **NEXT STEPS**

1. **Review & Prioritize:** Confirm priority levels with team
2. **Create Tickets:** Break down into manageable JIRA/GitHub issues
3. **Implement Phase 1:** Start with authentication flows
4. **Create Test Coverage:** Write Playwright tests as IDs are added
5. **Document Standards:** Update coding guidelines with test ID conventions
6. **Code Review:** Ensure consistency during implementation
7. **Validate:** Test all IDs with actual Playwright selectors
8. **Monitor:** Track coverage and update this document

---

## 📌 **NOTES**

- Some components have `id` attributes which are good, but `data-testid` is preferred for testing consistency
- `aria-label` exists on some IconButtons but should be supplemented with `data-testid`
- Dynamic lists (courses, notifications, etc.) need unique IDs incorporating the item's unique identifier
- Modal/Dialog components need IDs on both the dialog itself and actionable elements within
- Tab components need IDs on both the tab container and individual tabs

---

**Document Created:** January 4, 2026
**Last Updated:** January 4, 2026
**Status:** Initial Analysis Complete
**Next Review:** After Phase 1 Implementation
