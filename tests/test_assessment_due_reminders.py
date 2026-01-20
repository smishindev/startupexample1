"""
Assessment Due Date Reminders Tests

Tests the complete flow of Assessment Due Date Reminders functionality:
1. Creating an assessment with a due date
2. Enrolling a student in the course
3. Triggering the reminder notification
4. Verifying the notification appears in the UI
5. Checking notification content and priority
"""
import pytest
from playwright.sync_api import Page, expect
from datetime import datetime, timedelta
import time


@pytest.mark.notifications
@pytest.mark.e2e
class TestAssessmentDueReminders:
    """Test Assessment Due Date Reminder notifications"""

    def test_assessment_due_reminder_flow(
        self,
        page: Page,
        base_url: str,
        api_base_url: str,
        api_client_instructor,
        api_client,
        instructor_credentials: dict,
        student_credentials: dict
    ):
        """
        Complete E2E test for Assessment Due Date Reminders
        
        Flow:
        1. Instructor creates a course
        2. Instructor creates a lesson in the course
        3. Instructor creates an assessment with due date (2 days from now)
        4. Student enrolls in the course
        5. Instructor triggers the test reminder endpoint
        6. Student logs in and checks for notification
        7. Verify notification content, type, and priority
        """
        
        # ====== SETUP: Get API clients ======
        instructor_session, instructor_token, instructor_id = api_client_instructor
        student_session, student_token, student_id = api_client
        
        print("\n" + "="*80)
        print("🧪 STARTING ASSESSMENT DUE REMINDER TEST")
        print("="*80)
        print(f"👨‍🏫 Instructor ID: {instructor_id}")
        print(f"👨‍🎓 Student ID: {student_id}")
        print("="*80 + "\n")
        
        # ====== STEP 1: Instructor creates a course ======
        print("📚 STEP 1: Creating course as instructor...")
        course_data = {
            "title": f"Test Course - Due Reminders {datetime.now().timestamp()}",
            "description": "Course for testing assessment due date reminders",
            "category": "Test",
            "level": "beginner",
            "price": 0.00,
            "thumbnail": "https://via.placeholder.com/300"
        }
        
        course_response = instructor_session.post(
            f"{api_base_url}/api/instructor/courses",
            json=course_data
        )
        assert course_response.status_code == 201, f"Failed to create course: {course_response.text}"
        course = course_response.json()
        course_id = course.get('id') or course.get('Id')  # Handle both lowercase and uppercase
        assert course_id, f"No course ID in response: {course}"
        print(f"✅ Course created: {course_id}")
        print(f"   Title: {course_data['title']}")
        
        # Publish the course so students can enroll
        publish_response = instructor_session.post(
            f"{api_base_url}/api/instructor/courses/{course_id}/publish"
        )
        assert publish_response.status_code == 200, f"Failed to publish course: {publish_response.text}"
        print(f"✅ Course published\n")
        
        # ====== STEP 2: Instructor creates a lesson ======
        print("📖 STEP 2: Creating lesson in course...")
        lesson_data = {
            "courseId": course_id,
            "title": f"Test Lesson - {datetime.now().timestamp()}",
            "description": "Lesson for testing assessments",
            "content": [
                {
                    "type": "text",
                    "data": {
                        "text": "This is a test lesson for assessment due date reminders."
                    }
                }
            ],
            "orderIndex": 1,
            "duration": 10,
            "isRequired": True
        }
        
        lesson_response = instructor_session.post(
            f"{api_base_url}/api/lessons",
            json=lesson_data
        )
        assert lesson_response.status_code == 201, f"Failed to create lesson: {lesson_response.text}"
        lesson = lesson_response.json()
        lesson_id = lesson.get('id') or lesson.get('Id')  # Handle both lowercase and uppercase
        assert lesson_id, f"No lesson ID in response: {lesson}"
        print(f"✅ Lesson created: {lesson_id}")
        print(f"   Title: {lesson_data['title']}\n")
        
        # ====== STEP 3: Instructor creates assessment with due date ======
        print("📝 STEP 3: Creating assessment with due date (2 days from now)...")
        due_date = datetime.utcnow() + timedelta(days=2)
        due_date_str = due_date.strftime("%Y-%m-%dT%H:%M:%S.000Z")
        
        assessment_data = {
            "lessonId": lesson_id,
            "title": f"Test Assessment - Due in 2 Days",
            "type": "quiz",
            "passingScore": 70,
            "maxAttempts": 3,
            "timeLimit": 30,
            "isAdaptive": False,
            "dueDate": due_date_str,
            "questions": [
                {
                    "question": "What is 2 + 2?",
                    "type": "multiple_choice",
                    "options": ["3", "4", "5"],
                    "correctAnswer": "4",
                    "difficulty": 5
                },
                {
                    "question": "What is the capital of France?",
                    "type": "multiple_choice",
                    "options": ["London", "Paris", "Berlin"],
                    "correctAnswer": "Paris",
                    "difficulty": 5
                }
            ]
        }
        
        assessment_response = instructor_session.post(
            f"{api_base_url}/api/assessments",
            json=assessment_data
        )
        assert assessment_response.status_code == 201, f"Failed to create assessment: {assessment_response.text}"
        assessment = assessment_response.json()
        assessment_id = assessment.get('Id')  # SQL Server returns capital 'Id'
        assert assessment_id, f"No assessment ID in response: {assessment}"
        print(f"✅ Assessment created: {assessment_id}")
        print(f"   Title: {assessment_data['title']}")
        print(f"   Due Date: {due_date_str}")
        print(f"   Days Until Due: 2\n")
        
        # ====== STEP 4: Student enrolls in the course ======
        print("🎓 STEP 4: Enrolling student in course...")
        enrollment_response = student_session.post(
            f"{api_base_url}/api/enrollment/courses/{course_id}/enroll"
        )
        assert enrollment_response.status_code in [200, 201], f"Failed to enroll: {enrollment_response.text}"
        print(f"✅ Student enrolled in course: {course_id}\n")
        
        # ====== STEP 5: Get initial notification count ======
        print("🔔 STEP 5: Getting initial notification count...")
        notifications_before_response = student_session.get(
            f"{api_base_url}/api/notifications?includeRead=true"
        )
        assert notifications_before_response.status_code == 200, f"Failed to get notifications: {notifications_before_response.text}"
        notifications_before_data = notifications_before_response.json()
        notifications_before = notifications_before_data.get('notifications', [])
        initial_count = len(notifications_before)
        print(f"📊 Initial notification count: {initial_count}\n")
        
        # ====== STEP 6: Trigger the assessment due reminder test endpoint ======
        print("⏰ STEP 6: Triggering assessment due reminder notification...")
        trigger_response = instructor_session.post(
            f"{api_base_url}/api/assessments/test-due-reminders"
        )
        assert trigger_response.status_code == 200, f"Failed to trigger reminders: {trigger_response.text}"
        trigger_result = trigger_response.json()
        print(f"✅ Trigger result: {trigger_result}")
        assert trigger_result.get('success'), f"Trigger failed: {trigger_result}"
        reminders_sent = trigger_result.get('remindersSent', 0)
        print(f"📨 Reminders sent: {reminders_sent}\n")
        
        # Wait a moment for the notification to be created
        time.sleep(1)
        
        # ====== STEP 7: Verify notification was created ======
        print("✅ STEP 7: Verifying notification was created via API...")
        notifications_after_response = student_session.get(
            f"{api_base_url}/api/notifications?includeRead=false"
        )
        assert notifications_after_response.status_code == 200, f"Failed to get notifications: {notifications_after_response.text}"
        notifications_after_data = notifications_after_response.json()
        notifications_after = notifications_after_data.get('notifications', [])
        new_count = len(notifications_after)
        
        print(f"📊 Notification count after trigger: {new_count}")
        print(f"📈 New notifications: {new_count - initial_count}")
        
        # Find the assessment due reminder notification
        due_reminder = None
        for notif in notifications_after:
            if (notif.get('Type') in ['assignment', 'assessment'] and 
                'due' in notif.get('Message', '').lower() and
                assessment_data['title'] in notif.get('Message', '')):
                due_reminder = notif
                break
        
        assert due_reminder is not None, f"Assessment due reminder not found in notifications: {notifications_after}"
        print(f"✅ Found assessment due reminder notification!")
        print(f"   ID: {due_reminder.get('Id')}")
        print(f"   Type: {due_reminder.get('Type')}")
        print(f"   Title: {due_reminder.get('Title')}")
        print(f"   Message: {due_reminder.get('Message')}")
        print(f"   Priority: {due_reminder.get('Priority')}")
        print(f"   IsRead: {due_reminder.get('IsRead')}\n")
        
        # ====== STEP 8: Verify notification properties ======
        print("🔍 STEP 8: Verifying notification properties...")
        
        # Check type
        assert due_reminder.get('Type') in ['assignment', 'assessment'], \
            f"Wrong type: {due_reminder.get('Type')}"
        print(f"✅ Type is correct: {due_reminder.get('Type')}")
        
        # Check priority (should be urgent)
        assert due_reminder.get('Priority') == 'urgent', \
            f"Wrong priority: {due_reminder.get('Priority')}, expected 'urgent'"
        print(f"✅ Priority is urgent")
        
        # Check message contains assessment title
        assert assessment_data['title'] in due_reminder.get('Message', ''), \
            f"Assessment title not in message"
        print(f"✅ Message contains assessment title")
        
        # Check message mentions "2 days"
        assert '2 day' in due_reminder.get('Message', '').lower(), \
            f"Message doesn't mention '2 days'"
        print(f"✅ Message mentions '2 days'")
        
        # Check it's unread
        assert not due_reminder.get('IsRead'), \
            f"Notification should be unread"
        print(f"✅ Notification is unread")
        
        # Check it has an action URL
        assert due_reminder.get('ActionUrl'), \
            f"Notification should have ActionUrl"
        print(f"✅ Has action URL: {due_reminder.get('ActionUrl')}\n")
        
        # ====== STEP 9: Login to UI and verify notification appears ======
        print("🌐 STEP 9: Logging in to UI and verifying notification in bell icon...")
        
        # Navigate to login page
        page.goto(f"{base_url}/login")
        page.wait_for_load_state("networkidle")
        
        # Login as student using data-testid selectors
        page.fill('[data-testid="login-email-input"]', student_credentials['email'])
        page.fill('[data-testid="login-password-input"]', student_credentials['password'])
        page.click('[data-testid="login-submit-button"]')
        
        # Wait for redirect after login
        page.wait_for_url(f"{base_url}/**", timeout=10000)
        print(f"✅ Logged in as student")
        
        # Wait for socket connection to establish
        time.sleep(2)
        
        # Click notification bell icon
        bell_button = page.locator('[data-testid="notification-bell-button"]')
        expect(bell_button).to_be_visible(timeout=5000)
        
        # Check if there's an unread badge
        unread_badge = page.locator('[data-testid="notification-bell-badge"]')
        if unread_badge.is_visible():
            badge_count = unread_badge.text_content()
            print(f"✅ Unread notification badge visible: {badge_count}")
        
        bell_button.click()
        time.sleep(1)
        
        # Check if notification appears in the dropdown
        notification_list = page.locator('[data-testid^="notification-item-"]')
        expect(notification_list.first).to_be_visible(timeout=5000)
        print(f"✅ Notification dropdown opened")
        
        # Find our specific notification
        all_notifications = notification_list.all()
        found_in_ui = False
        for notif_element in all_notifications:
            text_content = notif_element.text_content()
            if assessment_data['title'] in text_content and '2 day' in text_content.lower():
                found_in_ui = True
                print(f"✅ Found notification in UI!")
                print(f"   Content: {text_content[:100]}...")
                break
        
        assert found_in_ui, "Notification not found in UI dropdown"
        
        # ====== STEP 10: Navigate to notifications page ======
        print("\n📋 STEP 10: Checking notifications page...")
        page.goto(f"{base_url}/notifications")
        page.wait_for_load_state("networkidle")
        
        # Wait for notifications to load
        time.sleep(2)
        
        # Check if our notification appears
        page_notifications = page.locator('[data-testid^="notification-item-"]')
        expect(page_notifications.first).to_be_visible(timeout=5000)
        
        all_page_notifications = page_notifications.all()
        found_on_page = False
        for notif_element in all_page_notifications:
            text_content = notif_element.text_content()
            if assessment_data['title'] in text_content:
                found_on_page = True
                print(f"✅ Found notification on notifications page!")
                
                # Check for urgent badge
                if 'urgent' in text_content.lower():
                    print(f"✅ Notification shows 'urgent' priority")
                
                break
        
        assert found_on_page, "Notification not found on notifications page"
        
        print("\n" + "="*80)
        print("✅ ALL TESTS PASSED! Assessment Due Date Reminders working correctly!")
        print("="*80)
        print("\nTest Summary:")
        print(f"  ✅ Course created: {course_id}")
        print(f"  ✅ Lesson created: {lesson_id}")
        print(f"  ✅ Assessment created with due date: {assessment_id}")
        print(f"  ✅ Student enrolled: {student_id}")
        print(f"  ✅ Reminder triggered: {reminders_sent} sent")
        print(f"  ✅ Notification created in database")
        print(f"  ✅ Notification visible in bell icon")
        print(f"  ✅ Notification visible on notifications page")
        print(f"  ✅ Priority: urgent")
        print(f"  ✅ Type: {due_reminder.get('Type')}")
        print(f"  ✅ Message includes assessment title and '2 days'")
        print("="*80 + "\n")
