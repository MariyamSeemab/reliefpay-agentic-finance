import React, { useState } from 'react';
import { Check, X, AlertTriangle, DollarSign, Users, Zap, ChevronRight, Lock } from 'lucide-react';
import { BackButton } from '../components/common/BackButton';

export default function PaymentAgentPage() {
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [approvalModal, setApprovalModal] = useState(false);
  const [authCode, setAuthCode] = useState('');

  const pendingPayouts = [
    {
      id: 'PAYOUT-001',
      campaignId: 'cmp-01',
      campaignName: 'Mumbra Monsoons Relief',
      totalAmount: 87500,
      beneficiaryCount: 5,
      status: 'READY_FOR_REVIEW',
      createdAt: '2026-10-28 14:30',
      details: [
        { appId: 'RPA-2026-0015', name: 'Rahim Shaikh', amount: 20000, status: 'VERIFIED', priority: 'CRITICAL' },
        { appId: 'RPA-2026-0018', name: 'Priya Nair', amount: 18500, status: 'VERIFIED', priority: 'HIGH' },
        { appId: 'RPA-2026-0021', name: 'Rajesh Patel', amount: 22000, status: 'VERIFIED', priority: 'HIGH' },
        { appId: 'RPA-2026-0024', name: 'Anjali Devi', amount: 16000, status: 'VERIFIED', priority: 'MEDIUM' },
        { appId: 'RPA-2026-0027', name: 'Vikram Kumar', amount: 11000, status: 'VERIFIED', priority: 'MEDIUM' }
      ],
      bankProviders: ['HDFC Bank', 'SBI', 'Axis Bank', 'ICICI Bank', 'PNB'],
      estimatedProcessingTime: '2-4 hours',
      agentNotes: 'All beneficiaries verified. Bank accounts validated. Duplicate payment risk: LOW. Ready for authorization.'
    },
    {
      id: 'PAYOUT-002',
      campaignId: 'cmp-02',
      campaignName: 'Kerala Flash Floods Emergency',
      totalAmount: 156000,
      beneficiaryCount: 8,
      status: 'PENDING_REVIEW',
      createdAt: '2026-10-28 10:15',
      details: [
        { appId: 'RPA-2026-0032', name: 'Kavya Nair', amount: 20000, status: 'VERIFIED', priority: 'CRITICAL' },
        { appId: 'RPA-2026-0033', name: 'Suresh Kumar', amount: 22000, status: 'VERIFIED', priority: 'CRITICAL' },
        { appId: 'RPA-2026-0034', name: 'Deepa Menon', amount: 18000, status: 'VERIFIED', priority: 'HIGH' },
        { appId: 'RPA-2026-0035', name: 'Arjun Singh', amount: 19000, status: 'VERIFIED', priority: 'HIGH' },
        { appId: 'RPA-2026-0036', name: 'Neha Sharma', amount: 20000, status: 'VERIFIED', priority: 'HIGH' },
        { appId: 'RPA-2026-0037', name: 'Mohan Das', amount: 17000, status: 'NEEDS_REVIEW', priority: 'MEDIUM' },
        { appId: 'RPA-2026-0038', name: 'Lakshmi Iyer', amount: 16000, status: 'NEEDS_REVIEW', priority: 'MEDIUM' },
        { appId: 'RPA-2026-0039', name: 'Ravi Pandit', amount: 14000, status: 'VERIFIED', priority: 'NORMAL' }
      ],
      bankProviders: ['SBI', 'Axis Bank', 'Yes Bank', 'Kotak Bank'],
      estimatedProcessingTime: '3-5 hours',
      agentNotes: '2 beneficiaries need document re-verification. Duplicate risk check showed 1 potential match requiring admin review.'
    }
  ];

  const completedPayouts = [
    {
      id: 'PAYOUT-DONE-001',
      campaignName: 'Assam Brahmputra Relief',
      totalAmount: 145000,
      beneficiaryCount: 7,
      status: 'COMPLETED',
      completedAt: '2026-10-27 16:45',
      successRate: '100%'
    },
    {
      id: 'PAYOUT-DONE-002',
      campaignName: 'Gujarat Earthquake Relief',
      totalAmount: 98500,
      beneficiaryCount: 5,
      status: 'COMPLETED',
      completedAt: '2026-10-26 14:20',
      successRate: '100%'
    }
  ];

  const failedPayouts = [
    {
      id: 'PAYOUT-FAIL-001',
      campaignName: 'Tamil Nadu Cyclone Relief',
      totalAmount: 52000,
      failedCount: 2,
      status: 'PARTIALLY_FAILED',
      failureDate: '2026-10-25 18:30',
      failureReasons: ['Invalid bank account', 'Beneficiary account closed'],
      retryable: true
    }
  ];

  const handleAuthorize = (payout) => {
    setSelectedPayout(payout);
    setApprovalModal(true);
  };

  const confirmAuthorization = () => {
    if (authCode === '12345') {
      alert(`Payout ${selectedPayout.id} authorized! PayPal payout initiated for ₹${selectedPayout.totalAmount.toLocaleString('en-IN')}`);
      setApprovalModal(false);
      setAuthCode('');
      setSelectedPayout(null);
    } else {
      alert('Invalid authorization code');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      READY_FOR_REVIEW: 'bg-emerald-100 text-emerald-700',
      PENDING_REVIEW: 'bg-yellow-100 text-yellow-700',
      COMPLETED: 'bg-blue-100 text-blue-700',
      PARTIALLY_FAILED: 'bg-red-100 text-red-700'
    };
    return styles[status] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <BackButton to="/dashboard" label="Back to Dashboard" />
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-8 h-8 text-yellow-500" />
            Payment Agent Control
          </h1>
          <p className="text-slate-600 mt-1">AI-powered disbursement management and PayPal payout authorization</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          {['pending', 'completed', 'failed'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-lg font-medium transition ${
                activeTab === tab
                  ? 'bg-emerald-600 text-white shadow-lg'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {tab === 'pending' && `Pending (${pendingPayouts.length})`}
              {tab === 'completed' && `Completed (${completedPayouts.length})`}
              {tab === 'failed' && `Failed (${failedPayouts.length})`}
            </button>
          ))}
        </div>

        {/* Pending Payouts */}
        {activeTab === 'pending' && (
          <div className="space-y-6">
            {pendingPayouts.map(payout => (
              <div key={payout.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-bold text-slate-900">{payout.campaignName}</h2>
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusBadge(payout.status)}`}>
                        {payout.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">Payout ID: {payout.id} • Created: {payout.createdAt}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600 mb-1">Total Payout Amount</p>
                    <p className="text-3xl font-bold text-slate-900">₹{payout.totalAmount.toLocaleString('en-IN')}</p>
                  </div>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm text-slate-600">Beneficiaries</p>
                    <p className="text-2xl font-bold text-slate-900">{payout.beneficiaryCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Avg Amount</p>
                    <p className="text-2xl font-bold text-slate-900">₹{(payout.totalAmount / payout.beneficiaryCount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Processing Time</p>
                    <p className="text-sm font-bold text-slate-900">{payout.estimatedProcessingTime}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Payment Methods</p>
                    <p className="text-sm font-bold text-slate-900">{payout.bankProviders.length} providers</p>
                  </div>
                </div>

                {/* AI Agent Notes */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-900">
                    <span className="font-semibold">🤖 Agent Analysis:</span> {payout.agentNotes}
                  </p>
                </div>

                {/* Beneficiaries Table */}
                <div className="mb-6 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-slate-900">App ID</th>
                        <th className="px-4 py-2 text-left font-semibold text-slate-900">Beneficiary</th>
                        <th className="px-4 py-2 text-right font-semibold text-slate-900">Amount</th>
                        <th className="px-4 py-2 text-left font-semibold text-slate-900">Priority</th>
                        <th className="px-4 py-2 text-left font-semibold text-slate-900">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payout.details.map(detail => (
                        <tr key={detail.appId} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono text-blue-600">{detail.appId}</td>
                          <td className="px-4 py-3">{detail.name}</td>
                          <td className="px-4 py-3 text-right font-semibold">₹{detail.amount.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              detail.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                              detail.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {detail.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {detail.status === 'VERIFIED' ? (
                              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                <Check className="w-4 h-4" /> Verified
                              </span>
                            ) : (
                              <span className="text-amber-600 font-semibold flex items-center gap-1">
                                <AlertTriangle className="w-4 h-4" /> Review Needed
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleAuthorize(payout)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                  >
                    <Lock className="w-5 h-5" />
                    Authorize Payout
                  </button>
                  <button className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-semibold">
                    Request More Info
                  </button>
                  <button className="px-6 py-3 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition font-semibold">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Completed Payouts */}
        {activeTab === 'completed' && (
          <div className="space-y-4">
            {completedPayouts.map(payout => (
              <div key={payout.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{payout.campaignName}</h3>
                  <p className="text-sm text-slate-600">Completed: {payout.completedAt}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">₹{payout.totalAmount.toLocaleString('en-IN')}</p>
                  <p className="text-sm text-emerald-600 font-semibold">{payout.successRate} Success Rate</p>
                  <p className="text-xs text-slate-600">{payout.beneficiaryCount} beneficiaries</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Failed Payouts */}
        {activeTab === 'failed' && (
          <div className="space-y-4">
            {failedPayouts.map(payout => (
              <div key={payout.id} className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{payout.campaignName}</h3>
                    <p className="text-sm text-slate-600">Failed: {payout.failureDate}</p>
                  </div>
                  <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold">
                    {payout.failedCount} Failed
                  </span>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-red-900 font-semibold mb-2">Failure Reasons:</p>
                  <ul className="text-sm text-red-800 space-y-1">
                    {payout.failureReasons.map((reason, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> {reason}
                      </li>
                    ))}
                  </ul>
                </div>
                {payout.retryable && (
                  <button className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-semibold transition">
                    Retry Payout
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Authorization Modal */}
      {approvalModal && selectedPayout && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Authorize Payout</h2>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
              <div className="flex justify-between mb-3">
                <span className="text-slate-700">Campaign</span>
                <span className="font-semibold text-slate-900">{selectedPayout.campaignName}</span>
              </div>
              <div className="flex justify-between mb-3">
                <span className="text-slate-700">Total Amount</span>
                <span className="text-2xl font-bold text-emerald-600">₹{selectedPayout.totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-700">Beneficiaries</span>
                <span className="font-semibold text-slate-900">{selectedPayout.beneficiaryCount}</span>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              ⚠️ This action will initiate a PayPal batch payout. You are authorizing the transfer of ₹{selectedPayout.totalAmount.toLocaleString('en-IN')} to {selectedPayout.beneficiaryCount} verified beneficiaries.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-900 mb-2">Authorization Code</label>
              <input
                type="password"
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value)}
                placeholder="Enter 5-digit code"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                maxLength="5"
              />
              <p className="text-xs text-slate-500 mt-2">Demo code: 12345</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setApprovalModal(false);
                  setAuthCode('');
                  setSelectedPayout(null);
                }}
                className="flex-1 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={confirmAuthorization}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition font-semibold flex items-center justify-center gap-2"
              >
                <DollarSign className="w-4 h-4" />
                Authorize
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
