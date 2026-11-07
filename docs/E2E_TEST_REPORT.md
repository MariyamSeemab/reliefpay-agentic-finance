# ReliefPay end-to-end test report

## Run 4: choose who gets paid (beneficiary checkboxes)

- **Date:** 7 November 2026, about 16:29 to 16:45 UTC
- **Target:** local run (`npm run build`, then the backend on http://localhost:4000) against the PayPal sandbox. `npm run seed:reset --prefix backend` before and after.
- **Change:** the payout method selector and the Venmo note were removed. A DRAFT batch now has a checkbox per beneficiary and a select-all box. The server pays only the ticked items (`itemIds` in `POST /api/payouts/:id/release`), removes the unticked ones so their applications can be drafted again, and audits `PAYOUT_BENEFICIARIES_DESELECTED`.
- **Automated tests:** `npm run build` passes. `npm test --prefix backend`: 141 of 141 pass. New tests cover partial selection, empty, duplicate or foreign selections, a wrong code removing nobody, a retry after `RELEASE_FAILED` having to pay the same people, and no `itemIds` paying everyone.

| # | Check | Result | Screenshot |
|---|---|---|---|
| 1 | Untick Rajesh Patel in `PB-SEED-001` | ✅ The row greys out, the page shows "Paying 1 of 2 beneficiaries, $200.00", and the button reads "Authorize Payout (1)" | `23-payout-select-beneficiaries.png` |
| 2 | Release with only Rahim Shaikh ticked (code sent from the server environment, never shown) | ✅ PayPal sandbox batch `QF3ZEACPMAWHW` with 1 item, $200.00. After "Refresh status from PayPal" the batch and item are **SUCCESS** | `14-payout-released-success.png` |
| 3 | Audit trail | ✅ `PAYOUT_BENEFICIARIES_DESELECTED` lists removed `RPA-2026-0021` and paid `RPA-2026-0015`. `PAYOUT_RELEASED` lists `paidApplicationIds: [RPA-2026-0015]` | - |
| 4 | Unticked person can be paid later | ✅ `RPA-2026-0021` drafted into new batch `PB-f3a67eca` ($220.00, 1 beneficiary) | `12-payment-agent-draft.png` |
| 5 | Authorization dialog shows only the selection | ✅ "$220.00", "1 of 1", names the selected beneficiary, code field empty | `13-authorize-dialog-empty-code.png` |

## Run 3: six UI changes on `feat/integrations`

- **Date:** 7 November 2026, about 14:20 to 14:45 UTC
- **Target:** local run of commit `2549973` (payout method commit `4683817` before it): `npm run build`, then the backend on http://localhost:4000 with `AG_STUDIO_AI=on` and `AG_STUDIO_AI_PROVIDER=bedrock`. `npm run seed:reset --prefix backend` after the run.
- **Method:** Playwright (Chromium, 1440x900), one step at a time. The PDF was captured from the page's own download and rendered with pdf.js for the screenshot.
- **Automated tests:** `npm run build` passes (jsPDF in its own lazy chunk). `npm test --prefix backend`: 143 of 143 pass (136 before plus 7 payout method tests).

| # | Change | Result | Screenshot |
|---|---|---|---|
| 1 | Landing navbar shows the logo and "ReliefPay"; "Contact our support team" block above the footer with `mailto:dineshrajdhanapathy@gmail.com` | ✅ Pass | `01-landing.png`, `21-landing-contact-support.png` |
| 2 | Payout Method selector per beneficiary in the DRAFT batch | ✅ Pass. Both rows show "PayPal email"; "Venmo (not supported)" is a disabled option and the reason is shown under the table. Through the API, `PATCH /api/payouts/PB-SEED-001/items/PI-SEED-001` with `VENMO` returns 400 `UNSUPPORTED_PAYOUT_METHOD`, and with `PAYPAL_EMAIL` returns 200. `GET /api/payouts` returns `payoutMethods`. The authorization dialog still opens with an empty code field; the batch was not released in this run. | `12-payment-agent-draft.png`, `23-payout-method-selector.png`, `13-authorize-dialog-empty-code.png` |
| 3 | Header gear opens Settings | ✅ Pass. Shows name, email, role and organization. Turning on the "Weekly impact summary" toggle and reloading keeps the new value (localStorage key `reliefpay.notifications.<user id>`). Sign Out in the panel returns to `/login`. | `22-settings-panel.png` |
| 4 | Floating AI Assistant button on the analytics page in View mode | ✅ Pass. On page load the bottom-right button opens the AG Studio assistant; "Close assistant" hides it and it reopens. Edit mode still works and shows the assistant in AG Studio's default layout (the floating button is hidden there). Bedrock answered "Which active campaigns are furthest from their target?" with Kerala $2,500 and Mumbra $1,320 short. | `15-analytics-ag-studio.png`, `24-analytics-floating-assistant.png`, `16-ag-studio-assistant-bedrock.png` |
| 5 | Tax receipt PDF | ✅ Pass. The DON-901 row icon downloads `RP-TR-DON-901.pdf` (valid PDF, one page) and **Download Tax Receipt** downloads `ReliefPay-tax-receipts.pdf`. The receipt has the logo, receipt number, donor, campaign, $500.00 (USD), date, donation ID and the sandbox demo note. Seeded donations have no PayPal order or capture ID, so that line is not shown. | `04-donor-dashboard.png`, `25-tax-receipt-pdf.png` |
| 6 | Back button on the campaigns page | ✅ Pass. "Back to Dashboard" above the title returns to `/dashboard`. | `02-campaigns.png` |

The payout method selector from item 2 was removed afterwards and replaced by beneficiary checkboxes. See run 4.

Notes:

- Each receipt PDF is about 3 MB because the logo image is embedded at full size.
- Once, after several View/Edit switches, the floating button opened the assistant with the side panels collapsed. A fresh load and a single Edit then View switch did not reproduce it.
- The AG Studio console logged one internal projection error while answering; the answer still completed.
- Screenshots 3, 5-7, 9-11, 14 and 17-20 are from run 2. Screenshot 14 needs a real release with the authorization code, which this run did not do.

## Run 2: local run after fixing F1-F3

- **Date:** 7 November 2026, 12:44 to 13:10 UTC
- **Target:** local run of branch `DD2` with the F1-F3 fixes (commit `e44a07b`): `npm run build`, then the backend on http://localhost:4000 with `AG_STUDIO_AI=on` and `AG_STUDIO_AI_PROVIDER=bedrock`. Fresh seed data (`npm run seed:reset --prefix backend`) before and after the run.
- **Environment:** PayPal **sandbox**, Groq `openai/gpt-oss-120b` (AI Command Centre and split suggestion), Amazon Bedrock `us.amazon.nova-2-lite-v1:0` in us-east-1 (AG Studio assistant, through the developer's AWS CLI credentials).
- **Method:** Playwright (Chromium, 1366x800) driving the real UI, one step at a time, with each screenshot taken after the page finished loading. The 20 screenshots are in [`docs/screenshots/`](screenshots/) and are listed in the README.
- **Automated tests:** `npm test --prefix backend`: 136 of 136 pass (133 existing plus 3 new tests for F1-F3).

### Results

| # | Step | Result | Screenshot |
|---|---|---|---|
| 1 | Landing page | ✅ Pass | `01-landing.png` |
| 2 | Campaigns directory with the split donation form | ✅ Pass | `02-campaigns.png` |
| 3 | Login page with demo accounts | ✅ Pass | `03-login-demo-accounts.png` |
| 4 | Donor dashboard | ✅ Pass | `04-donor-dashboard.png` |
| 5 | Split $25 with **Suggest a split with AI** (Groq) | ✅ Pass. 60% Mumbra ($15.00), 40% Kerala ($10.00). The rationale quotes the funded share correctly (F1 fixed). | `05-split-ai-suggestion.png` |
| 6 | **Confirm split** shows PayPal Donate and card buttons | ✅ Pass. PayPal order `33243512DB079494L` created with two purchase units. | `06-split-paypal-buttons.png` |
| 7 | PayPal sandbox checkout popup | ✅ Opens on the PayPal sandbox login screen. Not logged in (no buyer password available). | `07-paypal-sandbox-popup.png` |
| 8 | Admin dashboard | ✅ Pass | `08-admin-dashboard.png` |
| 9 | Application management | ✅ Pass | `09-application-management.png` |
| 10 | AI Command Centre answers with a markdown table | ✅ Pass. The table renders as an HTML table (F2 fixed). | `10-ai-command-centre-table.png` |
| 11 | AI Command Centre drafts a payout batch | ✅ Pass. The agent drafted `PB-01cdca11` ($185, RPA-2026-0018). Its first attempt included ineligible applications and was rejected by the server with `APPLICATIONS_NOT_ELIGIBLE`, then it retried correctly. | `11-ai-command-centre-draft-batch.png` |
| 12 | Payment Agent shows the AI-drafted batch | ✅ Pass | `12-payment-agent-draft.png` |
| 13 | Authorization dialog | ✅ Pass. The code field is empty and is a password field. | `13-authorize-dialog-empty-code.png` |
| 14 | Release the batch, then **Refresh status from PayPal** | ✅ Pass. PayPal accepted the release (PayPal batch `GWYCMDEM5ZNRU`), and the refresh moved it to **SUCCESS**, 1/1 paid (F3 fixed). | `14-payout-released-success.png` |
| 15 | AG Studio analytics | ✅ Pass. Licence accepted, no watermark. | `15-analytics-ag-studio.png` |
| 16 | AG Studio AI Assistant on Bedrock (Edit mode) | ✅ Pass. "Which active campaigns are furthest from their target?" was answered correctly: Kerala $2,500 short, Mumbra $1,320 short. The answer took about 2.5 minutes. | `16-ag-studio-assistant-bedrock.png` |
| 17 | Donations and refunds panel | ✅ Pass. Shows the two new split rows as PENDING (buyer did not approve) and the seeded completed donations. | `17-refunds-panel.png` |
| 18 | Auditor audit log | ✅ Pass. Shows `AI_CHAT`, `AI_TOOL_CALL` (including the failed draft attempt), `PAYOUT_DRAFTED`, `PAYOUT_RELEASED`, `PAYOUT_SYNCED`, `DONATION_SPLIT_ORDER_CREATED` and `AI_SPLIT_SUGGESTED`. | `18-auditor-audit-log.png` |
| 19 | Beneficiary dashboard | ✅ Pass (mock data, as noted in the README) | `19-beneficiary-dashboard.png` |
| 20 | Volunteer dashboard | ✅ Pass (mock data, as noted in the README) | `20-volunteer-dashboard.png` |

### Findings from run 1

| ID | Status | Evidence |
|---|---|---|
| F1 | ✅ Fixed | The split prompt now gets precomputed `fundedPercent` and `remaining`. The rationale reads "cmp-01 has fundedPercent 73.6 and remaining 1320, lower than cmp-02's fundedPercent 79.2 and remaining 2500". Screenshot `05-split-ai-suggestion.png`, plus a backend test. |
| F2 | ✅ Fixed | Command Centre markdown renders pipe tables as HTML tables. Screenshots `10-ai-command-centre-table.png` and `11-ai-command-centre-draft-batch.png`, plus a test. |
| F3 | ✅ Fixed | The first release stores a unique `sender_batch_id` and a retry reuses it. Release of `PB-01cdca11` was accepted by PayPal and reached SUCCESS after refresh. Screenshot `14-payout-released-success.png`, audit entries `PAYOUT_RELEASED` and `PAYOUT_SYNCED` in `18-auditor-audit-log.png`, plus a test. |
| F4 | Open (info) | The AG Studio assistant on Bedrock still takes a long time per answer (about 2.5 minutes in this run). |
| F5 | Open (info) | Render's free plan still resets the SQLite data on restart. Not affected by this run. |

### Notes on this run

- The release in step 14 was submitted through the authorization dialog in the visible Playwright browser at 12:55:36 UTC, right after screenshot 13. The automation script did not type the code. The audit log shows that single accepted attempt by the admin session and no rejected attempts. The code does not appear in any screenshot, log or report.
- The webhook for the payout could not reach a local server, so the batch status came from the "Refresh status from PayPal" button (`PAYOUT_SYNCED`), not from a webhook.
- At 1366 px wide the auditor dashboard is slightly wider than the window and scrolls horizontally. Screenshot 18 was taken scrolled to the left edge.

### Still needs manual testing

- **PayPal buyer approval** for a single donation and for a split donation: it needs the sandbox buyer password, so this run stopped at the PayPal login popup.
- **Refund of a real capture**: it needs a captured donation. The donations in this run were not approved by a buyer, so the refund flow is covered by automated tests only.

## Run 1: live deployment

- **Date:** 7 November 2026, 12:09 to 12:28 UTC
- **Target:** live deployment https://reliefpay.onrender.com (Render, `main` at `b9639fc`)
- **Environment:** PayPal **sandbox**, Groq `openai/gpt-oss-120b`, Amazon Bedrock `us.amazon.nova-2-lite-v1:0` (us-east-1)
- **Method:** Playwright (Chromium, 1366x800) driving the real UI, plus direct API calls for evidence. Its screenshots were in `docs/e2e/` and were replaced by the run 2 set in `docs/screenshots/`; the file names below refer to the removed set.
- **Automated tests:** `npm test --prefix backend`: 133 of 133 pass (PayPal, Groq and Bedrock faked).

### Summary

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

### Details

#### 1-2. Landing, login, donor dashboard
The landing page, logo and hero carousel load. The Donor demo account logs in and reaches the dashboard.
Screenshots: `01-home.png`, `02-donor-dashboard.png`.

#### 3-4. Split donation
- On `/campaigns`, a $25 split was set up across the two active campaigns.
- **Suggest a split with AI** (Groq) returned 40% for Mumbra ($10.00) and 60% for Kerala ($15.00), with a short rationale.
- **Confirm split** rendered the PayPal **Donate** and **Debit or Credit Card** buttons (JS SDK, sandbox client).
- Paying needs the sandbox buyer login, so Playwright stopped at the buttons. The user completed a split payment manually.

Screenshots: `03-split-ai-suggestion.png`, `04-split-paypal-buttons.png`.

#### 5-6. Admin dashboard and AI Command Centre
- The admin dashboard shows USD totals from the API: $21,180.00 raised.
- AI Command Centre question: "List approved applications for cmp-01". The agent called `list_applications` (shown in the UI and in the audit log as `AI_TOOL_CALL`) and returned RPA-2026-0015 ($200), RPA-2026-0021 ($220) and RPA-2026-0024 ($160).

Screenshots: `05-admin-dashboard.png`, `06-ai-command-centre.png`.

#### 7-8. Payment Agent
- Draft batch `PB-SEED-001` ($420, two beneficiaries) is shown with **Authorize Payout**. Screenshot `07-payment-agent-draft.png`.
- **Wrong code:** HTTP 403. The audit log shows `PAYOUT_RELEASE_REJECTED` with `INVALID_AUTH_CODE`.
- **Correct code** (read from the server environment, never displayed): PayPal returned HTTP 400 `USER_BUSINESS_ERROR`. The audit log shows `PAYOUT_RELEASE_FAILED`, and the batch moved to `RELEASE_FAILED`. See finding F3.

#### 9-11. AG Studio analytics and Bedrock assistant
- `/admin/analytics` loads the AG Studio report (KPIs, campaign progress, funded rate, net donations by campaign, campaign table) and the "Donations and refunds" panel. The licence was accepted: 0 console errors. Screenshot `08-analytics-ag-studio.png`.
- The **AI Assistant** panel appears in **Edit** mode. Screenshot `09-analytics-edit-mode.png`.
- Question 1, "Which active campaigns are furthest from their target?", was answered correctly: Kerala needs $2,500 more and Mumbra $1,320, matching the campaign data. Screenshot `10-ag-studio-assistant-bedrock-q1.png`.
- Question 2, asked straight after: "Which donor has given the most so far?", was answered correctly: Rohan Mehta, $500. Screenshot `11-ag-studio-assistant-bedrock-q2.png`.
- No HTTP 429 occurred. On Groq's free tier, the second question used to fail with 429.
- AWS IAM shows the `reliefpay-render-bedrock` access key was last used at 12:23 UTC for `bedrock` in us-east-1. That proves the live app called Bedrock.

#### 12. Auditor
The Auditor role sees the audit log, including logins, AI tool calls and payout release attempts. Screenshot `12-auditor-audit-log.png`.

### Findings

| ID | Severity | Finding | Suggested fix |
|---|---|---|---|
| F1 | Low | The AI split rationale says campaigns are "20.8% funded" and "26.4% funded". Those numbers are the **remaining** share (2,500/12,000 and 1,320/5,000), not the funded share (79% and 74%). The split itself is sensible. | Pass precomputed `fundedPercent` and `remaining` values to the model and ask it to quote them, or show the rationale without numbers. |
| F2 | Low | The AI Command Centre shows markdown tables as raw `\| a \| b \|` text. | Add table support to the chat markdown renderer, or ask the model for bullet lists. |
| F3 | Medium | Releasing `PB-SEED-001` on Render failed with PayPal `USER_BUSINESS_ERROR`. **Likely cause, not confirmed:** the payout uses the batch id as PayPal's `sender_batch_id`. Render's free plan re-seeds the database on every redeploy or restart, so the seeded batch keeps the same id `PB-SEED-001`. PayPal rejects a `sender_batch_id` it has already seen, and the user had already released this batch before the last redeploy. | Generate a unique `sender_batch_id` on the first release attempt (for example `PB-SEED-001-<timestamp>`), store it, and reuse it only for retries of that attempt. Until then, draft a **new** batch for the demo instead of releasing the seeded one. |
| F4 | Info | The AG Studio assistant takes about 40 to 90 seconds per answer, and question 1 showed one internal "Could not run the query" step before it recovered. | Fine for a demo. Mention it in the video, or ask a question that was tried beforehand. |
| F5 | Info | Render's free plan resets the SQLite data on redeploy or restart, so manual test records (split capture, payout release, refunds) are not kept. | Known limitation, already in the README. A persistent database is listed as future work. |

### Not covered by this run
- **Paying with the sandbox buyer account** (single donation, split donation): needs the sandbox buyer password. The user completed this manually. A live single-donation capture with a verified webhook was also recorded on 4 November 2026 (order `8G6559713T7281800`).
- **Refunds through the UI:** they need a captured donation, and the database had been reset. They're covered by automated tests only.
