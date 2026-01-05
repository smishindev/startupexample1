# Quick Start: Run Notification Settings Tests

## BEFORE RUNNING TESTS - START THE APPLICATION

### Step 1: Start the application (Terminal 1 - Keep running)
```powershell
npm run dev
```

### Step 2: Set up test credentials (One-time setup)
```powershell
# Copy the example file
cp tests\.env.test.example tests\.env.test
```

The example file already has the correct credentials:
- `STUDENT_EMAIL=student1@gmail.com`
- `STUDENT_PASSWORD=Aa123456`
- `INSTRUCTOR_EMAIL=ins1@gmail.com`
- `INSTRUCTOR_PASSWORD=Aa123456`

### Step 3: Activate Python environment (Terminal 2)
```powershell
.venv\Scripts\Activate.ps1
```

### Step 4: Run the tests

#### Option A: Run all tests (headless - fastest)
```powershell
pytest tests/test_notification_settings.py -v
```

#### Option B: Run with visible browser (see what's happening)
```powershell
$env:HEADLESS="false"
pytest tests/test_notification_settings.py -v --headed
```

#### Option C: Run specific test
```powershell
pytest tests/test_notification_settings.py::TestNotificationSettings::test_lesson_completion_notification_when_enabled -v --headed
```

#### Option D: Run only UI tests (skip integration - faster)
```powershell
pytest tests/test_notification_settings.py -v -m "not integration"
```

#### Option E: Run only integration tests (with API calls)
```powershell
pytest tests/test_notification_settings.py -v -m "integration"
```

#### Option F: Debug mode (slow motion, stays open)
```powershell
$env:PWDEBUG="1"
pytest tests/test_notification_settings.py::TestNotificationSettings::test_global_in_app_toggle
```

## Expected Output

```
tests/test_notification_settings.py::TestNotificationSettings::test_global_in_app_toggle PASSED
tests/test_notification_settings.py::TestNotificationSettings::test_global_email_toggle PASSED
tests/test_notification_settings.py::TestNotificationSettings::test_email_frequency_selection PASSED
tests/test_notification_settings.py::TestNotificationSettings::test_accordion_expand_collapse PASSED
tests/test_notification_settings.py::TestNotificationSettings::test_category_switch_updates_chip PASSED
tests/test_notification_settings.py::TestNotificationSettings::test_progress_category_toggle PASSED
tests/test_notification_settings.py::TestNotificationSettings::test_all_category_switches_persist PASSED
tests/test_notification_settings.py::TestNotificationSettings::test_lesson_completion_subcategory_toggles PASSED
tests/test_notification_settings.py::TestNotificationSettings::test_live_sessions_subcategory_toggles PASSED
tests/test_notification_settings.py::TestNotificationSettings::test_subcategory_inherits_from_category PASSED
tests/test_notification_settings.py::TestNotificationSettings::test_explicit_override_vs_inherit PASSED
tests/test_notification_settings.py::TestNotificationSettings::test_lesson_completion_notification_when_enabled PASSED
tests/test_notification_settings.py::TestNotificationSettings::test_lesson_completion_blocked_when_disabled PASSED
tests/test_notification_settings.py::TestNotificationSettings::test_live_session_notification_when_enabled PASSED
tests/test_notification_settings.py::TestNotificationSettings::test_live_session_blocked_when_disabled PASSED
tests/test_notification_settings.py::TestNotificationSettings::test_email_only_mode PASSED
tests/test_notification_settings.py::TestNotificationSettings::test_security_alerts_cannot_be_disabled PASSED
tests/test_notification_settings.py::TestNotificationSettings::test_multiple_changes_before_save PASSED

======================== 27 passed in 145.23s ========================
```

## Troubleshooting

### 1. "Connection refused" error
→ Make sure app is running: `npm run dev`  
→ Check ports 5173 (frontend) and 3001 (backend) are available

### 2. "Login failed" error
→ Check credentials in `tests/.env.test` match QUICK_REFERENCE.md  
→ Verify users exist in database

### 3. "Element not found" error
→ Run with `--headed` to see what's happening  
→ Check if test IDs are correct in TEST_SELECTOR_MAP_ORGANIZED.md

### 4. Tests are slow
→ Run without `--headed` for faster execution  
→ Use `-m "not integration"` to skip integration tests

### 5. Screenshots on failure
→ Check `tests/screenshots/` folder  
→ Videos in `tests/videos/` folder

## For More Details

See: `tests/NOTIFICATION_SETTINGS_TESTS.md`
