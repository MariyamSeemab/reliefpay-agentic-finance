import React, { useState } from 'react';
import { FileText, Clock, CheckCircle, AlertCircle, Download, MessageCircle } from 'lucide-react';
import { INITIAL_APPLICATIONS } from '../../data/mockData';

export const BeneficiaryDashboard = ({ currentUser }) => {
  const [applications] = useState(INITIAL_APPLICATIONS);

  const userApplications = applications.filter(app => app.beneficiaryName === currentUser?.name);
  const approvedAmount = userApplications.reduce((sum, app) => sum + (app.approvedAmount || 0), 0);
  const totalRequested = userApplications.reduce((sum, app) => sum + app.requestedAmount, 0);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">My Applications</h1>
        <p className="text-blue-100">Track the status of your assistance requests in real-time</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-600 mb-2 font-semibold">Total Requested</p>
          <p className="text-2xl font-bold text-slate-900">₹{totalRequested.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-2">{userApplications.length} application(s)</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-600 mb-2 font-semibold">Approved Amount</p>
          <p className="text-2xl font-bold text-emerald-600">₹{approvedAmount.toLocaleString()}</p>
          <p className="text-xs text-emerald-600 mt-2">Ready for disbursement</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-600 mb-2 font-semibold">Application Status</p>
          <p className="text-2xl font-bold text-blue-600">{userApplications.length}</p>
          <p className="text-xs text-blue-600 mt-2">
            {userApplications.filter(a => a.status === 'APPROVED').length} approved
          </p>
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Your Applications</h2>

        {userApplications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">No applications submitted yet</p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg">
              Submit New Application
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {userApplications.map((app) => (
              <div key={app.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition">
                {/* Application Header */}
                <div className="p-6 border-b border-slate-200">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Application ID</p>
                      <p className="font-bold text-slate-900">{app.id}</p>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border ${getStatusColor(app.status)}`}>
                      {getStatusIcon(app.status)}
                      <span className="font-semibold text-sm">{app.status.replace('_', ' ')}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Requested</p>
                      <p className="font-bold text-slate-900">₹{app.requestedAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Approved</p>
                      <p className="font-bold text-emerald-600">₹{app.approvedAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Priority</p>
                      <p className="font-bold text-slate-900">{app.priority}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Submitted</p>
                      <p className="font-bold text-slate-900">{app.submittedAt}</p>
                    </div>
                  </div>
                </div>

                {/* Application Details */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                  <p className="text-sm text-slate-700">
                    <strong>Location:</strong> {app.area} | <strong>Household:</strong> {app.householdMembers} members
                  </p>
                </div>

                {/* AI Findings */}
                {app.aiFindings && app.aiFindings.length > 0 && (
                  <div className="px-6 py-4 border-b border-slate-200 space-y-2">
                    <p className="text-sm font-semibold text-slate-900">AI Assessment</p>
                    <div className="space-y-2">
                      {app.aiFindings.map((finding) => {
                        let bgColor = 'bg-yellow-50 border-yellow-200 text-yellow-700';
                        if (finding.severity === 'SUCCESS') bgColor = 'bg-emerald-50 border-emerald-200 text-emerald-700';
                        if (finding.severity === 'WARNING') bgColor = 'bg-yellow-50 border-yellow-200 text-yellow-700';
                        if (finding.severity === 'ERROR') bgColor = 'bg-red-50 border-red-200 text-red-700';

                        return (
                          <div key={finding.id} className={`border rounded-lg p-3 text-xs ${bgColor}`}>
                            <p className="font-semibold">{finding.title}</p>
                            <p className="opacity-75">{finding.reason}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div className="px-6 py-4 border-b border-slate-200">
                  <p className="text-sm font-semibold text-slate-900 mb-3">Application Timeline</p>
                  <div className="space-y-2">
                    {app.timeline.map((event, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0"></div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                          <p className="text-xs text-slate-500">{event.date} • {event.actor}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="px-6 py-4 flex gap-3">
                  <button className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition">
                    <MessageCircle className="w-4 h-4" />
                    Contact Reviewer
                  </button>
                  <button className="flex-1 border border-slate-300 text-slate-900 hover:bg-slate-50 font-semibold py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition">
                    <Download className="w-4 h-4" />
                    Download Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
