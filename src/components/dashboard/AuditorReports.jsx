import React, { useState } from 'react';
import { ShieldCheck, Wallet, BarChart3 } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { exportToCSV } from '../../utils/exportCsv';

// Each report reads live data from the API and downloads a CSV.
const REPORTS = [
  {
    id: 'compliance',
    label: 'Compliance Report',
    help: 'Every audit log entry: who did what, when, and the result.',
    Icon: ShieldCheck,
    async rows() {
      const { logs } = await apiFetch('/audit-logs');
      return logs.map((l) => ({ id: l.id, timestamp: l.timestamp, actor: l.actor, action: l.action, target: l.target, status: l.status }));
    },
  },
  {
    id: 'financial',
    label: 'Financial Summary',
    help: 'Per campaign: target, raised, disbursed and available, in USD.',
    Icon: Wallet,
    async rows() {
      const { campaigns } = await apiFetch('/campaigns', { auth: false });
      return campaigns.map((c) => ({
        campaignId: c.id,
        campaign: c.title,
        status: c.status,
        targetUSD: c.targetAmount,
        raisedUSD: c.raisedAmount,
        disbursedUSD: c.disbursedAmount,
        availableUSD: c.availableAmount,
      }));
    },
  },
  {
    id: 'performance',
    label: 'Performance Metrics',
    help: 'Per payout batch: status, people paid, and amounts.',
    Icon: BarChart3,
    async rows() {
      const { batches } = await apiFetch('/payouts');
      return batches.map((b) => ({
        batchId: b.id,
        campaign: b.campaignTitle,
        status: b.status,
        paypalBatchId: b.paypalBatchId || '',
        beneficiaries: b.beneficiaryCount,
        paid: b.items.filter((i) => i.status === 'SUCCESS').length,
        totalUSD: b.totalAmount,
        draftedByAi: b.draftedByAi ? 'yes' : 'no',
        createdAt: b.createdAt,
        releasedAt: b.releasedAt || '',
      }));
    },
  },
];

export const AuditorReports = () => {
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState({ text: '', error: false });

  const run = async (report) => {
    setBusy(report.id);
    setMessage({ text: '', error: false });
    try {
      const rows = await report.rows();
      if (!rows.length) {
        setMessage({ text: `${report.label}: no data yet.`, error: false });
        return;
      }
      exportToCSV(rows, `reliefpay-${report.id}-${new Date().toISOString().slice(0, 10)}.csv`);
      setMessage({ text: `${report.label} downloaded (${rows.length} rows).`, error: false });
    } catch (err) {
      setMessage({ text: err.message || `Could not build the ${report.label}.`, error: true });
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-4">
      {REPORTS.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => run(r)}
          disabled={!!busy}
          className="w-full bg-gradient-to-r from-slate-900 to-slate-800 hover:shadow-lg text-white font-bold py-3 px-4 rounded-lg transition flex items-center justify-between gap-4 disabled:opacity-60 text-left"
        >
          <span className="flex items-center gap-3">
            <r.Icon className="w-5 h-5" />
            <span>
              {busy === r.id ? 'Preparing…' : r.label}
              <span className="block text-xs font-normal text-slate-300">{r.help}</span>
            </span>
          </span>
          <span className="text-xs font-semibold text-slate-300">CSV</span>
        </button>
      ))}
      {message.text && (
        <p className={`text-sm ${message.error ? 'text-red-600' : 'text-emerald-700'}`} role="status">{message.text}</p>
      )}
    </div>
  );
};
