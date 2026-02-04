# Dashboard Debugging Steps

## Issue: Submissions not loading on dashboard

I've added comprehensive console logging to help debug this issue. Follow these steps:

## Step 1: Clear Browser Cache and LocalStorage

1. Open your browser and go to `http://localhost:3000`
2. Press **F12** to open DevTools
3. Go to the **Console** tab
4. Type: `localStorage.clear()`
5. Press **Enter**
6. Type: `sessionStorage.clear()`
7. Press **Enter**

## Step 2: Log Out (if logged in)

1. If you're currently logged in, click **Logout** in the navigation
2. This will clear your session

## Step 3: Log In Fresh

1. Go to the login page: `http://localhost:3000/employer/login`
2. Enter:
   - Email: `tcholland123@gmail.com`
   - Password: `TempPassword123!`
3. Click **Login**

## Step 4: Navigate to Dashboard

1. After login, go to: `http://localhost:3000/employer/dashboard`
2. **Keep DevTools Console open** - you'll see debug messages

## Step 5: Check Console Logs

You should see debug messages like:
```
[DEBUG] loadRoles() called
[DEBUG] roles fetch response status: 200
[DEBUG] roles data: [...]
[DEBUG] normalized roles: [...]
[DEBUG] localStorage latest_role_id: ...
[DEBUG] using first role: R-5f690fa9acec
[DEBUG] loadSubmissions() called with roleId: R-5f690fa9acec
[DEBUG] fetching submissions from: /api/employer/roles/R-5f690fa9acec/submissions
[DEBUG] submissions fetch response status: 200
[DEBUG] submissions raw data: [...]
[DEBUG] normalized submissions: [...] count: 3
```

## Step 6: Report What You See

**If submissions load successfully:**
- You should see 3 candidates: John Smith, Sarah Johnson, Michael Chen
- All should have status "Ready" (green)
- Click "Details" on one to test the details page

**If submissions don't load:**
1. Copy ALL console output (right-click in console → "Save as...")
2. Go to **Network** tab in DevTools
3. Look for the request to `/api/employer/roles/R-5f690fa9acec/submissions`
4. Click on it and check:
   - **Status Code** (should be 200)
   - **Response** tab (what data came back)
   - **Headers** tab (check if cookies are being sent)
5. Take screenshots and share them

## Step 7: Test Candidate Details Page

1. Click **Details** on any candidate
2. Check the console for debug messages:
```
[DEBUG] loadCandidate() called for candidateId: A-...
[DEBUG] fetching candidate from: /api/employer/candidates/A-...
[DEBUG] candidate fetch response status: 200
[DEBUG] candidate data: {...}
```

**If details page doesn't load:**
1. Copy console errors
2. Check Network tab for the request to `/api/employer/candidates/[id]`
3. Report the status code and error

## Expected Behavior

### Dashboard should show:
- Role dropdown with "Software Engineer (R-5f690fa9acec)"
- Table with 3 rows:
  1. **John Smith** - john.smith@example.com - Status: Ready
  2. **Sarah Johnson** - sarah.j@example.com - Status: Ready
  3. **Michael Chen** - m.chen@example.com - Status: Ready
- Each row should have "Details" and "PDF" links

### Details page should show:
- Candidate name and email
- Environment scores (if psychometric data exists)
- Notes section
- Tags section
- Feedback section

## Database Verification (Already Done)

The database has been verified to contain:
- ✅ Role: "Software Engineer" (R-5f690fa9acec)
- ✅ Assessment: a0c92d8e529948e881a3d07bab8ebb98 (linked to role)
- ✅ 3 Applicants with pdf_status='success'
- ✅ All properly linked to your employer_id

## Common Issues and Fixes

### Issue: 401 Unauthorized
**Cause:** Not logged in or session expired
**Fix:** Logout and login again

### Issue: 404 Not Found on submissions endpoint
**Cause:** Wrong role_id cached in localStorage
**Fix:** Clear localStorage (Step 1) and refresh

### Issue: Empty array returned
**Cause:** Session has wrong employer_id
**Fix:** Logout, clear cache, login again

### Issue: Network request fails
**Cause:** Backend not running
**Fix:** Check if backend is running on http://127.0.0.1:8001/docs

## Next Steps

Once you've completed these steps, tell me:
1. Did the submissions load? (Yes/No)
2. What console debug messages did you see?
3. What status code did the submissions endpoint return?
4. Did the details page work? (Yes/No)
5. Any error messages?

I'll use this information to fix any remaining issues.
