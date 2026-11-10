import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, FileText, Shield, Flag } from 'lucide-react';
import { BackButton } from '../components/common/BackButton';
import { apiFetch } from '../lib/api';

const EMPTY_VERIFICATION = { reviewed: [], flagged: [], decision: null };

export default function AIVerificationPage() {
  const [applications, setApplications] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Applications with AI warnings, loaded from the API.
  useEffect(() => {
    apiFetch('/applications')
      .then((data) => {
        const apps = data?.applications ?? [];
        setApplications(apps);
        const firstFlagged = apps.find((a) => a.aiFindings.some((f) => f.severity === 'WARNING')) ?? apps[0];
        setSelectedId(firstFlagged?.id ?? null);
      })
      .catch((err) => setError(err.message || 'Could not load applications.'))
      .finally(() => setLoading(false));
  }, []);

  const selectedApp = applications.find((a) => a.id === selectedId) ?? null;
  const v = { ...EMPTY_VERIFICATION, ...(selectedApp?.verification ?? {}) };
  const reviewedFindings = v.reviewed;
  const flaggedFindings = v.flagged;

  // Every reviewer action is saved to the server and written to the audit log.
  const save = async (app, next) => {
    setSaving(true);
    setError('');
    try {
      const { application } = await apiFetch(`/applications/${encodeURIComponent(app.id)}/verification`, {
        method: 'PUT',
        body: { reviewed: next.reviewed, flagged: next.flagged, decision: next.decision },
      });
      setApplications((prev) => prev.map((a) => (a.id === application.id ? application : a)));
    } catch (err) {
      setError(err.message || 'Could not save the review.');
    } finally {
      setSaving(false);
    }
  };

  const add = (list, id) => [...new Set([...list, id])];
  const handleMarkAsReviewed = (findingId) => save(selectedApp, { ...v, reviewed: add(v.reviewed, findingId) });
  const handleFlagFinding = (findingId) => save(selectedApp, { ...v, flagged: add(v.flagged, findingId) });
  const handleMarkIrrelevant = handleMarkAsReviewed;

  const findingIds = (app) => app.aiFindings.map((f) => f.id);
  const completeReview = (app) => save(app, { reviewed: findingIds(app), flagged: [], decision: 'REVIEWED' });
  const escalate = (app) => save(app, { ...v, flagged: findingIds(app), decision: 'ESCALATED' });
  const undo = (app) => save(app, { ...EMPTY_VERIFICATION });

  const getRiskScore = (findings) => {
    const warningCount = findings.filter(f => f.severity === 'WARNING').length;
    if (warningCount === 0) return 'LOW';
    if (warningCount === 1) return 'MEDIUM';
    return 'HIGH';
  };

  const riskColor = {
    LOW: 'text-emerald-600',
    MEDIUM: 'text-amber-600',
    HIGH: 'text-red-600'
  };

  const riskBg = {
    LOW: 'bg-emerald-50 border-emerald-200',
    MEDIUM: 'bg-amber-50 border-amber-200',
    HIGH: 'bg-red-50 border-red-200'
  };

  if (loading) {
    return <div className="min-h-screen p-6 text-slate-600">Loading applications...</div>;
  }
  if (!selectedApp) {
    return (
      <div className="min-h-screen p-6">
        <BackButton to="/dashboard" label="Back to Dashboard" />
        <p className="text-slate-600 mt-4">{error || 'No applications to review yet.'}</p>
      </div>
    );
  }

  const riskLevel = getRiskScore(selectedApp.aiFindings);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <BackButton to="/dashboard" label="Back to Dashboard" />
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">AI Verification Review</h1>
          <p className="text-slate-600 mt-1">Review AI findings and make informed decisions</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Applications List */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 h-fit sticky top-6">
            <h3 className="font-semibold text-slate-900 mb-4">Flagged Applications</h3>
            <div className="space-y-2">
              {applications.filter(app => app.aiFindings.some(f => f.severity === 'WARNING')).map(app => (
                <button
                  key={app.id}
                  onClick={() => setSelectedId(app.id)}
                  className={`w-full p-3 rounded-lg text-left transition ${
                    selectedApp.id === app.id
                      ? 'bg-emerald-100 border border-emerald-300'
                      : 'hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <p className="font-medium text-sm text-slate-900">{app.id}</p>
                  <p className="text-xs text-slate-600">{app.beneficiaryName}</p>
                  <div className="flex gap-1 mt-2">
                    {app.aiFindings.filter(f => f.severity === 'WARNING').map((_, idx) => (
                      <div key={idx} className="w-1.5 h-1.5 bg-amber-600 rounded-full"></div>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Risk Overview */}
            <div className={`border-2 rounded-lg p-6 ${riskBg[riskLevel]}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">AI Risk Assessment</h2>
                  <p className={`text-lg font-semibold ${riskColor[riskLevel]}`}>
                    {riskLevel} RISK
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600 mb-2">Application</p>
                  <p className="text-2xl font-bold text-slate-900">{selectedApp.id}</p>
                </div>
              </div>
            </div>

            {/* Applicant Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Applicant Information
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-600 font-semibold mb-1">NAME</p>
                  <p className="text-slate-900 font-medium">{selectedApp.beneficiaryName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 font-semibold mb-1">PHONE</p>
                  <p className="text-slate-900 font-medium">{selectedApp.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 font-semibold mb-1">LOCATION</p>
                  <p className="text-slate-900 font-medium">{selectedApp.area}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 font-semibold mb-1">SUBMITTED</p>
                  <p className="text-slate-900 font-medium text-sm">{selectedApp.submittedAt}</p>
                </div>
              </div>
            </div>

            {/* AI Findings Analysis */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-lg">
                <AlertTriangle className="w-5 h-5" />
                AI Findings & Analysis
              </h3>

              {selectedApp.aiFindings.map(finding => {
                const isReviewed = reviewedFindings.includes(finding.id);
                const isFlagged = flaggedFindings.includes(finding.id);

                return (
                  <div
                    key={finding.id}
                    className={`border-l-4 rounded-lg p-6 ${
                      finding.severity === 'WARNING'
                        ? 'bg-amber-50 border-l-amber-500'
                        : finding.severity === 'INFO'
                        ? 'bg-blue-50 border-l-blue-500'
                        : 'bg-emerald-50 border-l-emerald-500'
                    } ${isReviewed ? 'opacity-75' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-slate-900">{finding.title}</h4>
                          <span
                            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                              finding.severity === 'WARNING'
                                ? 'bg-amber-200 text-amber-700'
                                : finding.severity === 'INFO'
                                ? 'bg-blue-200 text-blue-700'
                                : 'bg-emerald-200 text-emerald-700'
                            }`}
                          >
                            {finding.severity}
                          </span>
                          {isReviewed && (
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-700">
                              REVIEWED
                            </span>
                          )}
                          {isFlagged && (
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-200 text-red-700">
                              FLAGGED
                            </span>
                          )}
                        </div>
                        <p className="text-slate-700 text-sm">{finding.reason}</p>
                      </div>
                    </div>

                    {finding.fields?.length > 0 && (
                      <div className="mb-4 p-3 bg-white rounded-lg">
                        <p className="text-xs font-semibold text-slate-600 mb-2">AFFECTED FIELDS</p>
                        <div className="flex flex-wrap gap-2">
                          {finding.fields.map((field, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded"
                            >
                              {field}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {!isReviewed && (
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleMarkAsReviewed(finding.id)}
                          className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition font-medium"
                        >
                          <CheckCircle className="w-4 h-4 inline mr-1" />
                          Mark Reviewed
                        </button>
                        <button
                          onClick={() => handleFlagFinding(finding.id)}
                          className="text-xs px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition font-medium"
                        >
                          <Flag className="w-4 h-4 inline mr-1" />
                          Escalate
                        </button>
                        <button
                          onClick={() => handleMarkIrrelevant(finding.id)}
                          className="text-xs px-3 py-1.5 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition font-medium"
                        >
                          Mark Irrelevant
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Recommendation Box */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">AI Recommendation</h4>
                  <p className="text-slate-700 text-sm mb-4">
                    {selectedApp.aiFindings.filter(f => f.severity === 'WARNING').length === 0
                      ? 'No significant risks detected. Application appears to meet verification standards.'
                      : 'Application contains warning flags that require human review before approval. Recommend additional verification.'}
                  </p>
                  <p className="text-xs text-slate-600">
                    Final decision must be made by authorized human reviewer. AI findings are for reference only.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Panel */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Reviewer Actions</h3>
              {error && (
                <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => completeReview(selectedApp)}
                  disabled={saving}
                  className="px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium text-sm"
                >
                  <CheckCircle className="w-4 h-4 inline mr-2" />
                  Review Complete
                </button>
                <button
                  type="button"
                  onClick={() => escalate(selectedApp)}
                  disabled={saving}
                  className="px-4 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-medium text-sm"
                >
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  Escalate for Investigation
                </button>
              </div>
              {v.decision && (
                <div
                  role="status"
                  className={`mt-4 rounded-lg border px-4 py-3 text-sm ${v.decision === 'REVIEWED' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}
                >
                  {v.decision === 'REVIEWED'
                    ? `Review complete for ${selectedApp.id}: all ${selectedApp.aiFindings.length} AI findings marked as reviewed.`
                    : `${selectedApp.id} escalated for investigation: all AI findings flagged.`}
                  {' '}
                  <span className="text-xs opacity-80">({v.decidedBy ? `${v.decidedBy}, ` : ''}{new Date(v.decidedAt).toLocaleString()})</span>
                  <button type="button" onClick={() => undo(selectedApp)} className="ml-3 underline text-xs">Undo</button>
                </div>
              )}
            </div>

            {/* Summary Statistics */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Review Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-xs text-slate-600 font-semibold mb-1">Total Findings</p>
                  <p className="text-2xl font-bold text-slate-900">{selectedApp.aiFindings.length}</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg">
                  <p className="text-xs text-amber-600 font-semibold mb-1">Warnings</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {selectedApp.aiFindings.filter(f => f.severity === 'WARNING').length}
                  </p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-lg">
                  <p className="text-xs text-emerald-600 font-semibold mb-1">Reviewed</p>
                  <p className="text-2xl font-bold text-emerald-600">{reviewedFindings.length}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-xs text-red-600 font-semibold mb-1">Flagged</p>
                  <p className="text-2xl font-bold text-red-600">{flaggedFindings.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
