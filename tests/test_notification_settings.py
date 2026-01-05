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
            in_app_switch = page.locator('[data-testid="notifications-settings-enable-in-app-switch"]')
            email_switch = page.locator('[data-testid="notifications-settings-enable-email-switch"]')
            
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
        in_app_switch = page.locator('[data-testid="notifications-settings-enable-in-app-switch"]')
        
        # Initially should be checked
        assert in_app_switch.is_checked()
        
        # Turn OFF
        in_app_switch.uncheck()
        assert not in_app_switch.is_checked()
        
        # Save settings
        page.click('[data-testid="notifications-settings-save-button"]')
        
        # Wait for toast message
        expect(page.locator('text="Notification settings saved!"')).to_be_visible(timeout=5000)
        
        # Reload page and verify persisted
        page.reload()
        page.wait_for_load_state("networkidle")
        page.wait_for_selector('[data-testid="notifications-settings-enable-in-app-switch"]', state='visible')
        
        in_app_switch_after = page.locator('[data-testid="notifications-settings-enable-in-app-switch"]')
        assert not in_app_switch_after.is_checked()

    @pytest.mark.smoke
    def test_global_email_toggle(self, page: Page):
        """Test global email notifications toggle"""
        email_switch = page.locator('[data-testid="notifications-settings-enable-email-switch"]')
        
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
        email_switch = page.locator('[data-testid="notifications-settings-enable-email-switch"]')
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
        expect(page.locator('[data-testid="notifications-settings-course-course-enrollment-inapp-switch"]')).to_be_visible()

    def test_category_switch_updates_chip(self, page: Page):
        """Test category switch updates the status chip"""
        # Expand Progress accordion (should be default expanded)
        progress_accordion = page.locator('[data-testid="notifications-settings-category-progress-accordion"]')
        progress_chip = progress_accordion.locator('text=/Enabled|Disabled/')
        
        # Initially should show "Enabled"
        expect(progress_chip).to_have_text('Enabled')
        
        # Turn OFF category
        progress_switch = page.locator('[data-testid="notifications-settings-category-progress-switch"]')
        progress_switch.uncheck()
        
        # Chip should update to "Disabled"
        expect(progress_chip).to_have_text('Disabled')

    # ================================================================
    # CATEGORY TOGGLE TESTS
    # ================================================================

    def test_progress_category_toggle(self, page: Page):
        """Test Progress Updates category toggle"""
        progress_switch = page.locator('[data-testid="notifications-settings-category-progress-switch"]')
        
        # Initially ON
        assert progress_switch.is_checked()
        
        # Turn OFF
        progress_switch.uncheck()
        
        # Save
        page.click('[data-testid="notifications-settings-save-button"]')
        expect(page.locator('text="Notification settings saved!"')).to_be_visible(timeout=5000)
        
        # Reload and verify
        page.reload()
        page.wait_for_load_state("networkidle")
        progress_switch_after = page.locator('[data-testid="notifications-settings-category-progress-switch"]')
        assert not progress_switch_after.is_checked()

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
            switch = page.locator(f'[data-testid="{testid}"]')
            if switch.is_checked():
                switch.uncheck()
        
        # Save
        page.click('[data-testid="notifications-settings-save-button"]')
        expect(page.locator('text="Notification settings saved!"')).to_be_visible(timeout=5000)
        
        # Reload and verify all OFF
        page.reload()
        page.wait_for_load_state("networkidle")
        
        for name, testid in categories:
            switch = page.locator(f'[data-testid="{testid}"]')
            assert not switch.is_checked(), f"{name} category should be OFF"

    # ================================================================
    # SUBCATEGORY TOGGLE TESTS
    # ================================================================

    def test_lesson_completion_subcategory_toggles(self, page: Page):
        """Test Lesson Completion in-app and email toggles"""
        # Progress accordion should be expanded by default
        
        # Find lesson completion switches
        lesson_inapp = page.locator('[data-testid="notifications-settings-progress-lesson-completion-inapp-switch"]')
        lesson_email = page.locator('[data-testid="notifications-settings-progress-lesson-completion-email-switch"]')
        
        # Initially both should be checked (or inherit as ON)
        assert lesson_inapp.is_checked()
        assert lesson_email.is_checked()
        
        # Turn OFF in-app only
        lesson_inapp.uncheck()
        assert not lesson_inapp.is_checked()
        assert lesson_email.is_checked()  # Email still ON
        
        # Save
        page.click('[data-testid="notifications-settings-save-button"]')
        expect(page.locator('text="Notification settings saved!"')).to_be_visible(timeout=5000)
        
        # Reload and verify
        page.reload()
        page.wait_for_load_state("networkidle")
        
        lesson_inapp_after = page.locator('[data-testid="notifications-settings-progress-lesson-completion-inapp-switch"]')
        lesson_email_after = page.locator('[data-testid="notifications-settings-progress-lesson-completion-email-switch"]')
        
        assert not lesson_inapp_after.is_checked()
        assert lesson_email_after.is_checked()

    def test_live_sessions_subcategory_toggles(self, page: Page):
        """Test Live Sessions in-app and email toggles"""
        # Expand Course accordion
        course_summary = page.locator('[data-testid="notifications-settings-category-course-accordion-summary"]')
        course_summary.click()
        page.wait_for_timeout(500)
        
        # Find live sessions switches
        live_inapp = page.locator('[data-testid="notifications-settings-course-live-sessions-inapp-switch"]')
        live_email = page.locator('[data-testid="notifications-settings-course-live-sessions-email-switch"]')
        
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
        
        live_inapp_after = page.locator('[data-testid="notifications-settings-course-live-sessions-inapp-switch"]')
        live_email_after = page.locator('[data-testid="notifications-settings-course-live-sessions-email-switch"]')
        
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
        progress_switch = page.locator('[data-testid="notifications-settings-category-progress-switch"]')
        progress_switch.uncheck()
        
        # Check that lesson completion switches show "Inherit: OFF"
        # Note: The switches themselves will appear unchecked because they inherit the OFF state
        lesson_inapp = page.locator('[data-testid="notifications-settings-progress-lesson-completion-inapp-switch"]')
        
        # The switch should appear unchecked (inheriting category OFF state)
        assert not lesson_inapp.is_checked()
        
        # Check for inherit text (appears when subcategory is NULL)
        expect(page.locator('text=/Inherit: OFF/i')).to_be_visible()
        
        # Now turn category back ON
        progress_switch.check()
        
        # Subcategories should now show as checked (inheriting ON)
        assert lesson_inapp.is_checked()
        expect(page.locator('text=/Inherit: ON/i')).to_be_visible()

    def test_explicit_override_vs_inherit(self, page: Page):
        """
        Test that explicit ON/OFF overrides inheritance
        """
        # Progress accordion expanded by default
        
        # Turn category OFF
        progress_switch = page.locator('[data-testid="notifications-settings-category-progress-switch"]')
        progress_switch.uncheck()
        
        # Lesson completion should inherit OFF
        lesson_inapp = page.locator('[data-testid="notifications-settings-progress-lesson-completion-inapp-switch"]')
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

    @pytest.mark.integration
    def test_lesson_completion_notification_when_enabled(
        self, 
        page: Page, 
        base_url: str, 
        trigger_test_notification,
        get_notification_count,
        wait_for_notification,
        clear_notifications
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
        progress_switch = page.locator('[data-testid="notifications-settings-category-progress-switch"]')
        lesson_inapp = page.locator('[data-testid="notifications-settings-progress-lesson-completion-inapp-switch"]')
        
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
        
        # Wait for notification to appear
        notification_received = wait_for_notification(timeout_ms=5000, expected_increase=1)
        assert notification_received, "Notification did not appear in bell"
        
        # Verify count increased
        final_count = get_notification_count()
        assert final_count == initial_count + 1, f"Expected {initial_count + 1} notifications, got {final_count}"
        
        # Click bell to verify notification content
        page.click('[data-testid="notification-bell-button"]')
        page.wait_for_timeout(500)
        
        # Should see notification about lesson completion
        expect(page.locator('text=/Lesson|Progress|Completed/i')).to_be_visible()

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
        progress_switch = page.locator('[data-testid="notifications-settings-category-progress-switch"]')
        lesson_inapp = page.locator('[data-testid="notifications-settings-progress-lesson-completion-inapp-switch"]')
        
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
        wait_for_notification,
        clear_notifications
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
        course_switch = page.locator('[data-testid="notifications-settings-category-course-switch"]')
        live_inapp = page.locator('[data-testid="notifications-settings-course-live-sessions-inapp-switch"]')
        
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
        
        # Wait for notification
        notification_received = wait_for_notification(timeout_ms=5000, expected_increase=1)
        assert notification_received, "Live session notification did not appear"
        
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
        live_inapp = page.locator('[data-testid="notifications-settings-course-live-sessions-inapp-switch"]')
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
        in_app_switch = page.locator('[data-testid="notifications-settings-enable-in-app-switch"]')
        email_switch = page.locator('[data-testid="notifications-settings-enable-email-switch"]')
        
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
        security_inapp = page.locator('[data-testid="notifications-settings-system-security-alerts-inapp-switch"]')
        security_email = page.locator('[data-testid="notifications-settings-system-security-alerts-email-switch"]')
        
        # Verify disabled state
        assert security_inapp.is_disabled()
        assert security_email.is_disabled()

    def test_multiple_changes_before_save(self, page: Page):
        """Test making multiple changes before saving"""
        # Change global settings
        email_switch = page.locator('[data-testid="notifications-settings-enable-email-switch"]')
        email_switch.uncheck()
        
        # Change category
        progress_switch = page.locator('[data-testid="notifications-settings-category-progress-switch"]')
        progress_switch.uncheck()
        
        # Change subcategory
        # Expand Course accordion
        course_summary = page.locator('[data-testid="notifications-settings-category-course-accordion-summary"]')
        course_summary.click()
        page.wait_for_timeout(500)
        
        live_inapp = page.locator('[data-testid="notifications-settings-course-live-sessions-inapp-switch"]')
        live_inapp.uncheck()
        
        # Save all at once
        page.click('[data-testid="notifications-settings-save-button"]')
        expect(page.locator('text="Notification settings saved!"')).to_be_visible(timeout=5000)
        
        # Reload and verify all changes persisted
        page.reload()
        page.wait_for_load_state("networkidle")
        
        email_after = page.locator('[data-testid="notifications-settings-enable-email-switch"]')
        progress_after = page.locator('[data-testid="notifications-settings-category-progress-switch"]')
        
        assert not email_after.is_checked()
        assert not progress_after.is_checked()


class TestNotificationSettingsWithAPI:
    """
    Advanced integration tests that use API calls to trigger notifications
    and verify settings enforcement
    """
    
    # TODO: Implement API-based tests that:
    # 1. Call /api/progress/complete-lesson with different notification settings
    # 2. Call /api/live-sessions/create with different notification settings
    # 3. Verify notifications in database
    # 4. Verify emails sent/not sent
    # 5. Test all subcategories (50+ combinations)
    
    pass
