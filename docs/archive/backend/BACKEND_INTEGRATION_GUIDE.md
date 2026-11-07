# ReliefPay Backend Integration Guide
## For Backend Development Team

---

## 📋 Overview

This document outlines all backend requirements for ReliefPay, an AI-powered agentic relief finance platform. The frontend is 100% complete and waiting for backend integration.

**Frontend Status:** ✅ Complete (13+ pages, all routes defined)
**Backend Status:** ⏳ Ready for integration points

---

## 🎯 Backend Architecture Overview

```
Frontend (React) 
    ↓
API Gateway (Node.js/Python)
    ↓
┌─────────────────────────────────────┐
│  Core Services                      │
├─────────────────────────────────────┤
│ • Auth Service (JWT)                │
│ • User Service (6 roles)            │
│ • Application Service               │
│ • Campaign Service                  │
│ • Payment Service                   │
│ • Transaction Service               │
│ • Notification Service              │
│ • AI Agent Service                  │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  External Integrations              │
├─────────────────────────────────────┤
│ • PayPal Checkout API               │
│ • PayPal Payouts API                │
│ • PayPal Webhooks                   │
│ • Anthropic Claude API              │
│ • OpenAI API (optional)             │
│ • AWS S3 (file storage)             │
│ • SendGrid (email)                  │
│ • Twilio (SMS)                      │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  Database                           │
├─────────────────────────────────────┤
│ • PostgreSQL (primary)              │
│ • Redis (caching)                   │
│ • Elasticsearch (search)            │
└─────────────────────────────────────┘
```

---

## 🗄 Database Schema Requirements

### 1. Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  passwordHash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role ENUM('ADMIN', 'REVIEWER', 'BENEFICIARY', 'DONOR', 'VOLUNTEER', 'AUDITOR'),
  organization VARCHAR(255),
  profileImage URL,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  isActive BOOLEAN,
  lastLogin TIMESTAMP
);
```

### 2. Campaigns Table
```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  disasterType VARCHAR(100),
  location VARCHAR(255),
  coordinates POINT (latitude, longitude),
  targetAmount DECIMAL(15,2),
  raisedAmount DECIMAL(15,2),
  disbursedAmount DECIMAL(15,2),
  status ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CLOSED'),
  startDate DATE,
  endDate DATE,
  organizationId UUID FOREIGN KEY,
  coverImage URL,
  beneficiariesCount INT,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### 3. Beneficiary Applications Table
```sql
CREATE TABLE applications (
  id UUID PRIMARY KEY,
  applicationId VARCHAR(50) UNIQUE NOT NULL, -- e.g., RPA-2026-0012
  campaignId UUID FOREIGN KEY,
  beneficiaryId UUID FOREIGN KEY,
  
  -- Personal Info
  fullName VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pinCode VARCHAR(10),
  
  -- Household
  familySize INT,
  dependents INT,
  occupation VARCHAR(100),
  monthlyIncome DECIMAL(12,2),
  
  -- Disaster Info
  emergencyType VARCHAR(100),
  disasterType VARCHAR(100),
  disasterLocation VARCHAR(255),
  
  -- Damage Assessment
  propertyDamageLevel ENUM('MINIMAL', 'MODERATE', 'SEVERE', 'TOTAL'),
  damageDescription TEXT,
  estimatedDamage DECIMAL(15,2),
  
  -- Assistance
  assistanceCategory VARCHAR(100),
  requestedAmount DECIMAL(15,2),
  approvedAmount DECIMAL(15,2),
  justification TEXT,
  
  -- Bank Details (encrypted)
  bankName VARCHAR(100),
  accountHolder VARCHAR(255),
  accountNumber VARCHAR(20) ENCRYPTED,
  ifscCode VARCHAR(11),
  
  -- Status
  status ENUM('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DOCUMENT_REQUESTED'),
  priority ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'NORMAL'),
  aiRiskLevel ENUM('LOW', 'MEDIUM', 'HIGH'),
  
  -- Tracking
  submittedAt TIMESTAMP,
  reviewedAt TIMESTAMP,
  reviewedBy UUID FOREIGN KEY (users.id),
  rejectionReason TEXT,
  
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### 4. AI Findings Table
```sql
CREATE TABLE aiFindings (
  id UUID PRIMARY KEY,
  applicationId UUID FOREIGN KEY,
  severity ENUM('WARNING', 'INFO', 'SUCCESS'),
  title VARCHAR(255),
  reason TEXT,
  affectedFields JSON, -- ['phone', 'address', etc]
  isReviewed BOOLEAN,
  isEscalated BOOLEAN,
  reviewedAt TIMESTAMP,
  reviewedBy UUID FOREIGN KEY,
  createdAt TIMESTAMP
);
```

### 5. Documents Table
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  applicationId UUID FOREIGN KEY,
  documentType ENUM('AADHAAR', 'ADDRESS_PROOF', 'INCOME_PROOF', 'MEDICAL', 'DAMAGE_PHOTO', 'OTHER'),
  fileUrl URL,
  fileName VARCHAR(255),
  fileSize INT,
  contentType VARCHAR(50),
  uploadedAt TIMESTAMP,
  extractedText TEXT, -- For OCR processing
  createdAt TIMESTAMP
);
```

### 6. Transactions Table
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  transactionId VARCHAR(50) UNIQUE NOT NULL, -- TXN-XXXXX
  type ENUM('DONATION', 'DISBURSEMENT', 'REFUND'),
  amount DECIMAL(15,2),
  currency VARCHAR(3) DEFAULT 'INR',
  
  -- PayPal Integration
  paypalTransactionId VARCHAR(255),
  paypalBatchId VARCHAR(255),
  paypalStatus VARCHAR(50), -- From PayPal webhooks
  
  -- References
  campaignId UUID FOREIGN KEY,
  applicationId UUID FOREIGN KEY (optional, for disbursements),
  donorId UUID FOREIGN KEY (optional, for donations),
  beneficiaryId UUID FOREIGN KEY (optional, for disbursements),
  
  -- Status
  status ENUM('CREATED', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED'),
  failureReason TEXT,
  
  -- Payment Method
  paymentMethod ENUM('PAYPAL_CHECKOUT', 'PAYPAL_PAYOUT', 'BANK_TRANSFER'),
  
  -- Timestamps
  initiatedAt TIMESTAMP,
  completedAt TIMESTAMP,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### 7. Donations Table
```sql
CREATE TABLE donations (
  id UUID PRIMARY KEY,
  transactionId UUID FOREIGN KEY,
  campaignId UUID FOREIGN KEY,
  donorId UUID FOREIGN KEY,
  donorName VARCHAR(255),
  donorEmail VARCHAR(255),
  amount DECIMAL(15,2),
  isAnonymous BOOLEAN,
  message TEXT,
  receiptUrl URL,
  createdAt TIMESTAMP
);
```

### 8. Volunteer Tasks Table
```sql
CREATE TABLE volunteerTasks (
  id UUID PRIMARY KEY,
  volunteerId UUID FOREIGN KEY,
  applicationId UUID FOREIGN KEY,
  beneficiaryName VARCHAR(255),
  area VARCHAR(255),
  status ENUM('ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'REVIEWED', 'COMPLETED'),
  taskType ENUM('FIELD_VERIFICATION', 'DOCUMENT_COLLECTION', 'DAMAGE_ASSESSMENT'),
  assignedAt TIMESTAMP,
  dueDate DATE,
  completedAt TIMESTAMP,
  notes TEXT,
  reportUrl URL,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### 9. Audit Logs Table
```sql
CREATE TABLE auditLogs (
  id UUID PRIMARY KEY,
  userId UUID FOREIGN KEY,
  action VARCHAR(100),
  entityType VARCHAR(50), -- 'Application', 'Transaction', etc
  entityId UUID,
  changes JSON, -- Before/after values
  timestamp TIMESTAMP,
  ipAddress VARCHAR(50),
  userAgent TEXT
);
```

### 10. AI Agent Interactions Table
```sql
CREATE TABLE aiAgentInteractions (
  id UUID PRIMARY KEY,
  userId UUID FOREIGN KEY,
  agent VARCHAR(50), -- 'orchestrator', 'verification', 'allocation', 'payment', 'procurement'
  command TEXT, -- User's natural language input
  response TEXT,
  responseType ENUM('TEXT', 'DATA', 'ACTION'),
  executedAction VARCHAR(100),
  timestamp TIMESTAMP
);
```

---

## 🔌 API Endpoints Required

### Authentication Endpoints
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh-token
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/me (get current user)
```

### User Management Endpoints
```
GET    /api/users (list all users - admin only)
GET    /api/users/:id
PUT    /api/users/:id
DELETE /api/users/:id (soft delete)
PUT    /api/users/:id/role (change role - super admin only)
```

### Campaign Endpoints
```
GET    /api/campaigns (public - list all active)
GET    /api/campaigns/:id
POST   /api/campaigns (create - admin only)
PUT    /api/campaigns/:id (update - admin only)
DELETE /api/campaigns/:id (soft delete)
GET    /api/campaigns/:id/stats (campaign statistics)
GET    /api/campaigns/:id/applications (list campaign applications)
```

### Beneficiary & Application Endpoints
```
GET    /api/applications (list - filtered by role)
GET    /api/applications/:id (detail view)
POST   /api/applications (create new application)
PUT    /api/applications/:id (update application)
PATCH  /api/applications/:id/status (change status)
PATCH  /api/applications/:id/approve (approve - admin)
PATCH  /api/applications/:id/reject (reject with reason)

GET    /api/applications/:id/ai-findings
POST   /api/applications/:id/ai-findings/mark-reviewed
POST   /api/applications/:id/ai-findings/escalate

GET    /api/beneficiaries
POST   /api/beneficiaries/register
GET    /api/beneficiaries/:id
PUT    /api/beneficiaries/:id
```

### Document Endpoints
```
POST   /api/documents/upload (file upload - multipart)
GET    /api/documents/:id
DELETE /api/documents/:id
GET    /api/applications/:id/documents
POST   /api/documents/:id/extract-text (OCR - admin/reviewer)
```

### Transaction & Payment Endpoints
```
GET    /api/transactions
GET    /api/transactions/:id
GET    /api/transactions?status=FAILED (filter by status)
POST   /api/transactions/refund/:id

GET    /api/donations
POST   /api/donations (create donation - calls PayPal)
GET    /api/donations/:id
GET    /api/donations/:id/receipt

-- Disbursement (AI-prepared, human-authorized)
GET    /api/payouts/pending
POST   /api/payouts/prepare (AI prepares batch)
POST   /api/payouts/:id/authorize (human authorizes with code)
POST   /api/payouts/:id/execute (actually calls PayPal Payouts)
```

### Volunteer Task Endpoints
```
GET    /api/volunteers
GET    /api/volunteers/:id/tasks
POST   /api/volunteers/:id/tasks/:taskId/submit (submit report)
PUT    /api/volunteers/:id/tasks/:taskId (update task)
GET    /api/volunteers/:id/tasks/:taskId/report
```

### AI Agent Endpoints
```
POST   /api/ai/command (process natural language command)
  Request: { command: "Show all critical applications" }
  Response: { type: 'data', data: [...], agent: 'orchestrator' }

POST   /api/ai/verify-application/:id (run AI verification)
POST   /api/ai/prepare-payout (prepare disbursement batch)
POST   /api/ai/detect-duplicates/:applicationId
POST   /api/ai/assess-priority/:applicationId
```

### Audit & Reporting Endpoints
```
GET    /api/audit-logs (admin/auditor only)
GET    /api/audit-logs?action=APPROVED_GRANT
GET    /api/audit-logs?userId=xxx
GET    /api/audit-logs?dateRange=2026-10-01,2026-10-31

GET    /api/reports/applications
GET    /api/reports/financial
GET    /api/reports/impact
POST   /api/reports/generate (generate PDF)
```

---

## 🔐 Authentication & Authorization

### JWT Token Structure
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "name": "User Name",
  "role": "ADMIN",
  "organization": "org-id",
  "iat": 1635533045,
  "exp": 1635619445,
  "iss": "reliefpay-backend"
}
```

### Role-Based Access Control (RBAC)
```
ADMIN:
  ├── Create campaigns
  ├── View all applications
  ├── Approve/reject applications
  ├── Authorize payments
  ├── Access AI Command Centre
  ├── View all transactions
  ├── Manage users
  └── Generate reports

REVIEWER:
  ├── View assigned applications
  ├── Review AI findings
  ├── Request additional documents
  ├── Approve/reject applications
  └── View audit logs

BENEFICIARY:
  ├── Register profile
  ├── Submit applications
  ├── Upload documents
  ├── View own applications
  └── Track payment status

DONOR:
  ├── View public campaigns
  ├── Make donations
  ├── View donation history
  ├── Download receipts
  └── View impact reports

VOLUNTEER:
  ├── View assigned tasks
  ├── Submit field reports
  ├── Upload photos
  └── View task history

AUDITOR:
  ├── View all transactions
  ├── View all applications
  ├── Access audit logs
  ├── Generate reports
  └── No approval power
```

### Security Requirements
- ✅ HTTPS everywhere
- ✅ JWT with 15-min expiry, 7-day refresh
- ✅ Bcrypt password hashing
- ✅ Account number encryption (at-rest)
- ✅ Rate limiting (100 req/min per IP)
- ✅ CORS with frontend domain
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection (sanitize inputs)
- ✅ CSRF tokens for state-changing operations

---

## 💳 PayPal Integration Points

### 1. PayPal Checkout (Donations)

**Flow:**
1. Frontend shows donation amount
2. User clicks "Donate"
3. Backend creates PayPal Checkout session
4. User redirected to PayPal
5. After approval, webhook updates transaction status
6. Frontend shows confirmation

**Implementation:**
```javascript
POST /api/donations
{
  "campaignId": "uuid",
  "amount": 5000,
  "donorName": "Rohan Mehta",
  "donorEmail": "donor@example.com",
  "isAnonymous": false
}

Response:
{
  "approvalUrl": "https://www.sandbox.paypal.com/...",
  "transactionId": "TXN-12345"
}
```

**Webhook:**
```
PayPal POST /webhooks/paypal
{
  "event_type": "CHECKOUT.ORDER.APPROVED",
  "resource": {
    "id": "paypal-order-id",
    "status": "APPROVED",
    "purchase_units": [
      {
        "amount": { "value": "5000.00", "currency_code": "INR" }
      }
    ]
  }
}
→ Update transaction status to COMPLETED
```

### 2. PayPal Payouts (Disbursements)

**Flow:**
1. Admin reviews pending beneficiary list
2. AI prepares batch payout
3. Frontend shows payout preview
4. Admin enters authorization code
5. Backend initiates PayPal Payouts batch
6. Webhook updates each transaction status

**Implementation:**
```javascript
POST /api/payouts/prepare
{
  "campaignId": "uuid",
  "applicationIds": ["app-1", "app-2", "app-3"]
}

Response:
{
  "payoutId": "PAYOUT-001",
  "beneficiaries": [
    {
      "applicationId": "app-1",
      "beneficiaryName": "Rahim",
      "amount": 20000,
      "bankAccount": "xxx-xxx-4482"
    }
  ],
  "totalAmount": 87500,
  "estimatedProcessingTime": "2-4 hours"
}

POST /api/payouts/PAYOUT-001/authorize
{
  "authorizationCode": "12345",
  "adminId": "uuid"
}

Response:
{
  "status": "AUTHORIZED",
  "batchId": "paypal-batch-id",
  "message": "PayPal batch initiated"
}
```

**Webhook:**
```
PayPal POST /webhooks/paypal
{
  "event_type": "INVOICING.PAYMENTREMINDER.SENT",
  "resource": {
    "id": "paypal-payout-batch-id",
    "status": "PROCESSING",
    "items": [
      {
        "recipient_type": "EMAIL",
        "recipient_wallet": "beneficiary@example.com",
        "amount": { "value": "20000", "currency_code": "INR" },
        "status": "SUCCESS"
      }
    ]
  }
}
→ Update transaction statuses
→ Update application status to DISBURSED
→ Send notification to beneficiary
```

### 3. PayPal Webhooks Setup

**Required Webhooks:**
```
✅ CHECKOUT.ORDER.APPROVED (donation approved)
✅ CHECKOUT.ORDER.COMPLETED (donation completed)
✅ PAYMENT.CAPTURE.COMPLETED (donation captured)
✅ PAYMENT.CAPTURE.DENIED (donation failed)
✅ INVOICING.PAYMENTREMINDER.SENT (payout status)
✅ INVOICING.INVOICE.PAYMENT_REMINDER (payout batch)
```

**Webhook Handler:**
```javascript
POST /webhooks/paypal
Header: PayPal-Transmission-Sig (validate signature)

1. Verify webhook signature with PayPal
2. Extract event_type and resource
3. Update database based on status
4. Send notifications
5. Return 200 OK
```

---

## 🤖 AI Integration Points

### 1. AI Command Centre

**Flow:**
1. Admin types natural language command
2. Backend sends to Claude API
3. Claude interprets command
4. Backend fetches relevant data
5. Backend formats response
6. Frontend displays results

**Implementation:**
```javascript
POST /api/ai/command
{
  "command": "Show all critical applications awaiting review",
  "userId": "uuid"
}

Processing:
1. Send to Claude: "Interpret this command: {command}"
2. Claude responds: { intent: "list_applications", filters: { priority: "CRITICAL", status: "UNDER_REVIEW" } }
3. Query database with filters
4. Format results into table/cards
5. Return to frontend

Response:
{
  "type": "data",
  "title": "Critical Applications Awaiting Review",
  "data": [
    { "applicationId": "RPA-2026-0012", "beneficiary": "Ayesha", "amount": 15000, ... }
  ],
  "agent": "orchestrator"
}
```

### 2. AI Verification

**Flow:**
1. Application submitted
2. Backend sends to Claude + Document Processor
3. Claude extracts & analyzes documents
4. Claude detects duplicates (by phone, name, address)
5. Claude flags inconsistencies
6. Claude generates risk score
7. Frontend displays findings

**Implementation:**
```javascript
POST /api/ai/verify-application/:id
{
  "applicationId": "RPA-2026-0012"
}

Processing:
1. Fetch application & documents
2. Extract text from documents (OCR)
3. Send to Claude for analysis:
   - Extract names, dates, amounts
   - Check for inconsistencies
   - Compare against recent applications
   - Generate risk assessment
4. Query database for potential duplicates (name/phone/address)
5. Combine findings

Response:
{
  "riskLevel": "MEDIUM",
  "findings": [
    {
      "id": "finding-1",
      "severity": "WARNING",
      "title": "Potential Contact Overlap",
      "reason": "Phone number matches application RPA-2026-0010 from 2025",
      "affectedFields": ["phone"]
    }
  ],
  "summary": "Application appears legitimate but phone overlap needs verification"
}
```

### 3. Smart Priority Assessment

**Flow:**
1. Application submitted
2. Claude analyzes damage level, family size, income, etc.
3. Claude generates priority score (1-5)
4. Backend stores priority level

**Implementation:**
```javascript
POST /api/ai/assess-priority/:id
{
  "applicationId": "RPA-2026-0012"
}

Claude Assessment Factors:
- Disaster severity
- Property damage level
- Medical emergencies
- Family size
- Dependents (children, elderly, disabled)
- Loss of primary income
- Urgency

Response:
{
  "priority": "CRITICAL",
  "score": 4.8,
  "explanation": "Medical emergency + severe property damage + 5-person household"
}
```

---

## 📧 Notification Service

### Email Templates Needed

```
1. Application Submitted
   - To: Beneficiary
   - Subject: "Your emergency application (RPA-XXXX) has been received"
   - Body: Application ID, status, next steps

2. Application Under Review
   - To: Beneficiary
   - Subject: "Your application is being reviewed"

3. Documents Requested
   - To: Beneficiary
   - Subject: "Additional documents needed for RPA-XXXX"
   - Body: List of required documents

4. Application Approved
   - To: Beneficiary
   - Subject: "Your application RPA-XXXX has been approved!"
   - Body: Approved amount, payment timeline

5. Application Rejected
   - To: Beneficiary
   - Subject: "Application update: RPA-XXXX"
   - Body: Reason for rejection

6. Payment Initiated
   - To: Beneficiary
   - Subject: "Your assistance payment has been sent"
   - Body: Amount, expected delivery

7. Donation Successful
   - To: Donor
   - Subject: "Your donation of ₹{amount} received"
   - Body: Receipt, impact info

8. Campaign Update
   - To: Donors
   - Subject: "{Campaign}: {milestone} reached!"
   - Body: Progress update, impact
```

### SMS Notifications

```
1. OTP (for 2FA): "Your ReliefPay OTP is: {code}. Valid for 10 minutes."
2. Application: "Your application RPA-XXXX submitted. Status: Under Review. Track: [link]"
3. Payment: "₹{amount} sent to your account. Reference: TXN-12345"
```

---

## 🔧 Implementation Checklist

### Phase 1: Core Setup (Week 1)
- [ ] Set up Node.js/Express or Python/FastAPI backend
- [ ] Set up PostgreSQL database
- [ ] Create database schema (10 tables above)
- [ ] Set up Redis cache
- [ ] Implement JWT authentication
- [ ] Create user management service
- [ ] Set up environment variables (.env)

### Phase 2: Campaign & Application APIs (Week 2)
- [ ] Campaign CRUD endpoints
- [ ] Application submission endpoint
- [ ] Document upload endpoint
- [ ] Application listing & filtering
- [ ] Application approval/rejection flow
- [ ] Database migrations

### Phase 3: Payment Integration (Week 3)
- [ ] PayPal Checkout integration
- [ ] PayPal Payouts integration
- [ ] Webhook handlers for PayPal
- [ ] Transaction tracking
- [ ] Payment authorization flow
- [ ] Receipt generation

### Phase 4: AI Integration (Week 4)
- [ ] Claude API setup
- [ ] AI verification service
- [ ] AI command parser
- [ ] Duplicate detection
- [ ] Priority assessment
- [ ] AI findings storage

### Phase 5: Additional Features (Week 5)
- [ ] Volunteer task management
- [ ] Audit logging
- [ ] Email notifications
- [ ] Reporting endpoints
- [ ] Search with Elasticsearch
- [ ] Rate limiting & security

### Phase 6: Testing & Deployment (Week 6)
- [ ] Unit tests
- [ ] Integration tests
- [ ] API documentation (Swagger)
- [ ] Load testing
- [ ] Security audit
- [ ] Deploy to staging
- [ ] Deploy to production

---

## 📦 Recommended Tech Stack

### Backend Framework
- **Node.js + Express** (recommended - matches frontend tech)
  OR
- **Python + FastAPI** (if team preference)

### Database
- **PostgreSQL** (primary relational DB)
- **Redis** (caching, sessions)
- **Elasticsearch** (optional, for advanced search)

### External Services
- **PayPal Sandbox** (testing)
- **Anthropic Claude API** (AI)
- **AWS S3** (file storage)
- **SendGrid** (email)
- **Twilio** (SMS - optional)

### DevOps
- **Docker** (containerization)
- **Render** (hosting - recommended)
- **GitHub Actions** (CI/CD)

---

## 🧪 Testing Requirements

### Unit Tests
- [ ] Auth service
- [ ] User service
- [ ] Payment service
- [ ] Application service

### Integration Tests
- [ ] Complete user flow (register → apply → approve → pay)
- [ ] PayPal flow (mock)
- [ ] AI verification flow
- [ ] Notification flow

### API Tests
- [ ] All GET endpoints
- [ ] All POST endpoints
- [ ] All PUT endpoints
- [ ] Authentication/authorization
- [ ] Error handling
- [ ] Rate limiting

### Security Tests
- [ ] SQL injection
- [ ] XSS attempts
- [ ] Unauthorized access
- [ ] Token expiry
- [ ] CORS policies

---

## 📱 Frontend Integration Points

### API Calls Frontend Makes

**Before logging in:**
```
GET  / → renders home page (no API call needed)
POST /api/auth/register
POST /api/auth/login
```

**After logging in:**
```
GET  /api/auth/me → get current user info
GET  /api/campaigns → list campaigns
POST /api/applications → submit application
GET  /api/applications/:id → get application detail
GET  /api/transactions → get payment history
POST /api/donations → initiate donation
POST /api/ai/command → send AI command
```

### Expected Response Formats

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": [ ... ]
}
```

**Paginated Response:**
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 125,
    "pages": 13
  }
}
```

---

## 🔄 Data Sync Points

### Real-time Updates (WebSockets Optional)
- Application status changes
- Payment updates
- New applications (for admin)
- AI findings completion

### Webhook Processing
- PayPal transaction updates
- Email delivery confirmations
- SMS delivery confirmations

---

## 📊 Environment Variables

**Backend `.env` file:**
```
# Server
PORT=5000
NODE_ENV=development
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/reliefpay
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# PayPal (Sandbox)
PAYPAL_CLIENT_ID=xxx
PAYPAL_CLIENT_SECRET=xxx
PAYPAL_MODE=sandbox

# AI
ANTHROPIC_API_KEY=xxx
OPENAI_API_KEY=xxx (optional)

# Email
SENDGRID_API_KEY=xxx
SENDGRID_FROM_EMAIL=noreply@reliefpay.org

# SMS (optional)
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=xxx

# Storage
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_S3_BUCKET=reliefpay-uploads
AWS_REGION=us-east-1

# Frontend
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173

# Encryption
ENCRYPTION_KEY=your-encryption-key-for-bank-details
```

---

## 📖 API Documentation

All endpoints should be documented in:
- **Swagger/OpenAPI** format
- **Postman collection** (for testing)
- **API markdown** (for developers)

Example endpoint:
```
GET /api/applications/:id

Parameters:
  - id (path): Application UUID

Authentication:
  - Bearer token required

Response:
  {
    "id": "uuid",
    "applicationId": "RPA-2026-0012",
    "beneficiary": "Ayesha Khan",
    "status": "UNDER_REVIEW",
    ...
  }

Errors:
  - 401: Unauthorized
  - 403: Forbidden
  - 404: Not found
```

---

## 🚀 Deployment Checklist

### Before Going Live
- [ ] All environment variables set
- [ ] Database migrations run
- [ ] PayPal sandbox tested thoroughly
- [ ] Email notifications tested
- [ ] AI agent integration tested
- [ ] Rate limiting configured
- [ ] SSL certificate installed
- [ ] CORS properly configured
- [ ] Logging configured
- [ ] Error tracking (Sentry) configured
- [ ] Backup strategy implemented
- [ ] Monitoring alerts set up

### Production Configuration
```
NODE_ENV=production
PAYPAL_MODE=live (production PayPal account)
Database: Production PostgreSQL
Redis: Production Redis cluster
Logging: Centralized logging service
Monitoring: Datadog/New Relic
Backups: Daily automated backups
```

---

## 📞 Communication with Frontend Team

### Daily Standup Points
1. What endpoints are ready for testing?
2. Any blocking issues from frontend?
3. Are response formats matching expectations?
4. Are webhooks firing correctly?

### Before Pushing Code
- [ ] Endpoints tested with Postman
- [ ] Response formats validated
- [ ] Error messages clear
- [ ] Documentation updated
- [ ] Tests pass

### Integration Testing
1. Frontend makes request
2. Backend processes
3. Database updates
4. External APIs called (PayPal, Claude)
5. Webhooks processed
6. Frontend updates

---

## 🎯 Success Criteria

✅ All API endpoints working
✅ PayPal integration functional (sandbox)
✅ AI commands producing correct responses
✅ Database properly normalized
✅ All notifications sending
✅ Audit logs recording
✅ Security implemented
✅ Performance acceptable (<200ms response time)
✅ Tests passing (>80% coverage)
✅ Ready for production deployment

---

## 📚 Additional Resources

- **PayPal Developer Docs:** https://developer.paypal.com
- **Anthropic Claude API:** https://console.anthropic.com
- **PostgreSQL Docs:** https://www.postgresql.org/docs
- **Express.js Guide:** https://expressjs.com
- **JWT Best Practices:** https://tools.ietf.org/html/rfc7519

---

## 📋 Handoff Checklist for Backend Team

- [ ] Read this entire document
- [ ] Review `COMPLETION_CHECKLIST.md`
- [ ] Review `FEATURES_GUIDE.md`
- [ ] Review frontend code in `/src` folder
- [ ] Test frontend locally (`npm run dev`)
- [ ] Understand all 6 user roles
- [ ] Understand complete user flows
- [ ] Understand AI integration points
- [ ] Set up development environment
- [ ] Create GitHub issues for each phase
- [ ] Estimate timeline
- [ ] Begin Phase 1 setup

---

**Document Version:** 1.0
**Last Updated:** October 30, 2026
**Status:** Ready for Backend Development

**Questions?** Review this document or ask frontend team for clarification on specific flows.

