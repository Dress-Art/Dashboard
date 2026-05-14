# Fix: Password Reset Link Expired Error

## Problem
When testing password reset, clicking the email link shows:
```
error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired
```

## Root Cause
The Supabase project isn't configured to accept the redirect URL `https://dashboard.dressart.studio/reset-password`. The code expires because Supabase doesn't recognize the redirect domain.

## Solution

### Step 1: Configure Site URL in Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your DressArt project
3. Go to **Authentication** → **URL Configuration**
4. Under **Site URL**, enter: `https://dashboard.dressart.studio`
5. Click **Save**

### Step 2: Add Redirect URL (if needed)

1. Still in **URL Configuration**
2. Under **Redirect URLs**, add: `https://dashboard.dressart.studio/reset-password`
3. Save

### Step 3: Environment Variable Check

Ensure your deployed environment has:
```env
NEXT_PUBLIC_SITE_URL=https://dashboard.dressart.studio
```

This is used by the `resetPassword()` function in [src/hooks/useAuth.ts](src/hooks/useAuth.ts) to construct the redirect URL.

### Step 4: Test Locally

For local testing, you may need:
```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## How It Works

1. User enters email on `/forgot-password`
2. `resetPassword(email)` is called from [src/hooks/useAuth.ts](src/hooks/useAuth.ts)
3. Supabase sends email with link pointing to:
   ```
   https://dashboard.dressart.studio/reset-password?code=<token>&type=recovery
   ```
4. User clicks link, lands on `/reset-password`
5. Page exchanges `code` for session via `exchangeCodeForSession(code)`
6. Form appears for new password
7. `updatePassword(newPassword)` saves new password

## UI Improvements Made

The reset password page now:
- ✅ Displays error message if link is invalid/expired
- ✅ Shows "Request new link" button to try again
- ✅ Handles PKCE code exchange properly
- ✅ Catches `error_description` from URL params

## Testing Checklist

- [ ] Site URL configured in Supabase
- [ ] Redirect URLs configured in Supabase  
- [ ] `NEXT_PUBLIC_SITE_URL` env var set (deployed + local)
- [ ] Fresh password reset email requested
- [ ] Link clicked immediately (don't wait >1 hour)
- [ ] New password form appears
- [ ] Password updated successfully

## Common Issues

| Issue | Solution |
|-------|----------|
| Still getting `otp_expired` | Wait 10 seconds after requesting link, or check Site URL in Supabase |
| Link works but shows blank page | Ensure `NEXT_PUBLIC_SITE_URL` matches the domain in the email link |
| Code exchange fails | Check browser console for detailed error message |
