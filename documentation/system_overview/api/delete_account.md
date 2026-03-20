# Delete User Account

Permanently deletes the authenticated user's account, including their auth credentials and profile data.

## Endpoint

```
DELETE /api/users/delete-account
```

## Authentication

Requires a valid Supabase session. Include the access token in the Authorization header or ensure session cookies are sent with the request.

## Headers

| Header        | Required | Description                                  |
|---------------|----------|----------------------------------------------|
| Authorization | Yes*     | Bearer <access_token>                        |
| Cookie        | Yes*     | Session cookies (if using cookie-based auth) |

*One of these authentication methods is required.

## Request Body

None.

## Response

### Success (200)

```json
{
  "success": true
}
```

### Unauthorized (401)

```json
{
  "error": "Unauthorized"
}
```

### Server Error (500)

```json
{
  "error": "Failed to delete account"
}
```

## Example

```bash
curl -X DELETE https://staging.pickleco.mx/api/users/delete-account \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Notes

- This action is irreversible
- Deletes both the Supabase auth record and the user profile
- The user will be immediately signed out after deletion
- Related data (reservations, registrations, etc.) may be orphaned depending on cascade rules

## Environments

| Environment | URL |
|-------------|-----|
| Production  | `https://www.thepickleco.mx/api/users/delete-account` |
| Staging     | `https://staging.pickleco.mx/api/users/delete-account` |
