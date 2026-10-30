# ReliefPay API Endpoints - Quick Reference

## 🔐 Authentication Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new user | None |
| POST | `/api/auth/login` | Login user | None |
| POST | `/api/auth/logout` | Logout user | JWT |
| POST | `/api/auth/refresh-token` | Refresh JWT token | JWT |
| POST | `/api/auth/forgot-password` | Request password reset | None |
| POST | `/api/auth/reset-password` | Reset password with token | None |
| GET | `/api/auth/me` | Get current user info | JWT |

---

## 👤 User Management Endpoints

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/api/users` | List all users | JWT | ADMIN |
| GET | `/api/users/:id` | Get user by ID | JWT | ADMIN/SELF |
| POST | `/api/users` | Create new user | JWT | ADMIN |
| PUT | `/api/users/:id` | Update user | JWT | ADMIN/SELF |
| DELETE | `/api/users/:id` | Delete user (soft) | JWT | ADMIN |
| PUT | `/api/users/:id/role` | Change user role | JWT | SUPER_ADMIN |
| PUT | `/api/users/:id/password` | Change password | JWT | SELF |

---

## 🏢 Campaign Endpoints

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/api/campaigns` | List all campaigns | None | Public |
| GET | `/api/campaigns/:id` | Get campaign detail | None | Public |
| POST | `/api/campaigns` | Create campaign | JWT | ADMIN |
| PUT | `/api/campaigns/:id` | Update campaign | JWT | ADMIN |
| PATCH | `/api/campaigns/:id/status` | Change campaign status | JWT | ADMIN |
| DELETE | `/api/campaigns/:id` | Delete campaign (soft) | JWT | ADMIN |
| GET | `/api/campaigns/:id/stats` | Get campaign statistics | JWT | ADMIN/REVIEWER |
| GET | `/api/campaigns/:id/applications` | List campaign applications | JWT | ADMIN/REVIEWER |

**Query Parameters:**
- `/api/campaigns?status=ACTIVE` - Filter by status
- `/api/campaigns?disasterType=Flood` - Filter by disaster
- `/api/campaigns?page=1&limit=10` - Pagination

---

## 📋 Application Endpoints

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/api/applications` | List applications | JWT | All roles |
| GET | `/api/applications/:id` | Get application detail | JWT | Owner/ADMIN/REVIEWER |
| POST | `/api/applications` | Create new application | JWT | BENEFICIARY |
| PUT | `/api/applications/:id` | Update application | JWT | OWNER/ADMIN |
| PATCH | `/api/applications/:id/status` | Change status | JWT | ADMIN/REVIEWER |
| DELETE | `/api/applications/:id` | Delete application | JWT | ADMIN/OWNER |

**Filter Parameters (GET /api/applications):**
```
?status=UNDER_REVIEW          // Filter by status
?priority=CRITICAL            // Filter by priority
?disasterType=Flood           // Filter by disaster type
?location=Mumbra              // Filter by location
?submittedAfter=2026-10-01    // Filter by date range
?submittedBefore=2026-10-31   // Filter by date range
?search=Ayesha                // Search beneficiary name
?page=1&limit=10              // Pagination
```

**Sort Parameters:**
```
?sort=submittedAt:desc        // Sort by date (newest first)
?sort=requestedAmount:desc    // Sort by amount (highest first)
?sort=priority:asc            // Sort by priority
```

---

## ✅ Application Status Endpoints

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| PATCH | `/api/applications/:id/approve` | Approve application | JWT | ADMIN/REVIEWER |
| PATCH | `/api/applications/:id/reject` | Reject application | JWT | ADMIN/REVIEWER |
| PATCH | `/api/applications/:id/request-documents` | Request documents | JWT | ADMIN/REVIEWER |
| PATCH | `/api/applications/:id/escalate` | Escalate for investigation | JWT | ADMIN/REVIEWER |

**Request Body Examples:**

Approve:
```json
{
  "approvedAmount": 15000,
  "remarks": "Verified and approved"
}
```

Reject:
```json
{
  "rejectionReason": "Insufficient documentation",
  "suggestions": "Please provide updated bank statement"
}
```

Request Documents:
```json
{
  "requestedDocuments": ["AADHAAR", "INCOME_PROOF"],
  "message": "Please submit updated income proof"
}
```

---

## 📎 Document Endpoints

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| POST | `/api/documents/upload` | Upload file | JWT | BENEFICIARY/ADMIN |
| GET | `/api/documents/:id` | Get document | JWT | Authorized |
| DELETE | `/api/documents/:id` | Delete document | JWT | OWNER/ADMIN |
| GET | `/api/applications/:id/documents` | List app documents | JWT | Authorized |
| POST | `/api/documents/:id/extract-text` | OCR extraction | JWT | ADMIN/REVIEWER |

**Upload (multipart/form-data):**
```
POST /api/documents/upload
Content-Type: multipart/form-data

Fields:
- file (binary)
- applicationId (uuid)
- documentType (AADHAAR | ADDRESS_PROOF | INCOME_PROOF | MEDICAL | DAMAGE_PHOTO | OTHER)

Response:
{
  "id": "doc-uuid",
  "fileUrl": "s3://...",
  "fileName": "aadhaar.pdf",
  "uploadedAt": "2026-10-28T10:30:00Z"
}
```

---

## 🔍 AI Verification Endpoints

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| POST | `/api/ai/verify-application/:id` | Run AI verification | JWT | ADMIN/REVIEWER |
| GET | `/api/applications/:id/ai-findings` | Get AI findings | JWT | ADMIN/REVIEWER |
| POST | `/api/applications/:id/ai-findings/:findingId/mark-reviewed` | Mark finding reviewed | JWT | ADMIN/REVIEWER |
| POST | `/api/applications/:id/ai-findings/:findingId/escalate` | Escalate finding | JWT | ADMIN/REVIEWER |
| POST | `/api/ai/detect-duplicates/:id` | Check for duplicates | JWT | ADMIN/REVIEWER |
| POST | `/api/ai/assess-priority/:id` | Assess priority | JWT | ADMIN/REVIEWER |

**Response Example:**
```json
{
  "applicationId": "RPA-2026-0012",
  "riskLevel": "MEDIUM",
  "findings": [
    {
      "id": "finding-1",
      "severity": "WARNING",
      "title": "Potential Contact Overlap",
      "reason": "Phone matches previous application",
      "affectedFields": ["phone"],
      "isReviewed": false
    }
  ],
  "summary": "Verification complete - human review recommended"
}
```

---

## 🤖 AI Command Centre Endpoints

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| POST | `/api/ai/command` | Process natural language command | JWT | ADMIN/REVIEWER |

**Request:**
```json
{
  "command": "Show all critical applications awaiting review",
  "context": {} // optional
}
```

**Response (Data Type):**
```json
{
  "type": "data",
  "title": "Critical Applications Awaiting Review",
  "data": [
    {
      "applicationId": "RPA-2026-0012",
      "beneficiary": "Ayesha Khan",
      "amount": 15000,
      "priority": "CRITICAL",
      "location": "Mumbra"
    }
  ],
  "agent": "orchestrator"
}
```

**Response (Action Type):**
```json
{
  "type": "action",
  "title": "Disbursement Plan Generated",
  "action": "REVIEW_PAYOUT",
  "summary": "5 eligible beneficiaries identified. Total: ₹87,500. Authorize to proceed?",
  "data": { "payoutId": "PAYOUT-001" }
}
```

---

## 💳 Payment Endpoints

### Transactions

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/api/transactions` | List transactions | JWT | ADMIN/AUDITOR |
| GET | `/api/transactions/:id` | Get transaction detail | JWT | Owner/ADMIN |
| GET | `/api/transactions?status=FAILED` | Filter by status | JWT | ADMIN/AUDITOR |

**Query Parameters:**
```
?type=DONATION              // DONATION | DISBURSEMENT | REFUND
?status=COMPLETED           // COMPLETED | FAILED | PENDING
?dateFrom=2026-10-01        // Date range
?dateTo=2026-10-31          // Date range
?campaignId=uuid            // Filter by campaign
?page=1&limit=20            // Pagination
```

---

### Donations

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/api/donations` | List donations | JWT | ADMIN/AUDITOR |
| POST | `/api/donations` | Create donation | JWT | DONOR |
| GET | `/api/donations/:id` | Get donation detail | JWT | Owner/ADMIN |
| GET | `/api/donations/:id/receipt` | Download receipt | JWT | Owner/ADMIN |

**Create Donation:**
```json
{
  "campaignId": "campaign-uuid",
  "amount": 5000,
  "donorName": "Rohan Mehta",
  "donorEmail": "rohan@example.com",
  "isAnonymous": false,
  "message": "Supporting relief efforts"
}
```

**Response:**
```json
{
  "transactionId": "TXN-12345",
  "approvalUrl": "https://sandbox.paypal.com/checkoutnow/...",
  "status": "PENDING"
}
```

---

### Payouts (Disbursements)

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/api/payouts/pending` | List pending payouts | JWT | ADMIN |
| POST | `/api/payouts/prepare` | Prepare payout batch | JWT | ADMIN (called by AI) |
| POST | `/api/payouts/:id/authorize` | Authorize payout | JWT | ADMIN |
| POST | `/api/payouts/:id/execute` | Execute payout (calls PayPal) | JWT | SYSTEM (after authorization) |
| PATCH | `/api/payouts/:id/status` | Update payout status | JWT | SYSTEM (from webhook) |

**Prepare Payout:**
```json
{
  "campaignId": "campaign-uuid",
  "applicationIds": ["app-1", "app-2", "app-3"],
  "totalBudget": 100000
}
```

**Response:**
```json
{
  "payoutId": "PAYOUT-001",
  "campaignId": "campaign-uuid",
  "totalAmount": 87500,
  "beneficiaryCount": 5,
  "estimatedProcessingTime": "2-4 hours",
  "beneficiaries": [
    {
      "applicationId": "app-1",
      "beneficiaryName": "Rahim Shaikh",
      "amount": 20000,
      "bankAccount": "****4482",
      "status": "VERIFIED"
    }
  ]
}
```

**Authorize Payout:**
```json
{
  "authorizationCode": "12345",
  "adminId": "admin-uuid",
  "remarks": "Approved for disbursement"
}
```

**Response:**
```json
{
  "payoutId": "PAYOUT-001",
  "status": "AUTHORIZED",
  "batchId": "paypal-batch-id-123",
  "message": "PayPal batch initiated",
  "estimatedCompletion": "2 hours"
}
```

---

## 👨‍🌾 Volunteer Endpoints

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/api/volunteers` | List volunteers | JWT | ADMIN |
| GET | `/api/volunteers/:id` | Get volunteer profile | JWT | ADMIN/SELF |
| GET | `/api/volunteers/:id/tasks` | Get volunteer tasks | JWT | VOLUNTEER/ADMIN |
| POST | `/api/volunteers/:id/tasks/:taskId/submit` | Submit task report | JWT | VOLUNTEER |
| PUT | `/api/volunteers/:id/tasks/:taskId` | Update task | JWT | VOLUNTEER/ADMIN |
| GET | `/api/volunteers/:id/tasks/:taskId/report` | Get task report | JWT | ADMIN/REVIEWER |

---

## 📊 Audit & Reporting Endpoints

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/api/audit-logs` | List audit logs | JWT | ADMIN/AUDITOR |
| GET | `/api/audit-logs?action=APPROVED_GRANT` | Filter logs | JWT | ADMIN/AUDITOR |
| GET | `/api/audit-logs?userId=uuid` | Logs by user | JWT | ADMIN/AUDITOR |
| GET | `/api/audit-logs?dateRange=start,end` | Logs by date | JWT | ADMIN/AUDITOR |
| GET | `/api/reports/applications` | Application report | JWT | ADMIN/AUDITOR |
| GET | `/api/reports/financial` | Financial report | JWT | ADMIN/AUDITOR |
| GET | `/api/reports/impact` | Impact report | JWT | ADMIN/AUDITOR |
| POST | `/api/reports/generate` | Generate PDF report | JWT | ADMIN |

**Report Request:**
```json
{
  "reportType": "financial",
  "dateFrom": "2026-10-01",
  "dateTo": "2026-10-31",
  "campaignIds": ["campaign-1", "campaign-2"],
  "format": "PDF"
}
```

---

## 🔔 Notification Endpoints (Optional)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/notifications` | Get user notifications | JWT |
| PATCH | `/api/notifications/:id/read` | Mark as read | JWT |
| PATCH | `/api/notifications/read-all` | Mark all as read | JWT |
| DELETE | `/api/notifications/:id` | Delete notification | JWT |
| PUT | `/api/notifications/preferences` | Update preferences | JWT |

---

## 🎯 WebHook Endpoints

### PayPal Webhooks

**Endpoint:** `POST /webhooks/paypal`
**Signature Verification Required:** Yes (from PayPal)

**Event Types to Handle:**
```
CHECKOUT.ORDER.APPROVED
CHECKOUT.ORDER.COMPLETED
PAYMENT.CAPTURE.COMPLETED
PAYMENT.CAPTURE.DENIED
INVOICING.PAYMENTREMINDER.SENT
```

**Handler Flow:**
1. Receive webhook from PayPal
2. Verify webhook signature
3. Extract event type and resource
4. Update database
5. Return 200 OK
6. (Optional) Send notifications

---

## ⚠️ Error Responses

**All error responses follow this format:**

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "statusCode": 400,
  "details": {
    "field": "email",
    "issue": "Already registered"
  },
  "timestamp": "2026-10-28T10:30:00Z"
}
```

**Common Error Codes:**
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `BAD_REQUEST` (400)
- `VALIDATION_ERROR` (400)
- `DUPLICATE_ENTRY` (409)
- `INTERNAL_ERROR` (500)

---

## 📊 Pagination Format

**Request:**
```
GET /api/applications?page=1&limit=10&sort=submittedAt:desc
```

**Response:**
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 125,
    "pages": 13,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## 🔐 Authentication Header

**Format:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Example:**
```
GET /api/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📝 Rate Limiting

**Default Limits:**
- 100 requests per minute per IP
- 1000 requests per hour per user

**Response Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1635533045
```

---

## 🧪 Testing with cURL/Postman

### Login Example:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alok.v@reliefpay.org",
    "password": "password123"
  }'
```

### Get Applications:
```bash
curl -X GET "http://localhost:5000/api/applications?status=UNDER_REVIEW" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create Application:
```bash
curl -X POST http://localhost:5000/api/applications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "campaignId": "uuid",
    "disasterType": "Flood",
    "requestedAmount": 15000,
    ...
  }'
```

---

## 📚 Summary by Role

### Admin Can Access:
✅ All GET endpoints
✅ All POST/PUT for applications, campaigns
✅ Payment authorization endpoints
✅ AI command centre
✅ Audit logs
✅ User management

### Reviewer Can Access:
✅ GET applications
✅ PATCH application status
✅ GET AI findings
✅ AI verification endpoints
✅ Limited audit logs

### Beneficiary Can Access:
✅ GET own applications
✅ POST new applications
✅ Upload documents
✅ View own dashboard

### Donor Can Access:
✅ POST donations
✅ GET donation history
✅ GET donation receipts

### Volunteer Can Access:
✅ GET own tasks
✅ POST task reports
✅ GET task history

### Auditor Can Access:
✅ GET all applications (read-only)
✅ GET all transactions (read-only)
✅ GET audit logs
✅ GET reports

---

**Last Updated:** October 30, 2026
**Version:** 1.0

