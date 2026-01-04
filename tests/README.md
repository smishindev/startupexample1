# Python Testing Setup for Mishin Learn Platform

## Overview
This directory contains end-to-end and API tests using **Pytest** and **Playwright**.

## Prerequisites

1. **Python 3.8+** installed
2. **Node.js** (for running the app)
3. **VS Code** with Python extension

## Installation

### 1. Create Virtual Environment
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

### 2. Install Dependencies
```powershell
pip install -r requirements-test.txt
playwright install
```

### 3. Configure Environment
```powershell
cp tests\.env.test.example tests\.env.test
# Edit tests\.env.test with your settings
```

## Running Tests

### Run All Tests
```powershell
pytest
```

### Run Specific Test File
```powershell
pytest tests/test_auth.py
```

### Run Specific Test Class
```powershell
pytest tests/test_auth.py::TestAuthentication
```

### Run Tests by Marker
```powershell
pytest -m smoke        # Quick smoke tests
pytest -m auth         # Authentication tests only
pytest -m "not slow"   # Skip slow tests
```

### Parallel Execution
```powershell
pytest -n auto  # Uses all CPU cores
pytest -n 4     # Uses 4 workers
```

### Generate HTML Report
```powershell
pytest --html=tests/reports/report.html
```

### Run with Browser Visible (Headed Mode)
```powershell
$env:HEADLESS="false"; pytest
```

## Test Structure

```
tests/
├── conftest.py              # Shared fixtures and configuration
├── test_auth.py            # Authentication tests
├── test_courses.py         # Course management tests
├── test_payments.py        # Payment integration tests
├── test_notifications.py   # Notification system tests
├── test_api.py            # API endpoint tests
├── reports/               # HTML test reports
├── screenshots/           # Failure screenshots
└── videos/               # Test execution videos
```

## VS Code Integration

### Test Explorer
- Open Test Explorer (Flask icon in sidebar)
- Tests appear automatically
- Click play button to run tests
- Green/red indicators show pass/fail

### Debugging Tests
1. Set breakpoint in test
2. Right-click test in explorer
3. Select "Debug Test"

Or use F5 with debug configurations in [.vscode/launch.json](.vscode/launch.json)

## Writing Tests

### Test Naming Convention
- Files: `test_*.py`
- Classes: `Test*`
- Methods: `test_*`

### Available Fixtures
- `page` - Playwright page object
- `context` - Browser context
- `base_url` - Application URL
- `admin_credentials` - Admin user
- `student_credentials` - Student user
- `instructor_credentials` - Instructor user

### Test Markers
Add markers to categorize tests:
```python
@pytest.mark.smoke
@pytest.mark.auth
def test_login(page, base_url):
    pass
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run Tests
  run: |
    pip install -r requirements-test.txt
    playwright install --with-deps
    pytest --html=report.html
```

## Troubleshooting

### Browser Not Found
```powershell
playwright install chromium
```

### Tests Timing Out
Increase timeout in [pytest.ini](../pytest.ini):
```ini
timeout = 60
```

### Screenshots Not Saving
Check permissions on `tests/screenshots/` directory

## Best Practices

1. **Keep tests independent** - Each test should run in isolation
2. **Use fixtures** - Reuse setup code via conftest.py
3. **Add markers** - Categorize tests for selective running
4. **Clean up** - Close browsers, delete test data
5. **Meaningful assertions** - Use descriptive error messages

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [Playwright Python](https://playwright.dev/python/)
- [VS Code Python Testing](https://code.visualstudio.com/docs/python/testing)
