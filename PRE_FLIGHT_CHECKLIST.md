# Pre-Flight Checklist - Before Making Any Code Changes

**Purpose**: Systematic checklist to follow before implementing changes  
**Goal**: Reduce errors, missing considerations, and broken functionality

---

## 🎯 USE THIS CHECKLIST EVERY TIME BEFORE:
- Fixing a bug
- Adding a feature
- Modifying existing code
- Refactoring components

---

## ✅ PHASE 1: RESEARCH & PLANNING (Before Writing Code)

### 1.1 Understand the Request
- [ ] I clearly understand what needs to be changed/added/fixed
- [ ] I know the expected behavior after the change
- [ ] I've identified the specific files that need modification
- [ ] If unclear, I've asked clarifying questions

### 1.2 Find All Related Code
- [ ] Used `grep_search` to find ALL files using this component/function/API
- [ ] Checked `COMPONENT_REGISTRY.md` for component dependencies
- [ ] Checked `ARCHITECTURE.md` for data flow understanding
- [ ] Identified all pages that use this component

**Recent Additions to Check:**
- [x] Payment System - Phases 1-3 complete (90%) - Invoice PDF Generation (Dec 14, 2025) ✅
  - Purchase button connected to checkout
  - Payment success page with confetti
  - Enrollment confirmation with payment verification
  - Auto-refresh enrollment state after payment
  - Professional invoice PDF generation with branding
  - Test Complete button for dev testing
  - Invoice download with security verification
- [x] TransactionsPage (`/transactions`) - Payment history with invoice download (Dec 14, 2025) ✅
- [x] ProfilePage (`/profile`) - 5-tab user profile system (Dec 11, 2025) ✅
- [x] Settings page - Privacy, appearance, data management with backend API (Dec 11, 2025) ✅
- [x] Notification preferences - Fully enforced with quiet hours and type filtering (Dec 11, 2025) ✅
- [x] Avatar upload system - multer + sharp processing (Dec 11, 2025) ✅

**Commands to run**:
```bash
# Find all usages of a component
grep_search(query="ComponentName", isRegexp=false, includePattern="client/src/**")

# Find all API calls to an endpoint
grep_search(query="/api/endpoint", isRegexp=false, includePattern="client/src/services/**")

# Find all usages of a function
grep_search(query="functionName", isRegexp=false, includePattern="**/*.ts*")
```

### 1.3 Check for Similar Implementations
- [ ] Checked if similar code exists elsewhere (avoid duplicates)
- [ ] Looked for existing utility functions I can reuse
- [ ] Checked if there's a shared component I should update instead

### 1.4 Review State Management
- [ ] Identified all state variables that will be affected
- [ ] Checked if Zustand store needs updating (authStore, etc.)
- [ ] Verified which components share this state

### 1.5 Check for TODOs/FIXMEs
- [ ] Searched for TODO/FIXME comments related to this code
- [ ] Decided if those TODOs should be fixed now or later
- [ ] Won't leave new TODOs without implementing them

**Command**:
```bash
grep_search(query="TODO|FIXME|BUG|HACK", isRegexp=true, includePattern="path/to/file")
```

---

## ✅ PHASE 2: IMPLEMENTATION (While Writing Code)

### 2.1 Code Quality
- [ ] Wrote code with proper TypeScript types (no `any` unless necessary)
- [ ] Added error handling (try/catch blocks)
- [ ] Added loading states where appropriate
- [ ] Added proper null/undefined checks
- [ ] Used descriptive variable names

### 2.2 API Integration
- [ ] If calling API, verified endpoint exists in backend
- [ ] Checked authentication requirements
- [ ] Added proper error handling for API calls
- [ ] Verified response data structure matches expectations

### 2.3 UI/UX Considerations
- [ ] Added loading indicators (CircularProgress, Skeleton, etc.)
- [ ] Added error messages for failed operations
- [ ] Added success feedback for completed actions
- [ ] Considered mobile/responsive design
- [ ] Followed existing Material-UI patterns

### 2.4 Avoid Breaking Changes
- [ ] If changing shared component (CourseCard, Header, etc.), verified it won't break other pages
- [ ] If changing API response structure, updated all consumers
- [ ] If changing database column, checked ALL queries using that column
- [ ] If changing utility function, checked all its usages

### 2.5 Role-Based Logic
- [ ] Considered different user roles (student, instructor, admin)
- [ ] Added role checks where needed (`user?.Role === 'instructor'`)
- [ ] Handled instructor preview mode correctly (no progress tracking)
- [ ] Checked enrollment status properly (`isEnrolled`, `isInstructor`)

---

## ✅ PHASE 3: VERIFICATION (After Writing Code)

### 3.1 Compilation Check
- [ ] Ran `get_errors()` to check for TypeScript errors
- [ ] Fixed all compilation errors
- [ ] Fixed all TypeScript warnings
- [ ] No unused imports or variables

**Command**:
```bash
get_errors(filePaths=["path/to/modified/file.tsx"])
```

### 3.2 Related Files Check
- [ ] Checked all files identified in Phase 1.2 still work
- [ ] Verified shared components still function correctly
- [ ] Checked if API services need updates
- [ ] Verified utility functions haven't broken

### 3.3 Database Considerations
- [ ] If database query changed, verified column names match schema
- [ ] Checked `database/schema.sql` for correct column names
- [ ] Used PascalCase for SQL columns (FirstName, not first_name)
- [ ] If removing column reference, confirmed column is actually unused

### 3.4 Authentication & Authorization
- [ ] Verified API calls include authentication token
- [ ] Checked authorization for protected operations
- [ ] Handled 401/403 errors gracefully
- [ ] Verified unauthenticated users see appropriate UI

### 3.5 Progress Tracking
- [ ] If affecting progress, checked instructor preview mode
- [ ] Verified instructors DON'T create progress records when previewing
- [ ] Confirmed students DO create progress records
- [ ] Checked both UserProgress (per-lesson) and CourseProgress (per-course)

### 3.6 Testing Scenarios
- [ ] Thought through edge cases:
  - [ ] What if user is not logged in?
  - [ ] What if API call fails?
  - [ ] What if data is null/undefined?
  - [ ] What if user is instructor viewing their own course?
  - [ ] What if course is not published?
  - [ ] What if enrollment already exists?

---

## ✅ PHASE 4: DOCUMENTATION (Before Reporting "Done")

### 4.1 Code Comments
- [ ] Added comments for complex logic
- [ ] Documented any workarounds or known issues
- [ ] Removed TODO comments if implemented
- [ ] Added JSDoc comments for new functions

### 4.2 Update Documentation
- [ ] Updated `COMPONENT_REGISTRY.md` if component changed significantly
- [ ] Updated `ARCHITECTURE.md` if data flow changed
- [ ] Updated `PROJECT_STATUS.md` with major changes
- [ ] Created migration guide if breaking changes introduced

### 4.3 Testing Checklist
- [x] Created manual testing checklist for user ✅
- [x] Listed specific steps to test the change ✅
- [x] Included both happy path and error cases ✅
- [x] Specified what to look for (expected behavior) ✅

**Payment System Testing (Dec 11, 2025)**:
- [x] Purchase button navigation to checkout ✅
- [x] Stripe test card payment (4242 4242 4242 4242) ✅
- [x] Payment success page with confetti ✅
- [x] Enrollment auto-created after payment ✅
- [x] Security: URL manipulation prevented (payment verification) ✅
- [x] "Continue Learning" button appears after payment ✅
- [ ] Webhook testing with Stripe CLI (requires local setup)

---

## ✅ PHASE 5: FINAL REVIEW (Before Submitting)

### 5.1 Self-Review
- [ ] Read through all changes line by line
- [ ] Verified no console.log left behind (or explained if needed)
- [ ] Checked for hardcoded values that should be configurable
- [ ] Ensured consistent code style with existing codebase

### 5.2 Impact Analysis
- [ ] Listed all files modified
- [ ] Explained what each change does
- [ ] Identified potential side effects
- [ ] Assessed risk level (low/medium/high)

### 5.3 Rollback Plan
- [ ] Know how to revert changes if something breaks
- [ ] Identified which files to restore
- [ ] Documented any database migrations needed

### 5.4 Summary Report
- [ ] Wrote clear summary of what was changed
- [ ] Explained why changes were necessary
- [ ] Listed what was tested (or needs testing)
- [ ] Provided testing instructions for user

---

## 🚨 CRITICAL RULES (NEVER SKIP)

### Rule 1: Port Numbers
- [ ] **NEVER** changed port numbers (Backend: 3001, Frontend: 5173)
- [ ] **NEVER** suggested moving to different ports

### Rule 2: Instructor Preview Mode
- [ ] If touching progress/completion logic, **VERIFIED** instructors don't create records
- [ ] Checked `isInstructorPreview` or `enrollmentStatus.isInstructor` flag

### Rule 3: Shared Components
- [ ] If modifying `CourseCard`, `Header`, or other shared components, **VERIFIED** all usages
- [ ] Tested or listed all pages that use the component

### Rule 4: Database Columns
- [ ] **NEVER** removed column references without checking ALL usages first
- [ ] Verified column exists in `database/schema.sql`
- [ ] If column appears in 10+ files, it's a FEATURE, not a bug

### Rule 5: Authentication
- [ ] **ALWAYS** checked if operation requires authentication
- [ ] Handled "not logged in" case gracefully
- [ ] Verified token in `localStorage['auth-storage']` is accessed correctly

---

## 📋 QUICK REFERENCE

### Before Changing a Component:
1. Check `COMPONENT_REGISTRY.md` → Find component → Read "Used By" section
2. Run grep_search to find all usages
3. Check each usage for potential breakage

### Before Changing an API:
1. Find API service file (e.g., `coursesApi.ts`)
2. Grep for all usages of that API method
3. Check if response structure changes affect consumers

### Before Changing Database Query:
1. Check `database/schema.sql` for column names
2. Grep for all queries using that table
3. Verify column names are PascalCase

### Before Reporting "Done":
1. Run `get_errors()` - should return 0 errors
2. Check for TODO/FIXME comments - should be 0 or documented
3. List all modified files
4. Provide testing checklist

---

## ✅ CHECKLIST COMPLETION

**Before submitting changes, verify**:
- [ ] All Phase 1 items completed (Research)
- [ ] All Phase 2 items completed (Implementation)
- [ ] All Phase 3 items completed (Verification)
- [ ] All Phase 4 items completed (Documentation)
- [ ] All Phase 5 items completed (Review)
- [ ] All Critical Rules followed

**If any item is unchecked, DO NOT proceed. Go back and complete it.**

---

## 💡 WHEN TO USE THIS CHECKLIST

**Always use for**:
- Bug fixes
- Feature additions
- Component modifications
- API changes
- Database query changes
- Refactoring

**Can skip for** (use judgment):
- Fixing typos in comments
- Updating documentation only
- Small CSS/styling tweaks
- Adding console.log for debugging

**Remember**: It's better to spend 10 extra minutes checking than 2 hours debugging later!

---

## 📊 ESTIMATED TIME

- **Phase 1 (Research)**: 5-10 minutes
- **Phase 2 (Implementation)**: Variable (depends on complexity)
- **Phase 3 (Verification)**: 5-10 minutes
- **Phase 4 (Documentation)**: 5 minutes
- **Phase 5 (Review)**: 5 minutes

**Total overhead**: ~20-30 minutes per change
**Time saved**: Hours of debugging and testing

---

**Last Updated**: November 22, 2025  
**This checklist will be followed for all future code changes.**
