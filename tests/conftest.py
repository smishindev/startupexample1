"""Pytest configuration and shared fixtures"""
import pytest
from playwright.sync_api import Browser, BrowserContext, Page
from typing import Generator
import os
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


@pytest.fixture
def base_url() -> str:
    """Base URL for the application (frontend)"""
    return BASE_URL


@pytest.fixture
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
