# Auth Edge Function

This Supabase Edge Function provides authentication services using the Hono framework. It replaces the Next.js API routes in `/pages/api/auth/` with a unified edge function.

## Endpoints

### POST `/login`

Authenticates a user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "callbackUrl": "/dashboard",
  "forceLogin": false,
  "deviceInfo": {
    "browser": "Chrome",
    "os": "macOS",
    "device": "Desktop"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "userName": "John",
      "firstName": "John",
      "lastName": "Doe",
      "type": "user",
      "authType": "email",
      "loginTime": "2024-01-15T10:30:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "redirectUrl": "/dashboard",
    "message": "Login successful"
  }
}
```

### POST `/logout`

Logs out the current user and invalidates their session.

**Request Body:**
```json
{
  "redirectUrl": "/login"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully",
    "redirectUrl": "/login"
  }
}
```

### POST `/oauth-process`

Processes OAuth authentication tokens from external providers.

**Request Body:**
```json
{
  "access_token": "ya29.a0ARrdaM...",
  "refresh_token": "1//04...",
  "expires_at": 1642248000,
  "forceLogin": false,
  "deviceInfo": {
    "browser": "Chrome",
    "os": "macOS"
  },
  "registrationData": {
    "examId": 1,
    "subjectId": 2,
    "boardId": 3,
    "marketingOptIn": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "user_id": 1,
      "email": "user@example.com",
      "user_name": "John",
      "fname": "John",
      "sname": "Doe",
      "type": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### GET `/validate`

Validates an existing session token.

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "valid": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "userName": "John",
    "firstName": "John",
    "lastName": "Doe",
    "type": "user",
    "lastLogin": "2024-01-15T10:30:00Z"
  },
  "expiresAt": "2024-01-22T10:30:00Z",
  "expiresIn": 604800,
  "tokenIssued": "2024-01-15T10:30:00Z",
  "message": "Session is valid"
}
```

### POST `/check-session`

Checks for existing sessions and potential conflicts.

**Request Body:**
```json
{
  "email": "user@example.com",
  "deviceInfo": {
    "browser": "Chrome",
    "os": "macOS",
    "device": "Desktop"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "hasConflict": true,
    "shouldPrompt": true,
    "message": "You have 2 active session(s) on other devices...",
    "activeSessions": [
      {
        "session_id": "abc123",
        "device_info": {
          "browser": "Safari",
          "os": "iOS",
          "device": "Mobile"
        },
        "last_activity": "2024-01-15T09:00:00Z",
        "created_at": "2024-01-15T08:00:00Z",
        "login_method": "oauth"
      }
    ],
    "currentDevice": {
      "browser": "Chrome",
      "os": "macOS",
      "device": "Desktop"
    }
  }
}
```

### GET `/callback`

Handles OAuth callback redirects.

**Query Parameters:**
- `next`: Redirect URL after authentication (default: `/gcse`)

**Response:**
```
302 Redirect to /auth/callback?[query_params]
```

### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy"
  }
}
```

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

Common error codes:
- `401`: Unauthorized
- `403`: Forbidden (blocked user)
- `404`: Not found
- `409`: Conflict (session conflict)
- `500`: Internal server error

## Session Management

The function handles session management including:
- Session creation and validation
- Session conflict detection
- Device tracking
- Session invalidation
- Automatic session cleanup

## Environment Variables

Required environment variables:
- `SUPABASE_URL` or `_SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` or `_SUPABASE_SERVICE_ROLE_KEY`: Service role key
- `JWT_SECRET`: Secret key for JWT signing
- `CORS_ORIGINS`: Allowed CORS origins (default: `*`)

## CORS Configuration

The function is configured to handle CORS properly with credentials support. Allowed origins include:
- `http://localhost:3000` (Next.js development)
- `http://localhost:3001` (Alternative development port)
- `https://exam-revise-ui.vercel.app` (Vercel deployment)
- `https://examrevise.co.uk` (Production domain)
- `https://www.examrevise.co.uk` (Production domain with www)

If you're testing from a different origin, add it to the `allowedOrigins` array in the CORS middleware.

## Testing

Run the test suite:

```bash
deno run --allow-net test.ts
```

### Testing CORS

The test suite includes CORS preflight testing. To manually test CORS:

```bash
# Test CORS preflight
curl -X OPTIONS http://localhost:54321/functions/v1/auth/login \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type, authorization" \
  -v

# Test actual request with CORS
curl -X POST http://localhost:54321/functions/v1/auth/health \
  -H "Origin: http://localhost:3000" \
  -H "Content-Type: application/json" \
  -v
```

## Deployment

### Local Development

1. Start Supabase locally:
```bash
supabase start
```

2. Serve the function locally:
```bash
supabase functions serve auth --env-file .env.local
```

3. Test the function:
```bash
# Test health endpoint
curl http://localhost:54321/functions/v1/auth/health

# Run test suite
deno run --allow-net test.ts
```

### Production Deployment

Deploy to Supabase Edge Functions:

```bash
supabase functions deploy auth --no-verify-jwt
```

Note: The `--no-verify-jwt` flag is used because we handle JWT verification manually in the function.

## Usage from Client

### JavaScript/TypeScript

```javascript
// Login
const loginResponse = await fetch('/functions/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const loginData = await loginResponse.json();
const token = loginData.data.token;

// Validate session
const validateResponse = await fetch('/functions/v1/auth/validate', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const validateData = await validateResponse.json();
```

### cURL

```bash
# Login
curl -X POST https://your-project.supabase.co/functions/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

# Validate session
curl -X GET https://your-project.supabase.co/functions/v1/auth/validate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Migration from Next.js API Routes

This edge function replaces the following Next.js API routes:
- `/pages/api/auth/login.ts` → `POST /auth/login`
- `/pages/api/auth/logout.ts` → `POST /auth/logout`
- `/pages/api/auth/oauth-process.ts` → `POST /auth/oauth-process`
- `/pages/api/auth/validate.ts` → `GET /auth/validate`
- `/pages/api/auth/check-session.ts` → `POST /auth/check-session`
- `/pages/api/auth/callback.ts` → `GET /auth/callback`

Update your client-side code to use the new endpoints with the `/functions/v1/auth/` prefix. 
