import { jsonResponse } from './helpers.js';

// In-memory stand-in for the PayPal sandbox REST API. Every request is
// recorded in `calls` as { method, path, headers, body } (body JSON-parsed when
// possible). `state` lets tests change responses:
//   captureValue  - amount PayPal reports as captured (default '25.00')
//   verify        - verification_status for webhook verification (default 'SUCCESS')
//   payoutBatch   - object or (id) => object returned by GET /v1/payments/payouts/:id
//   payoutError   - HTTP status returned by POST /v1/payments/payouts instead of 201
//   refundStatus  - status of refunds from POST /v2/payments/captures/:id/refund (default 'COMPLETED')
//   refundError   - HTTP status returned by the refund call instead of 201
//   refundFullValue - refund amount when the request has no amount (default '25.00')
//   splitCaptureStatus - { [reference_id]: capture status } for orders created with
//                   more than one purchase unit (default 'COMPLETED' per unit). All
//                   completed -> 201 COMPLETED, some -> 207 PARTIALLY_COMPLETED,
//                   none -> 422. Single-unit orders keep the response above.
export function makeFakePayPal() {
  const calls = [];
  const state = {};
  const orders = new Map();
  let n = 0;

  async function fetch(url, init = {}) {
    const method = (init.method || 'GET').toUpperCase();
    const { pathname } = new URL(url);
    let body = init.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        // form-encoded token request: keep the raw string
      }
    }
    calls.push({ method, path: pathname, headers: init.headers || {}, body });

    if (method === 'POST' && pathname === '/v1/oauth2/token') {
      return jsonResponse(200, { access_token: 'A21-test', token_type: 'Bearer', expires_in: 32400 });
    }
    if (method === 'POST' && pathname === '/v2/checkout/orders') {
      n += 1;
      orders.set('ORDER-' + n, body);
      return jsonResponse(201, { id: 'ORDER-' + n, status: 'CREATED' });
    }
    const capture = /^\/v2\/checkout\/orders\/([^/]+)\/capture$/.exec(pathname);
    if (method === 'POST' && capture) {
      const stored = orders.get(capture[1]);
      if (stored?.purchase_units?.length > 1) {
        const units = stored.purchase_units.map((u) => {
          n += 1;
          return {
            reference_id: u.reference_id,
            payments: {
              captures: [
                { id: 'CAP-' + n, status: state.splitCaptureStatus?.[u.reference_id] ?? 'COMPLETED', amount: u.amount, custom_id: u.custom_id },
              ],
            },
          };
        });
        const completed = units.filter((u) => u.payments.captures[0].status === 'COMPLETED').length;
        if (completed === 0) return jsonResponse(422, { name: 'UNPROCESSABLE_ENTITY', debug_id: 'fake-split-debug' });
        const all = completed === units.length;
        return jsonResponse(all ? 201 : 207, { id: capture[1], status: all ? 'COMPLETED' : 'PARTIALLY_COMPLETED', purchase_units: units });
      }
      n += 1;
      return jsonResponse(201, {
        id: capture[1],
        status: 'COMPLETED',
        purchase_units: [
          {
            payments: {
              captures: [
                { id: 'CAP-' + n, status: 'COMPLETED', amount: { currency_code: 'USD', value: state.captureValue ?? '25.00' } },
              ],
            },
          },
        ],
      });
    }
    if (method === 'POST' && pathname === '/v1/payments/payouts') {
      if (state.payoutError) {
        return jsonResponse(state.payoutError, { name: 'INTERNAL_SERVICE_ERROR', debug_id: 'fake-payout-debug' });
      }
      n += 1;
      return jsonResponse(201, {
        batch_header: {
          payout_batch_id: 'PPB-' + n,
          batch_status: 'PENDING',
          sender_batch_header: body?.sender_batch_header,
        },
      });
    }
    const getBatch = /^\/v1\/payments\/payouts\/([^/]+)$/.exec(pathname);
    if (method === 'GET' && getBatch) {
      const id = getBatch[1];
      const payload =
        typeof state.payoutBatch === 'function'
          ? state.payoutBatch(id)
          : state.payoutBatch ?? { batch_header: { payout_batch_id: id, batch_status: 'PENDING' }, items: [] };
      return jsonResponse(200, payload);
    }
    const refund = /^\/v2\/payments\/captures\/([^/]+)\/refund$/.exec(pathname);
    if (method === 'POST' && refund) {
      if (state.refundError) {
        return jsonResponse(state.refundError, {
          name: 'UNPROCESSABLE_ENTITY',
          debug_id: 'fake-refund-debug',
          details: [{ issue: 'REFUND_AMOUNT_EXCEEDED' }],
        });
      }
      n += 1;
      return jsonResponse(201, {
        id: 'REF-' + n,
        status: state.refundStatus ?? 'COMPLETED',
        amount: body?.amount ?? { currency_code: 'USD', value: state.refundFullValue ?? '25.00' },
        links: [
          { rel: 'self', href: 'https://api-m.sandbox.paypal.com/v2/payments/refunds/REF-' + n, method: 'GET' },
          { rel: 'up', href: 'https://api-m.sandbox.paypal.com/v2/payments/captures/' + refund[1], method: 'GET' },
        ],
      });
    }
    if (method === 'POST' && pathname === '/v1/notifications/verify-webhook-signature') {
      return jsonResponse(200, { verification_status: state.verify ?? 'SUCCESS' });
    }
    return jsonResponse(404, { name: 'RESOURCE_NOT_FOUND', debug_id: 'fake-debug' });
  }

  return { fetch, calls, state };
}
