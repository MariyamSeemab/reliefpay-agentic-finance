# ReliefPay API reference

Every route below exists in `backend/src/routes/`. All paths start with `/api`. Send the JWT from **Login** as `Authorization: Bearer <token>`. Money values are USD; the server stores them as integer cents.

The [public Postman workspace](https://www.postman.com/orbital-module-cosmonaut-84618325-s-team/workspace/reliefpay-paypal-ai-hackathon) has a ready-made collection for these routes.

## Meta

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | none | Health check |
| GET | `/api/config` | none | Public settings only: PayPal client id, currency, sandbox flag, whether AI and payout authorization are configured |

## Auth

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | none | Email and password, returns a JWT |
| POST | `/api/auth/signup` | none | Create an account |
| GET | `/api/auth/me` | JWT | Current user |

## Campaigns and applications

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/campaigns` | none | All campaigns with raised, target and disbursed totals |
| GET | `/api/campaigns/:id` | none | One campaign |
| GET | `/api/applications` | ADMIN, REVIEWER, AUDITOR | Relief applications |
| GET | `/api/applications/mine` | BENEFICIARY | The signed-in beneficiary's own applications |
| POST | `/api/applications` | BENEFICIARY | Submit a new application (`campaignId`, `requestedAmount`, `paypalEmail`, ...) |
| PATCH | `/api/applications/:id/status` | ADMIN, REVIEWER | Approve or reject, with an approved amount |
| PUT | `/api/applications/:id/verification` | ADMIN, REVIEWER | Save AI-finding review state (`reviewed`, `flagged`, `decision`) |

## Field work and beneficiary profiles

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/volunteer/tasks` | VOLUNTEER (own), ADMIN (all) | Field-check tasks |
| PATCH | `/api/volunteer/tasks/:id` | VOLUNTEER (assigned) | Update `status`, `fieldNotes` or `evidence` file details. Completing needs at least one evidence file |
| GET | `/api/beneficiary/profile` | BENEFICIARY | The saved registration profile |
| PUT | `/api/beneficiary/profile` | BENEFICIARY | Create or update the registration profile |

## Donations (PayPal Orders v2)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/donations/orders` | JWT | Create a PayPal order for one campaign |
| GET | `/api/donations/mine` | any signed-in user | The caller's own captured donations, one row per campaign for split donations |
| POST | `/api/donations/orders/:orderId/capture` | JWT | Capture after the buyer approves in the PayPal popup |
| POST | `/api/donations/split-orders` | JWT | One PayPal order with one purchase unit per campaign (2 to 10 campaigns) |
| POST | `/api/donations/split-orders/:orderId/capture` | JWT | Capture a split order; each unit is credited to its own campaign once |
| GET | `/api/donations` | ADMIN, AUDITOR | All donations |
| POST | `/api/donations/:id/refund` | ADMIN | Full or partial PayPal refund; lowers the campaign total once |

## Payouts (PayPal Payouts v1)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/payouts` | ADMIN, AUDITOR | Payout batches and their items |
| POST | `/api/payouts` | ADMIN | Draft a batch from approved applications (`campaignId`, `applicationIds`) |
| POST | `/api/payouts/:id/release` | ADMIN | **The only route that sends money.** Body: `authCode` (checked on the server) and optional `itemIds` (the ticked beneficiaries; omitted means everyone in the batch) |
| POST | `/api/payouts/:id/sync` | ADMIN | Read batch and item status from PayPal |

## AI

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/ai/chat` | ADMIN | AI Command Centre on Groq. Tools read the database and can draft a batch; there is no release tool |
| POST | `/api/ai/suggest-split` | JWT | Proposes split percentages only |
| POST | `/api/ai/studio/responses` | ADMIN | Proxy for the AG Studio assistant (Groq or Amazon Bedrock), off unless `AG_STUDIO_AI=on` |

## Analytics, audit and webhooks

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/analytics` | ADMIN, AUDITOR | Read-only data for the AG Studio dashboard |
| GET | `/api/audit-logs` | ADMIN, AUDITOR | Audit trail |
| POST | `/api/webhooks/paypal` | PayPal signature | Verified with PayPal's verify-webhook-signature API; duplicate events are ignored |
