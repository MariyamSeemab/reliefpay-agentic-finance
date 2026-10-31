> For the full-stack setup (API, PayPal sandbox, Groq) see the root README.md.

# ReliefPay - Quick Start Checklist

## 🚀 Get Running in 2 Minutes

### Step 1: Start the Dev Server
```bash
npm run dev
```

Open: http://localhost:5173/

---

## 🎯 Demo Login (5 Demo Accounts Ready)

**Password for all accounts:** `password123`

| Email | Role | Try This |
|-------|------|----------|
| alok.v@reliefpay.org | Admin | Full admin access, try AI Command Centre |
| s.jenkins@reliefpay.org | Reviewer | Review applications & AI findings |
| ayesha.k@gmail.com | Beneficiary | Register & apply for aid |
| mehta.r@techcorp.in | Donor | Donor dashboard |
| vikram.s@reliefpay.org | Volunteer | Volunteer dashboard |
| elena@auditcore.org | Auditor | Audit logs & financial reports |

---

## 📍 Navigate These Pages (After Login)

### For Admins (alok.v@reliefpay.org):
1. **AI Command Centre** → `/admin/ai-command-centre`
   - Type: "Show all critical applications"
   - Watch AI respond with data!

2. **Application Management** → `/admin/applications`
   - Search & filter applications
   - Click to see details with AI findings

3. **Payment Agent** → `/admin/payment-agent`
   - Review pending disbursement batches
   - Authorize payouts (code: 12345)

4. **AI Verification** → `/admin/ai-verification`
   - Review AI findings in detail
   - Mark as reviewed/escalate

5. **Dashboard** → `/dashboard`
   - See admin statistics

### For Beneficiaries (ayesha.k@gmail.com):
1. **Registration** → `/beneficiary/registration`
   - 5-step form (personal, address, household, emergency contact, review)

2. **Apply for Aid** → `/beneficiary/application/new`
   - 7-step form (disaster, damage, assistance, documents, bank, review)

3. **Dashboard** → `/dashboard`
   - See your applications & status

---

## ✨ Must-Try Features

### 1️⃣ AI Command Centre (Most Innovative)
- Go to `/admin/ai-command-centre`
- Click one of the suggested prompts
- Watch AI respond with real data
- Try: "Prepare a disbursement plan"

### 2️⃣ Payment Authorization
- Go to `/admin/payment-agent`
- Click "Authorize Payout"
- Enter code: `12345`
- See PayPal payout initiation

### 3️⃣ Application Workflow
- Login as beneficiary
- Complete 5-step registration
- Submit 7-step application
- Get confirmation with Application ID

### 4️⃣ AI Findings Review
- Go to `/admin/ai-verification`
- See AI analysis of applications
- Mark findings as reviewed/irrelevant

---

## 🔑 Key Routes

```
/ ........................... Home (public)
/login ....................... Login page
/signup ....................... Signup page
/dashboard ................... Your role dashboard

BENEFICIARY:
/beneficiary/registration .... Register as beneficiary
/beneficiary/application/new . Apply for emergency aid

ADMIN/REVIEWER:
/admin/applications .......... Search & manage applications
/admin/ai-verification ....... Review AI findings
/admin/ai-command-centre ..... AI chat (most innovative!)
/admin/payment-agent ......... Authorize disbursements
```

---

## 📋 What You'll See

### ✅ Complete Implementations:
- [x] Landing page (hero, stats, testimonials)
- [x] Login/signup with 6 demo accounts
- [x] Role-based dashboards (6 different roles)
- [x] Beneficiary registration (5-step form)
- [x] Emergency application (7-step form with file upload)
- [x] Application management (search, filter, detail view)
- [x] AI verification interface (findings review)
- [x] **AI Command Centre** (conversational commands)
- [x] **Payment Agent** (disbursement authorization)
- [x] Multi-agent status display

### 📊 Mock Data Included:
- [x] 3 campaigns (Mumbra, Kerala, Assam)
- [x] 2 applications with AI findings
- [x] 3 transactions
- [x] 3 donations
- [x] Volunteer tasks
- [x] Audit logs

---

## 🎓 For Judges/Reviewers

### Show These Features:
1. **Responsiveness**
   - Open on mobile - everything adapts

2. **Form Validation**
   - Try submitting empty fields
   - See real-time error messages

3. **Role-Based Access**
   - Login as different roles
   - See different dashboards/features

4. **AI Integration**
   - Command Centre shows how AI can be conversational
   - Not just a chatbot - it executes intelligent workflows

5. **Authorization Workflows**
   - Multi-step payment approval
   - Prevents unauthorized disbursements

6. **Accessible Design**
   - Try keyboard navigation
   - All form labels are semantic

---

## 🛠 Build for Production

```bash
npm run build
npm run preview
```

---

## 📱 Responsive Test

Open DevTools (F12) and try these screen sizes:
- Mobile: 375px (iPhone)
- Tablet: 768px (iPad)
- Desktop: 1920px

All layouts adapt beautifully!

---

## ⚡ Performance

- Zero external dependencies for charts (custom CSS)
- No heavy libraries bloating the bundle
- Fast form validation
- Optimized images

---

## 🎯 What This Demonstrates

For PayPal AI Hackathon judges:

1. **UI Excellence** - Professional, modern design
2. **AI Integration** - Conversational command centre
3. **PayPal Ready** - Payment authorization UI designed for PayPal Payouts
4. **Scalability** - Architecture supports real backend
5. **Innovation** - Multi-agent agentic design
6. **Accessibility** - WCAG compliant forms

---

## 🚨 If You Get Stuck

### Page won't load?
- Check console (F12) for errors
- Refresh page
- Check that dev server is running (terminal shows port)

### Form not submitting?
- Fill ALL required fields
- Check for validation messages
- Demo uses client-side validation

### Build failing?
- Run: `npm install` first
- Check Node version (need 16+)

---

## 💬 What to Say When Showing

> "This is ReliefPay, an AI-powered relief finance platform. Notice how instead of complex forms, admins control operations using natural language. The AI Command Centre is the core innovation - I can type commands and agents coordinate everything from application review to payment authorization. All payouts require human approval through this secure authorization dialog."

---

## 📞 Quick Links

- **Frontend Only** - No backend needed to demo
- **Demo Data** - All pre-populated, no API calls
- **Mock Agents** - AI responses are hardcoded for demo
- **Production Ready** - Ready for real PayPal & Anthropic integration

---

**Start here:** 
```bash
npm run dev
```

Then open http://localhost:5173/ and click "Sign In"

**First Login:** 
```
Email: alok.v@reliefpay.org
Password: password123
```

**First Click:**
Go to `/admin/ai-command-centre` - this is the most innovative part!

---

✨ **Enjoy exploring ReliefPay!** ✨
