Worked for 34s

I checked the official PayPal AI Hackathon Devpost page, its rules, sponsor resources and PayPal's developer announcement.

And honestly, I think ReliefPay has an opportunity to become much more interesting than a conventional NGO donation dashboard.

My recommendation: Turn ReliefPay into an AI-powered agentic relief-finance platform.

Instead of simply using AI to detect duplicate applications, let AI coordinate relief operations, recommend fund allocation, prepare payments, monitor transactions and generate transparent financial reports — with human authorization before money moves.

### ReliefPay

### Agentic AI for Emergency Relief Finance

From emergency assistance requests to accountable money movement.

PayPal + AISocial ImpactAgentic Commerce

### 1\. First, understand what PayPal expects

The hackathon does not prescribe fixed tracks. Its fundamental requirement is that your project meaningfully integrates both PayPal and AI. It also provides a free PayPal sandbox.

The judging criteria are equally weighted:

* Technological implementation.

* Design.

* Potential impact.

* Innovation.

* Presentation. Devpost +1

The deadline listed on Devpost is November 12, 2026, at 12 PM Pacific Time. Devpost +1

This means a beautiful frontend alone will not qualify as a finished submission. Your frontend phase can come first, but eventually the demo must have functioning PayPal and AI integrations.

### 2\. PayPal products you should integrate into ReliefPay

Devpost lists several PayPal capabilities beyond ordinary checkout. These are the ones I would consider.

| PayPal product       | How ReliefPay can use it                                            |
| -------------------- | ------------------------------------------------------------------- |
| PayPal Checkout      | Accept donations for emergency campaigns.                           |
| PayPal Payouts       | Disburse approved aid to eligible recipients in batches.            |
| PayPal Webhooks      | Automatically update transaction statuses after payment events.     |
| PayPal Agent Toolkit | Allow AI agents to interact with supported PayPal operations.       |
| PayPal MCP Server    | Give an AI assistant access to supported payment tools through MCP. |
| PayPal Invoicing     | Generate and manage supplier or service-provider invoices.          |
| PayPal Subscriptions | Enable recurring monthly donor contributions.                       |
| PayPal Donations     | Explore donation-specific payment experiences.                      |

These capabilities are listed in the official hackathon resources. PayPal AI Hackathon +1

### Features I would add using these products

A. AI-powered disbursement agent

Imagine an admin types:

> Show all approved critical and high-priority flood relief applications. Prepare payments for eligible beneficiaries within the available campaign budget.

The AI agent:

* Fetches approved applications.

* Checks the available campaign budget.

* Validates beneficiary payment details.

* Identifies duplicate payment risks.

* Prepares a batch payout.

* Displays a payment preview.

* Requests explicit admin authorization.

* Initiates the supported PayPal payout operation.

* Monitors the resulting transaction states.

This is a much stronger demonstration of AI + payments than a chatbot.

B. Smart recurring donor system

* Monthly donation subscriptions.

* Recurring contribution management.

* Donor subscription history.

* Payment failure notifications.

* AI-generated donor impact updates.

* Suggested monthly contribution amounts.

C. Intelligent payment reconciliation

* Read transaction events.

* Match payments to beneficiary records.

* Detect missing or duplicated payment records.

* Identify failed transactions.

* Generate reconciliation reports.

* Explain discrepancies using AI.

D. AI financial assistant

Admins can ask:

* How much money was collected this month?

* Which campaign has the biggest funding gap?

* How much has been disbursed?

* Show failed payments.

* Which approved beneficiaries are still waiting for assistance?

* Prepare a campaign financial report.

The AI should answer using actual application and payment records, not invented numbers.

E. Payment-event automation

When a payment succeeds, fails, or is refunded, update the relevant campaign and beneficiary records using verified PayPal webhook events.

This creates a connected financial workflow instead of a collection of disconnected screens.

PayPal AI Hackathon +1

### 3\. Partner products — this is where you can differentiate

The hackathon has several technology partners. Some are particularly relevant to ReliefPay, including partners with separate prizes.

### 1\. AG Grid — My first choice

Separate sponsor prize: $5,000 / $2,000 / $1,000

![AG Studio: High-Performance React Dashboard, Angular Dashboard, JavaScript Dashboard](https://images.openai.com/static-rsc-4/_8WSN0cC7zMRmWwlbWTx2Qrw3Yn-qGR70mWSNZsNzB9aGV8ap_PHUhwF4TDaxKtfbJ1bTuYzquU2p_xdWluV0UCELSRUK0vjf-Upi-xnTzgk_HObL_1R5MbCAz0-BO-HjYMMG5AYeXspGKm0S6rkYhX4qXZuPyj80JN0Bx5BhUR13qFyVjbzVVMaL0F3maQ5?purpose=fullsize)

AG Grid offers AG Studio, which combines dashboards, charts, grids and an agent framework. The Devpost page specifically suggests nonprofit donation dashboards and AI-generated analytics widgets. Devpost +1

Add these ReliefPay features:

* Live donation analytics dashboard.

* Campaign-wise fund utilization.

* Beneficiary distribution analytics.

* AI-generated dashboard widgets.

* Natural-language analytics.

* Payment failure monitoring.

* Donation trends.

* Suspicious transaction anomaly alerts.

* Customizable admin dashboards.

Standout feature: Ask ReliefPay AI

An admin types:

"Show me the campaigns with the highest number of pending beneficiaries and lowest available funds."

The system generates the relevant charts and data grid.

Another example:

"Compare collected and disbursed funds across all campaigns."

The dashboard generates a comparison automatically.

This is particularly attractive because AG Grid's own hackathon description highlights this type of natural-language finance agent and nonprofit dashboard.

### 2\. APIMatic — Best development partner for PayPal integration

Separate sponsor prize: $1,000 × 3

APIMatic provides Context Plugins that give AI coding agents access to PayPal API documentation and context.

How to use it:

* Connect its PayPal Context Plugin to your coding agent.

* Use it while implementing PayPal APIs.

* Generate more reliable API integration code.

* Understand request and response structures.

* Reduce integration errors.

* Keep implementation aligned with API contracts.

My recommendation: Use APIMatic during development. It doesn't need to become a visible ReliefPay feature. Its value is helping you implement PayPal correctly.

The hackathon's APIMatic prize specifically requires use of its Context Plugin to build the PayPal integration. Devpost +1

### 3\. Elastic — AI search and fraud intelligence

![Dashboards and visualizations in Elastic Agent Builder chat | Elastic Docs](https://images.openai.com/static-rsc-4/YLMTR0S6sKnyzW5U2b0zdRp9mfVL3kQCugFH5YHERce2jFpRI1mKeRpGMhUECn1qYO4Vnlp_ePHacVxt3vRyVLBv1sHCWPTxtGQF-g-yGlr9FJ_-qrc3M_KxucP5MzspBw7W1yxPUVqLGTRz02TvSo286xhswkhQvbjHXzn3cC2PThUHwOw4i_PXzG3wLLzZ?purpose=fullsize)

Elastic provides hybrid search, vector search, analytics and AI agent capabilities. Devpost

Add these features:

* Semantic beneficiary search.

* Similar application detection.

* Search using natural language.

* Search through application documents.

* Historical fraud-pattern investigation.

* Similarity-based duplicate detection.

* AI-powered audit log search.

* Search across campaign reports.

Example:

An admin enters:

"Find applications from families reporting complete house damage in the same locality."

Elastic can retrieve relevant records based on their meaning rather than just exact keywords.

Another example:

"Find applications with similar documents but different beneficiary names."

The system retrieves potentially related records for human investigation.

My recommendation: Elastic is a particularly good match for your existing AI duplicate-detection idea. It makes that feature more technically substantial.

### 4\. Bryntum — Emergency operations and scheduling

Separate sponsor prize: $1,000 × 3

![Using Bryntum Gantt and Bryntum Scheduler with React and Material UI components - Bryntum](https://images.openai.com/static-rsc-4/kZMKZeyO1WDqOZSz1P85wnHA9qsLWnp0PaKy4YaZJpXOoKHpwFoZ82S9EOhV8LbQWoI_3GExmQKgh2HBNYwfRcgh3ZNI6meEZkf37yG-TtYZXHpYr8Yau0k6eu2f_j0YwpjecI8s2-xSvIbbiXs4lJQjycmK8fFr0e34EfAbL6KPnoiuYE-MoJsSF8owMScT?purpose=fullsize)

Bryntum provides Gantt, Scheduler and Calendar components. Devpost

Add a Relief Operations Planner:

* Volunteer shift scheduling.

* Field verification appointments.

* Emergency task assignment.

* Relief delivery schedules.

* Vehicle and resource scheduling.

* Aid distribution timelines.

* Task dependencies.

* Payment milestone tracking.

Standout feature: AI Emergency Coordinator

An admin says:

"Assign field verification visits for 20 high-priority applications tomorrow."

AI prepares a schedule based on:

* Volunteer availability.

* Location.

* Task urgency.

* Estimated visit duration.

* Existing assignments.

The admin reviews and confirms the schedule.

You could also build a Gantt timeline showing application approval, fund allocation and payment completion.

### 5\. Channel3 — AI relief procurement assistant

Separate sponsor prize: $1,500

![Highlight gifts in Gift Catalog with badges | Fundraise Up](https://images.openai.com/static-rsc-4/fl7cGfxotIT_2zVteBIzeND0RXkXgFlhzE7i54D5MtD7k0blosQKmj9-vJAfYUH3SBtNEk4FbRzV0_Kpq5-CoSSFiehMEPHlO37diKsX0-3K7gxQLCMb18TsuyLUpK-xZWAgiEM8DEvG5hqrLkiJswARc7kSNttODzipulzCfbBAP6jTacMraW0oesqw2kc2?purpose=fullsize)

Channel3 provides normalized product data, including titles, images, prices, variants, availability and purchase links. Its API or MCP server must actually be used in the product experience to qualify for its sponsor prize. Devpost +1

This opens a different feature for ReliefPay.

Build an AI Relief Supply Assistant.

Instead of distributing only financial aid, organizations can coordinate essential supplies.

Features:

* Search relief supplies.

* Compare product prices.

* Find food and water supplies.

* Search hygiene kits.

* Find blankets and emergency essentials.

* Recommend products based on campaign requirements.

* Generate a suggested procurement list.

* Compare available product options.

* Estimate total procurement cost.

* Let admins review purchase recommendations.

Example:

An organization has 100 families affected by flooding.

Admin asks:

"Prepare a relief kit recommendation for 100 families with a ₹1,000 budget per family."

AI:

* Identifies essential supplies.

* Searches relevant products using Channel3.

* Compares product prices and availability.

* Prepares a suggested procurement list.

* Calculates the estimated cost.

* Requests admin approval before purchasing.

This makes ReliefPay more than a cash-disbursement platform.

However, check whether Channel3 has suitable product and merchant coverage for your intended region before committing to this feature.

### 6\. Render — AI workflow orchestration and deployment

Sponsor prize: Render credits

Render offers hosting and Render Workflows for coordinating AI agents, background jobs and distributed tasks. Devpost

Use it for:

* Deploying the ReliefPay backend.

* Running AI verification jobs.

* Processing application submissions.

* Running payment reconciliation jobs.

* Coordinating multiple AI agents.

* Scheduling recurring campaign reports.

* Handling background notifications.

### 7\. Astropods — Deployable AI agents

Astropods provides agent infrastructure, knowledge bases, integrations, runtime and observability. Devpost

You could build separate agents:

* Beneficiary Verification Agent.

* Fund Allocation Agent.

* Payment Monitoring Agent.

* Donor Communication Agent.

* Relief Procurement Agent.

They can work as coordinated agents, each with a defined responsibility and restricted permissions.

### 8\. KERNEL — Browser automation

Kernel provides cloud browser infrastructure for agents that need to navigate websites and interact with web interfaces. Devpost

Possible ReliefPay use:

* Research supplier information.

* Collect public emergency information.

* Assist with external relief-resource discovery.

* Monitor public campaign information.

I would not use browser automation to operate payment accounts or bypass official payment APIs. Use PayPal's supported APIs for money movement.

### 9\. Postman — API testing and documentation

* Test PayPal sandbox requests.

* Organize API collections.

* Document ReliefPay endpoints.

* Test payment success and failure scenarios.

* Validate webhook handling.

* Prepare reproducible judge testing instructions.

Postman is useful for development and testing rather than a primary end-user feature. Devpost +1

### 10\. Zapier — Workflow automation

Potential integrations:

* New critical application → notify organization admin.

* Payment failure → create follow-up task.

* Campaign target reached → notify campaign manager.

* New donation → trigger donor acknowledgement.

* Completed field verification → notify reviewer.

This can connect ReliefPay to external workflow tools without building every integration from scratch. PayPal AI Hackathon

### 4\. My recommended partner combination

You don't need to integrate all ten partners. Choose the ones that contribute meaningfully to the product.

| Partner   | ReliefPay implementation                   | Priority  |
| --------- | ------------------------------------------ | --------- |
| AG Grid   | AI-powered financial analytics             | Very high |
| APIMatic  | Reliable PayPal integration development    | Very high |
| Elastic   | Semantic search and duplicate intelligence | High      |
| Bryntum   | Emergency operations scheduling            | High      |
| Render    | Deployment and AI workflow orchestration   | High      |
| Channel3  | Relief supply procurement                  | Optional  |
| Astropods | Multi-agent infrastructure                 | Optional  |
| Postman   | API testing                                | Useful    |
| Zapier    | External workflow automation               | Optional  |
| KERNEL    | Browser automation                         | Optional  |

Prize strategy: AG Grid, APIMatic and Bryntum have particularly relevant sponsor awards. You can win at most one Grand Prize and one Sponsor Prize, or one Honorable Mention Prize and one Sponsor Prize. Devpost

### 5\. Additional original features I would introduce

These are features I think could make ReliefPay more innovative than a normal relief platform.

### A. ReliefPay AI Command Centre

![Informer GO | Personalized Command Center for BI & Apps](https://images.openai.com/static-rsc-4/1tmecFtqrvVLZcI5O2bJRORoOEodMWLTP64GRS0-lTXaz4_dc6zVHRHG44MoO1x9byBlkukw9hqLpIa08Vq0uq_1_ubUnDclAHNEBPWZgEtysMTdF8O0TA0RHsClIzr3pn-2-LldgTmsijeAcDmhqa8Dxc9YSQQ7Mcz7z6kBUl3jp6OWBSRLRH6a2h6c2w1G?purpose=fullsize)

A conversational workspace where organization admins control relief operations using natural language.

Example commands:

* "Show me all critical applications awaiting review."

* "Prepare a disbursement plan for the remaining campaign budget."

* "Find campaigns with insufficient funding."

* "Identify failed payments from yesterday."

* "Generate a report of all completed beneficiary payments."

* "Find volunteers available for tomorrow's field visits."

The AI should have access to appropriate data and tools, explain its actions, and request authorization for sensitive operations.

### B. Multi-Agent Relief Management

Build a team of specialized agents.

Central coordinator

ReliefPay Orchestrator Agent

Understands admin instructions and coordinates tasks

Verification Agent

Documents and duplicate checks

Allocation Agent

Budget and priority recommendations

Payment Agent

Payment preparation and monitoring

Procurement Agent

Relief supplies and purchasing recommendations

Transparency Agent

Financial reconciliation, impact reports and donor updates

### C. Emergency Fund Allocation Simulator

An admin enters:

* Available campaign funds.

* Number of approved beneficiaries.

* Assistance categories.

* Priority levels.

AI generates different possible allocation plans.

For example:

Available emergency funds

### ₹5,00,000

| Category            | Suggested allocation |
| ------------------- | -------------------- |
| Critical assistance | ₹2,00,000            |
| High priority       | ₹1,50,000            |
| Medium priority     | ₹1,00,000            |
| General assistance  | ₹50,000              |

Total allocated ₹5,00,000

Illustrative AI-generated allocation, subject to human review.

Allow admins to compare alternative allocation scenarios before approving one.

### D. Donor Impact Intelligence

After donating, donors can ask:

* What impact did my donation have?

* Which campaign did I support?

* How many families were helped?

* What progress has the campaign made?

* Show me the latest campaign update.

AI generates a personalized impact summary using verified campaign records, without claiming that an individual donation directly funded a specific beneficiary unless that link is actually recorded.

### E. Emergency Supply Marketplace

Combine Channel3 with PayPal checkout to introduce a procurement experience.

Organizations can:

* Browse emergency supplies.

* Compare suppliers and products.

* Generate relief kits.

* Estimate procurement costs.

* Prepare purchase orders.

* Review payment details.

* Track procurement status.

This introduces a second kind of money movement: organizations purchasing essential supplies rather than only disbursing cash.

### 6\. What to add to the frontend right now

Since you want to start with the frontend, I would add these new pages to your existing specification.

| New page/module         | Important UI elements                                             |
| ----------------------- | ----------------------------------------------------------------- |
| AI Command Centre       | Chat interface, suggested prompts, agent activity, approval cards |
| Agent Activity Monitor  | Agent status, tasks, execution logs, errors                       |
| AI Allocation Simulator | Budget input, allocation charts, comparison scenarios             |
| Payment Agent           | Pending payouts, payment previews, authorization dialog           |
| Financial Intelligence  | Natural-language search, generated charts, AG Grid                |
| Emergency Procurement   | Product search, product cards, comparison and cart                |
| Volunteer Scheduler     | Calendar, resource assignments, Gantt timeline                    |
| Payment Reconciliation  | Matched transactions, unmatched records, discrepancies            |
| Donor Impact Centre     | Donation history, campaign updates, impact summaries              |
| Workflow Automation     | Triggers, conditions, actions and execution history               |

These can initially run on realistic mock data. Design the interfaces so actual partner integrations can replace the mock services later.

### 7\. The exact combination I would choose for ReliefPay

My recommended architecture

| Technology                 | Purpose                                    |
| -------------------------- | ------------------------------------------ |
| PayPal Checkout            | Donations                                  |
| PayPal Payouts             | Approved aid disbursement                  |
| PayPal Webhooks            | Transaction updates                        |
| PayPal Agent Toolkit / MCP | AI payment