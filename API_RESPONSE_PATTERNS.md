# API Response Structure Patterns

## ⚠️ CRITICAL: Inconsistent Response Structures

Our API has **two different response patterns** that you MUST be aware of to avoid bugs:

### Pattern 1: Nested Structure (Auth Endpoints)
Used by: `/api/auth/*` endpoints

```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", ... },
    "token": "eyJhbGc...",
    "expiresIn": "24h"
  }
}
```

**Access in Python**:
```python
response_data = response.json()
data = response_data.get('data', {})  # ← Must extract 'data' first!
token = data.get('token')
user = data.get('user', {})
```

**Access in JavaScript**:
```javascript
const response = await axios.post('/api/auth/login', {...});
const { data } = response.data;  // ← Destructure nested 'data'
const token = data.token;
const user = data.user;
```

### Pattern 2: Flat Structure with 'success' (Most Other Endpoints)
Used by: `/api/notifications/*`, `/api/settings/*`, etc.

```json
{
  "success": true,
  "notifications": [...],
  "count": 5
}
```

**Access in Python**:
```python
data = response.json()
notifications = data.get('notifications', [])  # ← Direct access
count = data.get('count', 0)
```

**Access in JavaScript**:
```javascript
const response = await axios.get('/api/notifications');
const { notifications, count } = response.data;  // ← Direct access
```

### Pattern 3: Direct Data (Some GET Endpoints)
Used by: Some older endpoints

```json
[
  { "id": "1", "name": "..." },
  { "id": "2", "name": "..." }
]
```

**Access in Python**:
```python
items = response.json()  # ← Returns array directly
```

---

## Endpoint-by-Endpoint Reference

### Authentication Endpoints

#### POST `/api/auth/login`
**Pattern**: Nested Structure (Pattern 1)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username",
      "firstName": "First",
      "lastName": "Last",
      "role": "student",
      "learningStyle": "visual",
      "emailVerified": true
    },
    "token": "eyJhbGc...",
    "expiresIn": "24h"
  }
}
```

**Python Access**:
```python
response_data = response.json()
data = response_data['data']
token = data['token']
user_id = data['user']['id']
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

#### POST `/api/auth/register`
**Pattern**: Nested Structure (Pattern 1)
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", ... },
    "token": "...",
    "expiresIn": "24h"
  }
}
```

#### POST `/api/auth/refresh`
**Pattern**: Nested Structure (Pattern 1)
```json
{
  "success": true,
  "data": {
    "token": "...",
    "expiresIn": "24h"
  }
}
```

---

### Notification Endpoints

#### GET `/api/notifications`
**Pattern**: Flat Structure (Pattern 2)
```json
{
  "success": true,
  "notifications": [
    {
      "Id": "uuid",
      "UserId": "uuid",
      "Type": "progress",
      "Title": "Lesson Completed",
      "Message": "You completed...",
      "IsRead": false,
      "CreatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

**Python Access**:
```python
data = response.json()
notifications = data.get('notifications', [])
pagination = data.get('pagination', {})
```

#### GET `/api/notifications/unread-count`
**Pattern**: Flat Structure (Pattern 2)
```json
{
  "success": true,
  "count": 5
}
```

**Python Access**:
```python
data = response.json()
count = data.get('count', 0)
```

#### POST `/api/notifications/test`
**Pattern**: Flat Structure (Pattern 2)
```json
{
  "success": true,
  "message": "Test notification created",
  "notificationId": "uuid"
}
```

**Python Access**:
```python
data = response.json()
notification_id = data.get('notificationId')
```

---

### Settings Endpoints

#### GET `/api/settings/privacy`
**Pattern**: Flat Structure (Pattern 2)
```json
{
  "success": true,
  "settings": {
    "profileVisibility": "public",
    "showEmail": false,
    ...
  }
}
```

#### PATCH `/api/settings/privacy`
**Pattern**: Flat Structure (Pattern 2)
```json
{
  "success": true,
  "message": "Privacy settings updated",
  "settings": { ... }
}
```

#### GET `/api/settings/notifications`
**Pattern**: Flat Structure (Pattern 2)
```json
{
  "success": true,
  "settings": {
    "enableInApp": true,
    "enableEmail": true,
    "emailFrequency": "instant",
    "categories": { ... }
  }
}
```

---

### Enrollment Endpoints

#### GET `/api/enrollment`
**Pattern**: Direct Array (Pattern 3) ⚠️
```json
[
  {
    "Id": "uuid",
    "CourseId": "uuid",
    "CourseTitle": "Course Name",
    "EnrolledAt": "2024-01-01T00:00:00Z"
  }
]
```

**Python Access**:
```python
enrollments = response.json()  # ← Direct array, no 'data' wrapper!
if len(enrollments) > 0:
    course_id = enrollments[0]['CourseId']
```

---

## How to Identify the Pattern

1. **Check the endpoint file** in `server/src/routes/`
2. **Look for the response structure** in the `res.json({...})` call
3. **Key indicators**:
   - Has `success: true` and `data: {...}` = Pattern 1 (Nested)
   - Has `success: true` but no `data` wrapper = Pattern 2 (Flat)
   - Returns array directly = Pattern 3 (Direct)

---

## Testing Checklist

When writing tests that make API calls:

- [ ] Identified which response pattern the endpoint uses
- [ ] Extracted data using the correct nesting level
- [ ] Added null checks for nested access (`.get('data', {})`)
- [ ] Handled error responses appropriately
- [ ] Verified token/auth headers are set correctly
- [ ] Checked status codes match expectations (200 vs 201)

---

## Future Refactoring Recommendation

⚠️ **For maintainability**, consider standardizing all API responses to use Pattern 2:

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

This would eliminate confusion and make the API more consistent. However, this is a breaking change that would require:
1. Updating all route handlers
2. Updating all client-side code
3. Updating all tests
4. Updating all scripts

---

## Files to Check When Adding New Tests

- `tests/conftest.py` - API client fixtures
- `scripts/test-*.js` - Node.js test scripts  
- `client/src/services/*.ts` - Frontend API service layers
- `TESTING_API_INTEGRATION.md` - Test integration guide

---

## Quick Reference

| Endpoint Pattern | Access Method | Example |
|-----------------|---------------|---------|
| `/api/auth/*` | `response.json()['data']['token']` | Login, Register |
| `/api/notifications/*` | `response.json()['notifications']` | Most notification APIs |
| `/api/enrollment` | `response.json()[0]['CourseId']` | Direct array response |

