import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { getPublicConfig } from './PayPalDonateButtons';
import { PayPalCheckout } from './PayPalCheckout';

// PayPal checkout for one order with one purchase unit per campaign.
// allocations: [{ campaignId, amount }] (dollars), already validated by the caller.
export const PayPalSplitButtons = ({ allocations, aiSuggested, onCaptured }) => {
  const onCapturedRef = useRef(onCaptured);
  onCapturedRef.current = onCaptured;
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

  const canRender = Boolean(config?.paypalClientId) && allocations.length >= 2;

  const createOrder = async () => {
    setError('');
    const { orderId } = await apiFetch('/donations/split-orders', {
      method: 'POST',
      body: { allocations, aiSuggested: aiSuggested === true },
    });
    return orderId;
  };

  const onApprove = async (orderId) => {
    setIsProcessing(true);
    try {
      const r = await apiFetch(`/donations/split-orders/${encodeURIComponent(orderId)}/capture`, { method: 'POST' });
      onCapturedRef.current(r);
    } catch (err) {
      setError(err.message || 'Payment capture failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-3">
      {config && !config.paypalClientId && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">PayPal sandbox is not configured on the server</p>
        </div>
      )}
      {canRender && (
        <PayPalCheckout
          config={config}
          createOrder={createOrder}
          onApprove={onApprove}
          disabled={isProcessing}
          onCancel={() => setError('Payment was cancelled. No money was taken.')}
          onError={(err) => setError(err?.message || 'PayPal could not process the payment')}
        />
      )}
      {isProcessing && <p className="text-sm text-slate-600">Confirming your split payment with PayPal...</p>}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
};