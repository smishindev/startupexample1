# Test Selector Map - Complete Component Reference

**Purpose**: Quick reference for selecting ANY component in Playwright tests  
**Last Updated**: January 4, 2026  
**Status**: Phase 24 Complete - **82.0% Coverage (451/550)** 🎉

---

## 🔍 HOW TO USE THIS MAP

For each component, find the selector and use it in your test:
```python
# Example
page.click('[data-testid="login-submit-button"]')
page.fill('[data-testid="login-email-input"]', 'test@example.com')
```

---

## ✅ **AUTHENTICATION COMPONENTS**

### LoginForm.tsx ✅
**Component Path**: `client/src/components/Auth/LoginForm.tsx`

| Element | Selector | Type | Usage |
|---------|----------|------|-------|
| Email input | `[data-testid="login-email-input"]` | TextField | `page.fill('[data-testid="login-email-input"]', 'user@email.com')` |
| Password input | `[data-testid="login-password-input"]` | TextField | `page.fill('[data-testid="login-password-input"]', 'password')` |
| Toggle password visibility | `[data-testid="login-toggle-password-visibility"]` | IconButton | `page.click('[data-testid="login-toggle-password-visibility"]')` |
| Remember me checkbox | `[data-testid="login-remember-me-checkbox"]` | Checkbox | `page.check('[data-testid="login-remember-me-checkbox"]')` |
| Submit button | `[data-testid="login-submit-button"]` | Button | `page.click('[data-testid="login-submit-button"]')` |
| Forgot password link | `[data-testid="login-forgot-password-link"]` | Link | `page.click('[data-testid="login-forgot-password-link"]')` |
| Register link | `[data-testid="login-register-link"]` | Link | `page.click('[data-testid="login-register-link"]')` |

**Status**: ✅ Complete - Test IDs added (Jan 4, 2025)

---

### RegisterForm.tsx ✅
**Component Path**: `client/src/components/Auth/RegisterForm.tsx`

| Element | Selector | Type | Usage |
|---------|----------|------|-------|
| First name input | `[data-testid="register-first-name-input"]` | TextField | `page.fill('[data-testid="register-first-name-input"]', 'John')` |
| Last name input | `[data-testid="register-last-name-input"]` | TextField | `page.fill('[data-testid="register-last-name-input"]', 'Doe')` |
| Role select | `[data-testid="register-role-select"]` | Select | `page.click('[data-testid="register-role-select"]')` |
| Student role option | `[data-testid="register-role-student-option"]` | MenuItem | `page.click('[data-testid="register-role-student-option"]')` |
| Instructor role option | `[data-testid="register-role-instructor-option"]` | MenuItem | `page.click('[data-testid="register-role-instructor-option"]')` |
| Email input | `[data-testid="register-email-input"]` | TextField | `page.fill('[data-testid="register-email-input"]', 'user@email.com')` |
| Username input | `[data-testid="register-username-input"]` | TextField | `page.fill('[data-testid="register-username-input"]', 'username')` |
| Password input | `[data-testid="register-password-input"]` | TextField | `page.fill('[data-testid="register-password-input"]', 'Pass123!')` |
| Confirm password input | `[data-testid="register-confirm-password-input"]` | TextField | `page.fill('[data-testid="register-confirm-password-input"]', 'Pass123!')` |
| Toggle password visibility | `[data-testid="register-toggle-password-visibility"]` | IconButton | `page.click('[data-testid="register-toggle-password-visibility"]')` |
| Toggle confirm password visibility | `[data-testid="register-toggle-confirm-password-visibility"]` | IconButton | `page.click('[data-testid="register-toggle-confirm-password-visibility"]')` |
| Learning style select | `[data-testid="register-learning-style-select"]` | Select | `page.click('[data-testid="register-learning-style-select"]')` |
| Back button | `[data-testid="register-back-button"]` | Button | `page.click('[data-testid="register-back-button"]')` |
| Next button | `[data-testid="register-next-button"]` | Button | `page.click('[data-testid="register-next-button"]')` |
| Submit button | `[data-testid="register-submit-button"]` | Button | `page.click('[data-testid="register-submit-button"]')` |
| Login link | `[data-testid="register-login-link"]` | Link | `page.click('[data-testid="register-login-link"]')` |
| Verification dialog | `[data-testid="register-verification-dialog"]` | Dialog | `page.locator('[data-testid="register-verification-dialog"]')` |
| Verify later button | `[data-testid="register-verify-later-button"]` | Button | `page.click('[data-testid="register-verify-later-button"]')` |
| Verify now button | `[data-testid="register-verify-now-button"]` | Button | `page.click('[data-testid="register-verify-now-button"]')` |

**Status**: ✅ Complete - Test IDs added (Jan 4, 2025)

---

### ForgotPasswordForm.tsx ✅
**Component Path**: `client/src/components/Auth/ForgotPasswordForm.tsx`

| Element | Selector | Type | Usage |
|---------|----------|------|-------|
| Email input | `[data-testid="forgot-password-email-input"]` | TextField | `page.fill('[data-testid="forgot-password-email-input"]', 'user@email.com')` |
| Submit button | `[data-testid="forgot-password-submit-button"]` | Button | `page.click('[data-testid="forgot-password-submit-button"]')` |
| Back to login link | `[data-testid="forgot-password-back-to-login-link"]` | Link | `page.click('[data-testid="forgot-password-back-to-login-link"]')` |

**Status**: ✅ Complete - Test IDs added (Jan 4, 2025)

---

### ResetPasswordForm.tsx ✅
**Component Path**: `client/src/components/Auth/ResetPasswordForm.tsx`

| Element | Selector | Type | Usage |
|---------|----------|------|-------|
| Email input | `[data-testid="reset-password-email-input"]` | TextField | `page.fill('[data-testid="reset-password-email-input"]', 'user@email.com')` |
| Token input | `[data-testid="reset-password-token-input"]` | TextField | `page.fill('[data-testid="reset-password-token-input"]', '123456')` |
| New password input | `[data-testid="reset-password-new-password-input"]` | TextField | `page.fill('[data-testid="reset-password-new-password-input"]', 'NewPass123!')` |
| Confirm password input | `[data-testid="reset-password-confirm-password-input"]` | TextField | `page.fill('[data-testid="reset-password-confirm-password-input"]', 'NewPass123!')` |
| Toggle password visibility | `[data-testid="reset-password-toggle-password-visibility"]` | IconButton | `page.click('[data-testid="reset-password-toggle-password-visibility"]')` |
| Toggle confirm password visibility | `[data-testid="reset-password-toggle-confirm-password-visibility"]` | IconButton | `page.click('[data-testid="reset-password-toggle-confirm-password-visibility"]')` |
| Submit button | `[data-testid="reset-password-submit-button"]` | Button | `page.click('[data-testid="reset-password-submit-button"]')` |
| Resend code link | `[data-testid="reset-password-resend-code-link"]` | Link | `page.click('[data-testid="reset-password-resend-code-link"]')` |
| Back to login link | `[data-testid="reset-password-back-to-login-link"]` | Link | `page.click('[data-testid="reset-password-back-to-login-link"]')` |
| Success go to login button | `[data-testid="reset-password-success-go-to-login-button"]` | Button | `page.click('[data-testid="reset-password-success-go-to-login-button"]')` |

**Status**: ✅ Complete - Test IDs added (Jan 4, 2025)

---

### EmailVerificationBanner.tsx ✅
**Component Path**: `client/src/components/Auth/EmailVerificationBanner.tsx`

| Element | Selector | Type | Usage |
|---------|----------|------|-------|
| Banner alert | `[data-testid="email-verification-banner-alert"]` | Alert | `page.locator('[data-testid="email-verification-banner-alert"]')` |
| Verify now button | `[data-testid="email-verification-verify-now-button"]` | Button | `page.click('[data-testid="email-verification-verify-now-button"]')` |
| Close button | `[data-testid="email-verification-close-button"]` | IconButton | `page.click('[data-testid="email-verification-close-button"]')` |

**Status**: ✅ Complete - Test IDs already present

---

## 🧭 **NAVIGATION COMPONENTS**

### HeaderV4.tsx ✅
**Component Path**: `client/src/components/Navigation/HeaderV4.tsx`

| Element | Selector | Type | Usage |
|---------|----------|------|-------|
| Mobile menu button | `[data-testid="header-mobile-menu-button"]` | IconButton | `page.click('[data-testid="header-mobile-menu-button"]')` |
| Search expand button | `[data-testid="header-search-expand-button"]` | IconButton | `page.click('[data-testid="header-search-expand-button"]')` |
| Profile menu button | `[data-testid="header-profile-menu-button"]` | IconButton | `page.click('[data-testid="header-profile-menu-button"]')` |
| Profile menu - Profile item | `[data-testid="header-profile-menu-item-profile"]` | MenuItem | `page.click('[data-testid="header-profile-menu-item-profile"]')` |
| Profile menu - Notifications item | `[data-testid="header-profile-menu-item-notifications"]` | MenuItem | `page.click('[data-testid="header-profile-menu-item-notifications"]')` |
| Profile menu - Settings item | `[data-testid="header-profile-menu-item-settings"]` | MenuItem | `page.click('[data-testid="header-profile-menu-item-settings"]')` |
| Profile menu - Logout item | `[data-testid="header-profile-menu-item-logout"]` | MenuItem | `page.click('[data-testid="header-profile-menu-item-logout"]')` |

**Status**: ✅ Complete - Test IDs added (Jan 4, 2025)

---

## 📚 **COURSE COMPONENTS** (Phase 2)

### CourseCard.tsx ✅
**Component Path**: `client/src/components/Course/CourseCard.tsx`

| Element | Selector | Type | Usage |
|---------|----------|------|-------|
| Card container | `[data-testid="course-card-{courseId}"]` | Card | `page.click('[data-testid="course-card-123"]')` |
| Bookmark button | `[data-testid="course-card-bookmark-button-{courseId}"]` | IconButton | `page.click('[data-testid="course-card-bookmark-button-123"]')` |
| Share button | `[data-testid="course-card-share-button-{courseId}"]` | IconButton | `page.click('[data-testid="course-card-share-button-123"]')` |
| Manage button (instructor) | `[data-testid="course-card-manage-button-{courseId}"]` | Button | `page.click('[data-testid="course-card-manage-button-123"]')` |
| Enroll button | `[data-testid="course-card-enroll-button-{courseId}"]` | Button | `page.click('[data-testid="course-card-enroll-button-123"]')` |
| Continue button (enrolled) | `[data-testid="course-card-continue-button-{courseId}"]` | Button | `page.click('[data-testid="course-card-continue-button-123"]')` |

**Status**: ✅ Complete - Test IDs added (Jan 4, 2026)

---

### ShareDialog.tsx ✅
**Component Path**: `client/src/components/Course/ShareDialog.tsx`

| Element | Selector | Type | Usage |
|---------|----------|------|-------|
| Dialog | `[data-testid="share-dialog"]` | Dialog | `page.locator('[data-testid="share-dialog"]')` |
| Close button | `[data-testid="share-dialog-close-button"]` | IconButton | `page.click('[data-testid="share-dialog-close-button"]')` |
| Copy link button | `[data-testid="share-dialog-copy-button"]` | Button | `page.click('[data-testid="share-dialog-copy-button"]')` |
| Twitter button | `[data-testid="share-dialog-twitter-button"]` | Button | `page.click('[data-testid="share-dialog-twitter-button"]')` |
| Facebook button | `[data-testid="share-dialog-facebook-button"]` | Button | `page.click('[data-testid="share-dialog-facebook-button"]')` |
| LinkedIn button | `[data-testid="share-dialog-linkedin-button"]` | Button | `page.click('[data-testid="share-dialog-linkedin-button"]')` |
| WhatsApp button | `[data-testid="share-dialog-whatsapp-button"]` | Button | `page.click('[data-testid="share-dialog-whatsapp-button"]')` |
| Email button | `[data-testid="share-dialog-email-button"]` | Button | `page.click('[data-testid="share-dialog-email-button"]')` |
| URL box | `[data-testid="share-dialog-url-box"]` | Box | `page.click('[data-testid="share-dialog-url-box"]')` |

**Status**: ✅ Complete - Test IDs added (Jan 4, 2026)

---

### CoursesPage.tsx ✅
**Component Path**: `client/src/pages/Courses/CoursesPage.tsx`

| Element | Selector | Type | Usage |
|---------|----------|------|-------|
| Tabs container | `[data-testid="courses-tabs"]` | Tabs | `page.locator('[data-testid="courses-tabs"]')` |
| All courses tab | `[data-testid="courses-tab-all"]` | Tab | `page.click('[data-testid="courses-tab-all"]')` |
| My courses tab | `[data-testid="courses-tab-my"]` | Tab | `page.click('[data-testid="courses-tab-my"]')` |
| Bookmarked tab | `[data-testid="courses-tab-bookmarked"]` | Tab | `page.click('[data-testid="courses-tab-bookmarked"]')` |
| Search input | `[data-testid="courses-search-input"]` | TextField | `page.fill('[data-testid="courses-search-input"]', 'Python')` |
| Category select | `[data-testid="courses-category-select"]` | Select | `page.click('[data-testid="courses-category-select"]')` |
| Level select | `[data-testid="courses-level-select"]` | Select | `page.click('[data-testid="courses-level-select"]')` |
| Sort select | `[data-testid="courses-sort-select"]` | Select | `page.click('[data-testid="courses-sort-select"]')` |
| Filters button | `[data-testid="courses-filters-button"]` | Button | `page.click('[data-testid="courses-filters-button"]')` |
| Pagination | `[data-testid="courses-pagination"]` | Pagination | `page.locator('[data-testid="courses-pagination"]')` |
| Browse courses button | `[data-testid="courses-browse-button"]` | Button | `page.click('[data-testid="courses-browse-button"]')` |

**Status**: ✅ Complete - Test IDs added (Jan 4, 2026)

---

## 🔔 **NOTIFICATION COMPONENTS** (Phase 3)

### NotificationsPage.tsx ✅
**Component Path**: `client/src/pages/Notifications/NotificationsPage.tsx`

| Element | Selector | Type | Usage |
|---------|----------|------|-------|
| Notification item | `[data-testid="notification-item-{notificationId}"]` | Box | `page.locator('[data-testid="notification-item-123"]')` |
| Item mark read button | `[data-testid="notification-item-mark-read-{notificationId}"]` | Button | `page.click('[data-testid="notification-item-mark-read-123"]')` |
| Item delete button | `[data-testid="notification-item-delete-{notificationId}"]` | IconButton | `page.click('[data-testid="notification-item-delete-123"]')` |
| Preferences button | `[data-testid="notifications-preferences-button"]` | Button | `page.click('[data-testid="notifications-preferences-button"]')` |
| Mark all read button | `[data-testid="notifications-mark-all-read-button"]` | Button | `page.click('[data-testid="notifications-mark-all-read-button"]')` |
| Refresh button | `[data-testid="notifications-refresh-button"]` | Button | `page.click('[data-testid="notifications-refresh-button"]')` |
| Show toggle | `[data-testid="notifications-show-toggle"]` | ToggleButtonGroup | `page.locator('[data-testid="notifications-show-toggle"]')` |
| Show all toggle | `[data-testid="notifications-show-all"]` | ToggleButton | `page.click('[data-testid="notifications-show-all"]')` |
| Show unread toggle | `[data-testid="notifications-show-unread"]` | ToggleButton | `page.click('[data-testid="notifications-show-unread"]')` |
| Type filter | `[data-testid="notifications-type-filter"]` | Select | `page.click('[data-testid="notifications-type-filter"]')` |
| Priority filter | `[data-testid="notifications-priority-filter"]` | Select | `page.click('[data-testid="notifications-priority-filter"]')` |
| Pagination | `[data-testid="notifications-pagination"]` | Pagination | `page.locator('[data-testid="notifications-pagination"]')` |

**Status**: ✅ Complete - Test IDs added (Jan 4, 2026)

---

### NotificationBell.tsx
**Status**: ⏳ Pending

---

## 👤 **PROFILE COMPONENTS** (Phase 3)

### ProfilePage.tsx ✅
**Component Path**: `client/src/pages/Profile/ProfilePage.tsx`

| Element | Selector | Type | Usage |
|---------|----------|------|-------|
| Avatar upload button | `[data-testid="profile-avatar-upload-button"]` | IconButton | `page.click('[data-testid="profile-avatar-upload-button"]')` |
| Email verification chip | `[data-testid="profile-verify-email-chip"]` | Chip | `page.click('[data-testid="profile-verify-email-chip"]')` |
| Tabs container | `[data-testid="profile-tabs"]` | Tabs | `page.locator('[data-testid="profile-tabs"]')` |
| Personal info tab | `[data-testid="profile-tab-personal"]` | Tab | `page.click('[data-testid="profile-tab-personal"]')` |
| Password tab | `[data-testid="profile-tab-password"]` | Tab | `page.click('[data-testid="profile-tab-password"]')` |
| Billing address tab | `[data-testid="profile-tab-billing"]` | Tab | `page.click('[data-testid="profile-tab-billing"]')` |
| Account info tab | `[data-testid="profile-tab-account"]` | Tab | `page.click('[data-testid="profile-tab-account"]')` |
| First name input | `[data-testid="profile-first-name-input"]` | TextField | `page.fill('[data-testid="profile-first-name-input"]', 'John')` |
| Last name input | `[data-testid="profile-last-name-input"]` | TextField | `page.fill('[data-testid="profile-last-name-input"]', 'Doe')` |
| Username input | `[data-testid="profile-username-input"]` | TextField | `page.fill('[data-testid="profile-username-input"]', 'johndoe')` |
| Learning style select | `[data-testid="profile-learning-style-select"]` | Select | `page.click('[data-testid="profile-learning-style-select"]')` |
| Save personal info button | `[data-testid="profile-save-personal-info-button"]` | Button | `page.click('[data-testid="profile-save-personal-info-button"]')` |
| Current password input | `[data-testid="profile-current-password-input"]` | TextField | `page.fill('[data-testid="profile-current-password-input"]', 'oldpass')` |
| Current password toggle | `[data-testid="profile-current-password-toggle"]` | IconButton | `page.click('[data-testid="profile-current-password-toggle"]')` |
| New password input | `[data-testid="profile-new-password-input"]` | TextField | `page.fill('[data-testid="profile-new-password-input"]', 'newpass')` |
| New password toggle | `[data-testid="profile-new-password-toggle"]` | IconButton | `page.click('[data-testid="profile-new-password-toggle"]')` |
| Confirm password input | `[data-testid="profile-confirm-password-input"]` | TextField | `page.fill('[data-testid="profile-confirm-password-input"]', 'newpass')` |
| Change password button | `[data-testid="profile-change-password-button"]` | Button | `page.click('[data-testid="profile-change-password-button"]')` |
| Billing street input | `[data-testid="profile-billing-street-input"]` | TextField | `page.fill('[data-testid="profile-billing-street-input"]', '123 Main St')` |
| Billing city input | `[data-testid="profile-billing-city-input"]` | TextField | `page.fill('[data-testid="profile-billing-city-input"]', 'New York')` |
| Billing state input | `[data-testid="profile-billing-state-input"]` | TextField | `page.fill('[data-testid="profile-billing-state-input"]', 'NY')` |
| Billing postal input | `[data-testid="profile-billing-postal-input"]` | TextField | `page.fill('[data-testid="profile-billing-postal-input"]', '10001')` |
| Billing country input | `[data-testid="profile-billing-country-input"]` | TextField | `page.fill('[data-testid="profile-billing-country-input"]', 'USA')` |
| Save billing button | `[data-testid="profile-save-billing-button"]` | Button | `page.click('[data-testid="profile-save-billing-button"]')` |
| Transaction history button | `[data-testid="profile-transaction-history-button"]` | Button | `page.click('[data-testid="profile-transaction-history-button"]')` |

**Status**: ✅ Complete - Test IDs added (Jan 4, 2026)

---

## 📊 **DASHBOARD COMPONENTS** (Phase 3)

### Dashboard.tsx ✅
**Component Path**: `client/src/pages/Dashboard/Dashboard.tsx`

| Element | Selector | Type | Usage |
|---------|----------|------|-------|
| My courses card | `[data-testid="dashboard-my-courses-card"]` | Card | `page.locator('[data-testid="dashboard-my-courses-card"]')` |
| Study hours card | `[data-testid="dashboard-study-hours-card"]` | Card | `page.locator('[data-testid="dashboard-study-hours-card"]')` |
| Completed card | `[data-testid="dashboard-completed-card"]` | Card | `page.locator('[data-testid="dashboard-completed-card"]')` |
| In progress card | `[data-testid="dashboard-in-progress-card"]` | Card | `page.locator('[data-testid="dashboard-in-progress-card"]')` |
| Recent activity section | `[data-testid="dashboard-recent-activity"]` | Paper | `page.locator('[data-testid="dashboard-recent-activity"]')` |

**Status**: ✅ Complete - Test IDs added (Jan 4, 2026)

---

## 🎓 **INSTRUCTOR COMPONENTS** (Phase 4)

### InstructorDashboard.tsx ✅
**Component Path**: `client/src/pages/Instructor/InstructorDashboard.tsx`

| Element | Selector | Type | Usage |
|---------|----------|------|-------|
| Create course header button | `[data-testid="instructor-create-course-header-button"]` | Button | `page.click('[data-testid="instructor-create-course-header-button"]')` |
| Total courses card | `[data-testid="instructor-total-courses-card"]` | Card | `page.locator('[data-testid="instructor-total-courses-card"]')` |
| Total students card | `[data-testid="instructor-total-students-card"]` | Card | `page.locator('[data-testid="instructor-total-students-card"]')` |
| Total revenue card | `[data-testid="instructor-total-revenue-card"]` | Card | `page.locator('[data-testid="instructor-total-revenue-card"]')` |
| Create new course button | `[data-testid="instructor-create-new-course-button"]` | Button | `page.click('[data-testid="instructor-create-new-course-button"]')` |
| Analytics hub button | `[data-testid="instructor-analytics-hub-button"]` | Button | `page.click('[data-testid="instructor-analytics-hub-button"]')` |
| Video analytics button | `[data-testid="instructor-video-analytics-button"]` | Button | `page.click('[data-testid="instructor-video-analytics-button"]')` |
| Intervention dashboard button | `[data-testid="instructor-intervention-dashboard-button"]` | Button | `page.click('[data-testid="instructor-intervention-dashboard-button"]')` |
| Settings button | `[data-testid="instructor-settings-button"]` | Button | `page.click('[data-testid="instructor-settings-button"]')` |
| Course edit button | `[data-testid="instructor-course-edit-button-{courseId}"]` | Button | `page.click('[data-testid="instructor-course-edit-button-123"]')` |
| Course preview button | `[data-testid="instructor-course-preview-button-{courseId}"]` | Button | `page.click('[data-testid="instructor-course-preview-button-123"]')` |
| Course lessons button | `[data-testid="instructor-course-lessons-button-{courseId}"]` | Button | `page.click('[data-testid="instructor-course-lessons-button-123"]')` |
| Course assessments button | `[data-testid="instructor-course-assessments-button-{courseId}"]` | Button | `page.click('[data-testid="instructor-course-assessments-button-123"]')` |
| Floating action button | `[data-testid="instructor-fab-create-course"]` | Fab | `page.click('[data-testid="instructor-fab-create-course"]')` |
| Create course dialog | `[data-testid="instructor-create-course-dialog"]` | Dialog | `page.locator('[data-testid="instructor-create-course-dialog"]')` |
| Create blank course option | `[data-testid="instructor-create-course-blank-option"]` | ListItem | `page.click('[data-testid="instructor-create-course-blank-option"]')` |
| Create template course option | `[data-testid="instructor-create-course-template-option"]` | ListItem | `page.click('[data-testid="instructor-create-course-template-option"]')` |

**Status**: ✅ Complete - Test IDs added (Jan 4, 2026)

---

### CourseCreationForm.tsx ✅
**Component Path**: `client/src/pages/Instructor/CourseCreationForm.tsx`

| Element | Selector | Type | Usage |
|---------|----------|------|-------|
| Course title input | `[data-testid="course-creation-title-input"]` | TextField | `page.fill('[data-testid="course-creation-title-input"]', 'Python Basics')` |
| Course subtitle input | `[data-testid="course-creation-subtitle-input"]` | TextField | `page.fill('[data-testid="course-creation-subtitle-input"]', 'Learn Python')` |
| Course description input | `[data-testid="course-creation-description-input"]` | TextField | `page.fill('[data-testid="course-creation-description-input"]', 'Description')` |
| Category select | `[data-testid="course-creation-category-select"]` | Select | `page.click('[data-testid="course-creation-category-select"]')` |
| Level select | `[data-testid="course-creation-level-select"]` | Select | `page.click('[data-testid="course-creation-level-select"]')` |
| Price input | `[data-testid="course-creation-price-input"]` | TextField | `page.fill('[data-testid="course-creation-price-input"]', '49.99')` |
| Thumbnail upload button | `[data-testid="course-creation-thumbnail-upload-button"]` | Button | `page.click('[data-testid="course-creation-thumbnail-upload-button"]')` |
| Add lesson button | `[data-testid="course-creation-add-lesson-button"]` | Button | `page.click('[data-testid="course-creation-add-lesson-button"]')` |
| Save draft button | `[data-testid="course-creation-save-draft-button"]` | Button | `page.click('[data-testid="course-creation-save-draft-button"]')` |

**Status**: ✅ Complete - Test IDs added (Jan 4, 2026)

---

## 📝 **ASSESSMENT COMPONENTS** (Phase 5)

### QuizTaker.tsx ✅
**Component Path**: `client/src/components/Assessment/QuizTaker.tsx`

| Element | Selector | Type | Usage |
|---------|----------|------|-------|
| Cancel button | `[data-testid="assessment-cancel-button"]` | Button | `page.click('[data-testid="assessment-cancel-button"]')` |
| Start assessment button | `[data-testid="assessment-start-button"]` | Button | `page.click('[data-testid="assessment-start-button"]')` |
| Question card | `[data-testid="assessment-question-card-{number}"]` | Card | `page.locator('[data-testid="assessment-question-card-1"]')` |
| Multiple choice answer | `[data-testid="assessment-multiple-choice-{number}"]` | RadioGroup | `page.locator('[data-testid="assessment-multiple-choice-1"]')` |
| True/False answer | `[data-testid="assessment-true-false-{number}"]` | RadioGroup | `page.locator('[data-testid="assessment-true-false-1"]')` |
| Short answer input | `[data-testid="assessment-short-answer-{number}"]` | TextField | `page.fill('[data-testid="assessment-short-answer-1"]', 'Answer')` |
| Essay input | `[data-testid="assessment-essay-{number}"]` | TextField | `page.fill('[data-testid="assessment-essay-1"]', 'Essay response')` |
| Submit button | `[data-testid="assessment-submit-button"]` | Button | `page.click('[data-testid="assessment-submit-button"]')` |
| Submit dialog | `[data-testid="assessment-submit-dialog"]` | Dialog | `page.locator('[data-testid="assessment-submit-dialog"]')` |
| Submit dialog cancel | `[data-testid="assessment-submit-dialog-cancel"]` | Button | `page.click('[data-testid="assessment-submit-dialog-cancel"]')` |
| Submit dialog confirm | `[data-testid="assessment-submit-dialog-confirm"]` | Button | `page.click('[data-testid="assessment-submit-dialog-confirm"]')` |

**Status**: ✅ Complete - Test IDs added (Jan 4, 2026)

---

## 💬 **COLLABORATION COMPONENTS** (Phase 6)

### StudyGroupsPage.tsx ✅
**Component Path**: `client/src/pages/StudyGroups/StudyGroupsPage.tsx`

| Element | Selector | Type | Usage |
|---------|----------|------|-------|
| Create group button | `[data-testid="study-groups-create-button"]` | Button | `page.click('[data-testid="study-groups-create-button"]')` |
| Tabs container | `[data-testid="study-groups-tabs"]` | Tabs | `page.locator('[data-testid="study-groups-tabs"]')` |
| My groups tab | `[data-testid="study-groups-tab-my"]` | Tab | `page.click('[data-testid="study-groups-tab-my"]')` |
| All groups tab | `[data-testid="study-groups-tab-all"]` | Tab | `page.click('[data-testid="study-groups-tab-all"]')` |
| By course tab | `[data-testid="study-groups-tab-course"]` | Tab | `page.click('[data-testid="study-groups-tab-course"]')` |
| Search input | `[data-testid="study-groups-search-input"]` | TextField | `page.fill('[data-testid="study-groups-search-input"]', 'Python')` |
| Course select | `[data-testid="study-groups-course-select"]` | Select | `page.click('[data-testid="study-groups-course-select"]')` |
| Search button | `[data-testid="study-groups-search-button"]` | Button | `page.click('[data-testid="study-groups-search-button"]')` |

**Status**: ✅ Complete - Test IDs added (Jan 4, 2026)

---

### CreateGroupModal.tsx ✅
**Component Path**: `client/src/components/StudyGroups/CreateGroupModal.tsx`

| Element | Selector | Type | Usage |
|---------|----------|------|-------|
| Modal dialog | `[data-testid="create-group-modal"]` | Dialog | `page.locator('[data-testid="create-group-modal"]')` |
| Group name input | `[data-testid="create-group-name-input"]` | TextField | `page.fill('[data-testid="create-group-name-input"]', 'Study Group')` |
| Description input | `[data-testid="create-group-description-input"]` | TextField | `page.fill('[data-testid="create-group-description-input"]', 'Description')` |
| Course select | `[data-testid="create-group-course-select"]` | Select | `page.click('[data-testid="create-group-course-select"]')` |
| Max members input | `[data-testid="create-group-max-members-input"]` | TextField | `page.fill('[data-testid="create-group-max-members-input"]', '20')` |
| Cancel button | `[data-testid="create-group-cancel-button"]` | Button | `page.click('[data-testid="create-group-cancel-button"]')` |
| Submit button | `[data-testid="create-group-submit-button"]` | Button | `page.click('[data-testid="create-group-submit-button"]')` |

**Status**: ✅ Complete - Test IDs added (Jan 4, 2026)

---

## 📱 **SETTINGS COMPONENTS** (Phase 7)

### SettingsPage.tsx ✅
**Component Path**: `client/src/pages/Settings/SettingsPage.tsx`

| Element | Selector | Type | Usage |
|---------|----------|------|-------|
| Profile visibility select | `[data-testid="settings-profile-visibility-select"]` | Select | `page.click('[data-testid="settings-profile-visibility-select"]')` |
| Show email switch | `[data-testid="settings-show-email-switch"]` | Switch | `page.click('[data-testid="settings-show-email-switch"]')` |
| Show progress switch | `[data-testid="settings-show-progress-switch"]` | Switch | `page.click('[data-testid="settings-show-progress-switch"]')` |
| Allow messages switch | `[data-testid="settings-allow-messages-switch"]` | Switch | `page.click('[data-testid="settings-allow-messages-switch"]')` |
| Save privacy button | `[data-testid="settings-save-privacy-button"]` | Button | `page.click('[data-testid="settings-save-privacy-button"]')` |
| Theme select | `[data-testid="settings-theme-select"]` | Select | `page.click('[data-testid="settings-theme-select"]')` |
| Export data button | `[data-testid="settings-export-data-button"]` | Button | `page.click('[data-testid="settings-export-data-button"]')` |
| Delete account button | `[data-testid="settings-delete-account-button"]` | Button | `page.click('[data-testid="settings-delete-account-button"]')` |
| Delete account dialog | `[data-testid="settings-delete-dialog"]` | Dialog | `page.is_visible('[data-testid="settings-delete-dialog"]')` |
| Delete dialog cancel | `[data-testid="settings-delete-dialog-cancel"]` | Button | `page.click('[data-testid="settings-delete-dialog-cancel"]')` |
| Delete dialog confirm | `[data-testid="settings-delete-dialog-confirm"]` | Button | `page.click('[data-testid="settings-delete-dialog-confirm"]')` |

**Status**: ✅ Complete - Test IDs added (Jan 4, 2026)

---

## 🎥 **VIDEO COMPONENTS** (Phase 7)

### VideoPlayer.tsx ✅
**Component Path**: `client/src/components/Video/VideoPlayer.tsx`

| Element | Selector | Type | Usage |
|---------|----------|------|-------|
| Skip backward (10s) | `[data-testid="video-skip-backward"]` | IconButton | `page.click('[data-testid="video-skip-backward"]')` |
| Play/Pause button | `[data-testid="video-play-pause"]` | IconButton | `page.click('[data-testid="video-play-pause"]')` |
| Skip forward (10s) | `[data-testid="video-skip-forward"]` | IconButton | `page.click('[data-testid="video-skip-forward"]')` |
| Mute/Unmute button | `[data-testid="video-mute-toggle"]` | IconButton | `page.click('[data-testid="video-mute-toggle"]')` |
| Volume slider | `[data-testid="video-volume-slider"]` | Slider | `page.fill('[data-testid="video-volume-slider"]', '50')` |
| Settings button | `[data-testid="video-settings-button"]` | IconButton | `page.click('[data-testid="video-settings-button"]')` |
| Keyboard shortcuts button | `[data-testid="video-shortcuts-button"]` | IconButton | `page.click('[data-testid="video-shortcuts-button"]')` |
| Picture-in-Picture button | `[data-testid="video-pip-button"]` | IconButton | `page.click('[data-testid="video-pip-button"]')` |
| Fullscreen button | `[data-testid="video-fullscreen-button"]` | IconButton | `page.click('[data-testid="video-fullscreen-button"]')` |
| Progress slider | `[data-testid="video-progress-slider"]` | Slider | `page.fill('[data-testid="video-progress-slider"]', '30')` |

**Status**: ✅ Complete - Test IDs added (Jan 4, 2026)

---

## 💳 **PAYMENT COMPONENTS** (Phase 7)

### CourseCheckoutPage.tsx ✅
**Component Path**: `client/src/pages/Payment/CourseCheckoutPage.tsx`

| Element | Selector | Type | Usage |
|---------|----------|------|-------|
| Payment submit button | `[data-testid="payment-submit-button"]` | Button | `page.click('[data-testid="payment-submit-button"]')` |

**Status**: ✅ Complete - Test IDs added (Jan 4, 2026)

---

## � **OFFICE HOURS COMPONENTS** (Phase 8)

### OfficeHoursPage.tsx ✅
**Component Path**: `client/src/pages/OfficeHours/OfficeHoursPage.tsx`

| Element | Selector | Type | Usage |
|---------|----------|------|-------|
| My Schedule tab (instructor) | `[data-testid="office-hours-schedule-tab"]` | Tab | `page.click('[data-testid="office-hours-schedule-tab"]')` |
| Current Queue tab (instructor) | `[data-testid="office-hours-queue-tab"]` | Tab | `page.click('[data-testid="office-hours-queue-tab"]')` |
| Join Queue tab (student) | `[data-testid="office-hours-join-tab"]` | Tab | `page.click('[data-testid="office-hours-join-tab"]')` |
| View Queues tab (student) | `[data-testid="office-hours-view-queues-tab"]` | Tab | `page.click('[data-testid="office-hours-view-queues-tab"]')` |

**Status**: ✅ Complete - Test IDs added (Jan 4, 2026)

---

### ScheduleManagement.tsx ✅
**Component Path**: `client/src/components/OfficeHours/ScheduleManagement.tsx`

| Element | Selector | Type | Usage |
|---------|----------|------|-------|
| Add schedule button | `[data-testid="schedule-add-button"]` | Button | `page.click('[data-testid="schedule-add-button"]')` |
| Edit schedule button | `[data-testid="schedule-edit-button"]` | Button | `page.click('[data-testid="schedule-edit-button"]')` |
| Toggle active button | `[data-testid="schedule-toggle-button"]` | Button | `page.click('[data-testid="schedule-toggle-button"]')` |
| Delete schedule button | `[data-testid="schedule-delete-button"]` | Button | `page.click('[data-testid="schedule-delete-button"]')` |
| Schedule dialog | `[data-testid="schedule-dialog"]` | Dialog | `page.locator('[data-testid="schedule-dialog"]')` |
| Day of week select | `[data-testid="schedule-day-select"]` | Select | `page.click('[data-testid="schedule-day-select"]')` |
| Start time input | `[data-testid="schedule-start-time-input"]` | TextField | `page.fill('[data-testid="schedule-start-time-input"]', '14:00')` |
| End time input | `[data-testid="schedule-end-time-input"]` | TextField | `page.fill('[data-testid="schedule-end-time-input"]', '16:00')` |
| Dialog cancel button | `[data-testid="schedule-dialog-cancel"]` | Button | `page.click('[data-testid="schedule-dialog-cancel"]')` |
| Dialog submit button | `[data-testid="schedule-dialog-submit"]` | Button | `page.click('[data-testid="schedule-dialog-submit"]')` |

**Status**: ✅ Complete - Test IDs added (Jan 4, 2026)

---

### QueueDisplay.tsx ✅
**Component Path**: `client/src/components/OfficeHours/QueueDisplay.tsx`

| Element | Selector | Type | Usage |
|---------|----------|------|-------|
| Admit student button | `[data-testid="queue-admit-button"]` | Button | `page.click('[data-testid="queue-admit-button"]')` |
| Complete session button | `[data-testid="queue-complete-button"]` | Button | `page.click('[data-testid="queue-complete-button"]')` |
| Cancel queue entry button | `[data-testid="queue-cancel-button"]` | Button | `page.click('[data-testid="queue-cancel-button"]')` |

**Status**: ✅ Complete - Test IDs added (Jan 4, 2026)

---

### StudentQueueJoin.tsx ✅
**Component Path**: `client/src/components/OfficeHours/StudentQueueJoin.tsx`

| Element | Selector | Type | Usage |
|---------|----------|------|-------|
| Instructor select | `[data-testid="queue-instructor-select"]` | Select | `page.click('[data-testid="queue-instructor-select"]')` |
| Time slot select | `[data-testid="queue-timeslot-select"]` | Select | `page.click('[data-testid="queue-timeslot-select"]')` |
| Question input | `[data-testid="queue-question-input"]` | TextField | `page.fill('[data-testid="queue-question-input"]', 'Need help with...')` |
| Join queue button | `[data-testid="queue-join-button"]` | Button | `page.click('[data-testid="queue-join-button"]')` |
| Leave queue button | `[data-testid="queue-leave-button"]` | Button | `page.click('[data-testid="queue-leave-button"]')` |

**Status**: ✅ Complete - Test IDs added (Jan 4, 2026)

---
## 📚 **COURSE & LESSON DETAIL PAGES** (Phase 9)

### CourseDetailPage.tsx ✅
**Component Path**: `client/src/pages/Course/CourseDetailPage.tsx`

| Element | Selector | Type | Usage |
|---------|----------|------|-------|
| Enroll button | `[data-testid="course-enroll-button"]` | Button | `page.click('[data-testid="course-enroll-button"]')` |
| Purchase button | `[data-testid="course-purchase-button"]` | Button | `page.click('[data-testid="course-purchase-button"]')` |
| Continue learning button | `[data-testid="course-continue-learning-button"]` | Button | `page.click('[data-testid="course-continue-learning-button"]')` |
| Bookmark button | `[data-testid="course-detail-bookmark-button"]` | IconButton | `page.click('[data-testid="course-detail-bookmark-button"]')` |
| Share button | `[data-testid="course-detail-share-button"]` | IconButton | `page.click('[data-testid="course-detail-share-button"]')` |

**Status**: ✅ Complete - Test IDs added (Jan 4, 2026)

---

### LessonDetailPage.tsx ✅
**Component Path**: `client/src/pages/Course/LessonDetailPage.tsx`

| Element | Selector | Type | Usage |
|---------|----------|------|-------|
| Mark complete button | `[data-testid="lesson-mark-complete-button"]` | Button | `page.click('[data-testid="lesson-mark-complete-button"]')` |
| Bookmark button | `[data-testid="lesson-bookmark-button"]` | IconButton | `page.click('[data-testid="lesson-bookmark-button"]')` |
| Share button | `[data-testid="lesson-share-button"]` | IconButton | `page.click('[data-testid="lesson-share-button"]')` |
| Add comment button | `[data-testid="lesson-add-comment-button"]` | Button | `page.click('[data-testid="lesson-add-comment-button"]')` |

**Status**: ✅ Complete - Test IDs added (Jan 4, 2026)

---
## 🎓 **INSTRUCTOR & LEARNING COMPONENTS** (Phase 10)

### LessonEditor.tsx ✅
**Component Path**: `client/src/pages/Instructor/LessonEditor.tsx`

| Element | Selector | Type | Usage |
|---------|----------|------|-------|
| Title input | `[data-testid="lesson-editor-title-input"]` | TextField | `page.fill('[data-testid="lesson-editor-title-input"]', 'Lesson Title')` |
| Description input | `[data-testid="lesson-editor-description-input"]` | TextField | `page.fill('[data-testid="lesson-editor-description-input"]', 'Description')` |
| Add video button | `[data-testid="lesson-editor-add-video-button"]` | Button | `page.click('[data-testid="lesson-editor-add-video-button"]')` |
| Add text button | `[data-testid="lesson-editor-add-text-button"]` | Button | `page.click('[data-testid="lesson-editor-add-text-button"]')` |
| Add quiz button | `[data-testid="lesson-editor-add-quiz-button"]` | Button | `page.click('[data-testid="lesson-editor-add-quiz-button"]')` |
| Save button | `[data-testid="lesson-editor-save-button"]` | Button | `page.click('[data-testid="lesson-editor-save-button"]')` |

**Status**: ✅ Complete - Test IDs added (Jan 4, 2026)

---

### PresenceStatusSelector.tsx ✅
**Component Path**: `client/src/components/Presence/PresenceStatusSelector.tsx`

| Element | Selector | Type | Usage |
|---------|----------|------|-------|
| Status button | `[data-testid="presence-status-button"]` | IconButton | `page.click('[data-testid="presence-status-button"]')` |
| Online status option | `[data-testid="presence-status-online"]` | MenuItem | `page.click('[data-testid="presence-status-online"]')` |
| Away status option | `[data-testid="presence-status-away"]` | MenuItem | `page.click('[data-testid="presence-status-away"]')` |
| Busy status option | `[data-testid="presence-status-busy"]` | MenuItem | `page.click('[data-testid="presence-status-busy"]')` |
| Offline status option | `[data-testid="presence-status-offline"]` | MenuItem | `page.click('[data-testid="presence-status-offline"]')` |

**Status**: ✅ Complete - Test IDs added (Jan 4, 2026)

---

### MyLearningPage.tsx ✅
**Component Path**: `client/src/pages/Learning/MyLearningPage.tsx`

| Element | Selector | Type | Usage |
|---------|----------|------|-------|
| Browse courses button | `[data-testid="my-learning-browse-button"]` | Button | `page.click('[data-testid="my-learning-browse-button"]')` |

**Status**: ✅ Complete - Test IDs added (Jan 4, 2026)

---
## �📝 **NAMING CONVENTIONS**

Pattern: `{component-context}-{element-purpose}-{action/type}[-{unique-id}]`

Examples:
- `login-email-input`
- `register-submit-button`
- `course-card-bookmark-button-{courseId}`
- `header-profile-menu-button`
- `notification-bell-delete-{notificationId}`

---

## 🔄 **UPDATE LOG**

| Date | Components Updated | Count | Notes |
|------|-------------------|-------|-------|
| 2026-01-04 | LoginForm.tsx | 7 | Email, password, checkbox, button, links |
| 2026-01-04 | RegisterForm.tsx | 16 | 3-step stepper, all inputs, navigation, verification dialog |
| 2026-01-04 | ForgotPasswordForm.tsx | 3 | Email input, submit button, back link |
| 2026-01-04 | ResetPasswordForm.tsx | 10 | Email, token, passwords with visibility toggles, links, success button |
| 2026-01-04 | EmailVerificationBanner.tsx | 3 | Alert, verify button, close button (already present) |
| 2026-01-04 | HeaderV4.tsx | 7 | Mobile menu, profile menu, logout |
| 2026-01-04 | CourseCard.tsx | 6 | Card, bookmark, share, manage, enroll, continue buttons |
| 2026-01-04 | ShareDialog.tsx | 9 | Dialog, close, platform buttons (copy, social media), URL box |
| 2026-01-04 | CoursesPage.tsx | 11 | Tabs, search, filters (category, level, sort), pagination, browse button |
| 2026-01-04 | NotificationsPage.tsx | 12 | Notification items, filters (show, type, priority), buttons, pagination |
| 2026-01-04 | ProfilePage.tsx | 25 | Avatar, tabs, personal info (4), password (6), billing (5), account info, transaction button |
| 2026-01-04 | Dashboard.tsx | 5 | 4 stat cards, recent activity section |
| 2026-01-04 | InstructorDashboard.tsx | 17 | Stats cards, quick actions (5 buttons), course actions (4 per course), FAB, create dialog |
| 2026-01-04 | CourseCreationForm.tsx | 9 | Course info fields (title, subtitle, description, category, level, price), thumbnail, add lesson, save draft |
| 2026-01-04 | QuizTaker.tsx | 11 | Start/cancel buttons, question cards, answer inputs (multiple choice, true/false, short answer, essay), submit button, submit dialog |
| 2026-01-04 | StudyGroupsPage.tsx | 8 | Create button, tabs (3), search input, course select, search button |
| 2026-01-04 | CreateGroupModal.tsx | 7 | Modal, name input, description, course select, max members, cancel/submit buttons |
| 2026-01-04 | test_auth.py | - | Updated to use new test IDs |
| 2026-01-04 | SettingsPage.tsx | 11 | Privacy settings (profile visibility select, 3 switches, save button), data management (export, delete + dialog) |
| 2026-01-04 | VideoPlayer.tsx | 14 | Play/pause, skip backward/forward, volume (slider + mute), progress slider, settings, shortcuts, PiP, fullscreen |
| 2026-01-04 | CourseCheckoutPage.tsx | 1 | Payment submit button |
| 2026-01-04 | OfficeHoursPage.tsx | 4 | Instructor tabs (schedule, queue), Student tabs (join, view queues) |
| 2026-01-04 | ScheduleManagement.tsx | 9 | Add button, schedule card buttons (edit, toggle, delete), dialog (day select, time inputs, cancel/submit) |
| 2026-01-04 | QueueDisplay.tsx | 3 | Queue action buttons (admit, complete, cancel) |
| 2026-01-04 | StudentQueueJoin.tsx | 5 | Instructor select, timeslot select, question input, join button, leave button |
| 2026-01-04 | CourseDetailPage.tsx | 5 | Enroll button, purchase button, continue learning button, bookmark button, share button |
| 2026-01-04 | LessonDetailPage.tsx | 4 | Mark complete button, bookmark button, share button, add comment button |
| 2026-01-04 | LessonEditor.tsx | 5 | Title input, description input, add video/text/quiz buttons, save button |
| 2026-01-04 | PresenceStatusSelector.tsx | 5 | Status button, status menu items (online, away, busy, offline) |
| 2026-01-04 | MyLearningPage.tsx | 1 | Browse courses button |
| 2026-01-04 | Chat.tsx | 5 | Create room button, message input, send button, room name input, create room submit |
| 2026-01-04 | LandingPage.tsx | 3 | Sign in button, get started button (header + hero) |
| 2026-01-04 | Tutoring.tsx | 3 | Create session button, message input, send button |

**Phase 1 Status**: ✅ Complete - All Auth + Navigation components (46 elements)
**Phase 2 Status**: ✅ Complete - Course components (26 elements)
**Phase 3 Status**: ✅ Complete - Notifications, Profile, Dashboard components (42 elements)
**Phase 4 Status**: ✅ Complete - Instructor components (26 elements)
**Phase 5 Status**: ✅ Complete - Assessment components (11 elements)
**Phase 6 Status**: ✅ Complete - Collaboration components (15 elements)
**Phase 7 Status**: ✅ Complete - Settings, Video, Payment components (26 elements)
**Phase 8 Status**: ✅ Complete - Office Hours components (21 elements)
**Phase 9 Status**: ✅ Complete - Course & Lesson Detail pages (9 elements)
**Phase 10 Status**: ✅ Complete - Additional Instructor & Learning components (11 elements)
**Phase 11 Status**: ✅ Complete - Chat, Landing, Tutoring components (11 elements)
**Phase 12 Status**: ✅ Complete - Live Sessions, Analytics, Notification Settings (30 elements)
**Phase 13 Status**: ✅ Complete - Transactions, Payment Success, Assessment Manager (23 elements)
**Phase 14 Status**: ✅ Complete - Student Management, Curriculum Builder, Intervention Dashboard (23 elements)
**Phase 15 Status**: ✅ Complete - Course Edit, Quiz Creator, Email Verification, Presence, Assessment Taking (23 elements)
**Phase 16 Status**: ✅ Complete - Video Analytics, Course Analytics, Student Assessment Dashboard, Lesson Management, Enhanced Assessment Analytics, Adaptive Quiz (17 elements)
**Phase 17 Status**: ✅ Complete - Video Transcript, Share Analytics, Instructor Student Analytics, AI Assessment Results (9 elements)
**Phase 18 Status**: ✅ Complete - ShareDialog (verified), OnlineUsersWidget, StudyGroupCard, LiveSessionCard (17 elements)
**Phase 19 Status**: ✅ Complete - GroupMembersList, EnhancedAssessmentResults (8 elements)
**Phase 20 Status**: ✅ Complete - CourseAssessmentManagementPage (11 elements)
**Phase 21 Status**: ✅ Complete - FileUpload component (6 elements)
**Phase 22 Status**: ✅ Complete - AITutoringDemo component (3 elements)
**Phase 23 Status**: ✅ Complete - CourseDetail page, UserPresenceBadge, TokenExpirationWarning (17 elements) - **🎉 REACHED 80% MILESTONE**
**Phase 24 Status**: ✅ Complete - LandingPage, Dashboard component (10 elements) - **🎉 REACHED 82% MILESTONE**

**Total Test IDs**: 451 across 82 components (82.0% of 550 target)

---

**Completed Components Summary**:
- Phase 12: InstructorSessionsList, StudentSessionsList, CreateSessionModal, AnalyticsHubPage, StudentProgressDashboard, NotificationSettingsPage
- Phase 13: TransactionsPage, PaymentSuccessPage, AssessmentManager
- Phase 14: StudentManagement, CurriculumBuilder, InterventionDashboard
- Phase 15: CourseEditPage, QuizCreator, EmailVerificationPage, OnlineUsersList, AssessmentTakingPage
- Phase 16: VideoAnalyticsPage, CourseAnalyticsDashboard, StudentAssessmentDashboard, LessonManagement, EnhancedAssessmentAnalyticsDashboard, AdaptiveQuizTaker
- Phase 17: VideoTranscript, ShareAnalyticsDialog, InstructorStudentAnalytics, AIEnhancedAssessmentResults
- Phase 18-22: ShareDialog (verified), OnlineUsersWidget, StudyGroupCard, LiveSessionCard, GroupMembersList, EnhancedAssessmentResults, CourseAssessmentManagementPage, FileUpload, AITutoringDemo
- Phase 23: CourseDetail, UserPresenceBadge, TokenExpirationWarning
- Phase 24: LandingPage (2 CTA buttons), Dashboard (8 quick action buttons)

**Remaining**: ~99 test IDs to reach target (18.0%)



---

## 📋 **PHASE 23 ADDITIONS** (Jan 4, 2026)

### CourseDetail.tsx ✅
**Component Path**: `client/src/pages/Courses/CourseDetail.tsx`

| Element | Selector | Type | Usage |
|---------|----------|------|-------|
| Courses breadcrumb | `[data-testid="course-detail-breadcrumb-courses"]` | Link | `page.click('[data-testid="course-detail-breadcrumb-courses"]')` |
| Category breadcrumb | `[data-testid="course-detail-breadcrumb-category"]` | Link | `page.click('[data-testid="course-detail-breadcrumb-category"]')` |
| Back button (error) | `[data-testid="course-detail-back-button"]` | Button | `page.click('[data-testid="course-detail-back-button"]')` |
| Learning outcomes accordion | `[data-testid="course-detail-learning-outcomes"]` | Accordion | `page.click('[data-testid="course-detail-learning-outcomes"]')` |
| Prerequisites accordion | `[data-testid="course-detail-prerequisites"]` | Accordion | `page.click('[data-testid="course-detail-prerequisites"]')` |
| Course content accordion | `[data-testid="course-detail-content"]` | Accordion | `page.click('[data-testid="course-detail-content"]')` |
| Manage course button | `[data-testid="course-detail-manage-button"]` | Button (instructor) | `page.click('[data-testid="course-detail-manage-button"]')` |
| Continue learning button | `[data-testid="course-detail-continue-button"]` | Button (enrolled) | `page.click('[data-testid="course-detail-continue-button"]')` |
| Enroll now button | `[data-testid="course-detail-enroll-button"]` | Button | `page.click('[data-testid="course-detail-enroll-button"]')` |
| Bookmark button | `[data-testid="course-detail-bookmark-button"]` | IconButton | `page.click('[data-testid="course-detail-bookmark-button"]')` |
| Share button | `[data-testid="course-detail-share-button"]` | IconButton | `page.click('[data-testid="course-detail-share-button"]')` |
| Enrollment dialog close | `[data-testid="enrollment-dialog-close-button"]` | Button | `page.click('[data-testid="enrollment-dialog-close-button"]')` |
| My learning button | `[data-testid="enrollment-dialog-my-learning-button"]` | Button | `page.click('[data-testid="enrollment-dialog-my-learning-button"]')` |
| Start learning button | `[data-testid="enrollment-dialog-start-button"]` | Button | `page.click('[data-testid="enrollment-dialog-start-button"]')` |

**Status**: ✅ Complete - 14 test IDs added

---

### UserPresenceBadge.tsx ✅
**Component Path**: `client/src/components/Presence/UserPresenceBadge.tsx`

| Element | Selector | Type | Usage |
|---------|----------|------|-------|
| Presence badge | `[data-testid="user-presence-badge"]` | Badge | `page.locator('[data-testid="user-presence-badge"]')` |

**Status**: ✅ Complete - 1 test ID added

---

### TokenExpirationWarning.tsx ✅
**Component Path**: `client/src/components/Auth/TokenExpirationWarning.tsx`

| Element | Selector | Type | Usage |
|---------|----------|------|-------|
| Warning snackbar | `[data-testid="token-expiration-warning"]` | Snackbar | `page.locator('[data-testid="token-expiration-warning"]')` |
| Extend session button | `[data-testid="token-extend-session-button"]` | Button | `page.click('[data-testid="token-extend-session-button"]')` |

**Status**: ✅ Complete - 2 test IDs added

**Phase 24 Total**: 10 test IDs added across 2 components
**Milestone Achievement**: 🎉 **REACHED 82% (451/550)** 🎉



---

## 📋 **PHASE 24 ADDITIONS** (Jan 4, 2026)

### LandingPage.tsx ✅
**Component Path**: `client/src/pages/Landing/LandingPage.tsx`

| Element | Selector | Type | Usage |
|---------|----------|------|-------|
| Watch Demo button | `[data-testid="landing-watch-demo-button"]` | Button | `page.click('[data-testid="landing-watch-demo-button"]')` |
| CTA button | `[data-testid="landing-cta-button"]` | Button | `page.click('[data-testid="landing-cta-button"]')` |

**Status**: ✅ Complete - 2 test IDs added

---

### Dashboard.tsx ✅
**Component Path**: `client/src/components/Dashboard.tsx`

| Element | Selector | Type | Usage |
|---------|----------|------|-------|
| Smart Progress button | `[data-testid="dashboard-smart-progress-button"]` | Button | `page.click('[data-testid="dashboard-smart-progress-button"]')` |
| Logout button | `[data-testid="dashboard-logout-button"]` | Button | `page.click('[data-testid="dashboard-logout-button"]')` |
| View All Courses button | `[data-testid="dashboard-view-all-courses-button"]` | Button | `page.click('[data-testid="dashboard-view-all-courses-button"]')` |
| Continue course button | `[data-testid="dashboard-continue-course-${index}"]` | Button (dynamic) | `page.click('[data-testid="dashboard-continue-course-0"]')` |
| Browse Courses (empty) | `[data-testid="dashboard-browse-courses-empty-button"]` | Button | `page.click('[data-testid="dashboard-browse-courses-empty-button"]')` |
| Quick Browse button | `[data-testid="dashboard-quick-browse-button"]` | Button | `page.click('[data-testid="dashboard-quick-browse-button"]')` |
| Assignments button | `[data-testid="dashboard-assignments-button"]` | Button | `page.click('[data-testid="dashboard-assignments-button"]')` |
| Study Group button | `[data-testid="dashboard-study-group-button"]` | Button | `page.click('[data-testid="dashboard-study-group-button"]')` |

**Status**: ✅ Complete - 8 test IDs added

**Phase 24 Total**: 10 test IDs added across 2 components
**Milestone Achievement**: 🎉 **REACHED 82% (451/550)** 🎉

