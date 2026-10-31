import React, { useState } from 'react';
import { Plus, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { LaunchCampaignModal } from '../campaigns/LaunchCampaignModal';
import { ProgressChart } from '../charts/ProgressChart';
import { SimpleBarChart } from '../charts/SimpleBarChart';
import { PieChart } from '../charts/PieChart';
import { formatMoney } from '../../lib/money';

export const AdminDashboard = ({ campaigns, applications, transactions, setActiveTab }) => {
  const [showCampaignModal, setShowCampaignModal] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'UNDER_REVIEW': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'REJECTED': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED': return <CheckCircle className="w-5 h-5" />;
      case 'UNDER_REVIEW': return <Clock className="w-5 h-5" />;
      default: return <AlertCircle className="w-5 h-5" />;
    }
  };

  // Calculate stats
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE').length;
  const totalRaised = campaigns.reduce((sum, c) => sum + c.raisedAmount, 0);
  const totalDisbursed = campaigns.reduce((sum, c) => sum + c.disbursedAmount, 0);
  const pendingApplications = applications.filter(a => a.status === 'UNDER_REVIEW').length;
  const approvedApplications = applications.filter(a => a.status === 'APPROVED').length;
  const currency = campaigns[0]?.currency || 'USD';

  // Chart data
  const applicationStatusData = [
    { label: 'Under Review', value: pendingApplications, color: '#3b82f6' },
    { label: 'Approved', value: approvedApplications, color: '#10b981' },
    { label: 'Rejected', value: applications.filter(a => a.status === 'REJECTED').length, color: '#ef4444' },
  ];

  const campaignPerformanceData = campaigns.map(c => ({
    label: c.title.substring(0, 12),
    value: c.targetAmount ? Math.round((c.raisedAmount / c.targetAmount) * 100) : 0,
    color: '#087E83',
  }));

  const fundingData = [
    { label: 'Raised', value: totalRaised, color: '#10b981' },
    { label: 'Disbursed', value: totalDisbursed, color: '#3b82f6' },
    { label: 'Pending', value: Math.max(totalRaised - totalDisbursed, 0), color: '#f59e0b' },
  ];

  const handleLaunchCampaign = (newCampaign) => {
    setShowCampaignModal(false);
    alert(`Campaign "${newCampaign.title}" launched successfully!`);
  };

  return (
    <div className="space-y-6">
      {/* Header with Launch Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-600 mt-1">Campaign and application management</p>
        </div>
        <button
          onClick={() => setShowCampaignModal(true)}
          className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:shadow-lg text-white font-bold py-3 px-6 rounded-lg transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Launch New Campaign
        </button>
      </div>

      {/* Campaign Launch Modal */}
      <LaunchCampaignModal
        isOpen={showCampaignModal}
        onClose={() => setShowCampaignModal(false)}
        onLaunch={handleLaunchCampaign}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-600 mb-2 font-semibold">Total Campaigns</p>
          <p className="text-3xl font-bold text-slate-900">{totalCampaigns}</p>
          <p className="text-xs text-emerald-600 mt-2">{activeCampaigns} active</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-600 mb-2 font-semibold">Total Raised</p>
          <p className="text-3xl font-bold text-slate-900">{formatMoney(totalRaised, currency)}</p>
          <p className="text-xs text-blue-600 mt-2">Across all campaigns</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-600 mb-2 font-semibold">Pending Applications</p>
          <p className="text-3xl font-bold text-slate-900">{pendingApplications}</p>
          <p className="text-xs text-yellow-600 mt-2">Awaiting review</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-600 mb-2 font-semibold">Total Disbursed</p>
          <p className="text-3xl font-bold text-slate-900">{formatMoney(totalDisbursed, currency)}</p>
          <p className="text-xs text-emerald-600 mt-2">To beneficiaries</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProgressChart campaigns={campaigns} title="Campaign Funding Progress" />
        <PieChart data={fundingData} title="Fund Distribution" />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SimpleBarChart data={campaignPerformanceData} title="Campaign Performance (% Funded)" height={250} />
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4">Application Status</h3>
          <div className="space-y-4">
            {applicationStatusData.map((item, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-sm font-medium text-slate-700">{item.label}</span>
                  </div>
                  <span className="font-bold text-slate-900">{item.value}</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full"
                    style={{
                      backgroundColor: item.color,
                      width: `${applications.length ? (item.value / applications.length) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Applications */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Recent Applications</h2>
        </div>
        <div className="divide-y divide-slate-200">
          {applications.slice(0, 5).map((app) => (
            <div key={app.id} className="p-6 hover:bg-slate-50 transition flex items-center justify-between">
              <div className="flex-1">
                <p className="font-bold text-slate-900">{app.beneficiaryName}</p>
                <p className="text-sm text-slate-600">{app.area} • {app.submittedAt}</p>
              </div>
              <div className="flex items-center gap-4">
                <p className="font-bold text-slate-900">{formatMoney(app.requestedAmount, app.currency)}</p>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border ${getStatusColor(app.status)}`}>
                  {getStatusIcon(app.status)}
                  <span className="text-sm font-semibold">{app.status.replace('_', ' ')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
