// The built-in ReliefPay report (AgReportState): Overview, Donations and Payouts
// pages. Field ids ('campaigns.raised') refer to the data sources in ./data.js.
// Helpers and widget shapes follow the PayPal AG Grid boilerplate's initial-report.ts.

// Position on the canvas grid, in tracks: 24 columns wide, rows of studioCanvasRowHeight.
const at = (xTrack, yTrack, xSpan, ySpan) => ({ xTrack, yTrack, xSpan, ySpan });
const title = (text) => ({ title: { enabled: true, text } });
const sum = (id) => ({ id, aggregation: 'sum' });
const avg = (id) => ({ id, aggregation: 'avg' });
const countd = (id) => ({ id, aggregation: 'countd' });

const FONT = 'Inter, ui-sans-serif, system-ui, sans-serif';

const typography = (fontSize, fontWeight = 'normal') => ({
  fontFamily: FONT,
  fontSize,
  fontWeight,
  fontStyle: 'normal',
});

// A KPI tile: bold title, large value.
const kpi = (text, value) => ({
  type: 'value',
  dataMapping: { value: [value] },
  format: {
    title: { enabled: true, text, typography: typography(14, 'bold') },
    caption: { enabled: true, text: '', typography: typography(0) },
    style: { typography: typography(22) },
  },
});

const legend = { style: { theme: { common: { legend: { enabled: true } } } } };

const donut = (text, categoryId, value) => ({
  type: 'donut-chart',
  dataMapping: { categoryKey: [{ id: categoryId }], valueKey: [value] },
  format: {
    ...title(text),
    style: { custom: { pieDataLabel: { enabled: true }, totalLabel: { enabled: true } } },
  },
});

const overview = {
  id: 'overview',
  widgets: {
    'kpi-raised': kpi('Total raised', sum('campaigns.raised')),
    'kpi-net': kpi('Net donations', sum('donations.netAmount')),
    'kpi-donations': kpi('Donations', countd('donations.id')),
    'kpi-refunded': kpi('Refunded', sum('donations.refundedAmount')),
    'campaign-progress': {
      type: 'bar-chart-grouped',
      dataMapping: {
        categoryKey: [{ id: 'campaigns.title' }],
        valueKey: [sum('campaigns.raised'), sum('campaigns.target')],
      },
      format: { ...title('Campaign progress: raised vs target'), ...legend },
    },
    'funded-rate': {
      type: 'radial-gauge',
      dataMapping: { value: [{ id: 'fundedRate' }] },
      format: {
        ...title('Funded rate'),
        style: {
          scaleLabel: { min: 0, max: 1 },
          label: { typography: typography(24, 'bold') },
          secondaryLabel: { enabled: true, text: 'of all campaign targets raised', typography: typography(12) },
        },
      },
    },
    'donations-by-campaign': donut('Net donations by campaign', 'campaigns.title', sum('donations.netAmount')),
    'campaign-table': {
      type: 'grid',
      dataMapping: {
        cols: [
          { id: 'campaigns.title' },
          { id: 'campaigns.status' },
          sum('campaigns.target'),
          sum('campaigns.raised'),
          sum('campaigns.disbursed'),
          sum('campaigns.available'),
          avg('campaigns.fundedPct'),
        ],
      },
      sort: [{ field: sum('campaigns.raised'), direction: 'desc' }],
      format: title('Campaigns'),
    },
  },
  widgetLayout: {
    'kpi-raised': at(0, 0, 6, 7),
    'kpi-net': at(6, 0, 6, 7),
    'kpi-donations': at(12, 0, 6, 7),
    'kpi-refunded': at(18, 0, 6, 7),
    'campaign-progress': at(0, 7, 16, 18),
    'funded-rate': at(16, 7, 8, 18),
    'donations-by-campaign': at(0, 25, 9, 20),
    'campaign-table': at(9, 25, 15, 20),
  },
};

const donations = {
  id: 'donations',
  widgets: {
    'donation-date': {
      type: 'date-filter',
      dataMapping: { value: [{ id: 'donations.createdAt' }] },
      // No default period: a relative date filter in saved state fails to apply on load in
      // Studio 3.0 (noted in the PayPal boilerplate), though it works once picked in the widget.
      format: { style: { filterType: 'relative' } },
    },
    'donation-feed': {
      type: 'grid',
      dataMapping: {
        cols: [
          { id: 'donations.createdAt' },
          { id: 'donations.donorName' },
          { id: 'campaigns.title' },
          { id: 'donations.kind' },
          { id: 'donations.status' },
          sum('donations.amount'),
          sum('donations.refundedAmount'),
          sum('donations.netAmount'),
        ],
      },
      sort: [{ field: { id: 'donations.createdAt' }, direction: 'desc' }],
      format: title('Donation feed, newest first'),
    },
    leaderboard: {
      type: 'grid',
      dataMapping: {
        cols: [
          { id: 'donors.donorName' },
          sum('donors.donationCount'),
          sum('donors.totalDonated'),
          { id: 'donors.lastDonationAt' },
        ],
      },
      sort: [{ field: sum('donors.totalDonated'), direction: 'desc' }],
      format: title('Donor leaderboard'),
    },
    'donations-by-type': donut('Net donations: single vs split', 'donations.kind', sum('donations.netAmount')),
  },
  widgetLayout: {
    'donation-date': at(0, 0, 24, 7),
    'donation-feed': at(0, 7, 24, 20),
    leaderboard: at(0, 27, 15, 20),
    'donations-by-type': at(15, 27, 9, 20),
  },
};

const payouts = {
  id: 'payouts',
  widgets: {
    'kpi-paid-out': kpi('Paid out', sum('payoutItems.amount')),
    'kpi-batches': kpi('Batches', countd('payoutBatches.id')),
    'payout-status': {
      type: 'column-chart-stacked',
      dataMapping: {
        categoryKey: [{ id: 'campaigns.title' }],
        valueKey: [sum('payoutItems.amount')],
        legendKey: [{ id: 'payoutItems.status' }],
      },
      format: { ...title('Payouts by campaign and status'), ...legend },
    },
    refunds: {
      type: 'grid',
      dataMapping: {
        cols: [{ id: 'refunds.createdAt' }, sum('refunds.amount'), { id: 'refunds.status' }, { id: 'refunds.source' }],
      },
      sort: [{ field: { id: 'refunds.createdAt' }, direction: 'desc' }],
      format: title('Refunds'),
    },
    batches: {
      type: 'grid',
      dataMapping: {
        cols: [
          { id: 'payoutBatches.id' },
          { id: 'payoutBatches.status' },
          sum('payoutBatches.total'),
          sum('payoutBatches.itemCount'),
          { id: 'payoutBatches.draftedByAi' },
          { id: 'payoutBatches.createdAt' },
        ],
      },
      sort: [{ field: { id: 'payoutBatches.createdAt' }, direction: 'desc' }],
      format: title('Payout batches'),
    },
  },
  widgetLayout: {
    'kpi-paid-out': at(0, 0, 12, 7),
    'kpi-batches': at(12, 0, 12, 7),
    'payout-status': at(0, 7, 14, 18),
    refunds: at(14, 7, 10, 18),
    batches: at(0, 25, 24, 18),
  },
};

export const REPORT_PAGES = [
  { id: overview.id, title: 'Overview' },
  { id: donations.id, title: 'Donations' },
  { id: payouts.id, title: 'Payouts' },
];

// The report opens on its first page.
export const reliefPayReport = {
  selectedPageId: overview.id,
  pages: [overview, donations, payouts],
};
