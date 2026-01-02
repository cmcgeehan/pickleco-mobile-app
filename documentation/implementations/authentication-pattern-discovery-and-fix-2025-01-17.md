# Authentication Pattern Discovery and Fix (2025-01-17)

## Project Summary
**Status**: ✅ COMPLETED - Working Authentication Pattern Successfully Implemented
**Duration**: Single session
**Outcome**: Successfully identified and implemented the working authentication pattern used by event spotlight functionality

## Problem Description
The `/api/play?view=my_registrations` endpoint was returning 401 Unauthorized despite the user being properly authenticated on the client-side. The issue was a disconnect between client-side authentication (which was working) and server-side session reading (which was failing).

## Root Cause Analysis
Multiple authentication approaches were attempted and failed:

1. **Initial Issue**: Row Level Security (RLS) policies blocking access to users table
2. **First Fix**: Switched from `createServerClient` to `createRouteHandlerClient` 
3. **Second Issue**: API route couldn't read server-side sessions despite middleware processing cookies
4. **Investigation**: Discovered that the working event spotlight uses a completely different authentication pattern

## Key Discovery
**The working authentication pattern in this codebase is:**
1. **Client-side authentication**: Use `useAuthStore()` to get user (reliable)
2. **API calls**: Pass `user_id` as query parameter or in request body
3. **Server-side**: Use `createAdminClient()` (bypasses authentication issues)

**DO NOT use server-side session reading** with `createRouteHandlerClient` or `createServerClient` - this approach is unreliable in this codebase.

## Solution Implemented

### Backend Changes
- Updated `/api/play` route to use `createAdminClient()` instead of trying to read server-side sessions
- Modified route to expect `user_id` in query parameters
- Removed complex cookie handling and session reading logic

### Frontend Changes  
- Updated `UserRegistrations` component to pass `user_id` when calling the API
- Changed API call from `/api/play?view=my_registrations&type=${activeTab}` to `/api/play?view=my_registrations&type=${activeTab}&user_id=${user.id}`

## Technical Details

### Why Server-Side Sessions Failed
- Middleware was processing cookies but API route couldn't read them
- `createRouteHandlerClient` and `createServerClient` had cookie handling mismatches
- Complex authentication flow between middleware and API routes was unreliable

### Why Admin Client Approach Works
- `createAdminClient()` uses service role key, bypassing authentication issues
- User ID is explicitly passed, eliminating authentication ambiguity
- Same pattern used by working endpoints (event registration, etc.)
- Simpler and more reliable than complex session reading

## Files Modified
1. `apps/web/app/api/play/route.ts` - Updated to use admin client and expect user_id
2. `apps/web/components/user-registrations.tsx` - Updated to pass user_id in API call

## Test Results
✅ **API Test Success**: Endpoint now returns user registrations with correct data structure
✅ **Authentication Working**: Uses proven working pattern from event spotlight
✅ **Data Flow**: Client → user ID → admin client → registrations returned

## Lessons Learned
1. **"Don't fix what's broken, copy what's working!"** - The solution was to copy the exact authentication pattern used by working functionality
2. **Client-side authentication is reliable** - `useAuthStore()` works consistently
3. **Server-side session reading is unreliable** - Avoid complex cookie/session handling in this codebase
4. **Admin client bypasses authentication issues** - Use `createAdminClient()` for authenticated operations
5. **Explicit user ID passing is better** - More reliable than trying to read sessions

## Future Development Guidelines
When implementing new authenticated API endpoints:

1. **Use the working pattern**: Client-side auth + user ID in request + admin client
2. **Don't reinvent authentication**: Copy the proven approach from event spotlight
3. **Keep it simple**: Avoid complex server-side session reading
4. **Test with real data**: Ensure the endpoint works with actual user IDs

## Related Documentation
- Updated `.cursor/rules/general.mdc` with the working authentication pattern
- This solution follows the same approach as `/api/events/register` and `/api/events/unregister` endpoints

---

*This project successfully resolved a complex authentication issue by discovering and implementing the working authentication pattern used throughout the codebase.*
