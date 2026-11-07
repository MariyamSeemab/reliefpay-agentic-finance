import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, Sparkles, SplitSquareHorizontal } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { formatMoney } from '../../lib/money';
import { PayPalSplitButtons } from './PayPalSplitButtons';

const MIN_TOTAL = 2;
const MAX_TOTAL = 10000;
const MIN_SHARE_CENTS = 100;

function evenSplit(ids) {
  const base = Math.floor(100 / ids.length);
  const out = {};
  ids.forEach((id, i) => { out[id] = base + (i === 0 ? 100 - base * ids.length : 0); });
  return out;
}

// Floors each share and gives the leftover cents to the largest share so the
// amounts always add up to the total.
export function computeAllocations(totalCents, percents) {
  const shares = percents.map((p) => Math.floor((totalCents * p) / 100));
  const used = shares.reduce((a, b) => a + b, 0);
  if (shares.length > 0 && totalCents - used > 0) {
    let largest = 0;
    percents.forEach((p, i) => { if (p > percents[largest]) largest = i; });
    shares[largest] += totalCents - used;
  }
  return shares;
}

function toCents(value) {
  const n = Number(value);
  if (value === '' || !Number.isFinite(n)) return null;
  const cents = n * 100;
  return Math.abs(cents - Math.round(cents)) < 1e-6 ? Math.round(cents) : null;
}

export const SplitDonationPanel = ({ campaigns, onCampaignsChanged }) => {
  const active = useMemo(() => campaigns.filter((c) => c.status === 'ACTIVE'), [campaigns]);
  const activeKey = active.map((c) => c.id).join(',');
  const currency = active[0]?.currency || 'USD';

  const [total, setTotal] = useState('25');
  const [percents, setPercents] = useState({});
  const [aiSuggested, setAiSuggested] = useState(false);
  const [rationale, setRationale] = useState('');
  const [aiError, setAiError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState(null);

  // Start with an even split; keep the donor's percents when the list reloads.
  useEffect(() => {
    const ids = activeKey ? activeKey.split(',') : [];
    setPercents((prev) => (ids.every((id) => id in prev) && Object.keys(prev).length === ids.length ? prev : evenSplit(ids)));
  }, [activeKey]);

  const totalCents = toCents(total);
  const rows = active.map((c) => ({ campaign: c, percent: Number(percents[c.id] ?? 0) }));
  const shares = computeAllocations(totalCents ?? 0, rows.map((r) => r.percent));
  const percentSum = rows.reduce((s, r) => s + r.percent, 0);
  const included = rows.map((r, i) => ({ ...r, cents: shares[i] })).filter((r) => r.percent > 0);

  const problems = [];
  if (totalCents === null || totalCents < MIN_TOTAL * 100 || totalCents > MAX_TOTAL * 100) {
    problems.push(`The total must be between ${formatMoney(MIN_TOTAL, currency)} and ${formatMoney(MAX_TOTAL, currency)} with at most 2 decimals.`);
  }
  if (rows.some((r) => !Number.isInteger(r.percent) || r.percent < 0 || r.percent > 100)) {
    problems.push('Each percent must be a whole number from 0 to 100.');
  }
  if (percentSum !== 100) problems.push(`Percents must total 100 (now ${percentSum}).`);
  if (included.length < 2) problems.push('Choose at least 2 campaigns above 0%.');
  if (totalCents !== null && included.some((r) => r.cents < MIN_SHARE_CENTS)) {
    problems.push(`Each included campaign needs at least ${formatMoney(MIN_SHARE_CENTS / 100, currency)}.`);
  }
  const isValid = problems.length === 0;
  const allocations = included.map((r) => ({ campaignId: r.campaign.id, amount: r.cents / 100 }));

  const edit = () => {
    setConfirmed(false);
    setResult(null);
  };

  const setPercent = (id, value) => {
    const n = value === '' ? 0 : Math.trunc(Number(value));
    setPercents((prev) => ({ ...prev, [id]: Number.isFinite(n) ? n : 0 }));
    setAiSuggested(false);
    edit();
  };

  const suggest = async () => {
    setAiError('');
    setAiLoading(true);
    try {
      const amount = totalCents !== null ? totalCents / 100 : Number(total);
      const r = await apiFetch('/ai/suggest-split', { method: 'POST', body: { amount } });
      const next = Object.fromEntries(active.map((c) => [c.id, 0]));
      for (const a of r.allocations) if (a.campaignId in next) next[a.campaignId] = a.percent;
      setPercents(next);
      setRationale(r.rationale || '');
      setAiSuggested(true);
      edit();
    } catch (err) {
      setAiError(err.message || 'The AI suggestion is not available right now.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleCaptured = (r) => {
    setResult(r);
    setConfirmed(false);
    onCampaignsChanged?.();
  };

  if (active.length < 2) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <p className="text-sm text-slate-600">Split donations need at least two active campaigns.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
      <div className="flex items-start gap-3">
        <SplitSquareHorizontal className="w-6 h-6 text-[#087E83] flex-shrink-0 mt-0.5" />
        <div>
          <h2 className="text-xl font-bold text-slate-900">Split one donation across campaigns</h2>
          <p className="text-sm text-slate-600">One PayPal payment, shared between the relief campaigns you choose.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-end gap-4">
        <div className="flex-1">
          <label htmlFor="split-total" className="block text-xs font-semibold text-slate-600 mb-1">
            Total amount ({currency})
          </label>
          <input
            id="split-total"
            type="number"
            min={MIN_TOTAL}
            max={MAX_TOTAL}
            step="0.01"
            value={total}
            onChange={(e) => { setTotal(e.target.value); edit(); }}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#087E83] focus:border-transparent outline-none"
          />
        </div>
        <button
          type="button"
          onClick={suggest}
          disabled={aiLoading}
          className="inline-flex items-center justify-center gap-2 border-2 border-[#087E83] text-[#087E83] hover:bg-teal-50 font-bold px-4 py-2.5 rounded-lg text-sm transition disabled:opacity-60"
        >
          <Sparkles className="w-4 h-4" />
          {aiLoading ? 'Asking the AI…' : 'Suggest a split with AI'}
        </button>
      </div>

      {aiError && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">{aiError} You can still set the split yourself.</p>
        </div>
      )}
      {aiSuggested && rationale && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
          <p className="text-xs font-bold text-[#087E83] uppercase mb-1">AI suggestion: review and edit before you pay</p>
          <p className="text-sm text-slate-700">{rationale}</p>
        </div>
      )}

      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
        {rows.map((r, i) => (
          <div key={r.campaign.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 truncate">{r.campaign.title}</p>
              <p className="text-xs text-slate-500">
                {formatMoney(r.campaign.raisedAmount, currency)} raised of {formatMoney(r.campaign.targetAmount, currency)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor={`split-pct-${r.campaign.id}`} className="sr-only">Percent for {r.campaign.title}</label>
              <input
                id={`split-pct-${r.campaign.id}`}
                type="number"
                min="0"
                max="100"
                step="1"
                value={percents[r.campaign.id] ?? 0}
                onChange={(e) => setPercent(r.campaign.id, e.target.value)}
                className="w-20 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#087E83] focus:border-transparent outline-none text-right"
              />
              <span className="text-sm text-slate-600">%</span>
              <span className="w-24 text-right font-semibold text-slate-900">
                {formatMoney((r.percent > 0 ? shares[i] : 0) / 100, currency)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {!isValid && (
        <ul className="text-sm text-[#B54747] list-disc pl-5 space-y-1">
          {problems.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}

      {isValid && !confirmed && !result && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <p className="font-bold text-slate-900">Review split</p>
          <ul className="text-sm text-slate-700 space-y-1">
            {included.map((r) => (
              <li key={r.campaign.id} className="flex justify-between gap-4">
                <span className="truncate">{r.campaign.title}</span>
                <span className="font-semibold">{formatMoney(r.cents / 100, currency)}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-slate-700">
            Total <strong>{formatMoney(totalCents / 100, currency)}</strong> in one PayPal sandbox payment.
          </p>
          <button
            type="button"
            onClick={() => setConfirmed(true)}
            className="bg-[#087E83] hover:bg-[#123B4A] text-white font-bold px-6 py-2.5 rounded-lg text-sm transition"
          >
            Confirm split
          </button>
        </div>
      )}

      {isValid && confirmed && (
        <PayPalSplitButtons allocations={allocations} aiSuggested={aiSuggested} onCaptured={handleCaptured} />
      )}

      {result?.split && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-[#16845B]" />
            <p className="font-semibold text-emerald-900">
              Split payment {result.split.status === 'COMPLETED' ? 'completed' : `status: ${result.split.status}`}
            </p>
          </div>
          <ul className="text-sm text-emerald-900 space-y-1">
            {result.split.donations.map((d) => (
              <li key={d.id} className="flex justify-between gap-4">
                <span className="truncate">{d.campaignTitle}</span>
                <span>
                  {formatMoney(d.amount, d.currency)} · {d.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
