# API Specification

Base URL: `/api` (Next.js route handlers)
Parser URL: `http://localhost:8000` (FastAPI microservice)

## Authentication

All protected routes require a `Authorization: Bearer <token>` header.

---

## Auth

### POST /api/auth/register
Register a new user.

**Body:** `{ email, password, name }`
**Response:** `{ user: User, token: string }`

### POST /api/auth/login
Login with email and password.

**Body:** `{ email, password }`
**Response:** `{ user: User, token: string }`

### POST /api/auth/logout
Invalidate the current session.

### POST /api/auth/forgot-password
Send a password reset email.

**Body:** `{ email }`

### POST /api/auth/reset-password
Reset password using a token.

**Body:** `{ token, password }`

### GET /api/auth/me
Get the current authenticated user.

**Response:** `{ user: User }`

---

## Files

### POST /api/files/upload
Upload a PDF or Excel file. Triggers parsing via the Python microservice.

**Body:** `multipart/form-data` with `file` field
**Response:** `{ file: FileMetadata }`

### GET /api/files
List the authenticated user's files.

**Query:** `?page=1&limit=20&status=done`
**Response:** `{ files: FileMetadata[], total: number }`

### GET /api/files/:id
Get file metadata and parsed data.

**Response:** `{ file: FileMetadata }`

### DELETE /api/files/:id
Delete a file and its associated data.

---

## Budget / Report

### GET /api/budget/:fileId
Get the full parsed budget data for a file.

**Response:** `BudgetData`

### GET /api/budget/:fileId/summary
Get only the summary section.

**Response:** `BudgetSummary`

### GET /api/budget/:fileId/anomalies
Get items flagged as anomalies. **[Pro only]**

**Response:** `{ items: BudgetItem[] }`

### GET /api/budget/:fileId/export/csv
Export budget data as CSV.

**Response:** `text/csv`

### GET /api/budget/:fileId/export/pdf
Export budget report as PDF. **[Pro only]**

**Response:** `application/pdf`

---

## Compare [Pro only]

### POST /api/compare
Compare two budget files side-by-side.

**Body:** `{ fileId1: string, fileId2: string }`
**Response:** `{ comparison: ComparisonResult }`

---

## Subscription

### GET /api/subscription
Get the current user's subscription plan.

### POST /api/subscription/checkout
Create a payment checkout session.

### POST /api/subscription/cancel
Cancel the current subscription.

### GET /api/subscription/history
Get payment history.

---

## Admin

### GET /api/admin/stats
System overview statistics.

### GET /api/admin/users
List all users with search and pagination.

**Query:** `?q=&page=1&limit=20&role=`

### GET /api/admin/users/:id
Get user detail and usage history.

### PATCH /api/admin/users/:id
Update user role or ban status.

**Body:** `{ role?: Role, banned?: boolean }`

### GET /api/admin/files
List all files in the system.

### GET /api/admin/subscriptions
List all active subscriptions.

### GET /api/admin/logs
Get system logs and errors.

---

## Parser Microservice (FastAPI)

### GET /parse/health
Health check.

### POST /parse/pdf
Parse a PDF file and return structured BudgetData.

**Body:** `multipart/form-data` with `file` field

### POST /parse/excel
Parse an Excel file and return structured BudgetData.

**Body:** `multipart/form-data` with `file` field
