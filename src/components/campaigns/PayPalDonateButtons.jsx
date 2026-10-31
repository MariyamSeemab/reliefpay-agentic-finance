import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { loadPayPalSdk } from '../../lib/paypalSdk';

let configPromise = null;
function getPublicConfig() {
  if (!configPromise) {
    configPromise = apiFetch('/config', { auth: false }).catch((err) => {
      configPromise = null;
      throw err;
    });
  }
  return configPromise;
}

export const PayPalDonateButtons = ({ campaign, amount, onDonated }) => {
  const containerRef = useRef(null);
  const onDonatedRef = useRef(onDonated);
  onDonatedRef.current = onDonated;
  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPublicConfig()
      .then((cfg) => { if (!cancelled) setConfig(cfg); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Could not load payment settings'); });
    return () => { cancelled = true; };
  }, []);

  const isActive = campaign.status === 'ACTIVE';
  const validAmount = Number.isFinite(amount) && amount >= 1;
  const canRender = Boolean(config?.paypalClientId) && isActive && validAmount;

  useEffect(() => {
    if (!canRender) return undefined;
    let cancelled = false;
    let buttons = null;

    loadPayPalSdk({ clientId: config.paypalClientId, currency: config.currency || campaign.currency || 'USD' })
      .then((paypal) => {
        if (cancelled || !containerRef.current) return;
        buttons = paypal.Buttons({
          style: { layout: 'vertical', shape: 'rect', label: 'donate' },
          createOrder: async () => {
            setError('');
            const { orderId } = await apiFetch('/donations/orders', {
              method: 'POST',
              body: { campaignId: campaign.id, amount },
            });
            return orderId;
          },
          onApprove: async (data) => {
            setIsProcessing(true);
            try {
              const r = await apiFetch(`/donations/orders/${encodeURIComponent(data.orderID)}/capture`, { method: 'POST' });
              if (r.donation?.status === 'COMPLETED') {
                onDonatedRef.current(r.campaign, r.donation);
              } else {
                setError(`PayPal did not complete the capture (status ${r.donation?.status || 'unknown'}).`);
              }
            } catch (err) {
              setError(err.message || 'Payment capture failed');
            } finally {
              setIsProcessing(false);
            }
          },
          onCancel: () => setError('Payment was cancelled. No money was taken.'),
          onError: (err) => setError(err?.message || 'PayPal could not process the payment'),
        });
        buttons.render(containerRef.current).catch(() => {
          // render rejects when the container is removed before PayPal finishes; ignore
        });
      })
      .catch((err) => { if (!cancelled) setError(err.message || 'Failed to load PayPal'); });

    return () => {
      cancelled = true;
      if (buttons) {
        Promise.resolve(buttons.close()).catch(() => {});
      }
    };
  }, [canRender, config, campaign.id, campaign.currency, amount]);

  if (!isActive) {
    return (
      <div className="bg-slate-100 border border-slate-200 rounded-lg p-4 text-sm text-slate-700">
        This campaign is {campaign.status?.toLowerCase()} and is not accepting donations.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {config && !config.paypalClientId && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">PayPal sandbox is not configured on the server</p>
        </div>
      )}
      {config?.paypalClientId && !validAmount && (
        <p className="text-sm text-slate-600">Enter an amount of at least $1 to donate.</p>
      )}
      <div ref={containerRef} className={canRender ? '' : 'hidden'} />
      {isProcessing && <p className="text-sm text-slate-600">Confirming your payment with PayPal…</p>}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
};
