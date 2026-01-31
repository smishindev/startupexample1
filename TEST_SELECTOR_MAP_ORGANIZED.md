# Test Selector Map - Organized for Test Automation

**Purpose**: Quick reference for writing Playwright tests - organized by feature area  
**Last Updated**: January 6, 2026  
**Coverage**: 668 test IDs across 32 components

---

## 📖 Quick Start Guide

### Finding Selectors
1. Navigate to the feature area you're testing (Authentication, Courses, Assessments, etc.)
2. Find your component
3. Copy the data-testid selector
4. Use in your test: `page.click('[data-testid="selector-name"]')`

### Dynamic Selectors
Many selectors use dynamic IDs/indexes:
- `{id}` - Replace with actual database ID (e.g., `course-detail-lesson-123`)
- `{index}` - Replace with array index (e.g., `lesson-content-move-up-0`)
- `{item}` - Replace with item name (e.g., `header-nav-courses`)

---

## 🔍 Component Quick Index

**Alphabetical component lookup** - Find your component and jump to its section:

- **AdaptiveQuizTaker** → Assessment System
- **AIEnhancedAssessmentResults** → Assessment System
- **AssessmentManager** → Assessment System
- **Chat** → Communication & Collaboration
- **CourseCheckoutPage** → Payment & Checkout
- **CourseCreationForm** → Course Management
- **CourseDetail / CourseDetailPage** → Course Management
- **CoursesPage** → Course Management
- **CurriculumBuilder** → Course Management
- **Dashboard** → Dashboard & Navigation
- **EnhancedAssessmentAnalyticsDashboard** → Assessment System
- **FileUpload** → File Management
- **ForgotPasswordForm** → Authentication & Access Control
- **HeaderV4** → Dashboard & Navigation
- **InstructorDashboard** → Instructor Tools
- **InstructorStudentAnalytics** → Instructor Tools
- **InterventionDashboard** → Instructor Tools
- **LandingPage** → Dashboard & Navigation
- **Layout** → Dashboard & Navigation
- **LessonDetailPage** → Lesson Management
- **LessonEditor** → Lesson Management
- **LessonManagement** → Lesson Management
- **LoginForm** → Authentication & Access Control
- **MyLearningPage** → Course Management
- **NotificationBell** → Communication & Collaboration
- **NotificationSettingsPage** → User Profile & Settings
- **NotificationsPage** → Communication & Collaboration
- **PaymentSuccessPage** → Payment & Checkout
- **PresenceStatusSelector** → User Profile & Settings
- **ProfilePage** → User Profile & Settings
- **QuizCreator** → Assessment System
- **QuizTaker** → Assessment System
- **RegisterForm** → Authentication & Access Control
- **ResetPasswordForm** → Authentication & Access Control
- **SettingsPage** → User Profile & Settings
- **ShareAnalyticsDialog** → Analytics & Insights
- **StudentAssessmentDashboard** → Assessment System
- **StudentManagement** → Instructor Tools
- **StudentProgressDashboard** → Instructor Tools
- **TokenExpirationWarning** → Authentication & Access Control
- **TransactionsPage** → User Profile & Settings
- **Tutoring** → Communication & Collaboration
- **UserPresenceBadge** → User Profile & Settings
- **VideoPlayer** → Video & Media
- **VideoTranscript** → Video & Media

---

## 🎯 Common Test Scenarios

### Complete Student Journey (E2E Test)
```python
def test_student_complete_journey(page):
    # 1. Registration
    page.goto('/register')
    page.fill('[data-testid="register-first-name-input"]', 'John')
    page.fill('[data-testid="register-last-name-input"]', 'Student')
    page.click('[data-testid="register-role-select"]')
    page.click('[data-testid="register-role-student-option"]')
    page.fill('[data-testid="register-email-input"]', 'john@test.com')
    page.fill('[data-testid="register-username-input"]', 'johnstudent')
    page.fill('[data-testid="register-password-input"]', 'Test123!')
    page.fill('[data-testid="register-confirm-password-input"]', 'Test123!')
    page.click('[data-testid="register-submit-button"]')
    
    # 2. Browse Courses
    page.wait_for_url('**/dashboard')
    page.click('[data-testid="dashboard-view-all-courses-button"]')
    
    # 3. Enroll in Course
    page.wait_for_selector('[data-testid="course-detail-enroll-button"]')
    page.click('[data-testid="course-detail-enroll-button"]')
    
    # 4. Start Learning
    page.click('[data-testid="course-detail-start-learning-button"]')
    page.wait_for_url('**/lessons/**')
    
    # 5. Complete Lesson
    page.click('[data-testid="lesson-detail-continue-next-button"]')
    
    # 6. Take Assessment
    page.click('[data-testid="assessment-start-button"]')
    page.click('[data-testid="assessment-multiple-choice-1"]')
    page.click('[data-testid="assessment-submit-button"]')
    
    # Verify completion
    page.wait_for_selector('[data-testid="assessment-results-continue-button"]')
```

### Instructor Course Creation Flow
```python
def test_instructor_create_course(page):
    # Login as instructor
    page.goto('/login')
    page.fill('[data-testid="login-email-input"]', 'instructor@test.com')
    page.fill('[data-testid="login-password-input"]', 'password123')
    page.click('[data-testid="login-submit-button"]')
    
    # Navigate to course creation
    page.wait_for_url('**/dashboard')
    page.click('[data-testid="instructor-dashboard-create-course-button"]')
    
    # Fill course details
    page.fill('[data-testid="course-title-input"]', 'Python Fundamentals')
    page.fill('[data-testid="course-description-input"]', 'Learn Python basics')
    page.click('[data-testid="course-creation-add-tag-button"]')
    page.click('[data-testid="course-creation-next-button"]')
    
    # Add lessons
    page.click('[data-testid="course-creation-lesson-dialog-add"]')
    page.click('[data-testid="course-creation-next-button"]')
    
    # Publish course
    page.click('[data-testid="course-creation-publish-button"]')
    page.wait_for_url('**/instructor/dashboard')
```

### Student Assessment Taking Flow
```python
def test_student_take_assessment(page):
    # Navigate to assessment
    page.goto('/courses/123/assessments/456')
    
    # Start assessment
    page.click('[data-testid="assessment-start-button"]')
    
    # Answer questions
    page.click('[data-testid="assessment-multiple-choice-1"]')  # Question 1
    page.fill('[data-testid="assessment-short-answer-2"]', 'Variables store data')  # Question 2
    page.fill('[data-testid="assessment-essay-3"]', 'Python is a high-level...')  # Question 3
    
    # Submit assessment
    page.click('[data-testid="assessment-submit-button"]')
    page.click('[data-testid="assessment-submit-dialog-confirm"]')
    
    # View results
    page.wait_for_selector('[data-testid="assessment-results-retake-button"]')
```

### Password Reset Flow
```python
def test_password_reset(page):
    # Navigate to forgot password
    page.goto('/login')
    page.click('[data-testid="login-forgot-password-link"]')
    
    # Request reset
    page.fill('[data-testid="forgot-password-email-input"]', 'user@test.com')
    page.click('[data-testid="forgot-password-submit-button"]')
    
    # Simulate receiving email token
    token = 'ABC123'
    
    # Reset password
    page.goto(f'/reset-password?token={token}')
    page.fill('[data-testid="reset-password-email-input"]', 'user@test.com')
    page.fill('[data-testid="reset-password-token-input"]', token)
    page.fill('[data-testid="reset-password-new-password-input"]', 'NewPass123!')
    page.fill('[data-testid="reset-password-confirm-password-input"]', 'NewPass123!')
    page.click('[data-testid="reset-password-submit-button"]')
    
    # Verify success and login
    page.click('[data-testid="reset-password-success-go-to-login-button"]')
```

### Instructor Student Management Flow
```python
def test_instructor_manage_students(page):
    # Navigate to student management
    page.goto('/instructor/courses/123/students')
    
    # Enroll new student
    page.click('[data-testid="student-management-enroll-button"]')
    # ... enrollment dialog flow
    
    # View student details
    student_id = 456
    page.click(f'[data-testid="student-management-view-{student_id}"]')
    
    # Send message to student
    page.click(f'[data-testid="student-management-message-{student_id}"]')
    page.fill('[data-testid="message-content-input"]', 'Great progress!')
    page.click('[data-testid="message-send-button"]')
    
    # Check intervention dashboard
    page.goto('/instructor/interventions')
    page.click(f'[data-testid="intervention-view-student-{student_id}"]')
```

### Chat and Collaboration Flow
```python
def test_chat_collaboration(page):
    # Open chat
    page.goto('/chat')
    
    # Search for room
    page.fill('[data-testid="chat-search-input"]', 'Python Study Group')
    
    # Join room
    room_id = 789
    page.click(f'[data-testid="chat-room-item-{room_id}"]')
    
    # Send message
    page.fill('[data-testid="chat-message-input"]', 'Hello everyone!')
    page.click('[data-testid="chat-emoji-picker-button"]')  # Optional
    page.click('[data-testid="chat-send-button"]')
    
    # Create new room
    page.click('[data-testid="chat-create-room-button"]')
    page.fill('[data-testid="chat-room-name-input"]', 'Advanced Python')
    page.click('[data-testid="chat-create-confirm-button"]')
```

---

## 🔐 AUTHENTICATION & ACCESS CONTROL

### LoginForm.tsx
**Path**: `client/src/components/Auth/LoginForm.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Email input | `login-email-input` | TextField | Required field |
| Password input | `login-password-input` | TextField | Required field |
| Toggle password visibility | `login-toggle-password-visibility` | IconButton | Shows/hides password |
| Remember me checkbox | `login-remember-me-checkbox` | Checkbox | Optional |
| Submit button | `login-submit-button` | Button | Form submission |
| Forgot password link | `login-forgot-password-link` | Link | Navigation to password reset |
| Register link | `login-register-link` | Link | Navigation to registration |

**Test Scenario Example:**
```python
page.fill('[data-testid="login-email-input"]', 'student@test.com')
page.fill('[data-testid="login-password-input"]', 'password123')
page.check('[data-testid="login-remember-me-checkbox"]')
page.click('[data-testid="login-submit-button"]')
```

---

### RegisterForm.tsx
**Path**: `client/src/components/Auth/RegisterForm.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| First name input | `register-first-name-input` | TextField | Required |
| Last name input | `register-last-name-input` | TextField | Required |
| Role select | `register-role-select` | Select | Student/Instructor |
| Student role option | `register-role-student-option` | MenuItem | Role selection |
| Instructor role option | `register-role-instructor-option` | MenuItem | Role selection |
| Email input | `register-email-input` | TextField | Required, must be unique |
| Username input | `register-username-input` | TextField | Required, must be unique |
| Password input | `register-password-input` | TextField | Required, validation rules |
| Confirm password input | `register-confirm-password-input` | TextField | Must match password |
| Toggle password visibility | `register-toggle-password-visibility` | IconButton | First password field |
| Toggle confirm password visibility | `register-toggle-confirm-password-visibility` | IconButton | Confirm password field |
| Learning style select | `register-learning-style-select` | Select | Student onboarding |
| Back button | `register-back-button` | Button | Multi-step form navigation |
| Next button | `register-next-button` | Button | Multi-step form navigation |
| Submit button | `register-submit-button` | Button | Final submission |
| Login link | `register-login-link` | Link | Navigation to login |
| Verification dialog | `register-verification-dialog` | Dialog | Email verification prompt |
| Verify later button | `register-verify-later-button` | Button | Skip verification |
| Verify now button | `register-verify-now-button` | Button | Redirect to email |

---

### ForgotPasswordForm.tsx
**Path**: `client/src/components/Auth/ForgotPasswordForm.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Email input | `forgot-password-email-input` | TextField | Required |
| Submit button | `forgot-password-submit-button` | Button | Sends reset email |
| Back to login link | `forgot-password-back-to-login-link` | Link | Navigation |

---

### ResetPasswordForm.tsx
**Path**: `client/src/components/Auth/ResetPasswordForm.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Email input | `reset-password-email-input` | TextField | Pre-filled from URL |
| Token input | `reset-password-token-input` | TextField | From email |
| New password input | `reset-password-new-password-input` | TextField | Password rules apply |
| Confirm password input | `reset-password-confirm-password-input` | TextField | Must match |
| Toggle password visibility | `reset-password-toggle-password-visibility` | IconButton | New password |
| Toggle confirm password visibility | `reset-password-toggle-confirm-password-visibility` | IconButton | Confirm password |
| Submit button | `reset-password-submit-button` | Button | Resets password |
| Resend code link | `reset-password-resend-code-link` | Link | Resends token email |
| Back to login link | `reset-password-back-to-login-link` | Link | Navigation |
| Success go to login button | `reset-password-success-go-to-login-button` | Button | After success |

---

### TokenExpirationWarning.tsx
**Path**: `client/src/components/Auth/TokenExpirationWarning.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Extend session button | `token-warning-extend-button` | Button | Refreshes token |
| Logout button | `token-warning-logout-button` | Button | Ends session |

---

## 📚 COURSE MANAGEMENT

### CoursesPage.tsx
**Path**: `client/src/pages/CoursesPage.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Bookmarks signin button | `courses-bookmarks-signin-button` | Button | For unauthenticated users |

---

### CourseCreationForm.tsx
**Path**: `client/src/components/Course/CourseCreationForm.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Add tag button | `course-creation-add-tag-button` | IconButton | Adds course tag |
| Remove lesson (dynamic) | `course-creation-remove-lesson-{id}-button` | IconButton | Use lesson ID |
| Add requirement button | `course-creation-add-requirement-button` | IconButton | Adds prerequisite |
| Remove requirement (dynamic) | `course-creation-remove-requirement-button` | IconButton | Array index based |
| Add learning point button | `course-creation-add-learning-point-button` | IconButton | What students learn |
| Remove learning point (dynamic) | `course-creation-remove-learning-point-button` | IconButton | Array index based |
| Cancel button | `course-creation-cancel-button` | Button | Discards changes |
| Back button | `course-creation-back-button` | Button | Multi-step navigation |
| Next button | `course-creation-next-button` | Button | Multi-step navigation |
| Publish button | `course-creation-publish-button` | Button | Final submission |
| Lesson dialog cancel | `course-creation-lesson-dialog-cancel-button` | Button | In lesson picker |
| Lesson dialog add | `course-creation-lesson-dialog-add` | Button | In lesson picker |
| Upload dialog close | `course-creation-upload-close-button` | Button | File upload dialog |

**Test Flow Example:**
```python
# Step 1: Basic Info
page.fill('[data-testid="course-title-input"]', 'Python Basics')
page.click('[data-testid="course-creation-add-tag-button"]')
page.click('[data-testid="course-creation-next-button"]')

# Step 2: Lessons
page.click('[data-testid="course-creation-lesson-dialog-add"]')

# Step 3: Publish
page.click('[data-testid="course-creation-publish-button"]')
```

---

### CourseDetail.tsx / CourseDetailPage.tsx
**Path**: `client/src/pages/Courses/CourseDetail.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Enroll button | `course-detail-enroll-button` | Button | For non-enrolled users |
| Unenroll button | `course-detail-unenroll-button` | Button | For enrolled users |
| Start learning button | `course-detail-start-learning-button` | Button | First lesson |
| Continue learning button | `course-detail-continue-learning-button` | Button | Resume progress |
| Share button | `course-detail-share-button` | IconButton | Social sharing |
| Bookmark button | `course-detail-bookmark-button` | IconButton | Save for later |
| Course menu button | `course-detail-course-menu-button` | IconButton | Actions menu |
| Breadcrumb home | `course-detail-breadcrumb-home` | Link | Navigation |
| Breadcrumb courses | `course-detail-breadcrumb-courses` | Link | Navigation |
| Overview tab | `course-detail-tab-overview` | Tab | Course description |
| Curriculum tab | `course-detail-tab-curriculum` | Tab | Lessons list |
| Reviews tab | `course-detail-tab-reviews` | Tab | Student feedback |
| Announcements tab | `course-detail-tab-announcements` | Tab | Instructor updates |
| Discussion tab | `course-detail-tab-discussion` | Tab | Q&A forum |
| Section lesson item (dynamic) | `course-detail-section-lesson-{id}-button` | ListItemButton | Navigate to lesson |

---

### CurriculumBuilder.tsx
**Path**: `client/src/components/Course/CurriculumBuilder.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Edit menu button (dynamic) | `curriculum-edit-menu-{id}` | IconButton | Opens lesson menu |
| Menu edit option (dynamic) | `curriculum-menu-edit-{id}` | MenuItem | Edit lesson |
| Menu delete option (dynamic) | `curriculum-menu-delete-{id}` | MenuItem | Delete lesson |
| Delete cancel button | `curriculum-builder-delete-cancel-button` | Button | Confirmation dialog |

---

### MyLearningPage.tsx
**Path**: `client/src/pages/Student/MyLearningPage.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Create test data button | `my-learning-create-test-data-button` | Button | Dev/testing only |
| Edit course (dynamic) | `my-learning-edit-course-{id}` | IconButton | Instructor only |
| View lessons (dynamic) | `my-learning-view-lessons-{id}` | Button | Navigate to lessons |
| View assessments (dynamic) | `my-learning-view-assessments-{id}` | Button | Navigate to quizzes |
| Preview course (dynamic) | `my-learning-preview-course-{id}` | Button | View as student |
| Continue learning (dynamic) | `my-learning-continue-{id}` | Button | Resume progress |

---

## 📝 LESSON MANAGEMENT

### LessonEditor.tsx
**Path**: `client/src/pages/Instructor/LessonEditor.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Title input | `lesson-editor-title-input` | TextField | Required field |
| Description input | `lesson-editor-description-input` | TextField | Optional |
| Add video button | `lesson-editor-add-video-button` | Button | Embed video content |
| Add text button | `lesson-editor-add-text-button` | Button | Rich text editor |
| Add quiz button | `lesson-editor-add-quiz-button` | Button | Assessment integration |
| Content move up (dynamic) | `lesson-editor-content-move-up-{index}` | IconButton | Reorder content blocks |
| Content move down (dynamic) | `lesson-editor-content-move-down-{index}` | IconButton | Reorder content blocks |
| Content delete (dynamic) | `lesson-editor-content-delete-{index}` | IconButton | Remove content block |
| Step continue button | `lesson-editor-step-continue-button` | Button | Multi-step wizard |
| Step back button | `lesson-editor-step-back-button` | Button | Multi-step wizard |
| Cancel button | `lesson-editor-cancel-button` | Button | Discard changes |
| Save button | `lesson-editor-save-button` | Button | Save lesson |
| Dialog cancel button | `lesson-editor-dialog-cancel-button` | Button | Close dialog |

---

### LessonDetailPage.tsx
**Path**: `client/src/pages/LessonDetailPage.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Back to course button | `lesson-detail-back-to-course-button` | Button | Return to course page |
| Back navigation button | `lesson-detail-back-button` | IconButton | Previous lesson |
| TOC toggle button | `lesson-detail-toc-toggle-button` | IconButton | Show/hide sidebar |
| TOC close button | `lesson-detail-toc-close-button` | IconButton | In drawer |
| Continue next button | `lesson-detail-continue-next-button` | Button | Next lesson |
| Comment like (dynamic) | `lesson-comment-like-{id}` | IconButton | Like comment |
| Comment reply (dynamic) | `lesson-comment-reply-{id}` | IconButton | Reply to comment |
| Progress lesson item (dynamic) | `lesson-detail-progress-lesson-{id}-button` | ListItemButton | In progress widget |
| TOC lesson item (dynamic) | `lesson-detail-toc-lesson-{id}-button` | ListItemButton | In drawer |

---

### LessonManagement.tsx
**Path**: `client/src/components/Lessons/LessonManagement.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Create first button | `lesson-management-create-first-button` | Button | Empty state CTA |

---

## 🎯 ASSESSMENT SYSTEM

### QuizCreator.tsx
**Path**: `client/src/components/Assessment/QuizCreator.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Settings close button | `quiz-creator-settings-close` | Button | Settings dialog |
| Preview close button | `quiz-creator-preview-close` | Button | Preview dialog |

---

### QuizTaker.tsx
**Path**: `client/src/components/Assessment/QuizTaker.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Start button | `assessment-start-button` | Button | Begin assessment |
| Submit button | `assessment-submit-button` | Button | Finish assessment |
| Submit dialog | `assessment-submit-dialog` | Dialog | Confirmation |
| Submit dialog cancel | `assessment-submit-dialog-cancel` | Button | Cancel submission |
| Cancel button | `assessment-cancel-button` | Button | Exit assessment |
| Multiple choice (dynamic) | `assessment-multiple-choice-{number}` | FormControlLabel | Answer option |
| Short answer (dynamic) | `assessment-short-answer-{number}` | TextField | Answer input |
| Essay (dynamic) | `assessment-essay-{number}` | TextField | Long answer |
| Question card (dynamic) | `assessment-question-card-{number}` | Card | Question container |

---

### AdaptiveQuizTaker.tsx
**Path**: `client/src/components/Assessment/AdaptiveQuizTaker.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Cancel submit button | `adaptive-quiz-cancel-submit` | Button | Cancel dialog |
| Confirm submit button | `adaptive-quiz-confirm-submit` | Button | Confirm submission |

---

### AIEnhancedAssessmentResults.tsx
**Path**: `client/src/components/Assessment/AIEnhancedAssessmentResults.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Retake button | `assessment-results-retake-button` | Button | Retry assessment |
| Continue button | `assessment-results-continue-button` | Button | Back to course |
| AI retry button | `assessment-results-ai-retry-button` | Button | Reload AI feedback |
| AI more insights button | `assessment-results-ai-more-insights-button` | Button | Request additional AI analysis |
| Generate AI insights button | `assessment-results-generate-ai-insights-button` | Button | Initial AI generation |
| Insight cancel button | `assessment-results-insight-cancel` | Button | Close insight dialog |

---

### AssessmentManager.tsx
**Path**: `client/src/components/Assessment/AssessmentManager.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Menu view option (dynamic) | `assessment-menu-view-{id}` | MenuItem | View details |
| Menu edit option (dynamic) | `assessment-menu-edit-{id}` | MenuItem | Edit assessment |
| Menu delete option (dynamic) | `assessment-menu-delete-{id}` | MenuItem | Delete assessment |
| Manager menu view | `assessment-manager-menu-view` | MenuItem | Alternative selector |
| Manager menu edit | `assessment-manager-menu-edit` | MenuItem | Alternative selector |
| Manager menu delete | `assessment-manager-menu-delete` | MenuItem | Alternative selector |
| Delete cancel button | `assessment-manager-delete-cancel-button` | Button | Confirmation dialog |

---

### StudentAssessmentDashboard.tsx
**Path**: `client/src/pages/Student/StudentAssessmentDashboard.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Max attempts button | `student-assessment-max-attempts-button` | Button | Warning message |
| Retry button | `student-assessment-retry-button` | Button | Retry assessment |
| Browse courses button | `student-assessment-browse-courses` | Button | Empty state |

---

### EnhancedAssessmentAnalyticsDashboard.tsx
**Path**: `client/src/components/Assessment/EnhancedAssessmentAnalyticsDashboard.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Error retry button | `assessment-analytics-error-retry` | IconButton | Error state |
| Refresh button | `assessment-analytics-refresh` | IconButton | Reload data |

---

## 👨‍🏫 INSTRUCTOR TOOLS

### InstructorDashboard.tsx
**Path**: `client/src/pages/Instructor/InstructorDashboard.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Create course button | `instructor-dashboard-create-course-button` | Button | Main CTA |
| View analytics button | `instructor-dashboard-view-analytics-button` | Button | Course analytics |
| Course menu button (dynamic) | `instructor-dashboard-course-menu-{id}-button` | IconButton | Course actions menu |
| Menu edit option (dynamic) | `instructor-dashboard-menu-edit-{id}` | MenuItem | Edit course |
| Menu preview option (dynamic) | `instructor-dashboard-menu-preview-{id}` | MenuItem | View as student |
| Menu analytics option (dynamic) | `instructor-dashboard-menu-analytics-{id}` | MenuItem | Course analytics |
| Menu students option (dynamic) | `instructor-dashboard-menu-students-{id}` | MenuItem | Manage enrollments |
| Course menu edit | `instructor-dashboard-course-menu-edit` | MenuItem | Alternative selector |
| Course menu preview | `instructor-dashboard-course-menu-preview` | MenuItem | Alternative selector |
| Course menu analytics | `instructor-dashboard-course-menu-analytics` | MenuItem | Alternative selector |
| Course menu students | `instructor-dashboard-course-menu-students` | MenuItem | Alternative selector |

---

### StudentManagement.tsx
**Path**: `client/src/pages/Instructor/StudentManagement.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Enroll button | `student-management-enroll-button` | Button | Add students |
| Bulk operations menu | `student-management-bulk-operations-menu` | Button | Batch actions |
| View student details (dynamic) | `student-management-view-{studentId}` | IconButton | Student profile |
| Send message (dynamic) | `student-management-message-{studentId}` | IconButton | Email student |
| Remove student (dynamic) | `student-management-remove-{studentId}` | IconButton | Unenroll student |
| Menu send message | `student-management-menu-send-message` | MenuItem | Context menu |
| Menu activate | `student-management-menu-activate` | MenuItem | Change status |
| Menu suspend | `student-management-menu-suspend` | MenuItem | Change status |
| Menu cancel | `student-management-menu-cancel` | MenuItem | Change status |
| Message cancel button | `student-management-message-cancel-button` | Button | Close dialog |

---

### StudentProgressDashboard.tsx
**Path**: `client/src/pages/Instructor/StudentProgressDashboard.tsx` & `client/src/components/Progress/StudentProgressDashboard.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Retry button | `student-progress-retry-button` | Button | Retry assessment |
| View recommendations button | `student-progress-view-recommendations-button` | Button | AI suggestions |

---

### InterventionDashboard.tsx
**Path**: `client/src/pages/Instructor/InterventionDashboard.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| View student (dynamic) | `intervention-view-student-{id}` | Button | Student details |
| Send message (dynamic) | `intervention-send-message-{id}` | Button | Contact student |
| Send reminder (dynamic) | `intervention-send-reminder-{id}` | Button | Automated nudge |

---

### InstructorStudentAnalytics.tsx
**Path**: `client/src/pages/Instructor/InstructorStudentAnalytics.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| View details (dynamic) | `instructor-analytics-view-details-{id}` | Button | Detailed metrics |
| Intervention dialog button | `instructor-analytics-intervention-dialog-button` | Button | Create intervention |
| Refresh button | `student-analytics-refresh` | IconButton | Reload data |
| Intervention close button | `student-analytics-intervention-close-button` | Button | Close dialog |

---

## 🏠 DASHBOARD & NAVIGATION

### Dashboard.tsx
**Path**: `client/src/components/Dashboard.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Smart Progress button | `dashboard-smart-progress-button` | Button | AI progress tracking |
| Logout button | `dashboard-logout-button` | Button | Sign out |
| View All Courses button | `dashboard-view-all-courses-button` | Button | Course catalog |
| Continue course (dynamic) | `dashboard-continue-course-{index}` | Button | Resume learning |
| Browse Courses (empty) | `dashboard-browse-courses-empty-button` | Button | Empty state |
| Quick Browse button | `dashboard-quick-browse-button` | Button | Course discovery |
| Assignments button | `dashboard-assignments-button` | Button | View assignments |
| Study Group button | `dashboard-study-group-button` | Button | Collaborative learning |

---

### LandingPage.tsx
**Path**: `client/src/pages/LandingPage.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Get started button | `landing-get-started-button` | Button | CTA to registration |
| Login button | `landing-login-button` | Button | Sign in link |

---

### HeaderV4.tsx
**Path**: `client/src/components/Navigation/HeaderV4.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Mobile menu button | `header-mobile-menu-button` | IconButton | Hamburger menu |
| Mobile close button | `header-mobile-close-button` | IconButton | Close drawer |
| Mobile courses toggle | `header-mobile-courses-toggle` | MenuItem | Expand courses menu |
| Mobile instructor toggle | `header-mobile-instructor-toggle` | MenuItem | Expand instructor menu |
| Mobile student toggle | `header-mobile-student-toggle` | MenuItem | Expand student menu |
| Mobile admin toggle | `header-mobile-admin-toggle` | MenuItem | Expand admin menu |
| Mobile nav (dynamic) | `header-mobile-nav-{item}` | MenuItem | Dynamic menu items |
| Desktop nav (dynamic) | `header-nav-{item}` | Button | Dynamic nav buttons |
| Search input | `header-search-input` | TextField | Course search |
| Search button | `header-search-button` | IconButton | Submit search |
| Search close button | `header-search-close-button` | IconButton | Close expanded search |
| Profile menu button | `header-profile-menu-button` | IconButton | User menu |

**Dynamic Items:**
- Courses: `header-nav-courses`, `header-mobile-nav-courses`
- My Learning: `header-nav-my-learning`, `header-mobile-nav-my-learning`
- Dashboard: `header-nav-dashboard`, `header-mobile-nav-dashboard`
- Analytics: `header-nav-analytics`, `header-mobile-nav-analytics`

---

### Layout.tsx
**Path**: `client/src/components/Layout/Layout.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Courses menu item | `layout-menu-courses` | MenuItem | Side navigation |
| Study Groups menu item | `layout-menu-study-groups` | MenuItem | Side navigation |
| Office Hours menu item | `layout-menu-office-hours` | MenuItem | Side navigation |
| Calendar menu item | `layout-menu-calendar` | MenuItem | Side navigation |
| Students menu item | `layout-menu-students` | MenuItem | Instructor only |
| Analytics menu item | `layout-menu-analytics` | MenuItem | Instructor only |
| Profile menu item | `layout-profile-menu-profile` | MenuItem | User dropdown |
| Settings menu item | `layout-profile-menu-settings` | MenuItem | User dropdown |
| Privacy Settings menu item | `layout-profile-menu-privacy-settings` | MenuItem | User dropdown |
| Logout menu item | `layout-profile-menu-logout` | MenuItem | User dropdown |
| Settings menu item (alt) | `layout-settings-menu-item` | MenuItem | Alternative path |

---

## 💬 COMMUNICATION & COLLABORATION

### Chat.tsx
**Path**: `client/src/pages/Chat/Chat.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Search input | `chat-search-input` | TextField | Search messages |
| Create room button | `chat-create-room-button` | IconButton | New chat room |
| Room item (dynamic) | `chat-room-item-{roomId}` | ListItemButton | Select room |
| Emoji picker button | `chat-emoji-picker-button` | IconButton | Insert emoji |
| Send button | `chat-send-button` | IconButton | Send message |
| Cancel button | `chat-cancel-button` | Button | Close dialog |
| Delete confirmation cancel | `chat-delete-confirmation-cancel-button` | Button | Cancel deletion |
| Delete confirmation confirm | `chat-delete-confirmation-confirm-button` | Button | Confirm deletion |

---

### Tutoring.tsx
**Path**: `client/src/pages/Tutoring/Tutoring.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Dialog cancel button | `tutoring-dialog-cancel-button` | Button | Close dialog |
| Dialog create button | `tutoring-dialog-create-button` | Button | Create session |
| Create session button | `tutoring-create-session-button` | Button | Open dialog |
| Session item (dynamic) | `tutoring-session-item-{id}` | ListItemButton | Select session |

---

### CommentsSection.tsx
**Path**: `client/src/components/Shared/CommentsSection.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Comments section (dynamic) | `comments-section-{entityType}` | Paper | Container for comments (lesson, course, etc.) |
| Comments disabled message | `comments-disabled` | Paper | Shown when comments are disabled |
| Refresh button | `comments-refresh-button` | Button | Reload comments |
| Loading indicator | `comments-loading` | CircularProgress | Displayed while loading comments |
| Comments error message | `comments-error` | Alert | Error state |
| Empty state message | `comments-empty` | Typography | No comments yet |

**Dynamic Entity Types:**
- `comments-section-lesson` - Comments on lesson page
- `comments-section-course` - Comments on course page
- `comments-section-assignment` - Comments on assignment
- `comments-section-study_group` - Comments in study group
- `comments-section-announcement` - Comments on announcement

**Usage Example:**
```python
# Wait for comments section to load
page.wait_for_selector('[data-testid="comments-section-lesson"]')

# Check if comments are disabled
if page.locator('[data-testid="comments-disabled"]').is_visible():
    print("Comments are disabled for this lesson")

# Refresh comments
page.click('[data-testid="comments-refresh-button"]')
```

---

### CommentItem.tsx
**Path**: `client/src/components/Shared/CommentItem.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Comment item (dynamic) | `comment-item-{id}` | Box | Individual comment container |
| Like button (dynamic) | `comment-like-button-{id}` | IconButton | Like/unlike comment |
| Reply button (dynamic) | `comment-reply-button-{id}` | Button | Open reply input |
| Menu button (dynamic) | `comment-menu-button-{id}` | IconButton | Open actions menu (edit/delete) |
| Edit option (dynamic) | `comment-edit-option-{id}` | MenuItem | Edit comment |
| Delete option (dynamic) | `comment-delete-option-{id}` | MenuItem | Delete comment |

**Dynamic Selectors:**
- `{id}` = Comment ID (UUID format from database)

**Usage Example:**
```python
# Find first comment
first_comment = page.locator('[data-testid^="comment-item-"]').first

# Like a specific comment
comment_id = "abc-123-def-456"
page.click(f'[data-testid="comment-like-button-{comment_id}"]')

# Reply to comment
page.click(f'[data-testid="comment-reply-button-{comment_id}"]')

# Delete comment
page.click(f'[data-testid="comment-menu-button-{comment_id}"]')
page.click(f'[data-testid="comment-delete-option-{comment_id}"]')
```

---

### CommentInput.tsx
**Path**: `client/src/components/Shared/CommentInput.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Input wrapper | `comment-input-wrapper` | Box | Container for input field |
| Comment input field | `comment-input` | TextField | Text input for comment content |
| Submit button | `comment-submit-button` | Button | Post comment (visible when has text) |
| Cancel button | `comment-cancel-button` | Button | Cancel edit/reply (visible in edit mode) |

**Usage Example:**
```python
# Post a comment
page.fill('[data-testid="comment-input"]', 'This is my comment')
page.click('[data-testid="comment-submit-button"]')

# Cancel editing
page.click('[data-testid="comment-cancel-button"]')
```

**Testing Notes:**
- Submit button only appears when input has text
- Cancel button only appears in edit/reply mode
- Input uses multiline TextField with minRows=2
- Placeholder text varies by context (new comment vs reply)

---

### NotificationBell.tsx
**Path**: `client/src/components/Notifications/NotificationBell.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Bell button | `notification-bell-button` | IconButton | Open notifications menu |
| Bell badge | `notification-bell-badge` | Badge | Shows unread count |
| Notification menu | `notification-bell-menu` | Menu | Dropdown menu container |
| Settings button | `notification-bell-settings-button` | IconButton | Navigate to notification settings |
| Mark all read button | `notification-bell-mark-all-read-button` | Button | Mark all notifications as read |
| Notification item (dynamic) | `notification-item-{id}` | MenuItem | Individual notification (clickable) |
| Delete notification (dynamic) | `notification-delete-{id}` | IconButton | Delete specific notification |
| Manage preferences button | `notification-bell-manage-preferences-button` | Button | Navigate to settings (empty state) |
| View all button | `notification-bell-view-all-button` | Button | Navigate to full notifications page |

**Dynamic Selectors**:
- `{id}` = Notification ID (UUID format)

**Testing Notes**:
- Use aria-label for count: `aria-label="show {count} new notifications"`
- Badge only visible when unreadCount > 0
- Menu opens on bell button click
- WebSocket delivers real-time notifications in production
- For tests, reload page to fetch updated count from API

---

### NotificationsPage.tsx
**Path**: `client/src/pages/Notifications/NotificationsPage.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Mark read (dynamic) | `notification-item-mark-read-{id}` | Button | Mark single as read |
| Delete (dynamic) | `notification-item-delete-{id}` | IconButton | Delete notification |
| Refresh button | `notifications-refresh-button` | Button | Reload notifications |

---

## 👤 USER PROFILE & SETTINGS

### ProfilePage.tsx
**Path**: `client/src/pages/ProfilePage.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Avatar upload button | `profile-avatar-upload-button` | IconButton | Change photo |
| Edit button | `profile-edit-button` | IconButton | Edit profile |
| Save button | `profile-save-button` | Button | Save changes |
| Cancel button | `profile-cancel-button` | Button | Discard changes |

---

### SettingsPage.tsx
**Path**: `client/src/pages/SettingsPage.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Save appearance button | `settings-save-appearance-button` | Button | Save theme settings |
| Delete dialog cancel | `settings-delete-dialog-cancel` | Button | Cancel account deletion |

---

### NotificationSettingsPage.tsx
**Path**: `client/src/pages/Settings/NotificationSettingsPage.tsx`

**Global Controls:**

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Enable in-app switch | `notifications-settings-enable-in-app-switch` | Switch | Global in-app toggle |
| Enable email switch | `notifications-settings-enable-email-switch` | Switch | Global email toggle |
| Email frequency select | `notifications-settings-email-frequency-select` | Select | Realtime/daily/weekly |
| Save button | `notifications-settings-save-button` | Button | Save all settings |

**Category Accordions & Switches:**

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Progress category accordion | `notifications-settings-category-progress-accordion` | Accordion | Progress updates section |
| Progress accordion summary | `notifications-settings-category-progress-accordion-summary` | AccordionSummary | Clickable header |
| Progress category switch | `notifications-settings-category-progress-switch` | Switch | Enable/disable category |
| Course category accordion | `notifications-settings-category-course-accordion` | Accordion | Course updates section |
| Course accordion summary | `notifications-settings-category-course-accordion-summary` | AccordionSummary | Clickable header |
| Course category switch | `notifications-settings-category-course-switch` | Switch | Enable/disable category |
| Assessment category accordion | `notifications-settings-category-assessment-accordion` | Accordion | Assessment updates section |
| Assessment accordion summary | `notifications-settings-category-assessment-accordion-summary` | AccordionSummary | Clickable header |
| Assessment category switch | `notifications-settings-category-assessment-switch` | Switch | Enable/disable category |
| Community category accordion | `notifications-settings-category-community-accordion` | Accordion | Community updates section |
| Community accordion summary | `notifications-settings-category-community-accordion-summary` | AccordionSummary | Clickable header |
| Community category switch | `notifications-settings-category-community-switch` | Switch | Enable/disable category |
| System category accordion | `notifications-settings-category-system-accordion` | Accordion | System alerts section |
| System accordion summary | `notifications-settings-category-system-accordion-summary` | AccordionSummary | Clickable header |
| System category switch | `notifications-settings-category-system-switch` | Switch | Enable/disable category |

**Progress Subcategories (In-App & Email):**

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Lesson completion in-app | `notifications-settings-progress-lesson-completion-inapp-switch` | Switch | In-app toggle |
| Lesson completion email | `notifications-settings-progress-lesson-completion-email-switch` | Switch | Email toggle |
| Video completion in-app | `notifications-settings-progress-video-completion-inapp-switch` | Switch | In-app toggle |
| Video completion email | `notifications-settings-progress-video-completion-email-switch` | Switch | Email toggle |
| Course milestones in-app | `notifications-settings-progress-course-milestones-inapp-switch` | Switch | In-app toggle |
| Course milestones email | `notifications-settings-progress-course-milestones-email-switch` | Switch | Email toggle |
| Progress summary in-app | `notifications-settings-progress-progress-summary-inapp-switch` | Switch | In-app toggle |
| Progress summary email | `notifications-settings-progress-progress-summary-email-switch` | Switch | Email toggle |

**Course Subcategories (In-App & Email):**

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Course enrollment in-app | `notifications-settings-course-course-enrollment-inapp-switch` | Switch | In-app toggle |
| Course enrollment email | `notifications-settings-course-course-enrollment-email-switch` | Switch | Email toggle |
| New lessons in-app | `notifications-settings-course-new-lessons-inapp-switch` | Switch | In-app toggle |
| New lessons email | `notifications-settings-course-new-lessons-email-switch` | Switch | Email toggle |
| Live sessions in-app | `notifications-settings-course-live-sessions-inapp-switch` | Switch | In-app toggle |
| Live sessions email | `notifications-settings-course-live-sessions-email-switch` | Switch | Email toggle |
| Instructor announcements in-app | `notifications-settings-course-instructor-announcements-inapp-switch` | Switch | In-app toggle |
| Instructor announcements email | `notifications-settings-course-instructor-announcements-email-switch` | Switch | Email toggle |

**Assessment Subcategories (In-App & Email):**

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Assessment graded in-app | `notifications-settings-assessment-assessment-graded-inapp-switch` | Switch | In-app toggle |
| Assessment graded email | `notifications-settings-assessment-assessment-graded-email-switch` | Switch | Email toggle |
| Assessment due in-app | `notifications-settings-assessment-assessment-due-inapp-switch` | Switch | In-app toggle |
| Assessment due email | `notifications-settings-assessment-assessment-due-email-switch` | Switch | Email toggle |
| New assessment in-app | `notifications-settings-assessment-new-assessment-inapp-switch` | Switch | In-app toggle |
| New assessment email | `notifications-settings-assessment-new-assessment-email-switch` | Switch | Email toggle |

**Community Subcategories (In-App & Email):**

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Mentions in-app | `notifications-settings-community-mentions-inapp-switch` | Switch | In-app toggle |
| Mentions email | `notifications-settings-community-mentions-email-switch` | Switch | Email toggle |
| Replies in-app | `notifications-settings-community-replies-inapp-switch` | Switch | In-app toggle |
| Replies email | `notifications-settings-community-replies-email-switch` | Switch | Email toggle |
| Group invites in-app | `notifications-settings-community-group-invites-inapp-switch` | Switch | In-app toggle |
| Group invites email | `notifications-settings-community-group-invites-email-switch` | Switch | Email toggle |

**System Subcategories (In-App & Email):**

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Payment confirmation in-app | `notifications-settings-system-payment-confirmation-inapp-switch` | Switch | In-app toggle |
| Payment confirmation email | `notifications-settings-system-payment-confirmation-email-switch` | Switch | Email toggle |
| Certificates in-app | `notifications-settings-system-certificates-inapp-switch` | Switch | In-app toggle |
| Certificates email | `notifications-settings-system-certificates-email-switch` | Switch | Email toggle |
| Security alerts in-app | `notifications-settings-system-security-alerts-inapp-switch` | Switch | Disabled (cannot disable) |
| Security alerts email | `notifications-settings-system-security-alerts-email-switch` | Switch | Disabled (cannot disable) |

---

### TransactionsPage.tsx
**Path**: `client/src/pages/Profile/TransactionsPage.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Browse courses button | `transactions-browse-courses-button` | Button | Empty state |
| Refund cancel button | `transactions-refund-cancel-button` | Button | Cancel refund |

---

### PresenceStatusSelector.tsx
**Path**: `client/src/components/Presence/PresenceStatusSelector.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Status button | `presence-status-button` | IconButton | Open status menu |
| Online option | `presence-status-online` | MenuItem | Set online |
| Away option | `presence-status-away` | MenuItem | Set away |
| Busy option | `presence-status-busy` | MenuItem | Set busy |
| Offline option | `presence-status-offline` | MenuItem | Set offline |

---

### UserPresenceBadge.tsx
**Path**: `client/src/components/Presence/UserPresenceBadge.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Badge | `user-presence-badge` | Badge | Visual status indicator |

---

## 💳 PAYMENT & CHECKOUT

### CourseCheckoutPage.tsx
**Path**: `client/src/pages/Payment/CourseCheckoutPage.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Error back button | `course-checkout-error-back-button` | Button | Error state |
| Checkout error back button | `checkout-error-back-button` | Button | Alternative selector |

---

### PaymentSuccessPage.tsx
**Path**: `client/src/pages/Payment/PaymentSuccessPage.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Error dashboard button | `payment-success-error-dashboard-button` | Button | Error recovery |

---

## 🎥 VIDEO & MEDIA

### VideoPlayer.tsx
**Path**: `client/src/components/Video/VideoPlayer.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Play overlay button | `video-player-play-overlay` | IconButton | Initial play |
| Skip backward button | `video-skip-backward` | IconButton | -10 seconds |
| Skip forward button | `video-skip-forward` | IconButton | +10 seconds |
| Shortcuts button | `video-shortcuts-button` | IconButton | Show keyboard help |

---

### VideoTranscript.tsx
**Path**: `client/src/components/Video/VideoTranscript.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Clear search button | `video-transcript-clear-search` | IconButton | Clear search field |
| Segment (dynamic) | `video-transcript-segment-{index}` | ListItemButton | Jump to timestamp |

---

## 📤 FILE MANAGEMENT

### FileUpload.tsx
**Path**: `client/src/components/Upload/FileUpload.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Dialog cancel button | `file-upload-dialog-cancel` | Button | Cancel upload |

---

## 📊 ANALYTICS & INSIGHTS

### ShareAnalyticsDialog.tsx
**Path**: `client/src/components/Analytics/ShareAnalyticsDialog.tsx`

| Element | Selector | Type | Notes |
|---------|----------|------|-------|
| Export button | `share-analytics-export` | Button | Download data |
| Clear button | `share-analytics-clear` | Button | Reset data |
| Close button | `share-analytics-close` | Button | Close dialog |

---

## 📖 APPENDIX: HISTORICAL RECORD

### Development Timeline

**Phase 23**: CourseDetail, UserPresenceBadge, TokenExpirationWarning (17 IDs)  
**Phase 24**: LandingPage, Dashboard (10 IDs)  
**Phase 25**: Chat, Layout (16 IDs)  
**Phase 26**: HeaderV4, StudentManagement (~62 IDs)  
**Phase 27-28**: StudentProgressDashboard, SettingsPage (3 IDs)  
**Phase 29**: LessonEditor, LessonDetailPage, Tutoring, PaymentSuccessPage, CourseCheckoutPage (22 IDs)  
**Phase 30**: MyLearningPage, CoursesPage, CourseCreationForm, CurriculumBuilder, InterventionDashboard, InstructorStudentAnalytics, VideoPlayer, StudentAssessmentDashboard (30 IDs)  
**First Rescan**: NotificationBell, CourseDetailPage, InstructorDashboard, AssessmentManager (11 IDs)  
**Second Rescan**: InstructorDashboard course menu, LessonEditor content controls (4 IDs)  
**Third Rescan**: AIEnhancedAssessmentResults AI features (3 IDs)

### Coverage Milestones
- ✅ 80% - Reached in Phase 23
- ✅ 85% - Reached in Phase 25
- ✅ 90% - Reached in Phase 26
- ✅ 95% - Reached in Phase 29
- ✅ 100% - EXCEEDED in Phase 30 (103.1%)
- ✅ 108% - After second rescan (594/550)
- ✅ 108.5% - Final count after third rescan (597/550)

### Final Statistics
- **Starting Coverage**: 424/550 (77.1%)
- **Ending Coverage**: 597/550 (108.5%)
- **Total Added This Session**: 173 test IDs
- **Total Components**: 31 instrumented components
- **Dynamic Patterns**: ~50+ dynamic test IDs with indexed/ID-based selectors

---

## 🛠️ TESTING BEST PRACTICES

### 1. Selector Usage Pattern
```python
# Always use data-testid with bracket notation
page.click('[data-testid="login-submit-button"]')

# For dynamic selectors, use f-strings
course_id = 123
page.click(f'[data-testid="my-learning-continue-{course_id}"]')
```

### 2. Waiting for Elements
```python
# Wait for element before interaction
page.wait_for_selector('[data-testid="dashboard-view-all-courses-button"]')
page.click('[data-testid="dashboard-view-all-courses-button"]')
```

### 3. Form Filling Pattern
```python
# Fill all fields before submitting
page.fill('[data-testid="login-email-input"]', 'user@test.com')
page.fill('[data-testid="login-password-input"]', 'password123')
page.click('[data-testid="login-submit-button"]')

# Wait for navigation
page.wait_for_url('**/dashboard')
```

### 4. Dynamic Lists
```python
# Iterate through dynamic items
lessons = [1, 2, 3, 4]
for lesson_id in lessons:
    selector = f'[data-testid="course-section-lesson-{lesson_id}-button"]'
    if page.locator(selector).is_visible():
        page.click(selector)
```

### 5. Testing Dialogs
```python
# Open dialog
page.click('[data-testid="course-creation-lesson-dialog-add"]')

# Interact with dialog content
page.fill('[data-testid="lesson-title-input"]', 'New Lesson')

# Close or submit
page.click('[data-testid="course-creation-lesson-dialog-cancel-button"]')
```

---

**📝 Note**: All selectors use the format `[data-testid="selector-name"]`. Dynamic selectors require substitution of `{id}`, `{index}`, or `{item}` with actual values.
