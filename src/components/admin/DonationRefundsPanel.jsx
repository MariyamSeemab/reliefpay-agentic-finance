import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, RotateCcw } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { formatMoney } from '../../lib/money';

const MAX_NOTE = 255;

const REFUND_ERRORS = {
  REFUND_EXCEEDS_REMAINING: 'That is more than the amount left to refund on this donation.',
  DONATION_NOT_REFUNDABLE: 'This donation cannot be refunded (not completed, or already fully refunded).',
  INVALID_AMOUNT: 'Enter a positive amount with at most 2 decimals, or leave it blank for the full remaining amount.',
  INVALID_NOTE: `The note must be at most ${MAX_NOTE} characters.`,
  PAYPAL_NOT_CONFIGURED: 'PayPal sandbox credentials are not configured on the server.',
  PAYPAL_ERROR: 'PayPal rejected the refund. Nothing was changed; check the audit log for details.',
};

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : '-';
}

const remainingOf = (d) => Math.round((d.amount - (d.refundedAmount ?? 0)) * 100) / 100;

// Admin list of donations with a PayPal refund action (POST /api/donations/:id/refund).
export function DonationRefundsPanel({ onRefunded }) {
  const [donations, setDonations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const { donations: list } = await apiFetch('/donations');
      setDonations(list);
      setLoadError('');
    } catch (err) {
      setLoadError(err.message || 'Could not load donations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openForm = (id) => {
    setOpenId(id);
    setAmount('');
    setNote('');
    setFormError('');
    setMessage('');
  };

  const submit = async (donation) => {
    const body = {};
    if (amount.trim() !== '') {
      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0) {
        setFormError(REFUND_ERRORS.INVALID_AMOUNT);
        return;
      }
      body.amount = value;
    }
    if (note.trim() !== '') body.note = note.trim();

    setIsSubmitting(true);
    setFormError('');
    try {
      const result = await apiFetch(`/donations/${encodeURIComponent(donation.id)}/refund`, { method: 'POST', body });
      const refund = result.refund;
      setMessage(
        refund.status === 'COMPLETED'
          ? `Refunded ${formatMoney(refund.appliedAmount)} on ${donation.id}.`
          : `PayPal reports the refund as ${refund.status}; the campaign total changes once it completes.`,
      );
      setOpenId(null);
      await load();
      onRefunded?.();
    } catch (err) {
      setFormError(REFUND_ERRORS[err.code] || err.message || 'Refund failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#123B4A]">Donations and refunds</h2>
          <p className="text-sm text-slate-600">
            Refunds go through PayPal and lower the campaign total once, including partial refunds.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setIsLoading(true); load(); }}
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" /> Reload
        </button>
      </div>

      {message && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-[#16845B]">{message}</p>}
      {isLoading && <p className="py-6 text-center text-slate-600">Loading donations…</p>}
      {!isLoading && loadError && <p className="py-6 text-center text-[#B54747]">{loadError}</p>}
      {!isLoading && !loadError && donations.length === 0 && (
        <p className="py-6 text-center text-slate-600">No donations yet.</p>
      )}

      {!isLoading && !loadError && donations.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Donor</th>
                <th className="py-2 pr-4">Campaign</th>
                <th className="py-2 pr-4 text-right">Amount</th>
                <th className="py-2 pr-4 text-right">Refunded</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {donations.map((d) => {
                const remaining = remainingOf(d);
                // Seeded/demo donations have no PayPal capture, so PayPal cannot refund them.
                const refundable = d.status === 'COMPLETED' && Boolean(d.paypalCaptureId) && remaining > 0;
                return (
                  <React.Fragment key={d.id}>
                    <tr className="border-b border-slate-100">
                      <td className="py-2 pr-4 text-slate-600">{formatDate(d.timestamp)}</td>
                      <td className="py-2 pr-4 text-slate-900">{d.donorName || 'Anonymous'}</td>
                      <td className="py-2 pr-4 text-slate-700">
                        {d.campaignTitle || d.campaignId}
                        {d.splitOrderId && (
                          <span className="ml-2 rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-semibold text-[#087E83]">Split</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-right font-medium text-slate-900">{formatMoney(d.amount, d.currency)}</td>
                      <td className="py-2 pr-4 text-right text-slate-700">
                        {d.refundedAmount ? formatMoney(d.refundedAmount, d.currency) : '-'}
                      </td>
                      <td className="py-2 pr-4 text-slate-700">{d.status}</td>
                      <td className="py-2 text-right">
                        {refundable && openId !== d.id && (
                          <button
                            type="button"
                            onClick={() => openForm(d.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-[#B54747] hover:bg-red-50"
                          >
                            <RotateCcw className="h-3 w-3" /> Refund
                          </button>
                        )}
                      </td>
                    </tr>
                    {openId === d.id && (
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <td colSpan={7} className="p-4">
                          <div className="flex flex-wrap items-end gap-3">
                            <label className="text-sm text-slate-700">
                              Amount (blank = full {formatMoney(remaining, d.currency)})
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                max={remaining}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="mt-1 block w-40 rounded-lg border border-slate-300 px-3 py-2"
                              />
                            </label>
                            <label className="min-w-[240px] flex-1 text-sm text-slate-700">
                              Note to donor (optional)
                              <input
                                type="text"
                                maxLength={MAX_NOTE}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
                              />
                            </label>
                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => submit(d)}
                              className="rounded-lg bg-[#B54747] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                            >
                              {isSubmitting ? 'Refunding…' : 'Refund via PayPal'}
                            </button>
                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => setOpenId(null)}
                              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
                            >
                              Cancel
                            </button>
                          </div>
                          {formError && <p className="mt-2 text-sm text-[#B54747]">{formError}</p>}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default DonationRefundsPanel;
