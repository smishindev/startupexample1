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
        - User menu in AppBar (IconButton with Avatar)
        - Logout in dropdown menu (MenuItem)
        """
        # Navigate directly to login page
        page.goto(f"{base_url}/login")
        
        # Wait for login form to load
        page.wait_for_load_state("networkidle")
        page.wait_for_selector('[data-testid="login-email-input"]', state='visible')
        
        # Fill in student credentials from QUICK_REFERENCE.md (using test IDs)
        page.fill('[data-testid="login-email-input"]', "student1@gmail.com")
        page.fill('[data-testid="login-password-input"]', "Aa123456")
        
        # Submit login form (using test ID)
        page.click('[data-testid="login-submit-button"]')
        
        # Wait for navigation to dashboard
        page.wait_for_url(re.compile(r".*/dashboard.*"), timeout=15000)
        
        # Verify we're on dashboard
        assert "/dashboard" in page.url, f"Expected dashboard URL, got {page.url}"
        
        # Wait for dashboard to fully load
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)  # Wait for HeaderV4 to render
        
        # Click on user avatar to open profile menu (using test ID)
        page.click('[data-testid="header-profile-menu-button"]')
        
        # Wait for profile menu to appear
        page.wait_for_timeout(500)  # Wait for menu animation
        
        # Click Logout menu item (using test ID)
        page.click('[data-testid="header-profile-menu-item-logout"]')
        
        # Wait for logout to complete and redirect
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)  # Give time for redirect
        
        # Verify we're back at login or home page
        current_url = page.url
        assert "/login" in current_url or current_url.endswith("/"), \
            f"Expected login or home page after logout, got {current_url}"
