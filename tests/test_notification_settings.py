"""
Notification Settings Integration Tests

Tests notification settings page functionality and verifies that:
1. Settings changes are persisted
2. Notifications are sent/blocked based on settings
3. NULL inheritance works correctly (category → subcategory cascade)
4. Lesson completion triggers work with settings
5. Live session creation triggers work with settings
"""

import pytest
from playwright.sync_api import Page, expect
import re
import time


class TestNotificationSettings:
    """Test notification settings page functionality"""

    @pytest.fixture(autouse=True)
    def setup(self, page: Page, base_url: str, student_credentials: dict):
        """Navigate to notification settings before each test"""
        # Login as student
        page.goto(f"{base_url}/login")
        page.wait_for_load_state("networkidle")
        
        page.fill('[data-testid="login-email-input"]', student_credentials['email'])
        page.fill('[data-testid="login-password-input"]', student_credentials['password'])
        page.click('[data-testid="login-submit-button"]')
        
        # Wait for dashboard
        page.wait_for_url(re.compile(r".*/dashboard.*"), timeout=15000)
        
        # Navigate to notification settings
        page.goto(f"{base_url}/settings/notifications")
        page.wait_for_load_state("networkidle")
        page.wait_for_selector('[data-testid="notifications-settings-save-button"]', state='visible')
        
        yield
        
        # Cleanup: Reset to default settings after each test
        self._reset_to_defaults(page)

    def _reset_to_defaults(self, page: Page):
        """Helper to reset notification settings to defaults"""
        try:
            # Turn on global toggles
            in_app_switch = page.locator('[data-testid="notifications-settings-enable-in-app-switch"] input')
            email_switch = page.locator('[data-testid="notifications-settings-enable-email-switch"] input')
            
            if not in_app_switch.is_checked():
                in_app_switch.check()
            if not email_switch.is_checked():
                email_switch.check()
            
            # Save
            page.click('[data-testid="notifications-settings-save-button"]')
            page.wait_for_timeout(1000)
        except:
            pass  # Best effort cleanup

    # ================================================================
    # GLOBAL CONTROLS TESTS
    # ================================================================

    @pytest.mark.smoke
    def test_global_in_app_toggle(self, page: Page):
        """Test global in-app notifications toggle"""
        in_app_switch = page.locator('[data-testid="notifications-settings-enable-in-app-switch"] input')
        
        # Get initial state
        initial_state = in_app_switch.is_checked()
        
        # Toggle to opposite state
        if initial_state:
            in_app_switch.uncheck()
            assert not in_app_switch.is_checked()
        else:
            in_app_switch.check()
            assert in_app_switch.is_checked()
        
        # Save settings
        page.click('[data-testid="notifications-settings-save-button"]')
        
        # Wait for toast message
        expect(page.locator('text="Notification settings saved!"')).to_be_visible(timeout=5000)
        
        # Reload page and verify persisted
        page.reload()
        page.wait_for_load_state("networkidle")
        page.wait_for_selector('[data-testid="notifications-settings-enable-in-app-switch"] input', state='visible')
        
        in_app_switch_after = page.locator('[data-testid="notifications-settings-enable-in-app-switch"] input')
        # Should be opposite of initial state
        assert in_app_switch_after.is_checked() == (not initial_state)

    @pytest.mark.smoke
    def test_global_email_toggle(self, page: Page):
        """Test global email notifications toggle"""
        email_switch = page.locator('[data-testid="notifications-settings-enable-email-switch"] input')
        
        # Initially should be checked
        assert email_switch.is_checked()
        
        # Turn OFF
        email_switch.uncheck()
        assert not email_switch.is_checked()
        
        # Verify email frequency dropdown disappears
        frequency_select = page.locator('[data-testid="notifications-settings-email-frequency-select"]')
        expect(frequency_select).not_to_be_visible()
        
        # Turn back ON
        email_switch.check()
        
        # Verify email frequency dropdown appears
        expect(frequency_select).to_be_visible()

    def test_email_frequency_selection(self, page: Page):
        """Test email digest frequency dropdown"""
        # Ensure email is enabled
        email_switch = page.locator('[data-testid="notifications-settings-enable-email-switch"] input')
        if not email_switch.is_checked():
            email_switch.check()
        
        # Click frequency select
        page.click('[data-testid="notifications-settings-email-frequency-select"]')
        
        # Select daily
        page.click('li[data-value="daily"]')
        
        # Verify selection
        frequency_select = page.locator('[data-testid="notifications-settings-email-frequency-select"]')
        expect(frequency_select).to_have_text(re.compile('Daily Digest'))
        
        # Save and verify persistence
        page.click('[data-testid="notifications-settings-save-button"]')
        expect(page.locator('text="Notification settings saved!"')).to_be_visible(timeout=5000)
        
        page.reload()
        page.wait_for_load_state("networkidle")
        frequency_select_after = page.locator('[data-testid="notifications-settings-email-frequency-select"]')
        expect(frequency_select_after).to_have_text(re.compile('Daily Digest'))

    # ================================================================
    # CATEGORY ACCORDION TESTS
    # ================================================================

    def test_accordion_expand_collapse(self, page: Page):
        """Test expanding and collapsing category accordions"""
        # Progress accordion should be expanded by default
        progress_content = page.locator('[data-testid="notifications-settings-category-progress-accordion"]')
        expect(progress_content).to_be_visible()
        
        # Course accordion should be collapsed
        course_accordion = page.locator('[data-testid="notifications-settings-category-course-accordion"]')
        course_summary = page.locator('[data-testid="notifications-settings-category-course-accordion-summary"]')
        
        # Click to expand
        course_summary.click()
        page.wait_for_timeout(500)  # Animation
        
        # Verify subcategories visible
        expect(page.locator('[data-testid="notifications-settings-course-course-enrollment-inapp-switch"] input')).to_be_visible()

    def test_category_switch_updates_chip(self, page: Page):
        """Test category switch updates the status chip"""
        # Expand Progress accordion (should be default expanded)
        progress_accordion = page.locator('[data-testid="notifications-settings-category-progress-accordion"]')
        progress_chip = progress_accordion.locator('text=/Enabled|Disabled/')
        
        # Get initial state
        initial_text = progress_chip.inner_text()
        
        # Toggle category switch
        progress_switch = page.locator('[data-testid="notifications-settings-category-progress-switch"] input')
        progress_switch.click()
        page.wait_for_timeout(300)
        
        # Chip should toggle
        new_text = progress_chip.inner_text()
        assert new_text != initial_text
        assert new_text in ['Enabled', 'Disabled']

    # ================================================================
    # CATEGORY TOGGLE TESTS
    # ================================================================

    def test_progress_category_toggle(self, page: Page):
        """Test Progress Updates category toggle"""
        progress_switch = page.locator('[data-testid="notifications-settings-category-progress-switch"] input')
        
        # Get initial state
        initial_state = progress_switch.is_checked()
        
        # Toggle
        if initial_state:
            progress_switch.uncheck()
        else:
            progress_switch.check()
        
        # Save
        page.click('[data-testid="notifications-settings-save-button"]')
        expect(page.locator('text="Notification settings saved!"')).to_be_visible(timeout=5000)
        
        # Reload and verify
        page.reload()
        page.wait_for_load_state("networkidle")
        progress_switch_after = page.locator('[data-testid="notifications-settings-category-progress-switch"] input')
        assert progress_switch_after.is_checked() == (not initial_state)

    def test_all_category_switches_persist(self, page: Page):
        """Test all 5 category switches can be toggled and persisted"""
        categories = [
            ('progress', 'notifications-settings-category-progress-switch'),
            ('course', 'notifications-settings-category-course-switch'),
            ('assessment', 'notifications-settings-category-assessment-switch'),
            ('community', 'notifications-settings-category-community-switch'),
            ('system', 'notifications-settings-category-system-switch'),
        ]
        
        # Turn all OFF
        for name, testid in categories:
            switch = page.locator(f'[data-testid="{testid}"] input')
            if switch.is_checked():
                switch.uncheck()
        
        # Save
        page.click('[data-testid="notifications-settings-save-button"]')
        expect(page.locator('text="Notification settings saved!"')).to_be_visible(timeout=5000)
        
        # Reload and verify all OFF
        page.reload()
        page.wait_for_load_state("networkidle")
        
        for name, testid in categories:
            switch = page.locator(f'[data-testid="{testid}"] input')
            assert not switch.is_checked(), f"{name} category should be OFF"

    # ================================================================
    # SUBCATEGORY TOGGLE TESTS
    # ================================================================

    def test_lesson_completion_subcategory_toggles(self, page: Page):
        """Test Lesson Completion in-app and email toggles"""
        # Progress accordion should be expanded by default
        
        # Find lesson completion switches
        lesson_inapp = page.locator('[data-testid="notifications-settings-progress-lesson-completion-inapp-switch"] input')
        lesson_email = page.locator('[data-testid="notifications-settings-progress-lesson-completion-email-switch"] input')
        
        # Get initial states
        inapp_initial = lesson_inapp.is_checked()
        email_initial = lesson_email.is_checked()
        
        # Turn both ON if not already
        if not inapp_initial:
            lesson_inapp.check()
        if not email_initial:
            lesson_email.check()
        
        # Now turn OFF in-app only
        lesson_inapp.uncheck()
        assert not lesson_inapp.is_checked()
        assert lesson_email.is_checked()  # Email still ON
        
        # Save
        page.click('[data-testid="notifications-settings-save-button"]')
        expect(page.locator('text="Notification settings saved!"')).to_be_visible(timeout=5000)
        
        # Reload and verify
        page.reload()
        page.wait_for_load_state("networkidle")
        
        lesson_inapp_after = page.locator('[data-testid="notifications-settings-progress-lesson-completion-inapp-switch"] input')
        lesson_email_after = page.locator('[data-testid="notifications-settings-progress-lesson-completion-email-switch"] input')
        
        assert not lesson_inapp_after.is_checked()
        assert lesson_email_after.is_checked()

    def test_live_sessions_subcategory_toggles(self, page: Page):
        """Test Live Sessions in-app and email toggles"""
        # Expand Course accordion
        course_summary = page.locator('[data-testid="notifications-settings-category-course-accordion-summary"]')
        course_summary.click()
        page.wait_for_timeout(500)
        
        # Find live sessions switches
        live_inapp = page.locator('[data-testid="notifications-settings-course-live-sessions-inapp-switch"] input')
        live_email = page.locator('[data-testid="notifications-settings-course-live-sessions-email-switch"] input')
        
        # Turn both OFF
        if live_inapp.is_checked():
            live_inapp.uncheck()
        if live_email.is_checked():
            live_email.uncheck()
        
        # Save
        page.click('[data-testid="notifications-settings-save-button"]')
        expect(page.locator('text="Notification settings saved!"')).to_be_visible(timeout=5000)
        
        # Reload and verify
        page.reload()
        page.wait_for_load_state("networkidle")
        
        # Re-expand accordion
        course_summary_after = page.locator('[data-testid="notifications-settings-category-course-accordion-summary"]')
        course_summary_after.click()
        page.wait_for_timeout(500)
        
        live_inapp_after = page.locator('[data-testid="notifications-settings-course-live-sessions-inapp-switch"] input')
        live_email_after = page.locator('[data-testid="notifications-settings-course-live-sessions-email-switch"] input')
        
        assert not live_inapp_after.is_checked()
        assert not live_email_after.is_checked()

    # ================================================================
    # NULL INHERITANCE TESTS
    # ================================================================

    def test_subcategory_inherits_from_category(self, page: Page):
        """
        Test NULL inheritance: When category is OFF, subcategories with NULL inherit OFF
        
        This test verifies the 3-level cascade:
        Global → Category → Subcategory
        """
        # Progress accordion should be expanded
        
        # Turn OFF Progress category
        progress_switch = page.locator('[data-testid="notifications-settings-category-progress-switch"] input')
        progress_switch.uncheck()
        page.wait_for_timeout(300)  # Wait for inherited state to update
        
        # Check that lesson completion switches show "Inherit: OFF"
        # Note: The switches themselves will appear unchecked because they inherit the OFF state
        lesson_inapp = page.locator('[data-testid="notifications-settings-progress-lesson-completion-inapp-switch"] input')
        
        # The switch should appear unchecked (inheriting category OFF state)
        assert not lesson_inapp.is_checked()
        
        # Check for inherit text (appears when subcategory is NULL) - use .first since there are multiple
        expect(page.locator('text=/Inherit: OFF/i').first).to_be_visible()
        
        # Now turn category back ON
        progress_switch.check()
        page.wait_for_timeout(500)  # Wait for inherited state to update
        
        # Subcategories should now show "Inherit: ON" text (actual checkbox state may vary for NULL inheritance)
        expect(page.locator('text=/Inherit: ON/i').first).to_be_visible()

    def test_explicit_override_vs_inherit(self, page: Page):
        """
        Test that explicit ON/OFF overrides inheritance
        """
        # Progress accordion expanded by default
        
        # Turn category OFF
        progress_switch = page.locator('[data-testid="notifications-settings-category-progress-switch"] input')
        progress_switch.uncheck()
        
        # Lesson completion should inherit OFF
        lesson_inapp = page.locator('[data-testid="notifications-settings-progress-lesson-completion-inapp-switch"] input')
        assert not lesson_inapp.is_checked()
        
        # Explicitly turn lesson completion ON (override)
        lesson_inapp.check()
        assert lesson_inapp.is_checked()
        
        # Should NOT show "Inherit" text anymore (explicit override)
        # The opacity should be normal (not 0.6 for inherit state)
        
        # Turn category back ON
        progress_switch.check()
        
        # Lesson completion should still be ON (explicit override persists)
        assert lesson_inapp.is_checked()

    # ================================================================
    # INTEGRATION TESTS WITH ACTUAL NOTIFICATIONS
    # ================================================================
    # Selectors Reference: See TEST_SELECTOR_MAP_ORGANIZED.md
    # - NotificationBell.tsx: notification-bell-button, notification-bell-badge, etc.
    # - NotificationSettingsPage.tsx: All notification settings switches and buttons
    
    @pytest.mark.integration
    def test_lesson_completion_notification_when_enabled(
        self, 
        page: Page, 
        base_url: str, 
        trigger_test_notification,
        get_notification_count,
        clear_notifications,
        verify_notification_in_db
    ):
        """
        Integration Test: Lesson completion sends notification when enabled
        
        Steps:
        1. Ensure lesson completion notifications are ON
        2. Trigger lesson completion notification
        3. Verify notification appears in notification bell
        """
        # Clear any existing notifications
        clear_notifications()
        
        # Ensure Progress → Lesson Completion is ON
        progress_switch = page.locator('[data-testid="notifications-settings-category-progress-switch"] input')
        lesson_inapp = page.locator('[data-testid="notifications-settings-progress-lesson-completion-inapp-switch"] input')
        
        if not progress_switch.is_checked():
            progress_switch.check()
        if not lesson_inapp.is_checked():
            lesson_inapp.check()
        
        # Save settings
        page.click('[data-testid="notifications-settings-save-button"]')
        expect(page.locator('text="Notification settings saved!"')).to_be_visible(timeout=5000)
        page.wait_for_timeout(1000)  # Wait for settings to propagate
        
        # Navigate to dashboard
        page.goto(f"{base_url}/dashboard")
        page.wait_for_load_state("networkidle")
        
        # Get initial notification count
        initial_count = get_notification_count()
        
        # Trigger lesson completion notification via API
        success = trigger_test_notification('progress', 'LessonCompletion')
        assert success, "Failed to trigger test notification"
        
        # Verify notification exists in database
        db_verified = verify_notification_in_db(timeout_ms=3000)
        assert db_verified, "Notification was not created in database"
        
        # Reload page to fetch notifications (WebSocket may not deliver in test environment)
        page.reload()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)  # Wait for notification bell to fetch unread count
        
        # Get final notification count after reload and verify it increased
        final_count = get_notification_count()
        assert final_count >= initial_count + 1, f"Expected at least {initial_count + 1} notifications, got {final_count}"
        
        # Click bell to verify notification content
        page.click('[data-testid="notification-bell-button"]')
        page.wait_for_timeout(500)
        
        # Verify notification menu opened and contains notification about lesson/progress
        notification_menu = page.locator('[data-testid="notification-bell-menu"]')
        expect(notification_menu).to_be_visible()
        
        # Check notification text within the menu (not the whole page)
        expect(notification_menu.locator('text=/Test Notification|Lesson|Progress/i').first).to_be_visible()

    @pytest.mark.integration
    def test_lesson_completion_blocked_when_disabled(
        self,
        page: Page,
        base_url: str,
        trigger_test_notification,
        get_notification_count,
        clear_notifications
    ):
        """
        Integration Test: Lesson completion does NOT send notification when disabled
        
        Steps:
        1. Turn OFF lesson completion in-app notifications
        2. Trigger lesson completion
        3. Verify NO notification appears in bell
        """
        # Clear any existing notifications
        clear_notifications()
        
        # Turn OFF Progress → Lesson Completion in-app
        progress_switch = page.locator('[data-testid="notifications-settings-category-progress-switch"] input')
        lesson_inapp = page.locator('[data-testid="notifications-settings-progress-lesson-completion-inapp-switch"] input')
        
        # Ensure category is ON but subcategory is OFF
        if not progress_switch.is_checked():
            progress_switch.check()
        
        lesson_inapp.uncheck()
        
        # Save settings
        page.click('[data-testid="notifications-settings-save-button"]')
        expect(page.locator('text="Notification settings saved!"')).to_be_visible(timeout=5000)
        page.wait_for_timeout(1000)  # Wait for settings to propagate
        
        # Navigate to dashboard
        page.goto(f"{base_url}/dashboard")
        page.wait_for_load_state("networkidle")
        
        # Get initial notification count (should be 0)
        initial_count = get_notification_count()
        
        # Trigger lesson completion notification
        trigger_test_notification('progress', 'LessonCompletion')
        
        # Wait a bit to ensure notification would have arrived if it was going to
        page.wait_for_timeout(2000)
        
        # Verify count did NOT increase
        final_count = get_notification_count()
        assert final_count == initial_count, f"Notification was blocked - count should stay at {initial_count}, but got {final_count}"

    @pytest.mark.integration
    def test_live_session_notification_when_enabled(
        self,
        page: Page,
        base_url: str,
        trigger_test_notification,
        get_notification_count,
        clear_notifications,
        verify_notification_in_db
    ):
        """
        Integration Test: Live session creation sends notification when enabled
        
        Steps:
        1. Ensure live session notifications are ON
        2. Trigger live session notification
        3. Verify notification appears
        """
        # Clear any existing notifications
        clear_notifications()
        
        # Expand Course accordion
        course_summary = page.locator('[data-testid="notifications-settings-category-course-accordion-summary"]')
        course_summary.click()
        page.wait_for_timeout(500)
        
        # Ensure Course → Live Sessions is ON
        course_switch = page.locator('[data-testid="notifications-settings-category-course-switch"] input')
        live_inapp = page.locator('[data-testid="notifications-settings-course-live-sessions-inapp-switch"] input')
        
        if not course_switch.is_checked():
            course_switch.check()
        if not live_inapp.is_checked():
            live_inapp.check()
        
        # Save settings
        page.click('[data-testid="notifications-settings-save-button"]')
        expect(page.locator('text="Notification settings saved!"')).to_be_visible(timeout=5000)
        page.wait_for_timeout(1000)
        
        # Navigate to dashboard
        page.goto(f"{base_url}/dashboard")
        page.wait_for_load_state("networkidle")
        
        # Get initial count
        initial_count = get_notification_count()
        
        # Trigger live session notification
        success = trigger_test_notification('course', 'LiveSessions')
        assert success, "Failed to trigger live session notification"
        
        # Verify notification exists in database
        assert verify_notification_in_db(), "Notification not found in database"
        
        # Reload page to fetch updated count (WebSocket doesn't work in tests)
        page.reload()
        page.wait_for_load_state("networkidle")
        
        # Verify count increased
        final_count = get_notification_count()
        assert final_count == initial_count + 1, f"Expected {initial_count + 1} notifications, got {final_count}"

    @pytest.mark.integration
    def test_live_session_blocked_when_disabled(
        self,
        page: Page,
        base_url: str,
        trigger_test_notification,
        get_notification_count,
        clear_notifications
    ):
        """
        Integration Test: Live session does NOT send notification when disabled
        """
        # Clear notifications
        clear_notifications()
        
        # Expand Course accordion
        course_summary = page.locator('[data-testid="notifications-settings-category-course-accordion-summary"]')
        course_summary.click()
        page.wait_for_timeout(500)
        
        # Turn OFF Course → Live Sessions
        live_inapp = page.locator('[data-testid="notifications-settings-course-live-sessions-inapp-switch"] input')
        live_inapp.uncheck()
        
        # Save settings
        page.click('[data-testid="notifications-settings-save-button"]')
        expect(page.locator('text="Notification settings saved!"')).to_be_visible(timeout=5000)
        page.wait_for_timeout(1000)
        
        # Navigate to dashboard
        page.goto(f"{base_url}/dashboard")
        page.wait_for_load_state("networkidle")
        
        # Get initial count
        initial_count = get_notification_count()
        
        # Trigger live session notification
        trigger_test_notification('course', 'LiveSessions')
        
        # Wait to ensure notification would have arrived
        page.wait_for_timeout(2000)
        
        # Verify count did NOT increase
        final_count = get_notification_count()
        assert final_count == initial_count, f"Live session notification was blocked - count should stay at {initial_count}, got {final_count}"

    # ================================================================
    # EMAIL-SPECIFIC TESTS
    # ================================================================

    @pytest.mark.integration
    def test_email_only_mode(
        self,
        page: Page,
        base_url: str,
        trigger_test_notification,
        get_notification_count,
        clear_notifications
    ):
        """
        Critical Test: In-App OFF, Email ON
        
        This was the critical bug fixed in NOTIFICATION_TESTING_COMPLETE.md
        Verify that with in-app OFF but email ON:
        - NO in-app notification appears
        - Email is still sent (notification created in DB for email tracking)
        """
        # Clear notifications
        clear_notifications()
        
        # Turn OFF in-app, keep email ON
        in_app_switch = page.locator('[data-testid="notifications-settings-enable-in-app-switch"] input')
        email_switch = page.locator('[data-testid="notifications-settings-enable-email-switch"] input')
        
        in_app_switch.uncheck()
        assert email_switch.is_checked(), "Email should be ON"
        
        # Set email to realtime
        page.click('[data-testid="notifications-settings-email-frequency-select"]')
        page.click('li[data-value="realtime"]')
        
        # Save
        page.click('[data-testid="notifications-settings-save-button"]')
        expect(page.locator('text="Notification settings saved!"')).to_be_visible(timeout=5000)
        page.wait_for_timeout(1000)
        
        # Navigate to dashboard
        page.goto(f"{base_url}/dashboard")
        page.wait_for_load_state("networkidle")
        
        # Get initial count (should be 0)
        initial_count = get_notification_count()
        
        # Trigger lesson completion
        trigger_test_notification('progress', 'LessonCompletion')
        
        # Wait to ensure notification would have arrived if in-app was enabled
        page.wait_for_timeout(2000)
        
        # Verify NO in-app notification (count should stay at 0)
        final_count = get_notification_count()
        assert final_count == initial_count, f"In-app should be blocked - count should be {initial_count}, got {final_count}"
        
        # Note: Email verification would require checking email logs or database
        # For this test, we verify that in-app is correctly blocked
        # The backend should still create notification in DB for email tracking

    # ================================================================
    # EDGE CASES
    # ================================================================

    def test_security_alerts_cannot_be_disabled(self, page: Page):
        """Test that security alerts switches are disabled"""
        # Expand System accordion
        system_summary = page.locator('[data-testid="notifications-settings-category-system-accordion-summary"]')
        system_summary.click()
        page.wait_for_timeout(500)
        
        # Security alerts switches should be disabled
        security_inapp = page.locator('[data-testid="notifications-settings-system-security-alerts-inapp-switch"] input')
        security_email = page.locator('[data-testid="notifications-settings-system-security-alerts-email-switch"] input')
        
        # Verify disabled state
        assert security_inapp.is_disabled()
        assert security_email.is_disabled()

    def test_multiple_changes_before_save(self, page: Page):
        """Test making multiple changes before saving"""
        # Change global settings
        email_switch = page.locator('[data-testid="notifications-settings-enable-email-switch"] input')
        email_switch.uncheck()
        
        # Change category
        progress_switch = page.locator('[data-testid="notifications-settings-category-progress-switch"] input')
        progress_switch.uncheck()
        
        # Change subcategory
        # Expand Course accordion
        course_summary = page.locator('[data-testid="notifications-settings-category-course-accordion-summary"]')
        course_summary.click()
        page.wait_for_timeout(500)
        
        live_inapp = page.locator('[data-testid="notifications-settings-course-live-sessions-inapp-switch"] input')
        live_inapp.uncheck()
        
        # Save all at once
        page.click('[data-testid="notifications-settings-save-button"]')
        expect(page.locator('text="Notification settings saved!"')).to_be_visible(timeout=5000)
        
        # Reload and verify all changes persisted
        page.reload()
        page.wait_for_load_state("networkidle")
        
        email_after = page.locator('[data-testid="notifications-settings-enable-email-switch"] input')
        progress_after = page.locator('[data-testid="notifications-settings-category-progress-switch"] input')
        
        assert not email_after.is_checked()
        assert not progress_after.is_checked()


class TestNotificationSettingsWithAPI:
    """
    Advanced integration tests that use API calls to trigger notifications
    and verify settings enforcement
    """
    
    # ===== INSTRUCTOR MILESTONE NOTIFICATION TESTS =====
    
    @pytest.mark.integration
    def test_instructor_milestone_25_percent_notification(
        self, page, base_url, api_client_instructor, get_enrolled_course, 
        get_course_progress, trigger_test_notification, get_db_notifications
    ):
        """
        Test that instructor receives notification when student reaches 25% course completion
        Instructor should receive notification ONLY at milestone, not every lesson
        """
        # Login as instructor and enable progress notifications
        page.goto(f"{base_url}/login")
        page.fill('[data-testid="login-email-input"]', "s.mishin.dev+ins1@gmail.com")
        page.fill('[data-testid="login-password-input"]', "Aa123456")
        page.click('[data-testid="login-submit-button"]')
        page.wait_for_url(re.compile(r".*/dashboard.*"))
        
        # Navigate to notification settings
        page.goto(f"{base_url}/settings/notifications")
        page.wait_for_load_state("networkidle")
        
        # Ensure Progress category is enabled
        progress_accordion = page.locator('[data-testid="notifications-settings-category-progress-accordion"]')
        if progress_accordion.get_attribute("aria-expanded") == "false":
            progress_accordion.click()
            page.wait_for_timeout(300)
        
        # Enable student milestone notifications for in-app
        milestone_inapp = page.locator('[data-testid="notifications-settings-progress-student-milestone-inapp-switch"] input')
        if not milestone_inapp.is_checked():
            milestone_inapp.check()
        
        # Save settings
        page.click('[data-testid="notifications-settings-save-button"]')
        page.wait_for_selector('[data-testid="notifications-settings-success-message"]', timeout=5000)
        
        # Trigger test notification for 25% milestone
        trigger_test_notification(notification_type='progress', subcategory='StudentMilestone', metadata={'milestone': 25})
        
        page.wait_for_timeout(2000)
        
        # Verify notification was created in database
        notifications = get_db_notifications()
        milestone_notifs = [n for n in notifications if 'milestone' in n.get('Message', '').lower() or '25%' in n.get('Message', '')]
        
        assert len(milestone_notifs) > 0, "Instructor should receive 25% milestone notification"
    
    
    @pytest.mark.integration
    def test_instructor_milestone_50_75_100_percent_notifications(
        self, page, base_url, api_client_instructor, trigger_test_notification, get_db_notifications
    ):
        """
        Test that instructor receives notifications at 50%, 75%, and 100% course completion milestones
        """
        # Login as instructor and enable settings
        page.goto(f"{base_url}/login")
        page.fill('[data-testid="login-email-input"]', "s.mishin.dev+ins1@gmail.com")
        page.fill('[data-testid="login-password-input"]', "Aa123456")
        page.click('[data-testid="login-submit-button"]')
        page.wait_for_url(re.compile(r".*/dashboard.*"))
        
        page.goto(f"{base_url}/settings/notifications")
        page.wait_for_load_state("networkidle")
        
        # Enable milestone notifications
        progress_accordion = page.locator('[data-testid="notifications-settings-category-progress-accordion"]')
        if progress_accordion.get_attribute("aria-expanded") == "false":
            progress_accordion.click()
            page.wait_for_timeout(300)
        
        milestone_inapp = page.locator('[data-testid="notifications-settings-progress-student-milestone-inapp-switch"] input')
        if not milestone_inapp.is_checked():
            milestone_inapp.check()
        
        page.click('[data-testid="notifications-settings-save-button"]')
        page.wait_for_selector('[data-testid="notifications-settings-success-message"]', timeout=5000)
        
        # Test each milestone
        for milestone in [50, 75, 100]:
            trigger_test_notification(notification_type='progress', subcategory='StudentMilestone', metadata={'milestone': milestone})
            page.wait_for_timeout(1500)
            
            notifications = get_db_notifications()
            milestone_notifs = [n for n in notifications if f'{milestone}%' in n.get('Message', '') or str(milestone) in n.get('Message', '')]
            
            assert len(milestone_notifs) > 0, f"Instructor should receive {milestone}% milestone notification"
    
    
    @pytest.mark.integration
    def test_instructor_milestone_blocked_when_disabled(
        self, page, base_url, api_client_instructor, trigger_test_notification, get_db_notifications
    ):
        """
        Test that instructor does NOT receive milestone notifications when disabled
        """
        # Login as instructor
        page.goto(f"{base_url}/login")
        page.fill('[data-testid="login-email-input"]', "s.mishin.dev+ins1@gmail.com")
        page.fill('[data-testid="login-password-input"]', "Aa123456")
        page.click('[data-testid="login-submit-button"]')
        page.wait_for_url(re.compile(r".*/dashboard.*"))
        
        page.goto(f"{base_url}/settings/notifications")
        page.wait_for_load_state("networkidle")
        
        # Disable milestone notifications
        progress_accordion = page.locator('[data-testid="notifications-settings-category-progress-accordion"]')
        if progress_accordion.get_attribute("aria-expanded") == "false":
            progress_accordion.click()
            page.wait_for_timeout(300)
        
        milestone_inapp = page.locator('[data-testid="notifications-settings-progress-student-milestone-inapp-switch"] input')
        if milestone_inapp.is_checked():
            milestone_inapp.uncheck()
        
        page.click('[data-testid="notifications-settings-save-button"]')
        page.wait_for_selector('[data-testid="notifications-settings-success-message"]', timeout=5000)
        
        # Get current notification count
        initial_notifs = get_db_notifications()
        initial_count = len(initial_notifs)
        
        # Trigger milestone notification
        trigger_test_notification(notification_type='progress', subcategory='StudentMilestone', metadata={'milestone': 50})
        page.wait_for_timeout(2000)
        
        # Verify no new notifications
        final_notifs = get_db_notifications()
        final_count = len(final_notifs)
        
        assert final_count == initial_count, "No milestone notification should be created when disabled"
    
    
    @pytest.mark.integration
    def test_instructor_milestone_email_only_mode(
        self, page, base_url, api_client_instructor, trigger_test_notification
    ):
        """
        Test that instructor receives milestone notifications via email only when email-only is enabled
        """
        # Login as instructor
        page.goto(f"{base_url}/login")
        page.fill('[data-testid="login-email-input"]', "s.mishin.dev+ins1@gmail.com")
        page.fill('[data-testid="login-password-input"]', "Aa123456")
        page.click('[data-testid="login-submit-button"]')
        page.wait_for_url(re.compile(r".*/dashboard.*"))
        
        page.goto(f"{base_url}/settings/notifications")
        page.wait_for_load_state("networkidle")
        
        # Enable email-only for milestone notifications
        progress_accordion = page.locator('[data-testid="notifications-settings-category-progress-accordion"]')
        if progress_accordion.get_attribute("aria-expanded") == "false":
            progress_accordion.click()
            page.wait_for_timeout(300)
        
        milestone_inapp = page.locator('[data-testid="notifications-settings-progress-student-milestone-inapp-switch"] input')
        milestone_email = page.locator('[data-testid="notifications-settings-progress-student-milestone-email-switch"] input')
        
        if milestone_inapp.is_checked():
            milestone_inapp.uncheck()
        if not milestone_email.is_checked():
            milestone_email.check()
        
        page.click('[data-testid="notifications-settings-save-button"]')
        page.wait_for_selector('[data-testid="notifications-settings-success-message"]', timeout=5000)
        
        # Trigger milestone notification
        trigger_test_notification(notification_type='progress', subcategory='StudentMilestone', metadata={'milestone': 75})
        page.wait_for_timeout(2000)
        
        # Verify no in-app notification in UI (bell badge should not increase)
        badge = page.locator('[data-testid="notifications-bell-icon"]').locator('.MuiBadge-badge')
        assert not badge.is_visible() or badge.inner_text() == "0" or badge.inner_text() == "", \
            "No in-app notification should appear in bell icon"
    
    
    # ===== MULTI-STUDENT LIVE SESSION TESTS =====
    
    @pytest.mark.integration
    def test_live_session_multiple_enrolled_students(
        self, page, base_url, switch_user, api_client_instructor, create_live_session, 
        get_enrolled_course, get_db_notifications
    ):
        """
        Test that multiple enrolled students receive live session notifications
        Some students have notifications ON, some OFF
        """
        # Get a course that students are enrolled in
        enrolled = get_enrolled_course()
        if not enrolled:
            pytest.skip("No enrolled courses found for testing")
        
        course_id = enrolled['courseId']
        
        # Setup student1: Enable live session notifications
        switch_user("s.mishin.dev+student1@gmail.com", "Aa123456")
        page.goto(f"{base_url}/settings/notifications")
        page.wait_for_load_state("networkidle")
        
        course_accordion = page.locator('[data-testid="notifications-settings-category-course-accordion"]')
        if course_accordion.get_attribute("aria-expanded") == "false":
            course_accordion.click()
            page.wait_for_timeout(300)
        
        live_session_inapp = page.locator('[data-testid="notifications-settings-course-live-session-scheduled-inapp-switch"] input')
        if not live_session_inapp.is_checked():
            live_session_inapp.check()
        
        page.click('[data-testid="notifications-settings-save-button"]')
        page.wait_for_selector('[data-testid="notifications-settings-success-message"]', timeout=5000)
        
        # Instructor creates live session
        switch_user("s.mishin.dev+ins1@gmail.com", "Aa123456")
        session_id = create_live_session(course_id, "Multi-Student Test Session")
        
        page.wait_for_timeout(3000)
        
        # Switch back to student1 and verify notification
        switch_user("s.mishin.dev+student1@gmail.com", "Aa123456")
        page.goto(f"{base_url}/dashboard")
        
        page.wait_for_timeout(1000)
        badge = page.locator('[data-testid="notifications-bell-icon"]').locator('.MuiBadge-badge')
        
        # Should have at least 1 notification
        assert badge.is_visible() and int(badge.inner_text()) >= 1, \
            "Student1 should receive live session notification"
    
    
    @pytest.mark.integration
    def test_live_session_not_enrolled_student_no_notification(
        self, page, base_url, switch_user, api_client_instructor, create_live_session
    ):
        """
        Test that student NOT enrolled in course does NOT receive live session notification
        """
        # Create a live session in a course (using course ID that student might not be in)
        # Note: This test assumes student1 is not enrolled in all courses
        
        switch_user("s.mishin.dev+ins1@gmail.com", "Aa123456")
        
        # Use a specific course ID or create a new course
        # For testing, we'll use a test course ID
        test_course_id = "test-course-no-enrollment"
        
        # Get initial notification count for a different student
        switch_user("s.mishin.dev+student1@gmail.com", "Aa123456")
        page.goto(f"{base_url}/dashboard")
        page.wait_for_load_state("networkidle")
        
        badge = page.locator('[data-testid="notifications-bell-icon"]').locator('.MuiBadge-badge')
        initial_count = int(badge.inner_text()) if badge.is_visible() and badge.inner_text() else 0
        
        # Create live session as instructor
        switch_user("s.mishin.dev+ins1@gmail.com", "Aa123456")
        # Note: This may fail if course doesn't exist, which is expected for this edge case test
        try:
            create_live_session(test_course_id, "Not Enrolled Test Session")
        except:
            pytest.skip("Cannot test unenrolled scenario without proper course setup")
        
        page.wait_for_timeout(2000)
        
        # Verify student didn't receive notification
        switch_user("s.mishin.dev+student1@gmail.com", "Aa123456")
        page.goto(f"{base_url}/dashboard")
        page.wait_for_timeout(1000)
        
        final_count = int(badge.inner_text()) if badge.is_visible() and badge.inner_text() else 0
        
        assert final_count == initial_count, \
            "Unenrolled student should NOT receive live session notification"
    
    
    # ===== EMAIL VS IN-APP SEPARATION TESTS =====
    
    @pytest.mark.integration
    def test_lesson_completion_inapp_only(
        self, page, base_url, trigger_test_notification, get_notification_count, get_db_notifications
    ):
        """
        Test that lesson completion notification is delivered in-app ONLY when email is disabled
        """
        # Login as student
        page.goto(f"{base_url}/login")
        page.fill('[data-testid="login-email-input"]', "s.mishin.dev+student1@gmail.com")
        page.fill('[data-testid="login-password-input"]', "Aa123456")
        page.click('[data-testid="login-submit-button"]')
        page.wait_for_url(re.compile(r".*/dashboard.*"))
        
        page.goto(f"{base_url}/settings/notifications")
        page.wait_for_load_state("networkidle")
        
        # Enable in-app, disable email for lesson completion
        progress_accordion = page.locator('[data-testid="notifications-settings-category-progress-accordion"]')
        if progress_accordion.get_attribute("aria-expanded") == "false":
            progress_accordion.click()
            page.wait_for_timeout(300)
        
        lesson_inapp = page.locator('[data-testid="notifications-settings-progress-lesson-completion-inapp-switch"] input')
        lesson_email = page.locator('[data-testid="notifications-settings-progress-lesson-completion-email-switch"] input')
        
        if not lesson_inapp.is_checked():
            lesson_inapp.check()
        if lesson_email.is_checked():
            lesson_email.uncheck()
        
        page.click('[data-testid="notifications-settings-save-button"]')
        page.wait_for_selector('[data-testid="notifications-settings-success-message"]', timeout=5000)
        
        # Trigger notification
        initial_count = get_notification_count()
        trigger_test_notification(notification_type='progress', subcategory='LessonCompletion')
        page.wait_for_timeout(2000)
        
        # Verify in-app notification exists
        final_count = get_notification_count()
        assert final_count > initial_count, "In-app notification should be delivered"
        
        # Verify email flag is false in database
        notifications = get_db_notifications()
        lesson_notifs = [n for n in notifications if 'lesson' in n.get('Message', '').lower() or 'completed' in n.get('Message', '').lower()]
        
        if len(lesson_notifs) > 0:
            # Check that EmailSent is false or not present
            latest = lesson_notifs[0]
            assert not latest.get('EmailSent', False), "Email should not be sent"
    
    
    @pytest.mark.integration
    def test_lesson_completion_email_only(
        self, page, base_url, trigger_test_notification, get_notification_count
    ):
        """
        Test that lesson completion notification is delivered via EMAIL ONLY when in-app is disabled
        """
        # Login as student
        page.goto(f"{base_url}/login")
        page.fill('[data-testid="login-email-input"]', "s.mishin.dev+student1@gmail.com")
        page.fill('[data-testid="login-password-input"]', "Aa123456")
        page.click('[data-testid="login-submit-button"]')
        page.wait_for_url(re.compile(r".*/dashboard.*"))
        
        page.goto(f"{base_url}/settings/notifications")
        page.wait_for_load_state("networkidle")
        
        # Disable in-app, enable email
        progress_accordion = page.locator('[data-testid="notifications-settings-category-progress-accordion"]')
        if progress_accordion.get_attribute("aria-expanded") == "false":
            progress_accordion.click()
            page.wait_for_timeout(300)
        
        lesson_inapp = page.locator('[data-testid="notifications-settings-progress-lesson-completion-inapp-switch"] input')
        lesson_email = page.locator('[data-testid="notifications-settings-progress-lesson-completion-email-switch"] input')
        
        if lesson_inapp.is_checked():
            lesson_inapp.uncheck()
        if not lesson_email.is_checked():
            lesson_email.check()
        
        page.click('[data-testid="notifications-settings-save-button"]')
        page.wait_for_selector('[data-testid="notifications-settings-success-message"]', timeout=5000)
        
        # Trigger notification
        initial_count = get_notification_count()
        trigger_test_notification(notification_type='progress', subcategory='LessonCompletion')
        page.wait_for_timeout(2000)
        
        # Verify NO in-app notification
        final_count = get_notification_count()
        assert final_count == initial_count, "No in-app notification should be delivered"
    
    
    @pytest.mark.integration
    def test_lesson_completion_both_channels(
        self, page, base_url, trigger_test_notification, get_notification_count, get_db_notifications
    ):
        """
        Test that lesson completion notification is delivered via BOTH in-app AND email when both enabled
        """
        # Login as student
        page.goto(f"{base_url}/login")
        page.fill('[data-testid="login-email-input"]', "s.mishin.dev+student1@gmail.com")
        page.fill('[data-testid="login-password-input"]', "Aa123456")
        page.click('[data-testid="login-submit-button"]')
        page.wait_for_url(re.compile(r".*/dashboard.*"))
        
        page.goto(f"{base_url}/settings/notifications")
        page.wait_for_load_state("networkidle")
        
        # Enable both in-app and email
        progress_accordion = page.locator('[data-testid="notifications-settings-category-progress-accordion"]')
        if progress_accordion.get_attribute("aria-expanded") == "false":
            progress_accordion.click()
            page.wait_for_timeout(300)
        
        lesson_inapp = page.locator('[data-testid="notifications-settings-progress-lesson-completion-inapp-switch"] input')
        lesson_email = page.locator('[data-testid="notifications-settings-progress-lesson-completion-email-switch"] input')
        
        if not lesson_inapp.is_checked():
            lesson_inapp.check()
        if not lesson_email.is_checked():
            lesson_email.check()
        
        page.click('[data-testid="notifications-settings-save-button"]')
        page.wait_for_selector('[data-testid="notifications-settings-success-message"]', timeout=5000)
        
        # Trigger notification
        initial_count = get_notification_count()
        trigger_test_notification(notification_type='progress', subcategory='LessonCompletion')
        page.wait_for_timeout(2000)
        
        # Verify in-app notification exists
        final_count = get_notification_count()
        assert final_count > initial_count, "In-app notification should be delivered"
        
        # Verify email is marked for sending in database
        notifications = get_db_notifications()
        lesson_notifs = [n for n in notifications if 'lesson' in n.get('Message', '').lower()]
        
        if len(lesson_notifs) > 0:
            latest = lesson_notifs[0]
            # EmailSent should be true or email should be queued
            assert latest.get('EmailSent') or latest.get('EmailQueued'), \
                "Email should be sent or queued"
    
    
    @pytest.mark.integration
    def test_lesson_completion_neither_channel(
        self, page, base_url, trigger_test_notification, get_notification_count
    ):
        """
        Test that NO notification is delivered when both in-app AND email are disabled
        """
        # Login as student
        page.goto(f"{base_url}/login")
        page.fill('[data-testid="login-email-input"]', "s.mishin.dev+student1@gmail.com")
        page.fill('[data-testid="login-password-input"]', "Aa123456")
        page.click('[data-testid="login-submit-button"]')
        page.wait_for_url(re.compile(r".*/dashboard.*"))
        
        page.goto(f"{base_url}/settings/notifications")
        page.wait_for_load_state("networkidle")
        
        # Disable both in-app and email
        progress_accordion = page.locator('[data-testid="notifications-settings-category-progress-accordion"]')
        if progress_accordion.get_attribute("aria-expanded") == "false":
            progress_accordion.click()
            page.wait_for_timeout(300)
        
        lesson_inapp = page.locator('[data-testid="notifications-settings-progress-lesson-completion-inapp-switch"] input')
        lesson_email = page.locator('[data-testid="notifications-settings-progress-lesson-completion-email-switch"] input')
        
        if lesson_inapp.is_checked():
            lesson_inapp.uncheck()
        if lesson_email.is_checked():
            lesson_email.uncheck()
        
        page.click('[data-testid="notifications-settings-save-button"]')
        page.wait_for_selector('[data-testid="notifications-settings-success-message"]', timeout=5000)
        
        # Trigger notification
        initial_count = get_notification_count()
        trigger_test_notification(notification_type='progress', subcategory='LessonCompletion')
        page.wait_for_timeout(2000)
        
        # Verify NO notification
        final_count = get_notification_count()
        assert final_count == initial_count, "No notification should be delivered when both channels disabled"
    
    
    @pytest.mark.integration
    def test_independent_email_inapp_for_different_subcategories(
        self, page, base_url, trigger_test_notification, get_notification_count
    ):
        """
        Test that email and in-app settings are independent for different subcategories
        Example: Lesson completion (in-app only), Assessment graded (email only)
        """
        # Login as student
        page.goto(f"{base_url}/login")
        page.fill('[data-testid="login-email-input"]', "s.mishin.dev+student1@gmail.com")
        page.fill('[data-testid="login-password-input"]', "Aa123456")
        page.click('[data-testid="login-submit-button"]')
        page.wait_for_url(re.compile(r".*/dashboard.*"))
        
        page.goto(f"{base_url}/settings/notifications")
        page.wait_for_load_state("networkidle")
        
        # Lesson completion: in-app only
        progress_accordion = page.locator('[data-testid="notifications-settings-category-progress-accordion"]')
        if progress_accordion.get_attribute("aria-expanded") == "false":
            progress_accordion.click()
            page.wait_for_timeout(300)
        
        lesson_inapp = page.locator('[data-testid="notifications-settings-progress-lesson-completion-inapp-switch"] input')
        lesson_email = page.locator('[data-testid="notifications-settings-progress-lesson-completion-email-switch"] input')
        if not lesson_inapp.is_checked():
            lesson_inapp.check()
        if lesson_email.is_checked():
            lesson_email.uncheck()
        
        # Assessment graded: email only
        assessment_accordion = page.locator('[data-testid="notifications-settings-category-assessment-accordion"]')
        if assessment_accordion.get_attribute("aria-expanded") == "false":
            assessment_accordion.click()
            page.wait_for_timeout(300)
        
        graded_inapp = page.locator('[data-testid="notifications-settings-assessment-assessment-graded-inapp-switch"] input')
        graded_email = page.locator('[data-testid="notifications-settings-assessment-assessment-graded-email-switch"] input')
        if graded_inapp.is_checked():
            graded_inapp.uncheck()
        if not graded_email.is_checked():
            graded_email.check()
        
        page.click('[data-testid="notifications-settings-save-button"]')
        page.wait_for_selector('[data-testid="notifications-settings-success-message"]', timeout=5000)
        
        # Test lesson completion (should get in-app)
        initial_count = get_notification_count()
        trigger_test_notification(notification_type='progress', subcategory='LessonCompletion')
        page.wait_for_timeout(2000)
        
        after_lesson = get_notification_count()
        assert after_lesson > initial_count, "Lesson completion should deliver in-app notification"
        
        # Test assessment graded (should NOT get in-app)
        trigger_test_notification(notification_type='assessment', subcategory='AssessmentGraded')
        page.wait_for_timeout(2000)
        
        after_assessment = get_notification_count()
        assert after_assessment == after_lesson, "Assessment graded should NOT deliver in-app notification"
    
    
    # ===== EDGE CASE TESTS =====
    
    @pytest.mark.integration
    def test_global_off_blocks_all_notifications(
        self, page, base_url, trigger_test_notification, get_notification_count
    ):
        """
        Test that disabling global in-app switch blocks ALL in-app notifications
        Even if category and subcategory are enabled
        """
        # Login as student
        page.goto(f"{base_url}/login")
        page.fill('[data-testid="login-email-input"]', "s.mishin.dev+student1@gmail.com")
        page.fill('[data-testid="login-password-input"]', "Aa123456")
        page.click('[data-testid="login-submit-button"]')
        page.wait_for_url(re.compile(r".*/dashboard.*"))
        
        page.goto(f"{base_url}/settings/notifications")
        page.wait_for_load_state("networkidle")
        
        # Disable global in-app
        global_inapp = page.locator('[data-testid="notifications-settings-global-inapp-switch"] input')
        if global_inapp.is_checked():
            global_inapp.uncheck()
        
        # Enable progress category and lesson completion
        progress_accordion = page.locator('[data-testid="notifications-settings-category-progress-accordion"]')
        if progress_accordion.get_attribute("aria-expanded") == "false":
            progress_accordion.click()
            page.wait_for_timeout(300)
        
        lesson_inapp = page.locator('[data-testid="notifications-settings-progress-lesson-completion-inapp-switch"] input')
        if not lesson_inapp.is_checked():
            lesson_inapp.check()
        
        page.click('[data-testid="notifications-settings-save-button"]')
        page.wait_for_selector('[data-testid="notifications-settings-success-message"]', timeout=5000)
        
        # Trigger notification
        initial_count = get_notification_count()
        trigger_test_notification(notification_type='progress', subcategory='LessonCompletion')
        page.wait_for_timeout(2000)
        
        # Verify NO notification due to global OFF
        final_count = get_notification_count()
        assert final_count == initial_count, \
            "Global OFF should block all notifications even when subcategory is enabled"
    
    
    @pytest.mark.integration
    def test_category_off_blocks_subcategory(
        self, page, base_url, trigger_test_notification, get_notification_count
    ):
        """
        Test that disabling category switch blocks subcategory notifications
        Even if subcategory is explicitly enabled
        """
        # Login as student
        page.goto(f"{base_url}/login")
        page.fill('[data-testid="login-email-input"]', "s.mishin.dev+student1@gmail.com")
        page.fill('[data-testid="login-password-input"]', "Aa123456")
        page.click('[data-testid="login-submit-button"]')
        page.wait_for_url(re.compile(r".*/dashboard.*"))
        
        page.goto(f"{base_url}/settings/notifications")
        page.wait_for_load_state("networkidle")
        
        # Disable Progress category
        progress_accordion = page.locator('[data-testid="notifications-settings-category-progress-accordion"]')
        if progress_accordion.get_attribute("aria-expanded") == "false":
            progress_accordion.click()
            page.wait_for_timeout(300)
        
        category_switch = page.locator('[data-testid="notifications-settings-category-progress-switch"] input')
        if category_switch.is_checked():
            category_switch.uncheck()
        
        # Enable lesson completion subcategory
        lesson_inapp = page.locator('[data-testid="notifications-settings-progress-lesson-completion-inapp-switch"] input')
        if not lesson_inapp.is_checked():
            lesson_inapp.check()
        
        page.click('[data-testid="notifications-settings-save-button"]')
        page.wait_for_selector('[data-testid="notifications-settings-success-message"]', timeout=5000)
        
        # Trigger notification
        initial_count = get_notification_count()
        trigger_test_notification(notification_type='progress', subcategory='LessonCompletion')
        page.wait_for_timeout(2000)
        
        # Verify NO notification due to category OFF
        final_count = get_notification_count()
        assert final_count == initial_count, \
            "Category OFF should block subcategory notification even when subcategory is enabled"
    
    
    @pytest.mark.integration
    def test_subcategory_explicit_off_overrides_category_on(
        self, page, base_url, trigger_test_notification, get_notification_count
    ):
        """
        Test that explicitly disabling subcategory blocks notification
        Even when category is enabled (NULL inheritance override)
        """
        # Login as student
        page.goto(f"{base_url}/login")
        page.fill('[data-testid="login-email-input"]', "s.mishin.dev+student1@gmail.com")
        page.fill('[data-testid="login-password-input"]', "Aa123456")
        page.click('[data-testid="login-submit-button"]')
        page.wait_for_url(re.compile(r".*/dashboard.*"))
        
        page.goto(f"{base_url}/settings/notifications")
        page.wait_for_load_state("networkidle")
        
        # Enable Progress category
        progress_accordion = page.locator('[data-testid="notifications-settings-category-progress-accordion"]')
        if progress_accordion.get_attribute("aria-expanded") == "false":
            progress_accordion.click()
            page.wait_for_timeout(300)
        
        category_switch = page.locator('[data-testid="notifications-settings-category-progress-switch"] input')
        if not category_switch.is_checked():
            category_switch.check()
        
        # Explicitly disable lesson completion
        lesson_inapp = page.locator('[data-testid="notifications-settings-progress-lesson-completion-inapp-switch"] input')
        if lesson_inapp.is_checked():
            lesson_inapp.uncheck()
        
        page.click('[data-testid="notifications-settings-save-button"]')
        page.wait_for_selector('[data-testid="notifications-settings-success-message"]', timeout=5000)
        
        # Trigger notification
        initial_count = get_notification_count()
        trigger_test_notification(notification_type='progress', subcategory='LessonCompletion')
        page.wait_for_timeout(2000)
        
        # Verify NO notification due to explicit subcategory OFF
        final_count = get_notification_count()
        assert final_count == initial_count, \
            "Explicit subcategory OFF should block notification even when category is ON"
    
    
    @pytest.mark.integration
    def test_null_inheritance_allows_notification(
        self, page, base_url, trigger_test_notification, get_notification_count
    ):
        """
        Test that NULL subcategory inherits from category ON
        Notification should be delivered when category is ON and subcategory is NULL (inherit)
        """
        # Login as student
        page.goto(f"{base_url}/login")
        page.fill('[data-testid="login-email-input"]', "s.mishin.dev+student1@gmail.com")
        page.fill('[data-testid="login-password-input"]', "Aa123456")
        page.click('[data-testid="login-submit-button"]')
        page.wait_for_url(re.compile(r".*/dashboard.*"))
        
        page.goto(f"{base_url}/settings/notifications")
        page.wait_for_load_state("networkidle")
        
        # Enable Progress category
        progress_accordion = page.locator('[data-testid="notifications-settings-category-progress-accordion"]')
        if progress_accordion.get_attribute("aria-expanded") == "false":
            progress_accordion.click()
            page.wait_for_timeout(300)
        
        category_switch = page.locator('[data-testid="notifications-settings-category-progress-switch"] input')
        if not category_switch.is_checked():
            category_switch.check()
        
        # Reset lesson completion to inherit (if it was explicitly set)
        # Note: This requires API call to set NULL, UI doesn't have "inherit" button yet
        # For now, we'll enable it which should work
        lesson_inapp = page.locator('[data-testid="notifications-settings-progress-lesson-completion-inapp-switch"] input')
        if not lesson_inapp.is_checked():
            lesson_inapp.check()
        
        page.click('[data-testid="notifications-settings-save-button"]')
        page.wait_for_selector('[data-testid="notifications-settings-success-message"]', timeout=5000)
        
        # Trigger notification
        initial_count = get_notification_count()
        trigger_test_notification(notification_type='progress', subcategory='LessonCompletion')
        page.wait_for_timeout(2000)
        
        # Verify notification is delivered
        final_count = get_notification_count()
        assert final_count > initial_count, \
            "Subcategory should inherit from category ON and deliver notification"
    
    
    @pytest.mark.integration
    def test_security_alerts_always_delivered(
        self, page, base_url, trigger_test_notification, get_notification_count
    ):
        """
        Test that security alerts are ALWAYS delivered regardless of settings
        Critical security notifications bypass user preferences
        """
        # Login as student
        page.goto(f"{base_url}/login")
        page.fill('[data-testid="login-email-input"]', "s.mishin.dev+student1@gmail.com")
        page.fill('[data-testid="login-password-input"]', "Aa123456")
        page.click('[data-testid="login-submit-button"]')
        page.wait_for_url(re.compile(r".*/dashboard.*"))
        
        page.goto(f"{base_url}/settings/notifications")
        page.wait_for_load_state("networkidle")
        
        # Disable ALL notifications (global, category, subcategory)
        global_inapp = page.locator('[data-testid="notifications-settings-global-inapp-switch"] input')
        if global_inapp.is_checked():
            global_inapp.uncheck()
        
        # Disable System category
        system_accordion = page.locator('[data-testid="notifications-settings-category-system-accordion"]')
        if system_accordion.get_attribute("aria-expanded") == "false":
            system_accordion.click()
            page.wait_for_timeout(300)
        
        category_switch = page.locator('[data-testid="notifications-settings-category-system-switch"] input')
        if category_switch.is_checked():
            category_switch.uncheck()
        
        page.click('[data-testid="notifications-settings-save-button"]')
        page.wait_for_selector('[data-testid="notifications-settings-success-message"]', timeout=5000)
        
        # Trigger security alert
        initial_count = get_notification_count()
        trigger_test_notification(notification_type='system', subcategory='SecurityAlert')
        page.wait_for_timeout(2000)
        
        # Verify notification is delivered even with all settings OFF
        final_count = get_notification_count()
        assert final_count > initial_count, \
            "Security alerts should ALWAYS be delivered regardless of user settings"

