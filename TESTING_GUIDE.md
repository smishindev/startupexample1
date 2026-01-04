# Testing Guide - Automated E2E Tests with Pytest + Playwright

**Last Updated**: January 4, 2026  
**Purpose**: Guide for writing and running automated tests for the Mishin Learn Platform

---

## 🧪 TEST SETUP

### Prerequisites
- Python 3.12.7 (in `.venv/`)
- Pytest 7.4.3 + Playwright 1.49.0
- Chromium, Firefox, WebKit browsers installed
- Application running on `localhost:5173` (frontend) and `localhost:3001` (backend)

### Running Tests

**Start Application First (Required):**
```powershell
# Terminal 1 - Keep this running
npm run dev
```

**Run Tests in Separate Terminal:**
```powershell
# Terminal 2
.venv\Scripts\Activate.ps1

# Run with visible browser (for debugging)
$env:HEADLESS="false"
pytest tests/test_auth.py -v -s --headed

# Run headless (for CI/CD)
pytest tests/test_auth.py -v

# Run specific test
pytest tests/test_auth.py::TestAuthentication::test_student_login_logout -v

# Run all tests
pytest tests/ -v
```

### Test Structure
```
tests/
├── __init__.py
├── conftest.py              # Shared fixtures (browser, credentials, base_url)
├── pytest.ini               # Pytest configuration
├── requirements-test.txt    # Python test dependencies
├── .env.test               # Test credentials (gitignored)
├── .env.test.example       # Template for credentials
├── test_auth.py            # Authentication tests
├── test_courses.py         # Course management tests (TODO)
├── test_payments.py        # Payment flow tests (TODO)
├── test_notifications.py   # Notification tests (TODO)
└── test_api.py            # API endpoint tests (TODO)
```

---

## 📋 TEST CREDENTIALS

From `QUICK_REFERENCE.md`:

**Student Account:**
```
Email: student1@gmail.com
Password: Aa123456
Role: Student
```

**Instructor Account:**
```
Email: ins1@gmail.com
Password: Aa123456
Role: Instructor
```

**Admin Account:**
```
Email: admin@mishinlearn.com
Password: Aa123456
Role: Admin
```

---

## 🎯 COMPONENT SELECTORS

### Authentication (LoginForm.tsx)
```python
# Login page
page.goto(f"{base_url}/login")

# Form fields (using test IDs)
page.fill('[data-testid="login-email-input"]', 'student1@gmail.com')
page.fill('[data-testid="login-password-input"]', 'Aa123456')

# Optional: Check remember me
page.check('[data-testid="login-remember-me-checkbox"]')

# Submit button (using test ID)
page.click('[data-testid="login-submit-button"]')

# Success: redirects to /dashboard
```

### Navigation (HeaderV4.tsx)
```python
# User avatar button (to open profile menu) - using test ID
page.click('[data-testid="header-profile-menu-button"]')

# Profile menu items - using test IDs
page.click('[data-testid="header-profile-menu-item-profile"]')
page.click('[data-testid="header-profile-menu-item-notifications"]')
page.click('[data-testid="header-profile-menu-item-settings"]')
page.click('[data-testid="header-profile-menu-item-logout"]')

# Navigation links (desktop) - still use text for now
page.click('text="Dashboard"')
page.click('text="Courses"')
page.click('text="My Learning"')
page.click('text="Live Sessions"')
page.click('text="Study Groups"')
page.click('text="AI Tutoring"')
```

### Dashboard (DashboardLayout.tsx)
```python
# After login, verify dashboard
page.wait_for_url(re.compile(r".*/dashboard.*"), timeout=15000)
assert "/dashboard" in page.url

# Dashboard loads with HeaderV4
page.wait_for_load_state("networkidle")
```

### Forms (General MUI TextField Pattern)
```python
# MUI TextFields use id attribute
page.fill('#email', 'value')
page.fill('#password', 'value')
page.fill('#firstName', 'value')
page.fill('#lastName', 'value')

# Submit buttons
page.click('button[type="submit"]')

# Cancel/back buttons
page.click('button:has-text("Cancel")')
```

---

## 🔍 COMMON TEST PATTERNS

### 1. Login Flow
```python
def test_login(page: Page, base_url: str):
    # Navigate to login
    page.goto(f"{base_url}/login")
    page.wait_for_load_state("networkidle")
    
    # Fill credentials
    page.fill('#email', "student1@gmail.com")
    page.fill('#password', "Aa123456")
    
    # Submit
    page.click('button[type="submit"]:has-text("Sign In")')
    
    # Verify redirect
    page.wait_for_url(re.compile(r".*/dashboard.*"), timeout=15000)
    assert "/dashboard" in page.url
```

### 2. Logout Flow
```python
def test_logout(page: Page):
    # Assumes already logged in and on dashboard
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)  # Wait for HeaderV4 to render
    
    # Click avatar
    page.click('button:has(.MuiAvatar-root)')
    page.wait_for_timeout(500)  # Menu animation
    
    # Click logout
    page.locator('text="Logout"').last.click()
    
    # Verify redirect
    page.wait_for_load_state("networkidle")
    assert "/login" in page.url or page.url.endswith("/")
```

### 3. Navigation Test
```python
def test_navigate_to_courses(page: Page):
    # Assumes logged in
    page.click('text="Courses"')
    page.wait_for_url(re.compile(r".*/courses.*"))
    assert "/courses" in page.url
```

### 4. Form Validation Test
```python
def test_empty_form_validation(page: Page, base_url: str):
    page.goto(f"{base_url}/login")
    
    # Submit without filling
    page.click('button[type="submit"]')
    
    # Check for error messages
    assert page.locator('text="Email is required"').is_visible()
    assert page.locator('text="Password is required"').is_visible()
```

---

## 🚨 TROUBLESHOOTING

### Issue: App Stops When Running Tests
**Problem**: PowerShell sends SIGINT signal to app when pytest runs in same VS Code terminal session.

**Solution**: Run app and tests in **completely separate terminals**
```powershell
# Terminal 1 (keep running)
npm run dev

# Terminal 2 (run tests here)
.venv\Scripts\Activate.ps1
pytest tests/test_auth.py -v -s --headed
```

**Alternative**: Use Windows Terminal or separate PowerShell window (not VS Code terminal tabs)

### Issue: Can't Find Selector
**Problem**: `TimeoutError: Page.click: Timeout 30000ms exceeded`

**Solution**: 
1. Check actual component source code (don't assume)
2. Use browser DevTools to inspect element
3. Look for: `id`, `class`, `aria-label`, `data-testid`, text content
4. Use flexible selectors: `button:has-text("Text")`, `button:has(.ClassName)`

### Issue: Test Works Locally But Fails in CI
**Problem**: Headless mode behaves differently

**Solution**:
- Add explicit waits: `page.wait_for_load_state("networkidle")`
- Add small delays for animations: `page.wait_for_timeout(500)`
- Wait for specific elements: `page.wait_for_selector('#element')`
- Use `page.wait_for_url()` instead of immediate assertions

### Issue: Flaky Tests (Pass Sometimes, Fail Others)
**Problem**: Race conditions, network delays, animation timing

**Solution**:
- Increase timeout: `page.click('#btn', timeout=10000)`
- Wait for network idle: `page.wait_for_load_state("networkidle")`
- Use `expect()` with retries (from `playwright.sync_api`)
- Add explicit waits before critical actions

---

## 📊 TEST MARKERS

Defined in `pytest.ini`:

```python
@pytest.mark.smoke      # Critical tests (login, logout, core flows)
@pytest.mark.regression # Full regression suite
@pytest.mark.auth       # Authentication tests
@pytest.mark.courses    # Course management tests
@pytest.mark.payments   # Payment tests
@pytest.mark.notifications # Notification tests
@pytest.mark.api        # API endpoint tests
@pytest.mark.slow       # Tests that take >10 seconds
@pytest.mark.integration # Integration tests
@pytest.mark.e2e        # End-to-end user flows
```

**Run specific markers:**
```powershell
pytest -m smoke -v              # Run only smoke tests
pytest -m "auth and smoke" -v   # Run auth smoke tests
pytest -m "not slow" -v         # Skip slow tests
```

---

## 🎬 EXAMPLE: Complete Login/Logout Test

```python
"""Authentication tests"""
import pytest
from playwright.sync_api import Page, expect
import re


class TestAuthentication:
    """Test user authentication flows"""
    
    @pytest.mark.smoke
    def test_student_login_logout(self, page: Page, base_url: str):
        """
        Test complete login and logout flow for student user
        Based on actual app structure:
        - LoginForm at /login with email/password fields (id='email', id='password')
        - Submit button redirects to /dashboard on success
        - HeaderV4 with Avatar button in AppBar
        - Logout in dropdown menu
        """
        # Navigate directly to login page
        page.goto(f"{base_url}/login")
        
        # Wait for login form to load
        page.wait_for_load_state("networkidle")
        page.wait_for_selector('#email', state='visible')
        
        # Fill in student credentials
        page.fill('#email', "student1@gmail.com")
        page.fill('#password', "Aa123456")
        
        # Submit login form
        page.click('button[type="submit"]:has-text("Sign In")')
        
        # Wait for navigation to dashboard
        page.wait_for_url(re.compile(r".*/dashboard.*"), timeout=15000)
        
        # Verify we're on dashboard
        assert "/dashboard" in page.url, f"Expected dashboard URL, got {page.url}"
        
        # Wait for dashboard to fully load
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)  # Wait for HeaderV4 to render
        
        # Click on user avatar to open profile menu
        page.click('button:has(.MuiAvatar-root)')
        
        # Wait for profile menu to appear
        page.wait_for_timeout(500)  # Wait for menu animation
        
        # Click Logout menu item
        page.locator('text="Logout"').last.click()
        
        # Wait for logout to complete and redirect
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)  # Give time for redirect
        
        # Verify we're back at login or home page
        current_url = page.url
        assert "/login" in current_url or current_url.endswith("/"), \
            f"Expected login or home page after logout, got {current_url}"
```

---

## 📝 WRITING NEW TESTS - CHECKLIST

Before writing tests for a new feature:

1. **Read Documentation**
   - [ ] Check ARCHITECTURE.md for component structure
   - [ ] Check QUICK_REFERENCE.md for test data/credentials
   - [ ] Check COMPONENT_REGISTRY.md for component details
   - [ ] Review actual source code in `client/src/`

2. **Identify Selectors**
   - [ ] Inspect component source code for `id`, `className`, `data-testid`
   - [ ] Use browser DevTools to verify selectors
   - [ ] Document selectors in this guide for future reference

3. **Write Test**
   - [ ] Add appropriate markers (`@pytest.mark.smoke`, etc.)
   - [ ] Add docstring explaining what test does
   - [ ] Use explicit waits (`page.wait_for_load_state()`)
   - [ ] Add assertions with clear error messages

4. **Run Test**
   - [ ] Start app in Terminal 1: `npm run dev`
   - [ ] Run test in Terminal 2 with `--headed` flag
   - [ ] Verify test passes multiple times (not flaky)
   - [ ] Run in headless mode to verify CI compatibility

5. **Document**
   - [ ] Add test to appropriate test file
   - [ ] Update this guide with new selectors/patterns
   - [ ] Update PROJECT_STATUS.md if feature testing is complete

---

## 🔗 RELATED DOCUMENTATION

- **ARCHITECTURE.md**: System components, API endpoints, tech stack
- **QUICK_REFERENCE.md**: Test credentials, feature testing instructions
- **COMPONENT_REGISTRY.md**: List of all components with descriptions
- **PROJECT_STATUS.md**: Current implementation status
- **PRE_FLIGHT_CHECKLIST.md**: Pre-deployment testing checklist

---

## 🎯 NEXT STEPS (TODO)

### Tests to Write:
1. **Authentication** (DONE ✅)
   - [x] Login with student account
   - [x] Logout
   - [ ] Login with instructor account
   - [ ] Login with admin account
   - [ ] Invalid credentials error
   - [ ] Registration flow
   - [ ] Password reset flow
   - [ ] Email verification flow

2. **Courses**
   - [ ] Browse courses page
   - [ ] View course details
   - [ ] Enroll in course
   - [ ] Start lesson
   - [ ] Complete lesson
   - [ ] Course search/filter

3. **Dashboard**
   - [ ] View dashboard stats
   - [ ] View enrolled courses
   - [ ] View recent activity

4. **Payments**
   - [ ] Course checkout flow
   - [ ] Payment success page
   - [ ] View transaction history

5. **Notifications**
   - [ ] View notifications center
   - [ ] Mark as read
   - [ ] Filter notifications
   - [ ] Notification preferences

6. **Profile**
   - [ ] Update personal info
   - [ ] Change password
   - [ ] Update privacy settings
   - [ ] Upload avatar

---

## 📞 SUPPORT

**Issues with tests?**
1. Check this guide first
2. Review ARCHITECTURE.md for component structure
3. Inspect actual component source code
4. Use browser DevTools to verify selectors exist
5. Check test output and screenshots in `tests/screenshots/`

**Remember**: Always base tests on the ACTUAL code structure, not assumptions about how components "should" work.
