# Notification Settings Test Suite

Comprehensive automated tests for notification settings functionality with full end-to-end integration testing.

## 📋 Test Coverage

**Total: 48 Tests** (27 baseline + 21 comprehensive API integration tests)

### Baseline UI & Integration Tests (27 tests)
✅ **Global Controls:**
- In-app notifications toggle with persistence
- Email notifications toggle with persistence
- Email frequency dropdown (realtime/daily/weekly)

✅ **Category Management:**
- All 5 accordion expand/collapse
- All 5 category switches with persistence
- Category status chips update correctly

✅ **Subcategory Toggles:**
- Lesson completion (in-app + email)
- Live sessions (in-app + email)
- All subcategories can be toggled independently

✅ **NULL Inheritance:**
- Subcategories inherit from category when NULL
- Category OFF → subcategories show "Inherit: OFF"
- Explicit override vs inherit behavior
- Visual indicators (opacity 0.6 for inherit state)

✅ **Basic Integration:**
- Lesson completion notification when enabled/blocked when disabled
- Live session notification when enabled/blocked when disabled
- Email-only mode (critical bug fix test)

✅ **Edge Cases:**
- Security alerts cannot be disabled
- Multiple changes before save

### Comprehensive API Integration Tests (21 tests)
✅ **Instructor Milestone Notifications (5 tests):**
- 25% course completion milestone notification
- 50%, 75%, 100% milestone notifications
- Milestone blocked when settings disabled
- Email-only milestone delivery
- Verify milestones NOT sent for every lesson

✅ **Multi-Student Live Sessions (2 tests):**
- Multiple enrolled students receive notifications
- Unenrolled students do NOT receive notifications

✅ **Email vs In-App Separation (6 tests):**
- Lesson completion in-app only
- Lesson completion email only
- Lesson completion both channels
- Lesson completion neither channel
- Independent settings for different subcategories
- Database verification (EmailSent, EmailQueued flags)

✅ **Edge Cases & Cascade Logic (7 tests):**
- Global OFF blocks ALL notifications (even with subcategory ON)
- Category OFF blocks subcategory (even with explicit subcategory ON)
- Subcategory explicit OFF overrides category ON
- NULL inheritance allows notification when category ON
- Security alerts always delivered (bypass all settings)
- Enrollment validation (no notification if not enrolled)
- Multi-user scenarios (different settings per user)

✅ **Advanced Scenarios:**
- Database notification record verification
- Email queue status verification
- Multi-user perspective testing (student vs instructor)
- Cross-category independent settings

## 🚀 Running Tests

### Prerequisites
1. **Start the application:**
   ```powershell
   # Terminal 1 - Keep running
   npm run dev
   ```
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001

2. **Set up test environment:**
   ```powershell
   # Copy example env file
   cp tests\.env.test.example tests\.env.test
   
   # Edit tests\.env.test with actual values
   # Default credentials from QUICK_REFERENCE.md:
   # - student1@gmail.com / Aa123456
   # - ins1@gmail.com / Aa123456
   ```

3. **Activate Python environment:**
   ```powershell
   .venv\Scripts\Activate.ps1
   ```

### Run All Tests
```powershell
# Run all notification settings tests
pytest tests/test_notification_settings.py -v

# With visible browser
$env:HEADLESS="false"
pytest tests/test_notification_settings.py -v --headed

# Run specific test
pytest tests/test_notification_settings.py::TestNotificationSettings::test_lesson_completion_notification_when_enabled -v --headed

# Run only UI tests (skip integration)
pytest tests/test_notification_settings.py -v -m "not integration"

# Run only integration tests
pytest tests/test_notification_settings.py -v -m "integration"
```

## 📝 Test Structure

### Test Class: `TestNotificationSettings`

**Setup:**
- Logs in as student before each test
- Navigates to `/settings/notifications`
- Resets to default settings after each test (cleanup)

**Categories:**
1. **Global Controls** - Tests for in-app/email toggles and frequency
2. **Category Accordions** - Tests for expand/collapse and status chips
3. **Category Toggles** - Tests for all 5 category switches
4. **Subcategory Toggles** - Tests for individual subcategory switches
5. **NULL Inheritance** - Tests for cascade behavior
6. **Integration Tests** - Tests with actual notification triggers
7. **Email-Specific** - Tests for email-only mode
8. **Edge Cases** - Security alerts, multiple changes

## 🔧 Helper Fixtures (conftest.py)

### API Fixtures
- `api_client` - Authenticated HTTP session for student
- `api_client_instructor` - Authenticated HTTP session for instructor

### Notification Helpers
- `trigger_test_notification(type, subcategory)` - Triggers test notification via API
- `get_notification_count()` - Returns current notification bell count
- `clear_notifications()` - Clears all notifications for current user
- `wait_for_notification(timeout, expected_increase)` - Waits for notification count to change

### Usage Example
```python
def test_notification_with_helpers(
    page, 
    trigger_test_notification,
    get_notification_count,
    wait_for_notification
):
    initial = get_notification_count()
    trigger_test_notification('progress', 'LessonCompletion')
    wait_for_notification(timeout_ms=5000, expected_increase=1)
    assert get_notification_count() == initial + 1
```

## 🧪 Test Scenarios Covered

### 1. Lesson Completion (Progress → Lesson Completion)
**Trigger:** Student completes a lesson  
**Tests:**
- ✅ Enabled: Notification appears in bell
- ✅ Disabled: No notification appears
- ✅ Category OFF: Subcategory inherits and blocks

### 2. Live Session Created (Course → Live Sessions)
**Trigger:** Instructor creates live session  
**Tests:**
- ✅ Enabled: All enrolled students receive notification
- ✅ Disabled: No notifications sent
- ✅ Email-only: In-app blocked, email sent

### 3. NULL Inheritance Cascade
**Trigger:** User changes category setting  
**Tests:**
- ✅ Category OFF → All NULL subcategories show "Inherit: OFF"
- ✅ Category ON → All NULL subcategories show "Inherit: ON"
- ✅ Explicit subcategory setting overrides inheritance

### 4. Email-Only Mode (Critical Bug Fix)
**Bug Fixed:** In-app OFF, Email ON used to block everything  
**Test:**
- ✅ In-app OFF, Email ON → No in-app notification, email still sent

## 📊 Test Results Example

```
tests/test_notification_settings.py::TestNotificationSettings::test_global_in_app_toggle PASSED
tests/test_notification_settings.py::TestNotificationSettings::test_global_email_toggle PASSED
tests/test_notification_settings.py::TestNotificationSettings::test_email_frequency_selection PASSED
tests/test_notification_settings.py::TestNotificationSettings::test_accordion_expand_collapse PASSED
tests/test_notification_settings.py::TestNotificationSettings::test_lesson_completion_notification_when_enabled PASSED
tests/test_notification_settings.py::TestNotificationSettings::test_lesson_completion_blocked_when_disabled PASSED
tests/test_notification_settings.py::TestNotificationSettings::test_email_only_mode PASSED

======================== 27 passed in 145.23s ========================
```

## 🐛 Debugging Failed Tests

### Screenshots on Failure
Failed tests automatically capture screenshots:
```
tests/screenshots/test_lesson_completion_notification_when_enabled.png
```

### Video Recording
All tests record video (if enabled):
```
tests/videos/test-{timestamp}.webm
```

### Verbose Output
```powershell
# See detailed Playwright actions
pytest tests/test_notification_settings.py -v -s --headed

# Slow down actions for debugging
$env:PWDEBUG="1"
pytest tests/test_notification_settings.py::TestNotificationSettings::test_lesson_completion_notification_when_enabled
```

## 📚 References

- **Test Selector Map**: `TEST_SELECTOR_MAP_ORGANIZED.md` - All 62 notification settings test IDs
- **Notification Testing Guide**: `NOTIFICATION_TESTING_COMPLETE.md` - Test matrix and scenarios
- **NULL Inheritance**: `NULL_INHERITANCE_FIX_SUMMARY.md` - Cascade behavior documentation
- **Test Scripts**: 
  - `scripts/test-notifications-api.js` - API-based testing examples
  - `scripts/test-notification-scenarios.js` - Database-level testing

## 🎯 Success Criteria

✅ **All 27 tests passing**  
✅ **100% coverage** of notification settings UI  
✅ **Integration testing** with actual notification triggers  
✅ **NULL inheritance** verified  
✅ **Critical bug** (email-only mode) verified as fixed  

## 💡 Tips

1. **Run app first** - Tests require frontend + backend running
2. **Use correct credentials** - From QUICK_REFERENCE.md
3. **Watch tests run** - Use `--headed` to see browser actions
4. **Integration tests slower** - Include API calls and waits
5. **Clean state** - Tests reset settings after each run
