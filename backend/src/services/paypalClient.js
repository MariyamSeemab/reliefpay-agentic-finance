// Thin PayPal REST client (sandbox by default) built on fetch so tests can
// inject a fake. Covers OAuth, Orders v2, Payouts v1 and webhook verification.
import { HttpError } from '../errors.js';

export class PayPalError extends Error {
  constructor({ status, name, debugId, details, message }) {
    super(message || `PayPal request failed (${status}${name ? ' ' + name : ''})`);
    this.status = status;
    this.paypalName = name;
    this.debugId = debugId;
    this.details = details;
  }
}

function notConfigured() {
  return new HttpError(503, 'PAYPAL_NOT_CONFIGURED', 'PayPal credentials are not configured on the server');
}

export function createPayPalClient({ clientId, clientSecret, apiBase, fetch = globalThis.fetch } = {}) {
  const isConfigured = Boolean(clientId && clientSecret);
  const base = String(apiBase || 'https://api-m.sandbox.paypal.com').replace(/\/+$/, '');
  let cachedToken = null;
  let cachedUntil = 0;

  async function send(path, init) {
    let res;
    try {
      res = await fetch(`${base}${path}`, init);
    } catch (err) {
      throw new PayPalError({ status: 0, name: 'NETWORK_ERROR', message: `PayPal unreachable: ${err.message}` });
    }
    const text = await res.text();
    let body = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { raw: text };
      }
    }
    if (!res.ok) {
      throw new PayPalError({
        status: res.status,
        name: body?.name || body?.error,
        debugId: body?.debug_id,
        details: body?.details || body?.error_description,
      });
    }
    return body;
  }

  async function getAccessToken() {
    if (!isConfigured) throw notConfigured();
    if (cachedToken && Date.now() < cachedUntil) return cachedToken;
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const body = await send('/v1/oauth2/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: 'grant_type=client_credentials',
    });
    cachedToken = body.access_token;
    cachedUntil = Date.now() + (Number(body.expires_in || 0) - 60) * 1000;
    return cachedToken;
  }

  async function call(method, path, { body, requestId } = {}) {
    const token = await getAccessToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (requestId) headers['PayPal-Request-Id'] = requestId;
    return send(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  }

  return {
    isConfigured,
    getAccessToken,

    createOrder({ donationId, campaignId, description, amount, currency, requestId }) {
      return call('POST', '/v2/checkout/orders', {
        requestId,
        body: {
          intent: 'CAPTURE',
          purchase_units: [
            {
              reference_id: campaignId,
              custom_id: donationId,
              description: String(description || '').slice(0, 127),
              amount: { currency_code: currency, value: amount },
            },
          ],
        },
      });
    },

    captureOrder(orderId, requestId) {
      return call('POST', `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { requestId, body: {} });
    },

    createPayoutBatch({ senderBatchId, emailSubject, emailMessage, items }) {
      return call('POST', '/v1/payments/payouts', {
        body: {
          sender_batch_header: {
            sender_batch_id: senderBatchId,
            recipient_type: 'EMAIL',
            email_subject: emailSubject,
            email_message: emailMessage,
          },
          items: items.map((item) => ({
            recipient_type: 'EMAIL',
            amount: { value: item.amount, currency: item.currency },
            receiver: item.receiver,
            sender_item_id: item.senderItemId,
            note: item.note,
          })),
        },
      });
    },

    getPayoutBatch(payoutBatchId) {
      return call('GET', `/v1/payments/payouts/${encodeURIComponent(payoutBatchId)}`);
    },

    async verifyWebhookSignature({ headers, webhookId, event }) {
      const body = await call('POST', '/v1/notifications/verify-webhook-signature', {
        body: {
          auth_algo: headers['paypal-auth-algo'],
          cert_url: headers['paypal-cert-url'],
          transmission_id: headers['paypal-transmission-id'],
          transmission_sig: headers['paypal-transmission-sig'],
          transmission_time: headers['paypal-transmission-time'],
          webhook_id: webhookId,
          webhook_event: event,
        },
      });
      return body?.verification_status;
    },
  };
}
