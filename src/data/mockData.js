export const INITIAL_USER_ACCOUNTS = [
  { id: 'usr-1', name: 'Dr. Alok Verma', role: 'ADMIN', email: 'alok.v@reliefpay.org', org: 'Global Relief Network', title: 'Operations Director' },
  { id: 'usr-2', name: 'Sarah Jenkins', role: 'REVIEWER', email: 's.jenkins@reliefpay.org', org: 'Field Operations', title: 'Senior Case Officer' },
  { id: 'usr-3', name: 'Ayesha Khan', role: 'BENEFICIARY', email: 'ayesha.k@gmail.com', org: 'Resident - Mumbra Sector 4', title: 'Applicant' },
  { id: 'usr-4', name: 'Rohan Mehta', role: 'DONOR', email: 'mehta.r@techcorp.in', org: 'Impact Angel', title: 'Philanthropist' },
  { id: 'usr-5', name: 'Vikram Singh', role: 'VOLUNTEER', email: 'vikram.s@reliefpay.org', org: 'Field Response Unit', title: 'Lead Field Assessor' },
  { id: 'usr-6', name: 'Elena Rostova', role: 'AUDITOR', email: 'elena@auditcore.org', org: 'Transparency Watch', title: 'Lead Financial Auditor' },
];

export const INITIAL_CAMPAIGNS = [
  {
    id: 'cmp-01',
    title: 'Mumbra Monsoons Relief & Shelter Fund',
    disasterType: 'Flood Relief',
    location: 'Mumbra, Maharashtra',
    coordinates: [19.1796, 73.0231],
    targetAmount: 500000,
    raisedAmount: 368000,
    disbursedAmount: 240000,
    status: 'ACTIVE',
    beneficiariesCount: 142,
    startDate: '2026-08-01',
    endDate: '2026-11-30',
    description: 'Providing direct monetary assistance for immediate food, emergency medical needs, and structural home repairs for families displaced by floodwaters.'
  },
  {
    id: 'cmp-02',
    title: 'Kerala Flash Floods Emergency Payouts',
    disasterType: 'Landslide & Flood',
    location: 'Wayanad, Kerala',
    coordinates: [11.6854, 76.1320],
    targetAmount: 1200000,
    raisedAmount: 950000,
    disbursedAmount: 710000,
    status: 'ACTIVE',
    beneficiariesCount: 380,
    startDate: '2026-07-15',
    endDate: '2026-12-15',
    description: 'Direct grant disbursements for temporary housing and essential sanitation kits for high-risk landslide displaced communities.'
  },
  {
    id: 'cmp-03',
    title: 'Assam Brahamaputra Basin Food & Health Security',
    disasterType: 'Riverine Flooding',
    location: 'Silchar, Assam',
    coordinates: [24.8333, 92.7789],
    targetAmount: 800000,
    raisedAmount: 800000,
    disbursedAmount: 790000,
    status: 'COMPLETED',
    beneficiariesCount: 510,
    startDate: '2026-05-10',
    endDate: '2026-09-01',
    description: 'Emergency clean water and cash-for-subsistence grants distributed across remote river basin settlements.'
  }
];

export const INITIAL_APPLICATIONS = [
  {
    id: 'RPA-2026-0012',
    beneficiaryName: 'Ayesha Khan',
    phone: '+91 98200 11223',
    campaignId: 'cmp-01',
    area: 'Mumbra Sector 4, Thane',
    coordinates: [19.1810, 73.0210],
    householdMembers: 5,
    disasterType: 'Flood Emergency',
    requestedAmount: 15000,
    approvedAmount: 12000,
    priority: 'HIGH',
    status: 'UNDER_REVIEW',
    submittedAt: '2026-10-24 10:15 AM',
    aiFindings: [
      { id: 'aif-1', severity: 'WARNING', title: 'Potential Contact Overlap', reason: 'Phone number matches previous assistance claim in 2025. Human verification recommended.', fields: ['phone'] },
      { id: 'aif-2', severity: 'INFO', title: 'Income & Verification Document Verified', reason: 'Aadhaar ID front/back alignment score 98%. Valid address proof.', fields: ['documents'] }
    ],
    timeline: [
      { title: 'Application Submitted', date: '2026-10-24 10:15 AM', actor: 'Ayesha Khan (Beneficiary)' },
      { title: 'Automated AI Risk Screening', date: '2026-10-24 10:16 AM', actor: 'ReliefPay AI Engine' }
    ],
    documents: ['Aadhaar_Card_Masked.pdf', 'Water_Damage_Photo_1.jpg', 'Local_Ration_Card.pdf']
  },
  {
    id: 'RPA-2026-0015',
    beneficiaryName: 'Rahim Shaikh',
    phone: '+91 98331 44556',
    campaignId: 'cmp-01',
    area: 'Kausa Market, Mumbra',
    coordinates: [19.1750, 73.0280],
    householdMembers: 3,
    disasterType: 'Flood Emergency',
    requestedAmount: 20000,
    approvedAmount: 20000,
    priority: 'CRITICAL',
    status: 'APPROVED',
    submittedAt: '2026-10-25 02:30 PM',
    aiFindings: [
      { id: 'aif-3', severity: 'SUCCESS', title: 'High Confidence Match', reason: 'Geolocated damage photo matches flood perimeter. Zero duplicate records.', fields: [] }
    ],
    timeline: [
      { title: 'Application Submitted', date: '2026-10-25 02:30 PM', actor: 'Rahim Shaikh' },
      { title: 'AI Screening Passed', date: '2026-10-25 02:31 PM', actor: 'ReliefPay AI Engine' },
      { title: 'Approved by Senior Officer', date: '2026-10-26 09:00 AM', actor: 'Sarah Jenkins (Reviewer)' }
    ],
    documents: ['Aadhaar_Card_Masked.pdf', 'Shop_Damage_Proof.jpg']
  }
];

export const INITIAL_TRANSACTIONS = [
  {
    id: 'TXN-880192',
    applicationId: 'RPA-2026-0015',
    beneficiaryName: 'Rahim Shaikh',
    campaignTitle: 'Mumbra Monsoons Relief',
    amount: 20000,
    provider: 'Bank Direct Payout (NPCI / UPI)',
    recipientRef: 'xxxx-xxxx-4482',
    status: 'COMPLETED',
    timestamp: '2026-10-26 09:15 AM',
    gatewayRef: 'UPI-N261026994112'
  },
  {
    id: 'TXN-880198',
    applicationId: 'RPA-2026-0012',
    beneficiaryName: 'Ayesha Khan',
    campaignTitle: 'Mumbra Monsoons Relief',
    amount: 12000,
    provider: 'Instant Relief Transfer',
    recipientRef: 'xxxx-xxxx-9012',
    status: 'PENDING',
    timestamp: '2026-10-28 11:30 AM',
    gatewayRef: 'PAYOUT-QUEUED-0082'
  }
];

export const INITIAL_DONATIONS = [
  { id: 'DON-901', donorName: 'Rohan Mehta', amount: 50000, campaignTitle: 'Mumbra Monsoons Relief & Shelter Fund', timestamp: '2026-10-20 04:12 PM', status: 'COMPLETED' },
  { id: 'DON-902', donorName: 'Anonymous Supporter', amount: 15000, campaignTitle: 'Kerala Flash Floods Emergency Payouts', timestamp: '2026-10-22 01:45 PM', status: 'COMPLETED' },
  { id: 'DON-903', donorName: 'Anita Desai', amount: 25000, campaignTitle: 'Mumbra Monsoons Relief & Shelter Fund', timestamp: '2026-10-27 10:05 AM', status: 'COMPLETED' }
];

export const INITIAL_VOLUNTEER_TASKS = [
  { id: 'TSK-101', beneficiaryId: 'RPA-2026-0012', beneficiaryName: 'Ayesha Khan', area: 'Mumbra Sector 4', status: 'IN_PROGRESS', dueDate: '2026-10-31', notes: 'Verify household water level mark and Aadhaar physical copy.' },
  { id: 'TSK-102', beneficiaryId: 'RPA-2026-0018', beneficiaryName: 'Priya Nair', area: 'Wayanad Zone 2', status: 'ASSIGNED', dueDate: '2026-11-02', notes: 'Inspect storm drain damage impact.' }
];

export const INITIAL_AUDIT_LOGS = [
  { id: 'LOG-7701', actor: 'Sarah Jenkins (Reviewer)', action: 'APPROVED_GRANT', target: 'Application RPA-2026-0015', timestamp: '2026-10-26 09:00 AM', status: 'VERIFIED' },
  { id: 'LOG-7702', actor: 'System Clearinghouse', action: 'INITIATED_DISBURSEMENT', target: 'Transaction TXN-880192', timestamp: '2026-10-26 09:15 AM', status: 'VERIFIED' },
  { id: 'LOG-7703', actor: 'Ayesha Khan (Beneficiary)', action: 'SUBMITTED_APPLICATION', target: 'Application RPA-2026-0012', timestamp: '2026-10-24 10:15 AM', status: 'RECORDED' }
];