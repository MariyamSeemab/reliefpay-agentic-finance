import React, { useCallback, useEffect, useState } from 'react';
import { Check, X, AlertTriangle, DollarSign, Users, Zap, ChevronRight, Lock, RefreshCw } from 'lucide-react';
import { BackButton } from '../components/common/BackButton';
import { apiFetch } from '../lib/api';
import { formatMoney } from '../lib/money';

const PENDING_STATUSES = ['DRAFT', 'RELEASE_FAILED'];
const RELEASED_STATUSES = ['RELEASING', 'PENDING', 'PROCESSING', 'SUCCESS'];
const FAILED_BATCH_STATUSES = ['DENIED', 'CANCELED'];
const FAILED_ITEM_STATUSES = ['FAILED', 'RETURNED', 'BLOCKED'];

const RELEASE_ERRORS = {
  INVALID_AUTH_CODE: 'Invalid authorization code.',
  BATCH_LOCKED: 'This batch is locked after too many wrong authorization codes.',
  PAYOUT_AUTH_NOT_CONFIGURED: 'Payout authorization is not configured on the server (PAYOUT_AUTH_CODE is missing).',
  PAYPAL_NOT_CONFIGURED: 'PayPal sandbox credentials are not configured on the server.',
  BATCH_NOT_RELEASABLE: 'This batch can no longer be released.',
  INSUFFICIENT_FUNDS: 'The campaign no longer has enough available funds for this batch.',
};

function isFailedBatch(batch) {
  return FAILED_BATCH_STATUSES.includes(batch.status) ||
    batch.items.some((item) => FAILED_ITEM_STATUSES.includes(item.status));
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

export default function PaymentAgentPage() {
  const [activeTab, setActiveTab] = useState('pending');
  const [batches, setBatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [approvalModal, setApprovalModal] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [isReleasing, setIsReleasing] = useState(false);
  const [releaseError, setReleaseError] = useState('');
  const [releasedBatch, setReleasedBatch] = useState(null);
  const [syncState, setSyncState] = useState({});

  const loadBatches = useCallback(async () => {
    try {
      const { batches: list } = await apiFetch('/payouts');
      setBatches(list);
      setLoadError('');
    } catch (err) {
      setLoadError(err.message || 'Could not load payout batches');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  const replaceBatch = (updated) => {
    setBatches((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  };

  const pendingPayouts = batches.filter((b) => PENDING_STATUSES.includes(b.status));
  const failedPayouts = batches.filter((b) => !PENDING_STATUSES.includes(b.status) && isFailedBatch(b));
  const releasedPayouts = batches.filter((b) => RELEASED_STATUSES.includes(b.status) && !isFailedBatch(b));

  const handleAuthorize = (payout) => {
    setSelectedPayout(payout);
    setAuthCode('');
    setReleaseError('');
    setReleasedBatch(null);
    setApprovalModal(true);
  };

  const closeModal = () => {
    setApprovalModal(false);
    setAuthCode('');
    setReleaseError('');
    setReleasedBatch(null);
    setSelectedPayout(null);
  };

  // The server checks the authorization code; the browser never compares it.
  const confirmAuthorization = async () => {
    if (!authCode.trim()) {
      setReleaseError('Enter the authorization code.');
      return;
    }
    setIsReleasing(true);
    setReleaseError('');
    try {
      const { batch } = await apiFetch(`/payouts/${encodeURIComponent(selectedPayout.id)}/release`, {
        method: 'POST',
        body: { authCode },
      });
      setReleasedBatch(batch);
      setAuthCode('');
      replaceBatch(batch);
    } catch (err) {
      setReleaseError(RELEASE_ERRORS[err.code] || err.message || 'Release failed');
      if (['INVALID_AUTH_CODE', 'BATCH_LOCKED', 'INSUFFICIENT_FUNDS', 'BATCH_NOT_RELEASABLE', 'PAYPAL_PAYOUT_FAILED'].includes(err.code)) {
        loadBatches();
      }
    } finally {
      setIsReleasing(false);
    }
  };

  const syncBatch = async (batchId) => {
    setSyncState((prev) => ({ ...prev, [batchId]: { loading: true, error: '' } }));
    try {
      const { batch } = await apiFetch(`/payouts/${encodeURIComponent(batchId)}/sync`, { method: 'POST' });
      replaceBatch(batch);
      setSyncState((prev) => ({ ...prev, [batchId]: { loading: false, error: '' } }));
    } catch (err) {
      setSyncState((prev) => ({ ...prev, [batchId]: { loading: false, error: err.message || 'Sync failed' } }));
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      DRAFT: 'bg-emerald-100 text-emerald-700',
      RELEASE_FAILED: 'bg-yellow-100 text-yellow-700',
      RELEASING: 'bg-yellow-100 text-yellow-700',
      PENDING: 'bg-yellow-100 text-yellow-700',
      PROCESSING: 'bg-yellow-100 text-yellow-700',
      SUCCESS: 'bg-blue-100 text-blue-700',
      DENIED: 'bg-red-100 text-red-700',
      CANCELED: 'bg-red-100 text-red-700'
    };
    return styles[status] || 'bg-slate-100 text-slate-700';
  };

  const renderSyncButton = (payout) => {
    if (!payout.paypalBatchId) return null;
    const state = syncState[payout.id] || {};
    return (
      <div className="mt-3">
        <button
          onClick={() => syncBatch(payout.id)}
          disabled={state.loading}
          className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${state.loading ? 'animate-spin' : ''}`} />
          Refresh status from PayPal
        </button>
        {state.error && <p className="text-xs text-red-600 mt-2">{state.error}</p>}
      </div>
    );
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
              {tab === 'completed' && `Released (${releasedPayouts.length})`}
              {tab === 'failed' && `Failed (${failedPayouts.length})`}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center text-slate-600">
            Loading payout batches…
          </div>
        )}

        {!isLoading && loadError && (
          <div className="bg-white rounded-lg shadow-sm border border-red-200 p-12 text-center">
            <p className="text-red-700 mb-4">{loadError}</p>
            <button
              onClick={() => { setIsLoading(true); loadBatches(); }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Pending Payouts */}
        {!isLoading && !loadError && activeTab === 'pending' && (
          <div className="space-y-6">
            {pendingPayouts.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center text-slate-600">
                No payout batches are waiting for authorization. Ask the AI Command Centre to draft one.
              </div>
            )}
            {pendingPayouts.map(payout => (
              <div key={payout.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-bold text-slate-900">{payout.campaignTitle}</h2>
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusBadge(payout.status)}`}>
                        {payout.status.replace(/_/g, ' ')}
                      </span>
                      {payout.draftedByAi && (
                        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-purple-100 text-purple-700">
                          Drafted by AI agent
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">Payout ID: {payout.id} • Created: {formatDate(payout.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600 mb-1">Total Payout Amount</p>
                    <p className="text-3xl font-bold text-slate-900">{formatMoney(payout.totalAmount, payout.currency)}</p>
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
                    <p className="text-2xl font-bold text-slate-900">
                      {formatMoney(payout.beneficiaryCount ? payout.totalAmount / payout.beneficiaryCount : 0, payout.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Payout Rail</p>
                    <p className="text-sm font-bold text-slate-900">PayPal Payouts</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Receivers</p>
                    <p className="text-sm font-bold text-slate-900">
                      {payout.items.filter((item) => item.receiverEmail).length} PayPal emails
                    </p>
                  </div>
                </div>

                {/* Agent Notes */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-900">
                    <span className="font-semibold">🤖 Agent Analysis:</span> {payout.note || 'No notes for this batch.'}
                  </p>
                  {payout.failedAuthAttempts > 0 && (
                    <p className="text-xs text-amber-700 mt-2">Failed authorization attempts: {payout.failedAuthAttempts}</p>
                  )}
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
                      {payout.items.map(item => (
                        <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono text-blue-600">{item.applicationId}</td>
                          <td className="px-4 py-3">
                            {item.beneficiaryName}
                            {item.receiverEmail && <span className="block text-xs text-slate-500 font-mono">{item.receiverEmail}</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">{formatMoney(item.amount, payout.currency)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              item.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                              item.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {item.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {FAILED_ITEM_STATUSES.includes(item.status) ? (
                              <span className="text-red-600 font-semibold flex items-center gap-1">
                                <AlertTriangle className="w-4 h-4" /> {item.status}
                              </span>
                            ) : (
                              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                <Check className="w-4 h-4" /> {item.status}
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
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Released Payouts */}
        {!isLoading && !loadError && activeTab === 'completed' && (
          <div className="space-y-4">
            {releasedPayouts.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center text-slate-600">
                No payout batches have been released yet.
              </div>
            )}
            {releasedPayouts.map(payout => {
              const succeeded = payout.items.filter((item) => item.status === 'SUCCESS').length;
              return (
                <div key={payout.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-slate-900">{payout.campaignTitle}</h3>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusBadge(payout.status)}`}>
                          {payout.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">Released: {formatDate(payout.releasedAt)}</p>
                      <p className="text-xs text-slate-500 font-mono">
                        {payout.id}{payout.paypalBatchId ? ` • PayPal batch ${payout.paypalBatchId}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-900">{formatMoney(payout.totalAmount, payout.currency)}</p>
                      <p className="text-sm text-emerald-600 font-semibold">{succeeded}/{payout.beneficiaryCount} paid</p>
                      <p className="text-xs text-slate-600">{payout.beneficiaryCount} beneficiaries</p>
                    </div>
                  </div>
                  {renderSyncButton(payout)}
                </div>
              );
            })}
          </div>
        )}

        {/* Failed Payouts */}
        {!isLoading && !loadError && activeTab === 'failed' && (
          <div className="space-y-4">
            {failedPayouts.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center text-slate-600">
                No failed payouts.
              </div>
            )}
            {failedPayouts.map(payout => {
              const failedItems = payout.items.filter((item) => FAILED_ITEM_STATUSES.includes(item.status) || item.error);
              return (
                <div key={payout.id} className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{payout.campaignTitle}</h3>
                      <p className="text-sm text-slate-600">Updated: {formatDate(payout.updatedAt)} • {payout.status}</p>
                    </div>
                    <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold">
                      {failedItems.length || payout.beneficiaryCount} Failed
                    </span>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-red-900 font-semibold mb-2">Failure Reasons:</p>
                    <ul className="text-sm text-red-800 space-y-1">
                      {failedItems.length === 0 && (
                        <li className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" /> PayPal marked the batch {payout.status}
                        </li>
                      )}
                      {failedItems.map((item) => (
                        <li key={item.id} className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          {item.beneficiaryName}: {item.status}{item.error ? ` (${item.error})` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {renderSyncButton(payout)}
                </div>
              );
            })}
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
                <span className="font-semibold text-slate-900">{selectedPayout.campaignTitle}</span>
              </div>
              <div className="flex justify-between mb-3">
                <span className="text-slate-700">Total Amount</span>
                <span className="text-2xl font-bold text-emerald-600">{formatMoney(selectedPayout.totalAmount, selectedPayout.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-700">Beneficiaries</span>
                <span className="font-semibold text-slate-900">{selectedPayout.beneficiaryCount}</span>
              </div>
            </div>

            {releasedBatch ? (
              <>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
                  <p className="font-semibold text-emerald-900 text-sm flex items-center gap-2">
                    <Check className="w-4 h-4" /> Payout sent to PayPal
                  </p>
                  <p className="text-sm text-emerald-800 mt-1">
                    Status: {releasedBatch.status}
                    {releasedBatch.paypalBatchId && <> • PayPal batch <span className="font-mono">{releasedBatch.paypalBatchId}</span></>}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition font-semibold"
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-600 mb-4">
                  ⚠️ This action will initiate a PayPal batch payout. You are authorizing the transfer of {formatMoney(selectedPayout.totalAmount, selectedPayout.currency)} to {selectedPayout.beneficiaryCount} verified beneficiaries.
                </p>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-900 mb-2">Authorization Code</label>
                  <input
                    type="password"
                    value={authCode}
                    onChange={(e) => setAuthCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isReleasing && confirmAuthorization()}
                    placeholder="Enter authorization code"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    disabled={isReleasing}
                  />
                  <p className="text-xs text-slate-500 mt-2">The code is checked by the server (PAYOUT_AUTH_CODE in backend/.env).</p>
                </div>

                {releaseError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex gap-2">
                    <X className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{releaseError}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={closeModal}
                    disabled={isReleasing}
                    className="flex-1 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmAuthorization}
                    disabled={isReleasing}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <DollarSign className="w-4 h-4" />
                    {isReleasing ? 'Releasing…' : 'Authorize'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
