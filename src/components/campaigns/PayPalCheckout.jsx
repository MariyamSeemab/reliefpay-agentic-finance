import React, { useEffect, useRef, useState } from 'react';
import { loadPayPalV5, loadPayPalV6 } from '../../lib/paypalSdk';

// One PayPal checkout button for ReliefPay donations.
//
// Uses PayPal JavaScript SDK v6: a <paypal-button> custom element and a
// one-time payment session. If v6 cannot start (script blocked, instance
// error, PayPal not eligible), it falls back to v5 Buttons so donors can still
// pay. Order creation and capture always go through the ReliefPay server.
//
// Props:
//   config        public config from GET /api/config
//   createOrder   async () => PayPal order id (created by the server)
//   onApprove     async (orderId) => void (capture on the server)
//   onCancel, onError
export const PayPalCheckout = ({ config, createOrder, onApprove, onCancel, onError, disabled = false }) => {
  const handlers = useRef({ createOrder, onApprove, onCancel, onError });
  handlers.current = { createOrder, onApprove, onCancel, onError };

  const [mode, setMode] = useState('loading'); // loading | v6 | v5 | failed
  const sessionRef = useRef(null);
  const v5Ref = useRef(null);

  const clientId = config?.paypalClientId;
  const environment = config?.paypalEnvironment || 'sandbox';
  const currency = config?.currency || 'USD';

  // v6: build the payment session once the SDK instance is ready.
  useEffect(() => {
    if (!clientId) return undefined;
    let cancelled = false;
    loadPayPalV6({ clientId, environment, currency })
      .then(({ sdk, paymentMethods }) => {
        if (cancelled) return;
        if (!paymentMethods.isEligible('paypal')) throw new Error('PayPal is not eligible for this buyer');
        sessionRef.current = sdk.createPayPalOneTimePaymentSession({
          onApprove: async (data) => handlers.current.onApprove(data.orderId),
          onCancel: () => handlers.current.onCancel?.(),
          onError: (err) => handlers.current.onError?.(err),
        });
        setMode('v6');
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('PayPal SDK v6 unavailable, using v5 Buttons:', err?.message || err);
        setMode('v5');
      });
    return () => { cancelled = true; };
  }, [clientId, environment, currency]);

  // v5 fallback: render Buttons into the container.
  useEffect(() => {
    if (mode !== 'v5' || !clientId) return undefined;
    let cancelled = false;
    let buttons = null;
    loadPayPalV5({ clientId, currency })
      .then((paypal) => {
        if (cancelled || !v5Ref.current) return;
        buttons = paypal.Buttons({
          style: { layout: 'vertical', shape: 'rect', label: 'donate' },
          createOrder: () => handlers.current.createOrder(),
          onApprove: (data) => handlers.current.onApprove(data.orderID),
          onCancel: () => handlers.current.onCancel?.(),
          onError: (err) => handlers.current.onError?.(err),
        });
        buttons.render(v5Ref.current).catch(() => {
          // render rejects if the container is removed before PayPal finishes
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setMode('failed');
        handlers.current.onError?.(err);
      });
    return () => {
      cancelled = true;
      if (buttons) Promise.resolve(buttons.close()).catch(() => {});
    };
  }, [mode, clientId, currency]);

  // v6 click: start the session right away (no await before start, so the
  // browser keeps the click's permission to open the PayPal window) and hand
  // it the order promise.
  const startV6 = () => {
    const session = sessionRef.current;
    if (!session || disabled) return;
    const orderPromise = Promise.resolve()
      .then(() => handlers.current.createOrder())
      .then((orderId) => ({ orderId }));
    session.start({ presentationMode: 'auto' }, orderPromise).catch((err) => handlers.current.onError?.(err));
  };

  if (!clientId) return null;

  return (
    <div data-paypal-sdk={mode} className={disabled ? 'pointer-events-none opacity-50' : ''}>
      {mode === 'loading' && <p className="text-sm text-slate-500">Loading PayPal...</p>}
      {mode === 'v6' && (
        <paypal-button type="pay" onClick={startV6} class="block w-full" />
      )}
      <div ref={v5Ref} className={mode === 'v5' ? '' : 'hidden'} />
    </div>
  );
};
