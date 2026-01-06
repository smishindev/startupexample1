# Testing Pre-Flight Checklist

## Before Writing ANY New Test

### 1. Read Documentation First
- [ ] Read `TESTING_API_INTEGRATION.md` - Authentication, fixtures, common pitfalls
- [ ] Read `API_RESPONSE_PATTERNS.md` - Response structures for all endpoints
- [ ] Check `tests/conftest.py` header comments - Critical warnings about API responses

### 2. Understand Response Structures
- [ ] Check which endpoint you're calling
- [ ] Look up response pattern in `API_RESPONSE_PATTERNS.md`
- [ ] Verify in actual route file: `server/src/routes/<endpoint>.ts`

### 3. Authentication Setup
- [ ] Use `api_client` fixture for student tests
- [ ] Use `api_client_instructor` fixture for instructor tests
- [ ] Never manually create login requests - fixtures handle this
- [ ] Remember: Session already has Authorization header set

### 4. MUI Component Testing
- [ ] All MUI Switch selectors must append ` input`
  ```python
  # ✅ CORRECT
  page.locator('[data-testid="my-switch"] input')
  
  # ❌ WRONG - Will fail with "Not a checkbox"
  page.locator('[data-testid="my-switch"]')
  ```
- [ ] Check if component is visible before interacting
- [ ] Add waits after state changes (`page.wait_for_timeout(300)`)

### 5. Common Mistakes to Avoid

#### ❌ DON'T: Access flat login response
```python
data = login_response.json()
token = data.get('token')  # Returns None!
```

#### ✅ DO: Access nested structure
```python
response_data = login_response.json()
data = response_data.get('data', {})
token = data.get('token')
```

#### ❌ DON'T: Assume initial state
```python
if switch.is_checked():
    switch.uncheck()  # Assumes it's checked
```

#### ✅ DO: Handle any initial state
```python
initial_state = switch.is_checked()
switch.click()  # Toggle regardless of state
assert switch.is_checked() == (not initial_state)
```

#### ❌ DON'T: Expect specific status codes without checking
```python
assert response.status_code == 201  # Some endpoints return 200!
```

#### ✅ DO: Check the actual endpoint documentation
```python
# Check API_RESPONSE_PATTERNS.md or server code
assert response.status_code == 200  # Verified in docs
```

### 6. Test Execution
- [ ] Run single test first: `pytest tests/test_file.py::test_name -v --headed`
- [ ] Use `-s` flag to see print statements
- [ ] Use `-x` flag to stop on first failure
- [ ] Check screenshot in `tests/screenshots/` if test fails
- [ ] Check server console for API errors

### 7. Debugging Failed Tests

#### If login fails (401 TOKEN_INVALID):
1. Check `tests/.env.test` credentials match database
2. Verify fixture extracts token from nested structure
3. Check server console for auth errors

#### If element not found:
1. Verify test-id exists in component: `grep -r "data-testid" client/src`
2. Check if element requires wait: `page.wait_for_selector(..., state='visible')`
3. Take screenshot to see actual page state

#### If switch interaction fails:
1. Verify selector has ` input` appended
2. Check if switch is visible and enabled
3. Add wait time after toggle: `page.wait_for_timeout(300)`

#### If API call fails:
1. Check response structure in `API_RESPONSE_PATTERNS.md`
2. Verify endpoint exists: `grep -r "router.post" server/src/routes`
3. Check if token is in Authorization header
4. Look at server console for detailed error

### 8. Before Committing
- [ ] All tests pass locally
- [ ] No hardcoded credentials (use fixtures)
- [ ] No unnecessary print statements
- [ ] Added comments explaining complex logic
- [ ] Screenshot on failure works
- [ ] Test name is descriptive

## Quick Command Reference

```powershell
# Run all tests in file
pytest tests/test_file.py -v --headed

# Run single test with output
pytest tests/test_file.py::test_name -v --headed -s

# Stop on first failure
pytest tests/test_file.py -v --headed -x

# Run without browser visible (faster)
pytest tests/test_file.py -v

# Generate HTML report
pytest tests/test_file.py -v --html=tests/reports/report.html
```

## Documentation Links

| Document | Purpose |
|----------|---------|
| `TESTING_API_INTEGRATION.md` | Complete testing guide with auth flow |
| `API_RESPONSE_PATTERNS.md` | All API endpoint response structures |
| `tests/conftest.py` | Fixture definitions (read header comments!) |
| `QUICK_REFERENCE.md` | Test users, credentials, common selectors |

## When to Update Documentation

- Added new API endpoint → Update `API_RESPONSE_PATTERNS.md`
- Added new fixture → Add to `tests/conftest.py` with docstring
- Found new pitfall → Add to `TESTING_API_INTEGRATION.md` Common Pitfalls
- New testing pattern → Add to this checklist

## Emergency Contact

If tests are failing and you can't figure out why:
1. Check this checklist first
2. Read the error message completely
3. Check server console logs
4. Look at screenshot in `tests/screenshots/`
5. Verify the API endpoint response structure
6. Check if credentials in `.env.test` are correct

## Success Criteria

✅ You're ready to write tests when:
- You've read all three documentation files
- You understand the two API response patterns
- You know which fixture to use (api_client vs api_client_instructor)
- You know to append ` input` to MUI Switch selectors
- You know how to debug failed tests using screenshots and logs
