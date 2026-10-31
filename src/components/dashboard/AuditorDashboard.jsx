import React, { useEffect, useMemo, useState } from 'react';
import { Shield, TrendingUp, AlertTriangle, CheckCircle2, Download, Filter } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { formatMoney } from '../../lib/money';

const MAX_FILTERS = 8;

export const AuditorDashboard = ({ currentUser }) => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [currency, setCurrency] = useState('USD');
  const [filterType, setFilterType] = useState('ALL');

  useEffect(() => {
    let cancelled = false;
    // One transaction per payout item across all payout batches.
    apiFetch('/payouts')
      .then(({ batches }) => {
        if (cancelled) return;
        setTransactions(batches.flatMap((b) => b.items));
        if (batches[0]?.currency) setCurrency(batches[0].currency);
      })
      .catch(() => { if (!cancelled) setTransactions([]); });
    apiFetch('/audit-logs')
      .then(({ logs }) => { if (!cancelled) setAuditLogs(logs); })
      .catch((err) => { if (!cancelled) setLogsError(err.message || 'Could not load the audit log'); })
      .finally(() => { if (!cancelled) setLogsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // ALL plus the most frequent actions, capped so the tab row stays readable.
  const filterTypes = useMemo(() => {
    const counts = {};
    auditLogs.forEach((l) => { counts[l.action] = (counts[l.action] || 0) + 1; });
    const top = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, MAX_FILTERS);
    return ['ALL', ...top];
  }, [auditLogs]);

  const verifiedCount = auditLogs.filter(l => l.status === 'VERIFIED').length;
  const recordedCount = auditLogs.filter(l => l.status === 'RECORDED').length;
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  const completedTransactions = transactions.filter(t => t.status === 'SUCCESS').length;

  const filteredLogs = filterType === 'ALL' ? auditLogs : auditLogs.filter(l => l.action === filterType);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Financial Audit & Compliance</h1>
        <p className="text-purple-100">Comprehensive audit trails and transparency reporting</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <Shield className="w-8 h-8 text-purple-600" />
            <span className="text-xs font-semibold bg-purple-50 text-purple-700 px-2 py-1 rounded">98.5%</span>
          </div>
          <p className="text-xs text-slate-600 mb-1">Verification Rate</p>
          <p className="text-2xl font-bold text-slate-900">{verifiedCount}/{auditLogs.length}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-1 rounded">Verified</span>
          </div>
          <p className="text-xs text-slate-600 mb-1">Total Transactions</p>
          <p className="text-2xl font-bold text-slate-900">{formatMoney(totalAmount, currency)}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2 py-1 rounded">Complete</span>
          </div>
          <p className="text-xs text-slate-600 mb-1">Completed Payouts</p>
          <p className="text-2xl font-bold text-slate-900">{completedTransactions}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <AlertTriangle className="w-8 h-8 text-yellow-600" />
            <span className="text-xs font-semibold bg-yellow-50 text-yellow-700 px-2 py-1 rounded">Pending</span>
          </div>
          <p className="text-xs text-slate-600 mb-1">Pending Review</p>
          <p className="text-2xl font-bold text-slate-900">{recordedCount}</p>
        </div>
      </div>

      {/* Audit Log Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900">Audit Trail</h2>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold rounded-lg text-sm transition">
              <Filter className="w-4 h-4" />
              Filter
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-sm transition">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {filterTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition ${
                filterType === type
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
              }`}
            >
              {type.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-bold text-slate-900">Actor</th>
                <th className="text-left py-3 px-4 font-bold text-slate-900">Action</th>
                <th className="text-left py-3 px-4 font-bold text-slate-900">Target</th>
                <th className="text-left py-3 px-4 font-bold text-slate-900">Timestamp</th>
                <th className="text-left py-3 px-4 font-bold text-slate-900">Status</th>
              </tr>
            </thead>
            <tbody>
              {(logsLoading || logsError) && (
                <tr>
                  <td colSpan={5} className={`py-6 px-4 text-center text-sm ${logsError ? 'text-red-700' : 'text-slate-600'}`}>
                    {logsError || 'Loading audit log…'}
                  </td>
                </tr>
              )}
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-b border-slate-200 hover:bg-slate-50 transition">
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-900">{log.actor}</p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-slate-600">{log.action.replace(/_/g, ' ')}</p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-slate-600 font-mono text-xs">{log.target}</p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-slate-600 text-xs">{new Date(log.timestamp).toLocaleString()}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                      log.status === 'VERIFIED'
                        ? 'bg-emerald-50 text-emerald-700'
                        : log.status === 'REJECTED' || log.status === 'FAILED'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-blue-50 text-blue-700'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compliance Summary */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl border border-purple-200 p-6">
        <h3 className="font-bold text-slate-900 mb-4">Compliance Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-slate-600 mb-2">Documentation</p>
            <div className="flex items-end gap-2">
              <p className="text-3xl font-bold text-slate-900">100%</p>
              <div className="w-12 h-8 bg-emerald-500 rounded"></div>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-600 mb-2">Verification</p>
            <div className="flex items-end gap-2">
              <p className="text-3xl font-bold text-slate-900">98.5%</p>
              <div className="w-12 h-8 bg-emerald-500 rounded"></div>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-600 mb-2">Timeliness</p>
            <div className="flex items-end gap-2">
              <p className="text-3xl font-bold text-slate-900">99.2%</p>
              <div className="w-12 h-8 bg-emerald-500 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
