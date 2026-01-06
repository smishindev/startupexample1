# API Integration Testing Guide

## Critical Authentication Flow

### Login Response Structure

The `/api/auth/login` endpoint returns a **nested JSON structure**, not a flat one:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "username": "username",
      "firstName": "First",
      "lastName": "Last",
      "role": "student",
      "learningStyle": "visual",
      "emailVerified": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  }
}
```

### Accessing the Token

**INCORRECT** ❌:
```python
data = login_response.json()
token = data.get('token')  # This will return None!
user_id = data.get('user', {}).get('id')  # This will return None!
```

**CORRECT** ✅:
```python
response_data = login_response.json()
data = response_data.get('data', {})  # Get the nested 'data' object first
token = data.get('token')
user_id = data.get('user', {}).get('id')
```

## JWT Token Details

### Token Expiration
- **Default**: 24 hours
- **With "Remember Me"**: 30 days
- **Configured in**: `server/src/routes/auth.ts` → `generateToken()`

### Token Verification
The `authenticateToken` middleware (`server/src/middleware/auth.ts`) performs:
1. Extract token from `Authorization: Bearer <token>` header
2. Verify JWT signature using `JWT_SECRET`
3. Check if user exists and is active in database
4. Attach user info to request as `req.user`

### Common Token Errors

| Error Code | Status | Cause | Solution |
|------------|--------|-------|----------|
| `TOKEN_MISSING` | 401 | No Authorization header | Ensure header is set: `Authorization: Bearer <token>` |
| `TOKEN_INVALID` | 401 | JWT verification failed | Token is malformed or signed with wrong secret |
| `TOKEN_EXPIRED` | 401 | Token past expiration time | User needs to login again |
| `USER_NOT_FOUND` | 401 | User deleted or inactive | Account no longer valid |

## Test Fixtures

### `api_client` Fixture
Creates authenticated HTTP session for **student** user:
```python
session, auth_token, user_id = api_client
```
- **Scope**: Function (new session per test)
- **User**: student1@gmail.com
- **Returns**: (requests.Session, token_string, user_id_string)

### `api_client_instructor` Fixture
Creates authenticated HTTP session for **instructor** user:
```python
session, auth_token, user_id = api_client_instructor
```
- **Scope**: Function
- **User**: ins1@gmail.com
- **Returns**: (requests.Session, token_string, user_id_string)

### Using the Session
The session already has the Authorization header set, so just make requests:
```python
session, token, user_id = api_client
response = session.get(f"{api_base_url}/api/notifications")
# Authorization header is automatically included
```

## Testing Notifications

### Test Notification Endpoint
`POST /api/notifications/test` (requires authentication)

**Request Body**:
```json
{
  "type": "progress",
  "subcategory": "LessonCompletion",
  "title": "Optional custom title",
  "message": "Optional custom message",
  "priority": "normal"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Test notification created",
  "notificationId": "notification-uuid"
}
```

**Response if blocked by preferences**:
```json
{
  "success": true,
  "message": "Notification blocked by preferences",
  "notificationId": null
}
```

### Using `trigger_test_notification` Fixture
```python
def test_notification(trigger_test_notification):
    # Trigger a lesson completion notification
    success = trigger_test_notification('progress', 'LessonCompletion')
    assert success, "Failed to trigger notification"
    
    # Trigger a live session notification
    success = trigger_test_notification('course', 'LiveSessionStarting')
    assert success
```

**Important**: This fixture automatically uses the authenticated student's session from `api_client`.

## Common Pitfalls

### 1. ⚠️ Accessing Flat Response Structure (CRITICAL)
**Problem**: Trying to access `response.json().get('token')` directly after login
**Why it fails**: Login endpoint returns **nested structure**: `{success: true, data: {token: "...", user: {...}}}`
**Solution**: Always access `response.json().get('data', {}).get('token')`

**Example of the bug**:
```python
# ❌ WRONG - This will return None!
data = login_response.json()
token = data.get('token')  # Returns None - token is in data.token
user_id = data.get('user', {}).get('id')  # Returns None
```

**Correct way**:
```python
# ✅ CORRECT
response_data = login_response.json()
data = response_data.get('data', {})  # Extract nested 'data' first
token = data.get('token')  # Now we get the actual token
user_id = data.get('user', {}).get('id')
```

**In JavaScript/Node.js**:
```javascript
// ❌ WRONG
const response = await axios.post('/api/auth/login', {...});
const token = response.data.token;  // undefined!

// ✅ CORRECT  
const response = await axios.post('/api/auth/login', {...});
const { data } = response.data;  // Destructure nested 'data'
const token = data.token;  // Now it works
```

### 2. Token Not in Headers
**Problem**: Making API calls without Authorization header
**Solution**: Use the `session` object from fixtures, not raw `requests.post()`

### 3. Wrong User Context
**Problem**: Test uses `api_client` (student) but tries to access instructor-only endpoints
**Solution**: Use `api_client_instructor` fixture for instructor tests

### 4. Expecting 201 Instead of 200
**Problem**: Checking `response.status_code == 201` for endpoints that return 200
**Solution**: Check endpoint documentation - most return 200, not 201

## MUI Switch Testing

### Issue
Playwright's `.check()` and `.uncheck()` don't work directly on MUI Switch components.

### Solution
Always target the `input` element inside the switch:

```python
# ❌ WRONG - targets the wrapper
switch = page.locator('[data-testid="my-switch"]')
switch.check()  # Fails with "Not a checkbox or radio button"

# ✅ CORRECT - targets the input element
switch = page.locator('[data-testid="my-switch"] input')
switch.check()  # Works!
```

### Bulk Pattern
All notification settings switches follow this pattern:
```python
page.locator('[data-testid="notifications-settings-<category>-<name>-switch"] input')
```

## Running Tests

### Run all notification tests
```powershell
pytest tests/test_notification_settings.py -v --headed
```

### Run single test
```powershell
pytest tests/test_notification_settings.py::TestNotificationSettings::test_name -v --headed
```

### Stop on first failure
```powershell
pytest tests/test_notification_settings.py -v --headed -x
```

### Show print statements
```powershell
pytest tests/test_notification_settings.py -v --headed -s
```

## Debugging Tips

1. **Check login response**: Add print in `api_client` fixture to see actual response
2. **Verify token**: Print `auth_token` to ensure it's not None
3. **Check headers**: Print `session.headers` to verify Authorization is set
4. **Server logs**: Check server console for detailed auth errors
5. **Screenshot**: Playwright auto-saves screenshots for failed tests to `tests/screenshots/`

## Environment Setup

Required in `tests/.env.test`:
```env
# API
API_BASE_URL=http://localhost:3001

# Student credentials
STUDENT_EMAIL=student1@gmail.com
STUDENT_PASSWORD=Aa123456

# Instructor credentials  
INSTRUCTOR_EMAIL=ins1@gmail.com
INSTRUCTOR_PASSWORD=Aa123456

# Browser
HEADLESS=false  # Set to true for CI/CD
```

## Related Files

- **Auth Middleware**: `server/src/middleware/auth.ts`
- **Login Endpoint**: `server/src/routes/auth.ts` (line 187)
- **Test Fixtures**: `tests/conftest.py` (⚠️ Has critical warnings in header comments)
- **Notification Endpoint**: `server/src/routes/notifications.ts` (line 273)
- **Test File**: `tests/test_notification_settings.py`
- **JavaScript Test Script**: `scripts/test-notifications-api.js` (also fixed for nested structure)
- **API Response Patterns**: `API_RESPONSE_PATTERNS.md` (⭐ Complete endpoint reference)

## Summary of Fixes Applied

**Issue**: Login endpoint returns nested structure `{success: true, data: {token: "...", user: {...}}}` but fixtures were accessing flat structure.

**Files Fixed**:
1. ✅ `tests/conftest.py` - Fixed `api_client` fixture to access `response_data['data']['token']`
2. ✅ `tests/conftest.py` - Fixed `api_client_instructor` fixture with same pattern
3. ✅ `tests/conftest.py` - Added validation to raise clear error if token is missing
4. ✅ `scripts/test-notifications-api.js` - Fixed JavaScript login to destructure nested data
5. ✅ `TESTING_API_INTEGRATION.md` - Enhanced Common Pitfalls section with examples
6. ✅ `API_RESPONSE_PATTERNS.md` - Created comprehensive endpoint response reference

**Prevention Measures**:
- Added warning comments in `tests/conftest.py` header
- Created `API_RESPONSE_PATTERNS.md` with all response structures documented
- Enhanced `TESTING_API_INTEGRATION.md` with detailed pitfall examples
- All future test developers should read these documents first
