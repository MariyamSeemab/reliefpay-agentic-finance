# ReliefPay end-to-end test report

- **Date:** 7 November 2026, 12:09 to 12:28 UTC
- **Target:** live deployment https://reliefpay.onrender.com (Render, `main` at `b9639fc`)
- **Environment:** PayPal **sandbox**, Groq `openai/gpt-oss-120b`, Amazon Bedrock `us.amazon.nova-2-lite-v1:0` (us-east-1)
- **Method:** Playwright (Chromium, 1366x800) driving the real UI, plus direct API calls for evidence. Screenshots are in [`docs/e2e/`](e2e/).
- **Automated tests:** `npm test --prefix backend`: 133 of 133 pass (PayPal, Groq and Bedrock faked).

## Summary

| # | Area | Result |
|---|---|---|
| 1 | Landing page and login | ✅ Pass |
| 2 | Donor dashboard | ✅ Pass |
| 3 | Split donation with AI suggestion (Groq) | ✅ Pass, with one wording issue (finding F1) |
| 4 | Split donation PayPal buttons | ✅ Pass. Buyer approval not automated (needs the sandbox buyer password). The user completed it manually. |
| 5 | Admin dashboard | ✅ Pass |
| 6 | AI Command Centre (Groq tool call) | ✅ Pass, with one display issue (F2) |
| 7 | Payment Agent: wrong authorization code rejected | ✅ Pass (HTTP 403, audited) |
| 8 | Payment Agent: release with correct code | ⚠️ PayPal rejected it with `USER_BUSINESS_ERROR` (F3). The user's earlier manual release succeeded. |
| 9 | AG Studio analytics with licence | ✅ Pass. Licence accepted, no console errors. |
| 10 | AG Studio AI assistant on Bedrock, two questions back to back | ✅ Pass. Both answers correct, no rate-limit error. Each took about 40 to 90 seconds. |
| 11 | Bedrock key used by Render | ✅ Confirmed in AWS IAM (last used 12:23 UTC, service `bedrock`, us-east-1) |
| 12 | Auditor audit log | ✅ Pass |
| 13 | Role protection | ✅ Pass. Beneficiary blocked from analytics (403), donor blocked from refunds (403). Checked locally on the same code. |

## Details

### 1-2. Landing, login, donor dashboard
The landing page, logo and hero carousel load. The Donor demo account logs in and reaches the dashboard.
Screenshots: `01-home.png`, `02-donor-dashboard.png`.

### 3-4. Split donation
- On `/campaigns`, a $25 split was set up across the two active campaigns.
- **Suggest a split with AI** (Groq) returned 40% for Mumbra ($10.00) and 60% for Kerala ($15.00), with a short rationale.
- **Confirm split** rendered the PayPal **Donate** and **Debit or Credit Card** buttons (JS SDK, sandbox client).
- Paying needs the sandbox buyer login, so Playwright stopped at the buttons. The user completed a split payment manually.

Screenshots: `03-split-ai-suggestion.png`, `04-split-paypal-buttons.png`.

### 5-6. Admin dashboard and AI Command Centre
- The admin dashboard shows USD totals from the API: $21,180.00 raised.
- AI Command Centre question: "List approved applications for cmp-01". The agent called `list_applications` (shown in the UI and in the audit log as `AI_TOOL_CALL`) and returned RPA-2026-0015 ($200), RPA-2026-0021 ($220) and RPA-2026-0024 ($160).

Screenshots: `05-admin-dashboard.png`, `06-ai-command-centre.png`.

### 7-8. Payment Agent
- Draft batch `PB-SEED-001` ($420, two beneficiaries) is shown with **Authorize Payout**. Screenshot `07-payment-agent-draft.png`.
- **Wrong code:** HTTP 403. The audit log shows `PAYOUT_RELEASE_REJECTED` with `INVALID_AUTH_CODE`.
- **Correct code** (read from the server environment, never displayed): PayPal returned HTTP 400 `USER_BUSINESS_ERROR`. The audit log shows `PAYOUT_RELEASE_FAILED`, and the batch moved to `RELEASE_FAILED`. See finding F3.

### 9-11. AG Studio analytics and Bedrock assistant
- `/admin/analytics` loads the AG Studio report (KPIs, campaign progress, funded rate, net donations by campaign, campaign table) and the "Donations and refunds" panel. The licence was accepted: 0 console errors. Screenshot `08-analytics-ag-studio.png`.
- The **AI Assistant** panel appears in **Edit** mode. Screenshot `09-analytics-edit-mode.png`.
- Question 1, "Which active campaigns are furthest from their target?", was answered correctly: Kerala needs $2,500 more and Mumbra $1,320, matching the campaign data. Screenshot `10-ag-studio-assistant-bedrock-q1.png`.
- Question 2, asked straight after: "Which donor has given the most so far?", was answered correctly: Rohan Mehta, $500. Screenshot `11-ag-studio-assistant-bedrock-q2.png`.
- No HTTP 429 occurred. On Groq's free tier, the second question used to fail with 429.
- AWS IAM shows the `reliefpay-render-bedrock` access key was last used at 12:23 UTC for `bedrock` in us-east-1. That proves the live app called Bedrock.

### 12. Auditor
The Auditor role sees the audit log, including logins, AI tool calls and payout release attempts. Screenshot `12-auditor-audit-log.png`.

## Findings

| ID | Severity | Finding | Suggested fix |
|---|---|---|---|
| F1 | Low | The AI split rationale says campaigns are "20.8% funded" and "26.4% funded". Those numbers are the **remaining** share (2,500/12,000 and 1,320/5,000), not the funded share (79% and 74%). The split itself is sensible. | Pass precomputed `fundedPercent` and `remaining` values to the model and ask it to quote them, or show the rationale without numbers. |
| F2 | Low | The AI Command Centre shows markdown tables as raw `\| a \| b \|` text. | Add table support to the chat markdown renderer, or ask the model for bullet lists. |
| F3 | Medium | Releasing `PB-SEED-001` on Render failed with PayPal `USER_BUSINESS_ERROR`. **Likely cause, not confirmed:** the payout uses the batch id as PayPal's `sender_batch_id`. Render's free plan re-seeds the database on every redeploy or restart, so the seeded batch keeps the same id `PB-SEED-001`. PayPal rejects a `sender_batch_id` it has already seen, and the user had already released this batch before the last redeploy. | Generate a unique `sender_batch_id` on the first release attempt (for example `PB-SEED-001-<timestamp>`), store it, and reuse it only for retries of that attempt. Until then, draft a **new** batch for the demo instead of releasing the seeded one. |
| F4 | Info | The AG Studio assistant takes about 40 to 90 seconds per answer, and question 1 showed one internal "Could not run the query" step before it recovered. | Fine for a demo. Mention it in the video, or ask a question that was tried beforehand. |
| F5 | Info | Render's free plan resets the SQLite data on redeploy or restart, so manual test records (split capture, payout release, refunds) are not kept. | Known limitation, already in the README. A persistent database is listed as future work. |

## Not covered by this run
- **Paying with the sandbox buyer account** (single donation, split donation): needs the sandbox buyer password. The user completed this manually. A live single-donation capture with a verified webhook was also recorded on 4 November 2026 (order `8G6559713T7281800`).
- **Refunds through the UI:** they need a captured donation, and the database had been reset. They're covered by automated tests only.
