import { jsonResponse } from './helpers.js';

// In-memory stand-in for the PayPal sandbox REST API. Every request is
// recorded in `calls` as { method, path, headers, body } (body JSON-parsed when
// possible). `state` lets tests change responses:
//   captureValue  - amount PayPal reports as captured (default '25.00')
//   verify        - verification_status for webhook verification (default 'SUCCESS')
//   payoutBatch   - object or (id) => object returned by GET /v1/payments/payouts/:id
//   payoutError   - HTTP status returned by POST /v1/payments/payouts instead of 201
export function makeFakePayPal() {
  const calls = [];
  const state = {};
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
      return jsonResponse(201, { id: 'ORDER-' + n, status: 'CREATED' });
    }
    const capture = /^\/v2\/checkout\/orders\/([^/]+)\/capture$/.exec(pathname);
    if (method === 'POST' && capture) {
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
    if (method === 'POST' && pathname === '/v1/notifications/verify-webhook-signature') {
      return jsonResponse(200, { verification_status: state.verify ?? 'SUCCESS' });
    }
    return jsonResponse(404, { name: 'RESOURCE_NOT_FOUND', debug_id: 'fake-debug' });
  }

  return { fetch, calls, state };
}
