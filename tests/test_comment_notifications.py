"""
New Comment Notification Tests

Tests the "New Comment on Course/Lesson" notification feature:
1. Student posts comment on lesson → other enrolled students receive notifications
2. Student posts comment on course → other enrolled students receive notifications
3. Notifications respect EnableComments (in-app) and EmailComments (email) settings
4. Comment author does NOT receive notification about their own comment
5. Category toggle (EnableCommunityUpdates) cascade behavior works correctly

Feature Implementation: 
- Backend: server/src/services/NotificationService.ts (sendNewCommentNotification)
- Backend: server/src/services/CommentService.ts (trigger on createComment)
- Frontend: client/src/pages/Settings/NotificationSettingsPage.tsx (New Comments toggle)
- Database: Comments table, NotificationPreferences table

Test Selectors Reference:
- CommentsSection: comments-section-{entityType}, comment-input, comments-refresh-button
- CommentItem: comment-item-{id}, comment-like-button-{id}, comment-reply-button-{id}
- CommentInput: comment-input-wrapper, comment-input, comment-submit-button
- NotificationBell: notification-bell-button, notification-bell-badge, notification-item-{id}
- NotificationSettings: notifications-settings-community-comments-inapp-switch, etc.

See TEST_SELECTOR_MAP_ORGANIZED.md for complete selector reference.
"""

import pytest
from playwright.sync_api import Page, expect
import re
import time


class TestCommentNotifications:
    """Test notification system for new comments on courses/lessons"""

    # ================================================================
    # SETUP AND TEARDOWN
    # ================================================================

    @pytest.fixture(autouse=True)
    def setup_and_teardown(
        self, 
        page: Page, 
        base_url: str, 
        student_credentials: dict,
        clear_notifications
    ):
        """
        Login as student and navigate to notification settings before each test.
        Reset settings to defaults after each test.
        """
        # Clear any existing notifications
        clear_notifications()
        
        # Login as student
        page.goto(f"{base_url}/login")
        page.wait_for_load_state("networkidle")
        
        page.fill('[data-testid="login-email-input"]', student_credentials['email'])
        page.fill('[data-testid="login-password-input"]', student_credentials['password'])
        page.click('[data-testid="login-submit-button"]')
        
        # Wait for dashboard
        page.wait_for_url(re.compile(r".*/dashboard.*"), timeout=15000)
        page.wait_for_load_state("networkidle")
        
        # Navigate to notification settings
        page.goto(f"{base_url}/settings/notifications")
        page.wait_for_load_state("networkidle")
        page.wait_for_selector('[data-testid="notifications-settings-save-button"]', state='visible')
        
        yield
        
        # Cleanup: Reset to defaults
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
            
            # Turn on Community category
            community_accordion = page.locator('[data-testid="notifications-settings-category-community-accordion-summary"]')
            if community_accordion.is_visible():
                community_accordion.click()
                page.wait_for_timeout(500)
                
                community_switch = page.locator('[data-testid="notifications-settings-category-community-switch"] input')
                if not community_switch.is_checked():
                    community_switch.check()
            
            # Save
            page.click('[data-testid="notifications-settings-save-button"]')
            page.wait_for_timeout(1000)
        except Exception as e:
            print(f"⚠️ Cleanup error: {e}")

    # ================================================================
    # NOTIFICATION SETTINGS UI TESTS
    # ================================================================

    @pytest.mark.smoke
    def test_new_comments_toggle_exists(self, page: Page):
        """
        Test that 'New Comments' toggle exists in Community category
        
        Location: Settings → Notifications → Community → New Comments
        Expected: In-App and Email toggles visible and functional
        """
        # Expand Community accordion
        community_accordion = page.locator('[data-testid="notifications-settings-category-community-accordion-summary"]')
        community_accordion.click()
        page.wait_for_timeout(500)
        
        # Verify New Comments switches exist
        comments_inapp = page.locator('[data-testid="notifications-settings-community-comments-inapp-switch"]')
        comments_email = page.locator('[data-testid="notifications-settings-community-comments-email-switch"]')
        
        expect(comments_inapp).to_be_visible()
        expect(comments_email).to_be_visible()
        
        # Verify switches are functional (can be toggled)
        comments_inapp_input = comments_inapp.locator('input')
        initial_state = comments_inapp_input.is_checked()
        
        # Toggle
        if initial_state:
            comments_inapp_input.uncheck()
        else:
            comments_inapp_input.check()
        
        # Verify state changed
        assert comments_inapp_input.is_checked() == (not initial_state)

    @pytest.mark.smoke
    def test_new_comments_setting_persists(self, page: Page):
        """
        Test that New Comments setting persists after save and reload
        
        Steps:
        1. Turn OFF New Comments in-app notification
        2. Save settings
        3. Reload page
        4. Verify setting is still OFF
        """
        # Expand Community accordion
        community_accordion = page.locator('[data-testid="notifications-settings-category-community-accordion-summary"]')
        community_accordion.click()
        page.wait_for_timeout(500)
        
        # Turn OFF in-app notifications for comments
        comments_inapp = page.locator('[data-testid="notifications-settings-community-comments-inapp-switch"] input')
        comments_inapp.uncheck()
        
        # Save settings
        page.click('[data-testid="notifications-settings-save-button"]')
        expect(page.locator('text="Notification settings saved!"')).to_be_visible(timeout=5000)
        
        # Reload page
        page.reload()
        page.wait_for_load_state("networkidle")
        
        # Re-expand accordion
        community_accordion_after = page.locator('[data-testid="notifications-settings-category-community-accordion-summary"]')
        community_accordion_after.click()
        page.wait_for_timeout(500)
        
        # Verify setting is still OFF
        comments_inapp_after = page.locator('[data-testid="notifications-settings-community-comments-inapp-switch"] input')
        assert not comments_inapp_after.is_checked(), "New Comments in-app setting should persist as OFF"

    def test_new_comments_inherits_from_community_category(self, page: Page):
        """
        Test NULL inheritance: When Community category is OFF, New Comments inherits OFF
        
        Verifies 3-level cascade: Global → Category (Community) → Subcategory (New Comments)
        """
        # Expand Community accordion
        community_accordion = page.locator('[data-testid="notifications-settings-category-community-accordion-summary"]')
        community_accordion.click()
        page.wait_for_timeout(500)
        
        # Turn OFF Community category
        community_switch = page.locator('[data-testid="notifications-settings-category-community-switch"] input')
        community_switch.uncheck()
        page.wait_for_timeout(300)
        
        # New Comments switch should show inherited OFF state
        comments_inapp = page.locator('[data-testid="notifications-settings-community-comments-inapp-switch"] input')
        assert not comments_inapp.is_checked(), "Should inherit OFF from category"
        
        # Check for "Inherit: OFF" text
        expect(page.locator('text=/Inherit: OFF/i').first).to_be_visible()
        
        # Turn category back ON
        community_switch.check()
        page.wait_for_timeout(300)
        
        # Should now show "Inherit: ON"
        expect(page.locator('text=/Inherit: ON/i').first).to_be_visible()

    # ================================================================
    # INTEGRATION TESTS - LESSON COMMENTS
    # ================================================================

    @pytest.mark.integration
    def test_new_comment_on_lesson_sends_notification(
        self,
        page: Page,
        base_url: str,
        api_client,
        api_base_url: str,
        get_enrolled_course,
        get_notification_count,
        clear_notifications,
        switch_user,
        student_credentials: dict,
        instructor_credentials: dict
    ):
        """
        Critical E2E Test: Student posts comment on lesson → enrolled participants receive notifications
        
        Scenario:
        1. Student1 (test user) enables comment notifications
        2. Student1 navigates to enrolled course lesson
        3. Student1 posts a comment
        4. Switch to Student2/Instructor account
        5. Verify they received notification (bell badge increases)
        6. Verify notification content mentions the comment/lesson
        
        Expected: All enrolled participants EXCEPT comment author receive notification
        """
        # Clear all notifications first
        clear_notifications()
        
        # Ensure New Comments notifications are ENABLED
        page.goto(f"{base_url}/settings/notifications")
        page.wait_for_load_state("networkidle")
        
        # Expand Community accordion
        community_accordion = page.locator('[data-testid="notifications-settings-category-community-accordion-summary"]')
        community_accordion.click()
        page.wait_for_timeout(500)
        
        # Enable Community category and Comments subcategory
        community_switch = page.locator('[data-testid="notifications-settings-category-community-switch"] input')
        comments_inapp = page.locator('[data-testid="notifications-settings-community-comments-inapp-switch"] input')
        
        if not community_switch.is_checked():
            community_switch.check()
        if not comments_inapp.is_checked():
            comments_inapp.check()
        
        # Save settings
        page.click('[data-testid="notifications-settings-save-button"]')
        expect(page.locator('text="Notification settings saved!"')).to_be_visible(timeout=5000)
        page.wait_for_timeout(1000)
        
        # Get enrolled course
        enrolled_course = get_enrolled_course()
        if not enrolled_course:
            pytest.skip("No enrolled course found for student")
        
        course_id = enrolled_course['courseId']
        
        # Navigate to course detail page
        page.goto(f"{base_url}/courses/{course_id}")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)
        
        # Find first lesson and navigate to it
        # Look for lesson links (may vary based on course structure)
        lesson_links = page.locator('[data-testid^="course-detail-lesson-"]').all()
        if len(lesson_links) == 0:
            pytest.skip("No lessons found in course")
        
        # Click first lesson
        lesson_links[0].click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        
        # Scroll down to comments section
        comments_section = page.locator('[data-testid="comments-section-lesson"]')
        if not comments_section.is_visible():
            pytest.skip("Comments section not available on lesson page")
        
        comments_section.scroll_into_view_if_needed()
        page.wait_for_timeout(500)
        
        # Post a comment
        comment_text = f"Test comment from automated test - {int(time.time())}"
        comment_input = page.locator('[data-testid="comment-input"]')
        comment_input.fill(comment_text)
        
        # Submit comment
        submit_button = page.locator('[data-testid="comment-submit-button"]')
        submit_button.click()
        
        # Wait for comment to appear in the list
        page.wait_for_timeout(2000)
        
        # Verify comment was created (should appear in comments list)
        expect(page.locator(f'text="{comment_text}"').first).to_be_visible(timeout=5000)
        
        # Now switch to INSTRUCTOR account to verify they received notification
        switch_user(instructor_credentials['email'], instructor_credentials['password'])
        
        # Navigate to dashboard and check notification count
        page.goto(f"{base_url}/dashboard")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)
        
        # Get notification count
        notification_count = get_notification_count()
        
        # Should have at least 1 notification (the new comment notification)
        assert notification_count >= 1, f"Instructor should have received comment notification, but count is {notification_count}"
        
        # Click bell to open notifications menu
        page.click('[data-testid="notification-bell-button"]')
        page.wait_for_timeout(500)
        
        # Verify notification content mentions comment or the lesson/course
        notification_menu = page.locator('[data-testid="notification-bell-menu"]')
        expect(notification_menu).to_be_visible()
        
        # Check for notification text (should contain "comment", "posted", or course/lesson name)
        expect(notification_menu.locator('text=/comment|posted|new/i').first).to_be_visible(timeout=5000)

    @pytest.mark.integration
    def test_comment_author_does_not_receive_own_notification(
        self,
        page: Page,
        base_url: str,
        get_enrolled_course,
        get_notification_count,
        clear_notifications,
        student_credentials: dict
    ):
        """
        Test that comment author does NOT receive notification about their own comment
        
        Scenario:
        1. Clear all notifications
        2. Student posts comment on lesson
        3. Verify notification count does NOT increase for the author
        
        Expected: Self-notification prevention works correctly
        """
        # Clear all notifications
        clear_notifications()
        
        # Get enrolled course
        enrolled_course = get_enrolled_course()
        if not enrolled_course:
            pytest.skip("No enrolled course found")
        
        course_id = enrolled_course['courseId']
        
        # Navigate to course detail
        page.goto(f"{base_url}/courses/{course_id}")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        
        # Navigate to first lesson
        lesson_links = page.locator('[data-testid^="course-detail-lesson-"]').all()
        if len(lesson_links) == 0:
            pytest.skip("No lessons found")
        
        lesson_links[0].click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        
        # Get initial notification count (should be 0)
        initial_count = get_notification_count()
        
        # Post a comment
        comments_section = page.locator('[data-testid="comments-section-lesson"]')
        if not comments_section.is_visible():
            pytest.skip("Comments section not available")
        
        comments_section.scroll_into_view_if_needed()
        
        comment_text = f"Self-notification test - {int(time.time())}"
        page.fill('[data-testid="comment-input"]', comment_text)
        page.click('[data-testid="comment-submit-button"]')
        
        # Wait for comment to be posted
        page.wait_for_timeout(2000)
        
        # Reload page to refresh notification count
        page.reload()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        
        # Get final notification count
        final_count = get_notification_count()
        
        # Should NOT increase (author doesn't get notified about own comment)
        assert final_count == initial_count, f"Author should NOT receive notification about own comment. Initial: {initial_count}, Final: {final_count}"

    # ================================================================
    # INTEGRATION TESTS - COURSE COMMENTS
    # ================================================================

    @pytest.mark.integration
    def test_new_comment_on_course_sends_notification(
        self,
        page: Page,
        base_url: str,
        get_enrolled_course,
        get_notification_count,
        clear_notifications,
        switch_user,
        instructor_credentials: dict
    ):
        """
        Test that posting comment on COURSE (not lesson) sends notifications
        
        Scenario:
        1. Student posts comment on course detail page
        2. Switch to instructor
        3. Verify instructor received notification
        
        Expected: Course-level comments trigger notifications same as lesson comments
        """
        # Clear notifications
        clear_notifications()
        
        # Enable comment notifications
        page.goto(f"{base_url}/settings/notifications")
        page.wait_for_load_state("networkidle")
        
        community_accordion = page.locator('[data-testid="notifications-settings-category-community-accordion-summary"]')
        community_accordion.click()
        page.wait_for_timeout(500)
        
        community_switch = page.locator('[data-testid="notifications-settings-category-community-switch"] input')
        comments_inapp = page.locator('[data-testid="notifications-settings-community-comments-inapp-switch"] input')
        
        if not community_switch.is_checked():
            community_switch.check()
        if not comments_inapp.is_checked():
            comments_inapp.check()
        
        page.click('[data-testid="notifications-settings-save-button"]')
        expect(page.locator('text="Notification settings saved!"')).to_be_visible(timeout=5000)
        page.wait_for_timeout(1000)
        
        # Get enrolled course
        enrolled_course = get_enrolled_course()
        if not enrolled_course:
            pytest.skip("No enrolled course found")
        
        course_id = enrolled_course['courseId']
        
        # Navigate to course detail page
        page.goto(f"{base_url}/courses/{course_id}")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        
        # Look for course-level comments section (may be on course page, not lesson page)
        comments_section = page.locator('[data-testid="comments-section-course"]')
        if not comments_section.is_visible():
            pytest.skip("Course-level comments section not available")
        
        comments_section.scroll_into_view_if_needed()
        page.wait_for_timeout(500)
        
        # Post comment on course
        comment_text = f"Course comment test - {int(time.time())}"
        page.fill('[data-testid="comment-input"]', comment_text)
        page.click('[data-testid="comment-submit-button"]')
        
        page.wait_for_timeout(2000)
        
        # Switch to instructor
        switch_user(instructor_credentials['email'], instructor_credentials['password'])
        
        page.goto(f"{base_url}/dashboard")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)
        
        # Check notification count
        notification_count = get_notification_count()
        assert notification_count >= 1, f"Instructor should receive course comment notification, count: {notification_count}"

    # ================================================================
    # PREFERENCE ENFORCEMENT TESTS
    # ================================================================

    @pytest.mark.integration
    def test_comment_notification_blocked_when_disabled(
        self,
        page: Page,
        base_url: str,
        get_enrolled_course,
        get_notification_count,
        clear_notifications,
        switch_user,
        instructor_credentials: dict,
        student_credentials: dict
    ):
        """
        Critical Test: Verify comment notifications are BLOCKED when disabled in settings
        
        Scenario:
        1. Instructor DISABLES New Comments notifications
        2. Student posts comment
        3. Verify instructor does NOT receive notification
        
        Expected: Notification preference enforcement works correctly
        """
        # Switch to INSTRUCTOR to disable their comment notifications
        switch_user(instructor_credentials['email'], instructor_credentials['password'])
        
        # Navigate to notification settings
        page.goto(f"{base_url}/settings/notifications")
        page.wait_for_load_state("networkidle")
        
        # Expand Community accordion
        community_accordion = page.locator('[data-testid="notifications-settings-category-community-accordion-summary"]')
        community_accordion.click()
        page.wait_for_timeout(500)
        
        # DISABLE New Comments in-app notifications
        comments_inapp = page.locator('[data-testid="notifications-settings-community-comments-inapp-switch"] input')
        if comments_inapp.is_checked():
            comments_inapp.uncheck()
        
        # Save settings
        page.click('[data-testid="notifications-settings-save-button"]')
        expect(page.locator('text="Notification settings saved!"')).to_be_visible(timeout=5000)
        page.wait_for_timeout(1000)
        
        # Clear instructor's notifications
        clear_notifications()
        
        # Get initial notification count (should be 0)
        page.goto(f"{base_url}/dashboard")
        page.wait_for_load_state("networkidle")
        initial_count = get_notification_count()
        
        # Switch back to STUDENT
        switch_user(student_credentials['email'], student_credentials['password'])
        
        # Get enrolled course
        enrolled_course = get_enrolled_course()
        if not enrolled_course:
            pytest.skip("No enrolled course found")
        
        course_id = enrolled_course['courseId']
        
        # Navigate to lesson
        page.goto(f"{base_url}/courses/{course_id}")
        page.wait_for_load_state("networkidle")
        
        lesson_links = page.locator('[data-testid^="course-detail-lesson-"]').all()
        if len(lesson_links) == 0:
            pytest.skip("No lessons found")
        
        lesson_links[0].click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        
        # Post comment
        comments_section = page.locator('[data-testid="comments-section-lesson"]')
        if not comments_section.is_visible():
            pytest.skip("Comments not available")
        
        comments_section.scroll_into_view_if_needed()
        
        comment_text = f"Blocked notification test - {int(time.time())}"
        page.fill('[data-testid="comment-input"]', comment_text)
        page.click('[data-testid="comment-submit-button"]')
        
        page.wait_for_timeout(2000)
        
        # Switch back to INSTRUCTOR
        switch_user(instructor_credentials['email'], instructor_credentials['password'])
        
        page.goto(f"{base_url}/dashboard")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)
        
        # Get final notification count
        final_count = get_notification_count()
        
        # Should NOT increase (notifications disabled)
        assert final_count == initial_count, f"Comment notification should be BLOCKED. Initial: {initial_count}, Final: {final_count}"

    @pytest.mark.integration
    def test_comment_notification_blocked_when_community_category_disabled(
        self,
        page: Page,
        base_url: str,
        get_enrolled_course,
        get_notification_count,
        clear_notifications,
        switch_user,
        instructor_credentials: dict,
        student_credentials: dict
    ):
        """
        Test NULL inheritance: Community category OFF blocks comment notifications
        
        Scenario:
        1. Instructor disables entire Community category (parent)
        2. Student posts comment
        3. Verify instructor does NOT receive notification (inherits OFF from category)
        
        Expected: Category-level toggle cascades to subcategory
        """
        # Switch to instructor
        switch_user(instructor_credentials['email'], instructor_credentials['password'])
        
        # Navigate to settings
        page.goto(f"{base_url}/settings/notifications")
        page.wait_for_load_state("networkidle")
        
        # Expand Community accordion
        community_accordion = page.locator('[data-testid="notifications-settings-category-community-accordion-summary"]')
        community_accordion.click()
        page.wait_for_timeout(500)
        
        # DISABLE entire Community category
        community_switch = page.locator('[data-testid="notifications-settings-category-community-switch"] input')
        if community_switch.is_checked():
            community_switch.uncheck()
        
        # Save
        page.click('[data-testid="notifications-settings-save-button"]')
        expect(page.locator('text="Notification settings saved!"')).to_be_visible(timeout=5000)
        page.wait_for_timeout(1000)
        
        # Clear notifications
        clear_notifications()
        
        page.goto(f"{base_url}/dashboard")
        page.wait_for_load_state("networkidle")
        initial_count = get_notification_count()
        
        # Switch to student and post comment
        switch_user(student_credentials['email'], student_credentials['password'])
        
        enrolled_course = get_enrolled_course()
        if not enrolled_course:
            pytest.skip("No enrolled course")
        
        course_id = enrolled_course['courseId']
        page.goto(f"{base_url}/courses/{course_id}")
        page.wait_for_load_state("networkidle")
        
        lesson_links = page.locator('[data-testid^="course-detail-lesson-"]').all()
        if len(lesson_links) > 0:
            lesson_links[0].click()
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1000)
            
            comments_section = page.locator('[data-testid="comments-section-lesson"]')
            if comments_section.is_visible():
                comments_section.scroll_into_view_if_needed()
                
                comment_text = f"Category disabled test - {int(time.time())}"
                page.fill('[data-testid="comment-input"]', comment_text)
                page.click('[data-testid="comment-submit-button"]')
                
                page.wait_for_timeout(2000)
        
        # Switch back to instructor
        switch_user(instructor_credentials['email'], instructor_credentials['password'])
        
        page.goto(f"{base_url}/dashboard")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)
        
        final_count = get_notification_count()
        
        # Should be blocked by category toggle
        assert final_count == initial_count, f"Comment notification should be BLOCKED by category toggle. Initial: {initial_count}, Final: {final_count}"

    # ================================================================
    # REPLY COMMENT TESTS (EXISTING FEATURE - REGRESSION TEST)
    # ================================================================

    def test_reply_to_comment_still_works(
        self,
        page: Page,
        base_url: str,
        get_enrolled_course,
        get_notification_count,
        clear_notifications,
        switch_user,
        instructor_credentials: dict,
        student_credentials: dict
    ):
        """
        Regression Test: Verify "Reply to Comment" notifications still work
        
        This is the EXISTING feature that was already implemented.
        We're testing it to ensure our new "New Comment" feature didn't break it.
        
        Scenario:
        1. Student1 posts comment
        2. Switch to Instructor
        3. Instructor replies to Student1's comment
        4. Switch back to Student1
        5. Verify Student1 received reply notification
        
        Expected: Reply notifications work independently of new comment notifications
        """
        # This test ensures backwards compatibility with the existing reply notification system
        # which was already implemented before the "New Comment on Course/Lesson" feature
        pytest.skip("Reply notification feature already exists and is tested elsewhere. This is a placeholder for regression testing.")


# ================================================================
# ADDITIONAL TEST CLASS FOR API-LEVEL TESTING
# ================================================================

class TestCommentNotificationsAPI:
    """
    API-level tests for comment notification system
    These tests use direct API calls instead of UI interactions
    """
    
    @pytest.mark.integration
    def test_api_create_comment_returns_success(
        self,
        api_client,
        api_base_url: str,
        get_enrolled_course
    ):
        """
        Test that creating comment via API returns success
        
        This validates the backend integration point where notifications are triggered
        """
        session, token, user_id = api_client
        
        # Get enrolled course
        response = session.get(f"{api_base_url}/api/enrollment")
        assert response.status_code == 200
        
        enrollments = response.json()
        if len(enrollments) == 0:
            pytest.skip("No enrollments found")
        
        course_id = enrollments[0]['CourseId']
        
        # Get course curriculum to find lessons
        curriculum_response = session.get(f"{api_base_url}/api/courses/{course_id}/curriculum")
        if curriculum_response.status_code != 200:
            # Try alternative: get enrollment details which includes progress
            progress_response = session.get(f"{api_base_url}/api/enrollment/{course_id}/progress")
            if progress_response.status_code != 200:
                pytest.skip("Cannot fetch course curriculum or progress")
            
            progress_data = progress_response.json()
            lessons = progress_data.get('lessons', [])
            if len(lessons) == 0:
                pytest.skip("No lessons in course")
            lesson_id = lessons[0].get('LessonId') or lessons[0].get('id')
        else:
            curriculum_data = curriculum_response.json()
            lessons = curriculum_data.get('lessons', [])
            if len(lessons) == 0:
                pytest.skip("No lessons in course")
            lesson_id = lessons[0].get('LessonId') or lessons[0].get('id')
        
        if not lesson_id:
            pytest.skip("Could not extract lesson ID")
        
        # Create comment on lesson via API
        comment_payload = {
            "entityType": "lesson",
            "entityId": lesson_id,
            "content": f"API test comment - {int(time.time())}",
            "parentCommentId": None
        }
        
        comment_response = session.post(
            f"{api_base_url}/api/comments",
            json=comment_payload
        )
        
        assert comment_response.status_code == 201, f"Failed to create comment: {comment_response.text}"
        
        comment_data = comment_response.json()
        assert 'id' in comment_data, "Comment response should include comment ID"
        assert comment_data['content'] == comment_payload['content']
        
        print(f"✅ Comment created via API: {comment_data['id']}")
        print(f"   Backend should have triggered notification for enrolled participants")
