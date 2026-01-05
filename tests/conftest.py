"""Pytest configuration and shared fixtures"""
import pytest
from playwright.sync_api import Browser, BrowserContext, Page
from typing import Generator
import os
import requests
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
    
    data = login_response.json()
    auth_token = data.get('token')
    user_id = data.get('user', {}).get('id')
    
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
    
    data = login_response.json()
    auth_token = data.get('token')
    user_id = data.get('user', {}).get('id')
    
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
        session, _, _ = api_client
        response = session.post(
            f"{api_base_url}/api/notifications/test",
            json={
                "type": notification_type,
                "subcategory": subcategory
            }
        )
        return response.status_code == 201
    
    return _trigger


@pytest.fixture
def get_notification_count(page: Page):
    """
    Helper to get current notification count from bell badge
    Returns integer count or 0 if no badge visible
    """
    def _get_count() -> int:
        try:
            bell = page.locator('[data-testid="notification-bell-button"]')
            if not bell.is_visible():
                return 0
            
            # Check for badge
            badge = bell.locator('.MuiBadge-badge')
            if badge.is_visible(timeout=1000):
                text = badge.text_content()
                if text and text.strip():
                    # Handle "9+" format
                    if '+' in text:
                        return int(text.replace('+', ''))
                    return int(text)
            return 0
        except:
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
            notifications = response.json()
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
