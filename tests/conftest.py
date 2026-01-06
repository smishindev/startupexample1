"""
Pytest configuration and shared fixtures for E2E testing

⚠️ CRITICAL API RESPONSE STRUCTURE NOTES:
- Auth endpoints (/api/auth/*) return NESTED structure: {success: true, data: {token: "...", user: {...}}}
- Must access as: response.json()['data']['token'] NOT response.json()['token']
- Other endpoints vary - see API_RESPONSE_PATTERNS.md for complete reference
- When in doubt, check the actual endpoint in server/src/routes/ to see res.json({...}) structure

See TESTING_API_INTEGRATION.md for comprehensive testing guide.
"""
import pytest
from playwright.sync_api import Browser, BrowserContext, Page
from typing import Generator
import os
import requests
import re
from dotenv import load_dotenv

# Load test environment variables
load_dotenv("tests/.env.test")

# Test configuration
BASE_URL = os.getenv("BASE_URL", "http://localhost:5173")
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:3001")
HEADLESS = os.getenv("HEADLESS", "true").lower() == "true"


@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    """Configure browser context for all tests"""
    return {
        **browser_context_args,
        "viewport": {"width": 1920, "height": 1080},
        "ignore_https_errors": True,
        "record_video_dir": "tests/videos",
    }


@pytest.fixture(scope="function")
def context(browser: Browser) -> Generator[BrowserContext, None, None]:
    """Create a new browser context for each test"""
    context = browser.new_context()
    yield context
    context.close()


@pytest.fixture(scope="function")
def page(context: BrowserContext) -> Generator[Page, None, None]:
    """Create a new page for each test"""
    page = context.new_page()
    yield page
    page.close()


@pytest.fixture(scope="session")
def base_url() -> str:
    """Base URL for the application (frontend)"""
    return BASE_URL


@pytest.fixture(scope="session")
def api_base_url() -> str:
    """Base URL for the API (backend)"""
    return API_BASE_URL


@pytest.fixture
def admin_credentials() -> dict:
    """Admin user credentials"""
    return {
        "email": os.getenv("ADMIN_EMAIL", "admin@example.com"),
        "password": os.getenv("ADMIN_PASSWORD", "admin123"),
    }


@pytest.fixture
def student_credentials() -> dict:
    """Student user credentials"""
    return {
        "email": os.getenv("STUDENT_EMAIL", "student@example.com"),
        "password": os.getenv("STUDENT_PASSWORD", "student123"),
    }


@pytest.fixture
def instructor_credentials() -> dict:
    """Instructor user credentials"""
    return {
        "email": os.getenv("INSTRUCTOR_EMAIL", "instructor@example.com"),
        "password": os.getenv("INSTRUCTOR_PASSWORD", "instructor123"),
    }


@pytest.fixture
def api_headers() -> dict:
    """Common headers for API requests"""
    return {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


@pytest.fixture
def api_client(api_base_url: str, student_credentials: dict):
    """
    HTTP client for API calls with authentication
    Returns tuple: (session, auth_token, user_id)
    """
    session = requests.Session()
    
    # Login
    login_response = session.post(
        f"{api_base_url}/api/auth/login",
        json={
            "email": student_credentials['email'],
            "password": student_credentials['password']
        }
    )
    
    if login_response.status_code != 200:
        raise Exception(f"Login failed: {login_response.text}")
    
    response_data = login_response.json()
    # Login response structure: {success: true, data: {user: {...}, token: "...", expiresIn: "24h"}}
    data = response_data.get('data', {})
    auth_token = data.get('token')
    user_id = data.get('user', {}).get('id')
    
    if not auth_token:
        raise Exception(f"No token in login response: {response_data}")
    
    # Set authorization header for all future requests
    session.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    })
    
    return session, auth_token, user_id


@pytest.fixture
def api_client_instructor(api_base_url: str, instructor_credentials: dict):
    """
    HTTP client for API calls with instructor authentication
    Returns tuple: (session, auth_token, user_id)
    """
    session = requests.Session()
    
    # Login
    login_response = session.post(
        f"{api_base_url}/api/auth/login",
        json={
            "email": instructor_credentials['email'],
            "password": instructor_credentials['password']
        }
    )
    
    if login_response.status_code != 200:
        raise Exception(f"Instructor login failed: {login_response.text}")
    
    response_data = login_response.json()
    # Login response structure: {success: true, data: {user: {...}, token: "...", expiresIn: "24h"}}
    data = response_data.get('data', {})
    auth_token = data.get('token')
    user_id = data.get('user', {}).get('id')
    
    if not auth_token:
        raise Exception(f"No token in instructor login response: {response_data}")
    
    session.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    })
    
    return session, auth_token, user_id


@pytest.fixture
def trigger_test_notification(api_client, api_base_url: str):
    """
    Helper to trigger a test notification
    Usage: trigger_test_notification(notification_type='progress', subcategory='LessonCompletion')
    """
    def _trigger(notification_type: str = 'progress', subcategory: str = 'LessonCompletion'):
        session, auth_token, user_id = api_client
        
        response = session.post(
            f"{api_base_url}/api/notifications/test",
            json={
                "type": notification_type,
                "subcategory": subcategory
            }
        )
        
        if response.status_code != 200:
            print(f"⚠️ Test notification API failed: {response.status_code} - {response.text}")
            return False
        
        # Check if notification was actually created or blocked by preferences
        data = response.json()
        notification_id = data.get('notificationId')
        message = data.get('message', '')
        
        if not notification_id:
            print(f"⚠️ Notification blocked by preferences: {message}")
            print(f"   Type: {notification_type}, Subcategory: {subcategory}")
            return False
        
        print(f"✅ Test notification created: {notification_id}")
        return True
    
    return _trigger


@pytest.fixture
def get_notification_count(page: Page):
    """
    Helper to get current notification count from bell badge
    Returns integer count or 0 if no badge visible
    
    Selectors used:
    - notification-bell-button (aria-label contains count)
    - notification-bell-badge (MUI Badge component)
    
    See TEST_SELECTOR_MAP_ORGANIZED.md → NotificationBell.tsx for all selectors
    """
    def _get_count() -> int:
        try:
            # Try to get count from aria-label first (most reliable)
            bell = page.locator('[data-testid="notification-bell-button"]')
            if bell.is_visible():
                aria_label = bell.get_attribute('aria-label')
                if aria_label:
                    # Extract number from "show X new notifications"
                    import re
                    match = re.search(r'show (\d+) new', aria_label)
                    if match:
                        return int(match.group(1))
            
            # Fallback: Try to get from badge text
            badge = page.locator('[data-testid="notification-bell-badge"] .MuiBadge-badge')
            if badge.is_visible(timeout=1000):
                text = badge.text_content()
                if text and text.strip():
                    # Handle "9+" format
                    if '+' in text:
                        return int(text.replace('+', ''))
                    return int(text)
            
            return 0
        except Exception as e:
            print(f"⚠️ Error getting notification count: {e}")
            return 0
    
    return _get_count


@pytest.fixture
def clear_notifications(api_client, api_base_url: str):
    """
    Helper to clear all notifications for the current user
    """
    def _clear():
        session, _, _ = api_client
        # Get all notifications
        response = session.get(f"{api_base_url}/api/notifications")
        if response.status_code == 200:
            data = response.json()
            # Response structure: {success: true, notifications: [...]}
            notifications = data.get('notifications', [])
            # Mark all as read and delete
            for notif in notifications:
                try:
                    session.delete(f"{api_base_url}/api/notifications/{notif['Id']}")
                except:
                    pass
        return True
    
    return _clear


@pytest.fixture
def wait_for_notification(page: Page, get_notification_count):
    """
    Helper to wait for notification count to change
    Returns True if count increased, False if timeout
    """
    def _wait(timeout_ms: int = 5000, expected_increase: int = 1) -> bool:
        import time
        initial_count = get_notification_count()
        start_time = time.time()
        
        while (time.time() - start_time) * 1000 < timeout_ms:
            current_count = get_notification_count()
            if current_count >= initial_count + expected_increase:
                return True
            page.wait_for_timeout(500)
        
        return False
    
    return _wait


@pytest.fixture
def verify_notification_in_db(api_client, api_base_url: str):
    """
    Helper to verify notification exists in database via API
    Returns True if notification found, False otherwise
    """
    def _verify(notification_id: str = None, timeout_ms: int = 5000) -> bool:
        import time
        session, _, _ = api_client
        start_time = time.time()
        
        while (time.time() - start_time) * 1000 < timeout_ms:
            response = session.get(f"{api_base_url}/api/notifications")
            if response.status_code == 200:
                data = response.json()
                notifications = data.get('notifications', [])
                
                if notification_id:
                    # Check for specific notification ID
                    for notif in notifications:
                        if notif.get('Id') == notification_id:
                            print(f"✅ Notification found in DB: {notification_id}")
                            return True
                elif len(notifications) > 0:
                    # Just check if any notification exists
                    print(f"✅ Found {len(notifications)} notifications in DB")
                    return True
            
            time.sleep(0.5)
        
        print(f"⚠️ Notification not found in DB after {timeout_ms}ms")
        return False
    
    return _verify


@pytest.fixture
def get_course_progress(api_client, api_base_url: str):
    """
    Helper to get student's progress percentage in a course
    Returns float (0.0 to 100.0)
    """
    def _get_progress(course_id: str) -> float:
        session, _, _ = api_client
        response = session.get(f"{api_base_url}/api/enrollment/{course_id}/progress")
        if response.status_code == 200:
            data = response.json()
            return float(data.get('progressPercentage', 0))
        return 0.0
    
    return _get_progress


@pytest.fixture
def get_enrolled_course(api_client, api_base_url: str):
    """
    Helper to get first enrolled course for current user
    Returns dict with courseId, courseTitle, or None
    """
    def _get_course():
        session, _, _ = api_client
        response = session.get(f"{api_base_url}/api/enrollment")
        if response.status_code == 200:
            enrollments = response.json()
            if len(enrollments) > 0:
                return {
                    'courseId': enrollments[0].get('CourseId'),
                    'courseTitle': enrollments[0].get('CourseTitle', 'Unknown Course')
                }
        return None
    
    return _get_course


@pytest.fixture
def create_live_session(api_client_instructor, api_base_url: str):
    """
    Helper for instructor to create a live session
    Returns session ID or None
    """
    def _create(course_id: str, title: str = "Test Live Session"):
        session, _, _ = api_client_instructor
        import datetime
        
        # Schedule for 1 hour from now
        scheduled_time = datetime.datetime.utcnow() + datetime.timedelta(hours=1)
        
        response = session.post(
            f"{api_base_url}/api/live-sessions",
            json={
                "courseId": course_id,
                "title": title,
                "scheduledTime": scheduled_time.isoformat(),
                "duration": 60,
                "meetingLink": "https://meet.example.com/test"
            }
        )
        if response.status_code == 201:
            return response.json().get('id')
        return None
    
    return _create


@pytest.fixture
def get_db_notifications(api_client, api_base_url: str):
    """
    Helper to get notifications from database via API
    Returns list of notification dicts
    """
    def _get_notifications(minutes: int = 5):
        session, _, _ = api_client
        response = session.get(f"{api_base_url}/api/notifications")
        if response.status_code == 200:
            import datetime
            notifications = response.json()
            cutoff_time = datetime.datetime.utcnow() - datetime.timedelta(minutes=minutes)
            
            # Filter recent notifications
            recent = []
            for n in notifications:
                created = datetime.datetime.fromisoformat(n['CreatedAt'].replace('Z', '+00:00'))
                if created > cutoff_time:
                    recent.append(n)
            return recent
        return []
    
    return _get_notifications


@pytest.fixture
def switch_user(page: Page, base_url: str):
    """
    Helper to switch between user accounts
    Usage: switch_user(email, password)
    """
    def _switch(email: str, password: str):
        # Logout current user
        try:
            page.goto(f"{base_url}/dashboard")
            page.wait_for_load_state("networkidle")
            page.click('[data-testid="header-profile-menu-button"]', timeout=3000)
            page.wait_for_timeout(500)
            page.click('[data-testid="header-profile-menu-item-logout"]', timeout=3000)
            page.wait_for_load_state("networkidle")
        except:
            pass  # May already be logged out
        
        # Login as new user
        page.goto(f"{base_url}/login")
        page.wait_for_load_state("networkidle")
        page.fill('[data-testid="login-email-input"]', email)
        page.fill('[data-testid="login-password-input"]', password)
        page.click('[data-testid="login-submit-button"]')
        page.wait_for_url(re.compile(r".*/dashboard.*"), timeout=15000)
        page.wait_for_load_state("networkidle")
        return True
    
    return _switch


def pytest_configure(config):
    """Configure pytest with custom settings"""
    # Create reports directory if it doesn't exist
    import pathlib
    pathlib.Path("tests/reports").mkdir(parents=True, exist_ok=True)
    pathlib.Path("tests/videos").mkdir(parents=True, exist_ok=True)
    pathlib.Path("tests/screenshots").mkdir(parents=True, exist_ok=True)


def pytest_runtest_makereport(item, call):
    """Hook to capture screenshots on test failure"""
    if call.when == "call":
        if call.excinfo is not None:
            # Test failed, capture screenshot if page fixture was used
            if "page" in item.funcargs:
                page = item.funcargs["page"]
                screenshot_path = f"tests/screenshots/{item.name}.png"
                try:
                    page.screenshot(path=screenshot_path)
                    print(f"\n📸 Screenshot saved: {screenshot_path}")
                except Exception as e:
                    print(f"\n❌ Failed to capture screenshot: {e}")
