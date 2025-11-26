# 🚀 Quick Reference - Development Workflow

**Last Updated**: November 22, 2025

---

## 📚 DOCUMENTATION FILES - WHAT TO READ WHEN

```
┌─────────────────────────────────────────────────────────────┐
│  When you need to...                  │  Read this file...   │
├─────────────────────────────────────────────────────────────┤
│  Understand HOW systems work          │  ARCHITECTURE.md     │
│  Find component dependencies          │  COMPONENT_REGISTRY  │
│  Make any code change                 │  PRE_FLIGHT_CHECKLIST│
│  See WHAT was built & when            │  PROJECT_STATUS.md   │
│  Troubleshoot common issues           │  COMPONENT_REGISTRY  │
│  Understand data flows                │  ARCHITECTURE.md     │
│  Find API endpoints                   │  ARCHITECTURE.md     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 STANDARD WORKFLOW (Every Change)

### 1️⃣ BEFORE Coding (5 minutes)
```bash
✓ Open PRE_FLIGHT_CHECKLIST.md
✓ Read Phase 1: Research & Planning
✓ Run grep_search to find all related files
✓ Check COMPONENT_REGISTRY.md for dependencies
```

### 2️⃣ WHILE Coding (Variable)
```bash
✓ Follow Phase 2: Implementation checklist
✓ Reference ARCHITECTURE.md for patterns
✓ Check COMPONENT_REGISTRY.md for examples
✓ Add proper error handling & loading states
```

### 3️⃣ AFTER Coding (10 minutes)
```bash
✓ Run get_errors() - Should be 0 errors
✓ Follow Phase 3: Verification checklist
✓ Check all related files still work
✓ Verify no TODOs left behind
```

### 4️⃣ BEFORE "Done" (5 minutes)
```bash
✓ Follow Phase 4: Documentation
✓ Follow Phase 5: Final Review
✓ Create testing checklist for user
✓ Update COMPONENT_REGISTRY if needed
```

---

## 🛠️ COMMON COMMANDS

### Find All Usages
```typescript
grep_search({
  query: "ComponentName",
  isRegexp: false,
  includePattern: "client/src/**"
})
```

### Check for TODOs
```typescript
grep_search({
  query: "TODO|FIXME|BUG",
  isRegexp: true,
  includePattern: "path/to/file.tsx"
})
```

### Check TypeScript Errors
```typescript
get_errors({
  filePaths: ["path/to/file.tsx"]
})
```

### Find API Calls
```typescript
grep_search({
  query: "/api/endpoint",
  isRegexp: false,
  includePattern: "client/src/services/**"
})
```

---

## 🚨 CRITICAL RULES (NEVER SKIP)

```
❌ NEVER change port numbers (3001 backend, 5173 frontend)
❌ NEVER track progress for instructors viewing their courses
❌ NEVER modify shared components without checking ALL usages
❌ NEVER remove database columns without checking ALL queries
❌ NEVER skip authentication checks for protected operations
```

---

## 🎯 QUICK CHECKS

### Before Modifying CourseCard (CRITICAL)
```bash
1. Check COMPONENT_REGISTRY.md → CourseCard section
2. Note: Used by 4+ pages (CoursesPage, MyLearningPage, Dashboard, etc.)
3. Grep for all usages: grep_search(query="CourseCard")
4. Test ALL pages after changes
```

### Before Changing API Response
```bash
1. Find API service file (e.g., coursesApi.ts)
2. Grep for all usages of that method
3. Check if response structure change affects consumers
4. Update TypeScript interfaces if needed
```

### Before Changing Database Query
```bash
1. Check database/schema.sql for column names (PascalCase)
2. Grep for all queries using that table
3. If column appears in 10+ files → It's a FEATURE
4. Verify new query returns expected data
```

---

## 📊 COMPONENT DEPENDENCY MAP (Quick Glance)

```
CourseDetailPage
├─ Services: coursesApi, enrollmentApi, progressApi, BookmarkApi
├─ Components: Header, ShareDialog
├─ State: authStore (Zustand)
└─ Used by: App.tsx (/courses/:courseId route)

CoursesPage
├─ Services: coursesApi, enrollmentApi, BookmarkApi
├─ Components: Header, CourseCard (SHARED!)
├─ State: authStore
└─ Used by: App.tsx (/courses route)

CourseCard (CRITICAL - SHARED)
├─ Utilities: getCategoryGradient, formatCategory, getLevelColor
├─ Used by: CoursesPage, MyLearningPage, Dashboard, etc.
└─ WARNING: Changes affect 4+ pages!

VideoPlayer
├─ Services: videoProgressApi
├─ Props: skipProgressTracking (true for instructors)
└─ Auto-saves every 5 seconds
```

---

## 🔍 TROUBLESHOOTING QUICK REFERENCE

### Bookmark Not Working
```bash
✓ Check: BookmarkApi import?
✓ Check: User logged in?
✓ Check: API call in handleBookmark()?
✓ Check: Backend route working?
✓ See: COMPONENT_REGISTRY.md → CourseDetailPage → Common Issues
```

### Progress Not Saving
```bash
✓ Check: Instructor preview mode? (should NOT save)
✓ Check: isInstructorPreview flag?
✓ Check: UserProgress record exists?
✓ See: ARCHITECTURE.md → Progress Tracking Flow
```

### Wrong Button Showing
```bash
✓ Check: enrollmentStatus.isInstructor value
✓ Check: course.isEnrolled value
✓ Check: API returning correct data?
✓ See: COMPONENT_REGISTRY.md → CourseDetailPage → Key Logic
```

---

## 📦 FILE STRUCTURE OVERVIEW

```
PROJECT ROOT
├─ ARCHITECTURE.md              ← System design & data flows
├─ COMPONENT_REGISTRY.md        ← Component details & dependencies
├─ PRE_FLIGHT_CHECKLIST.md      ← Development workflow checklist
├─ PROJECT_STATUS.md            ← Project history & what was built
├─ SESSION_SUMMARY_NOV_22.md    ← Latest session summary
├─ QUICK_REFERENCE.md           ← This file!
├─ client/
│  ├─ src/
│  │  ├─ pages/                 ← Page components (entry points)
│  │  ├─ components/            ← Reusable components
│  │  ├─ services/              ← API service classes
│  │  ├─ stores/                ← Zustand stores (authStore)
│  │  └─ utils/                 ← Utility functions
│  └─ package.json
├─ server/
│  ├─ src/
│  │  ├─ routes/                ← API endpoints
│  │  ├─ services/              ← Business logic
│  │  └─ middleware/            ← Auth, CSRF, etc.
│  └─ package.json
└─ database/
   └─ schema.sql                ← Database schema (source of truth)
```

---

## ⏱️ TIME ESTIMATES

```
┌──────────────────────────────────────────────┐
│ Activity                │ Time      │ Saves  │
├──────────────────────────────────────────────┤
│ Following checklist     │ 20-30 min │ 2-3 hr │
│ Checking dependencies   │ 5 min     │ 1 hr   │
│ Reading docs            │ 10 min    │ 30 min │
│ Proper error handling   │ 5 min     │ 1 hr   │
│ Writing tests (manual)  │ 10 min    │ 2 hr   │
└──────────────────────────────────────────────┘

Total overhead: ~1 hour per feature
Total savings: 6+ hours per feature
ROI: 6:1 time savings!
```

---

## 🎓 GOLDEN RULES

1. **Document WHILE coding**, not after
2. **Check dependencies BEFORE modifying**
3. **Test ALL related pages** after shared component changes
4. **Update docs** when code changes
5. **Follow checklist** for every change (no shortcuts!)

---

## 💡 REMEMBER

```
┌──────────────────────────────────────────────────────────┐
│ "Measure twice, cut once"                               │
│                                                          │
│ 10 minutes of research >>> 2 hours of debugging         │
│                                                          │
│ Good documentation >>> Good memory                       │
│                                                          │
│ Complete implementation >>> Quick hack                   │
└──────────────────────────────────────────────────────────┘
```

---

## 📞 QUICK HELP

**Can't find something?**
→ Use Ctrl+F in documentation files

**Component not in registry?**
→ Check ARCHITECTURE.md for patterns, then add to registry

**Breaking something?**
→ Check PRE_FLIGHT_CHECKLIST.md Phase 1.2 (find related code)

**Need pattern example?**
→ Check ARCHITECTURE.md "Common Patterns" section

**Have questions?**
→ Check COMPONENT_REGISTRY.md "Common Issues" sections

---

**Keep this file open while developing!** 📌
