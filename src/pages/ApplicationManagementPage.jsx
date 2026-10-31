import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Search, Filter, ChevronRight, Eye, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { BackButton } from '../components/common/BackButton';
import { apiFetch } from '../lib/api';
import { formatMoney } from '../lib/money';

export default function ApplicationManagementPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterDisasterType, setFilterDisasterType] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [actionModal, setActionModal] = useState(null);
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiFetch('/applications')
      .then(({ applications: list }) => { if (!cancelled) setApplications(list); })
      .catch((err) => { if (!cancelled) setLoadError(err.message || 'Could not load applications'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setActionError('');
  }, [actionModal]);

  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const matchesSearch = 
        app.beneficiaryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.id.includes(searchTerm);
      const matchesStatus = !filterStatus || app.status === filterStatus;
      const matchesPriority = !filterPriority || app.priority === filterPriority;
      const matchesDisaster = !filterDisasterType || app.disasterType === filterDisasterType;
      
      return matchesSearch && matchesStatus && matchesPriority && matchesDisaster;
    });
  }, [applications, searchTerm, filterStatus, filterPriority, filterDisasterType]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      case 'REJECTED':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'UNDER_REVIEW':
        return <Clock className="w-5 h-5 text-amber-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      APPROVED: 'bg-emerald-100 text-emerald-700',
      REJECTED: 'bg-red-100 text-red-700',
      UNDER_REVIEW: 'bg-amber-100 text-amber-700',
      PENDING: 'bg-slate-100 text-slate-700'
    };
    return `px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.PENDING}`;
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      CRITICAL: 'bg-red-100 text-red-700',
      HIGH: 'bg-orange-100 text-orange-700',
      MEDIUM: 'bg-yellow-100 text-yellow-700',
      NORMAL: 'bg-blue-100 text-blue-700'
    };
    return `px-2.5 py-1 rounded-full text-xs font-semibold ${styles[priority] || styles.NORMAL}`;
  };

  // PATCH the status on the server and replace the row with its response.
  const updateStatus = async (app, body) => {
    setIsSaving(true);
    setActionError('');
    try {
      const { application } = await apiFetch(`/applications/${encodeURIComponent(app.id)}/status`, {
        method: 'PATCH',
        body,
      });
      setApplications(prev => prev.map(a => (a.id === application.id ? application : a)));
      setRemarks('');
      setShowDetails(false);
      setActionModal(null);
    } catch (err) {
      setActionError(err.message || 'Could not update the application');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = (app) => updateStatus(app, { status: 'APPROVED' });

  const handleReject = (app) => {
    if (!remarks.trim()) {
      alert('Please provide remarks for rejection');
      return;
    }
    updateStatus(app, { status: 'REJECTED', remarks });
  };

  const handleRequestDocuments = (app) => {
    if (!remarks.trim()) {
      alert('Please specify what documents are needed');
      return;
    }
    updateStatus(app, { status: 'DOCUMENT_REQUESTED', remarks });
  };

  if (showDetails && selectedApp) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Application Details</h1>
              <p className="text-slate-600 mt-1">Reference: {selectedApp.id}</p>
            </div>
            <button
              onClick={() => setShowDetails(false)}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
            >
              Back to List
            </button>
          </div>

          {/* Status Bar */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Current Status</p>
                <div className="flex items-center gap-2">
                  {getStatusIcon(selectedApp.status)}
                  <span className={`${getPriorityBadge(selectedApp.priority)}`}>
                    {selectedApp.priority}
                  </span>
                  <span className={`${getStatusBadge(selectedApp.status)}`}>
                    {selectedApp.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600 mb-1">Requested Amount</p>
                <p className="text-2xl font-bold text-slate-900">{formatMoney(selectedApp.requestedAmount, selectedApp.currency)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600 mb-1">Approved Amount</p>
                <p className="text-2xl font-bold text-emerald-600">{formatMoney(selectedApp.approvedAmount || 0, selectedApp.currency)}</p>
              </div>
            </div>
          </div>

          {/* Content Tabs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Beneficiary Info */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Beneficiary Information</h2>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-slate-600">Name</p>
                    <p className="text-slate-900 font-medium">{selectedApp.beneficiaryName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Phone</p>
                    <p className="text-slate-900 font-medium">{selectedApp.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Area</p>
                    <p className="text-slate-900 font-medium">{selectedApp.area}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Household Members</p>
                    <p className="text-slate-900 font-medium">{selectedApp.householdMembers}</p>
                  </div>
                </div>
              </div>

              {/* Emergency Details */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Emergency Details</h2>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-slate-600">Disaster Type</p>
                    <p className="text-slate-900 font-medium">{selectedApp.disasterType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Campaign</p>
                    <p className="text-slate-900 font-medium">{selectedApp.campaignId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Submitted Date</p>
                    <p className="text-slate-900 font-medium">{selectedApp.submittedAt}</p>
                  </div>
                </div>
              </div>

              {/* AI Findings */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">AI Verification Findings</h2>
                <div className="space-y-3">
                  {selectedApp.aiFindings.map(finding => (
                    <div 
                      key={finding.id}
                      className={`p-4 rounded-lg border-l-4 ${
                        finding.severity === 'WARNING' ? 'bg-amber-50 border-l-amber-500' :
                        finding.severity === 'INFO' ? 'bg-blue-50 border-l-blue-500' :
                        'bg-emerald-50 border-l-emerald-500'
                      }`}
                    >
                      <p className="font-semibold text-slate-900">{finding.title}</p>
                      <p className="text-sm text-slate-700 mt-1">{finding.reason}</p>
                      {finding.fields.length > 0 && (
                        <p className="text-xs text-slate-600 mt-2">
                          Fields: {finding.fields.join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Documents */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Uploaded Documents</h2>
                <div className="space-y-2">
                  {selectedApp.documents.map((doc, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{doc}</span>
                      <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">
                        View
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Application Timeline</h2>
                <div className="space-y-4">
                  {selectedApp.timeline.map((event, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-4 h-4 bg-emerald-600 rounded-full"></div>
                        {idx < selectedApp.timeline.length - 1 && (
                          <div className="w-0.5 h-12 bg-slate-200"></div>
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="font-semibold text-slate-900">{event.title}</p>
                        <p className="text-sm text-slate-600">{event.actor}</p>
                        <p className="text-xs text-slate-500 mt-1">{event.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar - Actions */}
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 sticky top-6">
                <h3 className="font-semibold text-slate-900 mb-4">Application Actions</h3>
                
                {selectedApp.status === 'UNDER_REVIEW' && (
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setActionModal('approve');
                        setRemarks('');
                      }}
                      className="w-full bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition font-medium text-sm"
                    >
                      Approve Application
                    </button>
                    <button
                      onClick={() => {
                        setActionModal('reject');
                        setRemarks('');
                      }}
                      className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-medium text-sm"
                    >
                      Reject Application
                    </button>
                    <button
                      onClick={() => {
                        setActionModal('documents');
                        setRemarks('');
                      }}
                      className="w-full bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition font-medium text-sm"
                    >
                      Request Documents
                    </button>
                  </div>
                )}

                {selectedApp.status === 'APPROVED' && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm text-emerald-900">
                    <p className="font-semibold">Application Approved</p>
                    <p className="mt-1">Approved Amount: {formatMoney(selectedApp.approvedAmount, selectedApp.currency)}</p>
                  </div>
                )}

                {selectedApp.status === 'REJECTED' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-900">
                    <p className="font-semibold">Application Rejected</p>
                  </div>
                )}

                <div className="mt-6 pt-6 border-t border-slate-200">
                  <p className="text-xs text-slate-600 mb-3">Priority Score</p>
                  <div className="flex items-end gap-1 h-16">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div 
                        key={level}
                        className={`flex-1 rounded-t ${
                          level <= (selectedApp.priority === 'CRITICAL' ? 5 : selectedApp.priority === 'HIGH' ? 4 : 3)
                            ? 'bg-emerald-600'
                            : 'bg-slate-200'
                        }`}
                        style={{ height: `${level * 20}%` }}
                      ></div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-600 mt-2">
                    {selectedApp.priority} Priority
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Modal */}
          {actionModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-md w-full p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  {actionModal === 'approve' && 'Approve Application'}
                  {actionModal === 'reject' && 'Reject Application'}
                  {actionModal === 'documents' && 'Request Additional Documents'}
                </h3>

                {actionError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {actionError}
                  </div>
                )}
                {isSaving && <p className="mb-4 text-sm text-slate-600">Saving…</p>}

                {actionModal === 'approve' && (
                  <div>
                    <p className="text-slate-600 mb-4">
                      Approve {formatMoney(selectedApp.requestedAmount, selectedApp.currency)} for {selectedApp.beneficiaryName}?
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setActionModal(null)}
                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleApprove(selectedApp)}
                        disabled={isSaving}
                        className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                )}

                {actionModal === 'reject' && (
                  <div>
                    <p className="text-slate-600 mb-4">
                      Please provide reason for rejection:
                    </p>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none mb-4"
                      placeholder="Explain the reason for rejection..."
                      rows="4"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => setActionModal(null)}
                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleReject(selectedApp)}
                        disabled={isSaving}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}

                {actionModal === 'documents' && (
                  <div>
                    <p className="text-slate-600 mb-4">
                      What documents do you need from the beneficiary?
                    </p>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none mb-4"
                      placeholder="List required documents..."
                      rows="4"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => setActionModal(null)}
                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleRequestDocuments(selectedApp)}
                        disabled={isSaving}
                        className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
                      >
                        Send Request
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <BackButton to="/dashboard" label="Back to Dashboard" />
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Application Management</h1>
          <p className="text-slate-600 mt-1">Review and manage assistance applications</p>
        </div>

        {/* Filters & Search */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name or application ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>

            {/* Priority Filter */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            >
              <option value="">All Priority</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="NORMAL">Normal</option>
            </select>

            {/* Disaster Type Filter */}
            <select
              value={filterDisasterType}
              onChange={(e) => setFilterDisasterType(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            >
              <option value="">All Disasters</option>
              <option value="Flood Emergency">Flood</option>
              <option value="Fire">Fire</option>
              <option value="Earthquake">Earthquake</option>
            </select>
          </div>

          <p className="text-sm text-slate-600">
            Found {filteredApplications.length} application{filteredApplications.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Applications List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
              <p className="text-slate-600">Loading applications…</p>
            </div>
          ) : loadError ? (
            <div className="bg-white rounded-lg shadow-sm border border-red-200 p-12 text-center">
              <p className="text-red-700">{loadError}</p>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
              <p className="text-slate-600">No applications found matching your criteria</p>
            </div>
          ) : (
            filteredApplications.map(app => (
              <div
                key={app.id}
                className="bg-white rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">{app.beneficiaryName}</h3>
                        <p className="text-sm text-slate-600">{app.id} • {app.area}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span className={getPriorityBadge(app.priority)}>
                        {app.priority}
                      </span>
                      <span className={getStatusBadge(app.status)}>
                        {app.status.replace('_', ' ')}
                      </span>
                      <span className="text-sm bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
                        {app.disasterType}
                      </span>
                    </div>
                  </div>

                  <div className="text-right mr-6">
                    <p className="text-sm text-slate-600 mb-1">Requested</p>
                    <p className="text-xl font-bold text-slate-900">{formatMoney(app.requestedAmount, app.currency)}</p>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedApp(app);
                      setShowDetails(true);
                    }}
                    className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-600 transition"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>

                {/* AI Findings Badge */}
                {app.aiFindings.some(f => f.severity === 'WARNING') && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-900 text-sm">AI Findings</p>
                      <p className="text-sm text-amber-800">
                        {app.aiFindings.filter(f => f.severity === 'WARNING').length} warning(s) found during verification
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
