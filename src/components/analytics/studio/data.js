// AG Studio data sources for the ReliefPay analytics page: one table per array in
// GET /api/analytics, the relationships between them, a shared calendar and two
// calculated measures. Helper style follows the PayPal AG Grid boilerplate's data.ts.

const CALENDAR_ID = 'calendar';

// [id, name, format, hide?]
const fields = (specs) => specs.map(([id, name, format, hide]) => ({ id, name, format, ...(hide && { hide }) }));

// Foreign key 'table.field' -> primary key 'table.field'.
const manyToOne = (id, source, target) => {
  const [sourceTable, sourceField] = source.split('.');
  const [targetTable, targetField] = target.split('.');
  return {
    id,
    source: { tableId: sourceTable, fieldId: sourceField },
    target: { tableId: targetTable, fieldId: targetField },
    type: 'many-to-one',
  };
};

const onCalendar = (tableId, fieldId, truncate) => ({
  id: `${tableId}-${fieldId}-calendar`,
  source: { tableId, fieldId },
  target: { calendarId: CALENDAR_ID },
  ...(truncate && { truncate }),
});

const sumOf = (id) => ({ id, aggregation: 'sum' });

const ratio = (id, name, description, numerator, denominator) => ({
  id,
  name,
  description,
  format: 'percentageFormat',
  isMeasure: true,
  expression: { operator: 'divide', inputs: [sumOf(numerator), sumOf(denominator)] },
});

// Without campaigns there is nothing to report on.
export const hasData = (data) => data.campaigns.length > 0;

export function buildStudioData(data) {
  const dates = [...data.donations.map((r) => r.createdAt), ...data.payoutBatches.map((r) => r.createdAt)]
    .filter(Boolean)
    .map((d) => d.slice(0, 10))
    .sort();
  const today = data.asOf.slice(0, 10);

  return {
    description:
      'ReliefPay disaster-relief data in USD: relief campaigns, the donations made to them through PayPal, ' +
      'refunds, and payout batches sent to verified beneficiaries. Donation net amounts are net of refunds. ' +
      'A split donation is one PayPal payment spread across several campaigns and has one row per campaign.',
    sources: [
      {
        id: 'campaigns',
        description: 'One row per relief campaign with its fundraising target and running totals.',
        data: data.campaigns,
        fields: fields([
          ['id', 'Campaign ID', 'textFormat', true],
          ['title', 'Campaign', 'textFormat'],
          ['status', 'Campaign Status', 'textFormat'],
          ['disasterType', 'Disaster Type', 'textFormat'],
          ['location', 'Location', 'textFormat'],
          ['target', 'Target', 'currencyFormat'],
          ['raised', 'Raised', 'currencyFormat'],
          ['disbursed', 'Disbursed', 'currencyFormat'],
          ['available', 'Available', 'currencyFormat'],
          ['fundedPct', 'Funded', 'percentageFormat'],
          ['beneficiaries', 'Beneficiaries', 'integerFormat'],
        ]),
      },
      {
        id: 'donations',
        description:
          'One row per donation (per campaign for split donations). Net donation is the amount minus refunds for completed donations, 0 otherwise.',
        data: data.donations,
        fields: fields([
          ['id', 'Donation ID', 'textFormat', true],
          ['campaignId', 'Donation Campaign ID', 'textFormat', true],
          ['donorName', 'Donor Name', 'textFormat'],
          ['amount', 'Donation Amount', 'currencyFormat'],
          ['refundedAmount', 'Refunded Amount', 'currencyFormat'],
          ['netAmount', 'Net Donation', 'currencyFormat'],
          ['status', 'Donation Status', 'textFormat'],
          ['kind', 'Donation Type', 'textFormat'],
          ['splitOrderId', 'Split Order', 'textFormat', true],
          ['createdAt', 'Donation Date', 'dateTimeFormat'],
        ]),
      },
      {
        id: 'donors',
        description: 'Donor leaderboard over completed donations, net of refunds.',
        data: data.donors,
        fields: fields([
          ['id', 'Donor ID', 'textFormat', true],
          ['donorName', 'Donor', 'textFormat'],
          ['donationCount', 'Donation Count', 'integerFormat'],
          ['totalDonated', 'Net Donated', 'currencyFormat'],
          ['lastDonationAt', 'Last Donation', 'dateTimeFormat'],
        ]),
      },
      {
        id: 'refunds',
        description: 'Refunds and reversals of donations. Refunded is the amount actually taken off the campaign total.',
        data: data.refunds,
        fields: fields([
          ['id', 'Refund ID', 'textFormat', true],
          ['donationId', 'Refund Donation ID', 'textFormat', true],
          ['campaignId', 'Refund Campaign ID', 'textFormat', true],
          ['amount', 'Refunded', 'currencyFormat'],
          ['requestedAmount', 'Requested Refund', 'currencyFormat'],
          ['status', 'Refund Status', 'textFormat'],
          ['source', 'Refund Source', 'textFormat'],
          ['eventType', 'Refund Event', 'textFormat'],
          ['createdAt', 'Refund Date', 'dateTimeFormat'],
        ]),
      },
      {
        id: 'payoutBatches',
        name: 'Payout Batches',
        description: 'PayPal payout batches for a campaign. Draft batches have not been released yet.',
        data: data.payoutBatches,
        fields: fields([
          ['id', 'Batch', 'textFormat'],
          ['campaignId', 'Batch Campaign ID', 'textFormat', true],
          ['status', 'Batch Status', 'textFormat'],
          ['total', 'Batch Total', 'currencyFormat'],
          ['itemCount', 'Batch Items', 'integerFormat'],
          ['draftedByAi', 'Drafted by AI', 'booleanFormat'],
          ['createdAt', 'Batch Created', 'dateTimeFormat'],
          ['releasedAt', 'Batch Released', 'dateTimeFormat'],
        ]),
      },
      {
        id: 'payoutItems',
        name: 'Payout Items',
        description: 'One payout to one beneficiary inside a batch.',
        data: data.payoutItems,
        fields: fields([
          ['id', 'Payout Item ID', 'textFormat', true],
          ['batchId', 'Payout Batch ID', 'textFormat', true],
          ['applicationId', 'Payout Application ID', 'textFormat', true],
          ['amount', 'Payout Amount', 'currencyFormat'],
          ['status', 'Payout Status', 'textFormat'],
        ]),
      },
    ],
    relationships: [
      manyToOne('donation-campaign', 'donations.campaignId', 'campaigns.id'),
      manyToOne('refund-donation', 'refunds.donationId', 'donations.id'),
      manyToOne('batch-campaign', 'payoutBatches.campaignId', 'campaigns.id'),
      manyToOne('item-batch', 'payoutItems.batchId', 'payoutBatches.id'),
      onCalendar('donations', 'createdAt', 'day'),
      onCalendar('payoutBatches', 'createdAt', 'day'),
    ],
    calendars: [
      {
        id: CALENDAR_ID,
        label: 'Calendar',
        range: {
          from: { type: 'date', value: dates[0] ?? today },
          to: { type: 'date', value: dates.at(-1) ?? today },
        },
        fragments: ['year', 'quarter', 'month', 'week', 'day', 'dayOfWeek'],
      },
    ],
    expressions: [
      ratio('fundedRate', 'Funded Rate', 'Raised / target across the selected campaigns.', 'campaigns.raised', 'campaigns.target'),
      ratio('refundRate', 'Refund Rate', 'Refunded / donated.', 'donations.refundedAmount', 'donations.amount'),
    ],
  };
}
