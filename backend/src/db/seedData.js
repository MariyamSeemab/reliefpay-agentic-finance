// Demo seed data. Copied from src/data/mockData.js (not imported) and converted
// to USD integer cents: mock INR amounts divided by 100.

export const SEED_PASSWORD = 'password123';

export const SEED_USERS = [
  { id: 'usr-1', name: 'Dr. Alok Verma', role: 'ADMIN', email: 'alok.v@reliefpay.org', org: 'Global Relief Network', title: 'Operations Director' },
  { id: 'usr-2', name: 'Sarah Jenkins', role: 'REVIEWER', email: 's.jenkins@reliefpay.org', org: 'Field Operations', title: 'Senior Case Officer' },
  { id: 'usr-3', name: 'Ayesha Khan', role: 'BENEFICIARY', email: 'ayesha.k@gmail.com', org: 'Resident - Mumbra Sector 4', title: 'Applicant' },
  { id: 'usr-4', name: 'Rohan Mehta', role: 'DONOR', email: 'mehta.r@techcorp.in', org: 'Impact Angel', title: 'Philanthropist' },
  { id: 'usr-5', name: 'Vikram Singh', role: 'VOLUNTEER', email: 'vikram.s@reliefpay.org', org: 'Field Response Unit', title: 'Lead Field Assessor' },
  { id: 'usr-6', name: 'Elena Rostova', role: 'AUDITOR', email: 'elena@auditcore.org', org: 'Transparency Watch', title: 'Lead Financial Auditor' },
];

export const SEED_CAMPAIGNS = [
  {
    id: 'cmp-01',
    title: 'Mumbra Monsoons Relief & Shelter Fund',
    disasterType: 'Flood Relief',
    location: 'Mumbra, Maharashtra',
    lat: 19.1796,
    lng: 73.0231,
    targetCents: 500000,
    raisedCents: 368000,
    disbursedCents: 240000,
    status: 'ACTIVE',
    beneficiariesCount: 142,
    startDate: '2026-08-01',
    endDate: '2026-11-30',
    description: 'Providing direct monetary assistance for immediate food, emergency medical needs, and structural home repairs for families displaced by floodwaters.',
  },
  {
    id: 'cmp-02',
    title: 'Kerala Flash Floods Emergency Payouts',
    disasterType: 'Landslide & Flood',
    location: 'Wayanad, Kerala',
    lat: 11.6854,
    lng: 76.132,
    targetCents: 1200000,
    raisedCents: 950000,
    disbursedCents: 710000,
    status: 'ACTIVE',
    beneficiariesCount: 380,
    startDate: '2026-07-15',
    endDate: '2026-12-15',
    description: 'Direct grant disbursements for temporary housing and essential sanitation kits for high-risk landslide displaced communities.',
  },
  {
    id: 'cmp-03',
    title: 'Assam Brahamaputra Basin Food & Health Security',
    disasterType: 'Riverine Flooding',
    location: 'Silchar, Assam',
    lat: 24.8333,
    lng: 92.7789,
    targetCents: 800000,
    raisedCents: 800000,
    disbursedCents: 790000,
    status: 'COMPLETED',
    beneficiariesCount: 510,
    startDate: '2026-05-10',
    endDate: '2026-09-01',
    description: 'Emergency clean water and cash-for-subsistence grants distributed across remote river basin settlements.',
  },
];

function emailFor(name) {
  const [first, ...rest] = name.toLowerCase().split(/\s+/);
  return `${first}.${rest.join('')}@example.com`;
}

const AI_ENGINE = 'ReliefPay AI Engine';

const RAW_APPLICATIONS = [
  {
    id: 'RPA-2026-0012',
    beneficiaryName: 'Ayesha Khan',
    phone: '+91 98200 11223',
    campaignId: 'cmp-01',
    area: 'Mumbra Sector 4, Thane',
    lat: 19.181,
    lng: 73.021,
    householdMembers: 5,
    disasterType: 'Flood Emergency',
    requestedCents: 15000,
    approvedCents: 12000,
    priority: 'HIGH',
    status: 'UNDER_REVIEW',
    submittedAt: '2026-10-24 10:15 AM',
    aiFindings: [
      { id: 'aif-1', severity: 'WARNING', title: 'Potential Contact Overlap', reason: 'Phone number matches previous assistance claim in 2025. Human verification recommended.', fields: ['phone'] },
      { id: 'aif-2', severity: 'INFO', title: 'Income & Verification Document Verified', reason: 'Aadhaar ID front/back alignment score 98%. Valid address proof.', fields: ['documents'] },
    ],
    timeline: [
      { title: 'Application Submitted', date: '2026-10-24 10:15 AM', actor: 'Ayesha Khan (Beneficiary)' },
      { title: 'Automated AI Risk Screening', date: '2026-10-24 10:16 AM', actor: AI_ENGINE },
    ],
    documents: ['Aadhaar_Card_Masked.pdf', 'Water_Damage_Photo_1.jpg', 'Local_Ration_Card.pdf'],
  },
  {
    id: 'RPA-2026-0015',
    beneficiaryName: 'Rahim Shaikh',
    phone: '+91 98331 44556',
    campaignId: 'cmp-01',
    area: 'Kausa Market, Mumbra',
    lat: 19.175,
    lng: 73.028,
    householdMembers: 3,
    disasterType: 'Flood Emergency',
    requestedCents: 20000,
    approvedCents: 20000,
    priority: 'CRITICAL',
    status: 'APPROVED',
    submittedAt: '2026-10-25 02:30 PM',
    aiFindings: [
      { id: 'aif-3', severity: 'SUCCESS', title: 'High Confidence Match', reason: 'Geolocated damage photo matches flood perimeter. Zero duplicate records.', fields: [] },
    ],
    timeline: [
      { title: 'Application Submitted', date: '2026-10-25 02:30 PM', actor: 'Rahim Shaikh' },
      { title: 'AI Screening Passed', date: '2026-10-25 02:31 PM', actor: AI_ENGINE },
      { title: 'Approved by Senior Officer', date: '2026-10-26 09:00 AM', actor: 'Sarah Jenkins (Reviewer)' },
    ],
    documents: ['Aadhaar_Card_Masked.pdf', 'Shop_Damage_Proof.jpg'],
  },
  {
    id: 'RPA-2026-0018',
    beneficiaryName: 'Priya Nair',
    phone: '+91 94470 22118',
    campaignId: 'cmp-02',
    area: 'Wayanad Zone 2',
    lat: 11.689,
    lng: 76.129,
    householdMembers: 4,
    disasterType: 'Landslide & Flood',
    requestedCents: 18500,
    approvedCents: 18500,
    priority: 'HIGH',
    status: 'APPROVED',
    submittedAt: '2026-10-26 11:20 AM',
    aiFindings: [
      { id: 'aif-4', severity: 'SUCCESS', title: 'Location Verified', reason: 'Address falls inside the mapped landslide impact zone. No duplicate records.', fields: [] },
    ],
    timeline: [
      { title: 'Application Submitted', date: '2026-10-26 11:20 AM', actor: 'Priya Nair (Beneficiary)' },
      { title: 'AI Screening Passed', date: '2026-10-26 11:21 AM', actor: AI_ENGINE },
      { title: 'Approved by Senior Officer', date: '2026-10-27 10:00 AM', actor: 'Sarah Jenkins (Reviewer)' },
    ],
    documents: ['Aadhaar_Card_Masked.pdf', 'Storm_Drain_Damage.jpg'],
  },
  {
    id: 'RPA-2026-0021',
    beneficiaryName: 'Rajesh Patel',
    phone: '+91 98190 33445',
    campaignId: 'cmp-01',
    area: 'Shil Phata, Mumbra',
    lat: 19.168,
    lng: 73.034,
    householdMembers: 6,
    disasterType: 'Flood Emergency',
    requestedCents: 22000,
    approvedCents: 22000,
    priority: 'HIGH',
    status: 'APPROVED',
    submittedAt: '2026-10-26 03:45 PM',
    aiFindings: [
      { id: 'aif-5', severity: 'SUCCESS', title: 'Documents Consistent', reason: 'ID and ration card names match. Damage photo inside flood perimeter.', fields: [] },
    ],
    timeline: [
      { title: 'Application Submitted', date: '2026-10-26 03:45 PM', actor: 'Rajesh Patel (Beneficiary)' },
      { title: 'AI Screening Passed', date: '2026-10-26 03:46 PM', actor: AI_ENGINE },
      { title: 'Approved by Senior Officer', date: '2026-10-27 11:30 AM', actor: 'Sarah Jenkins (Reviewer)' },
    ],
    documents: ['Aadhaar_Card_Masked.pdf', 'Home_Flooding_Photo.jpg', 'Local_Ration_Card.pdf'],
  },
  {
    id: 'RPA-2026-0024',
    beneficiaryName: 'Anjali Devi',
    phone: '+91 98670 55667',
    campaignId: 'cmp-01',
    area: 'Amrut Nagar, Mumbra',
    lat: 19.186,
    lng: 73.019,
    householdMembers: 3,
    disasterType: 'Flood Emergency',
    requestedCents: 16000,
    approvedCents: 16000,
    priority: 'MEDIUM',
    status: 'APPROVED',
    submittedAt: '2026-10-27 09:10 AM',
    aiFindings: [
      { id: 'aif-6', severity: 'INFO', title: 'Household Size Verified', reason: 'Ration card lists 3 members, matching the application.', fields: ['householdMembers'] },
    ],
    timeline: [
      { title: 'Application Submitted', date: '2026-10-27 09:10 AM', actor: 'Anjali Devi (Beneficiary)' },
      { title: 'AI Screening Passed', date: '2026-10-27 09:11 AM', actor: AI_ENGINE },
      { title: 'Approved by Senior Officer', date: '2026-10-28 09:40 AM', actor: 'Sarah Jenkins (Reviewer)' },
    ],
    documents: ['Aadhaar_Card_Masked.pdf', 'Local_Ration_Card.pdf'],
  },
  {
    id: 'RPA-2026-0027',
    beneficiaryName: 'Vikram Kumar',
    phone: '+91 98920 77889',
    campaignId: 'cmp-01',
    area: 'Retibunder, Mumbra',
    lat: 19.191,
    lng: 73.026,
    householdMembers: 2,
    disasterType: 'Flood Emergency',
    requestedCents: 11000,
    approvedCents: null,
    priority: 'MEDIUM',
    status: 'UNDER_REVIEW',
    submittedAt: '2026-10-28 01:05 PM',
    aiFindings: [
      { id: 'aif-7', severity: 'WARNING', title: 'Address Proof Missing', reason: 'No address proof uploaded yet. Request document before approval.', fields: ['documents'] },
    ],
    timeline: [
      { title: 'Application Submitted', date: '2026-10-28 01:05 PM', actor: 'Vikram Kumar (Beneficiary)' },
      { title: 'Automated AI Risk Screening', date: '2026-10-28 01:06 PM', actor: AI_ENGINE },
    ],
    documents: ['Aadhaar_Card_Masked.pdf'],
  },
];

export const SEED_APPLICATIONS = RAW_APPLICATIONS.map((app) => ({
  ...app,
  paypalEmail: emailFor(app.beneficiaryName),
}));

// counted = 1: already included in the seeded campaign raised totals.
export const SEED_DONATIONS = [
  { id: 'DON-901', campaignId: 'cmp-01', userId: 'usr-4', donorName: 'Rohan Mehta', amountCents: 50000, createdAt: '2026-10-20T16:12:00.000Z' },
  { id: 'DON-902', campaignId: 'cmp-02', userId: null, donorName: 'Anonymous Supporter', amountCents: 15000, createdAt: '2026-10-22T13:45:00.000Z' },
  { id: 'DON-903', campaignId: 'cmp-01', userId: null, donorName: 'Anita Desai', amountCents: 25000, createdAt: '2026-10-27T10:05:00.000Z' },
];

export const SEED_AUDIT_LOGS = [
  { id: 'LOG-7701', actorId: 'usr-2', actorLabel: 'Sarah Jenkins (Reviewer)', action: 'APPROVED_GRANT', target: 'Application RPA-2026-0015', createdAt: '2026-10-26T09:00:00.000Z', status: 'VERIFIED' },
  { id: 'LOG-7702', actorId: 'system', actorLabel: 'System Clearinghouse', action: 'INITIATED_DISBURSEMENT', target: 'Transaction TXN-880192', createdAt: '2026-10-26T09:15:00.000Z', status: 'VERIFIED' },
  { id: 'LOG-7703', actorId: 'usr-3', actorLabel: 'Ayesha Khan (Beneficiary)', action: 'SUBMITTED_APPLICATION', target: 'Application RPA-2026-0012', createdAt: '2026-10-24T10:15:00.000Z', status: 'RECORDED' },
];

export const SEED_PAYOUT_BATCH = {
  id: 'PB-SEED-001',
  campaignId: 'cmp-01',
  status: 'DRAFT',
  note: 'Seeded demo batch',
  draftedByAi: 0,
  createdByUserId: 'usr-1',
  createdAt: '2026-10-28T12:00:00.000Z',
  items: [
    { id: 'PI-SEED-001', applicationId: 'RPA-2026-0015', amountCents: 20000 },
    { id: 'PI-SEED-002', applicationId: 'RPA-2026-0021', amountCents: 22000 },
  ],
};
