// PayPal JavaScript SDK loaders.
//
// v6 (primary): load the core script, then create one SDK instance with the
// browser-safe client ID and the "paypal-payments" component. Buttons are the
// <paypal-button> custom element; each click starts a one-time payment session.
// https://developer.paypal.com/sdk/js/
//
// v5 (fallback only): used if the v6 script or instance fails, so donations keep
// working.

const V6_CORE = {
  sandbox: 'https://www.sandbox.paypal.com/web-sdk/v6/core',
  live: 'https://www.paypal.com/web-sdk/v6/core',
};

function loadScript(src, isReady) {
  return new Promise((resolve, reject) => {
    if (isReady()) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => (isReady() ? resolve() : reject(new Error(`Loaded ${src} but the SDK is missing`)));
    script.onerror = () => {
      script.remove();
      reject(new Error(`Failed to load ${src}`));
    };
    document.head.appendChild(script);
  });
}

let v6Promise = null;

// Resolves { sdk, paymentMethods } once per page. Rejects if v6 cannot start.
export function loadPayPalV6({ clientId, environment = 'sandbox', currency = 'USD' }) {
  if (!v6Promise) {
    v6Promise = (async () => {
      const src = V6_CORE[environment] ?? V6_CORE.sandbox;
      await loadScript(src, () => typeof window.paypal?.createInstance === 'function');
      const sdk = await window.paypal.createInstance({
        clientId,
        components: ['paypal-payments'],
        pageType: 'checkout',
      });
      const paymentMethods = await sdk.findEligibleMethods({ currencyCode: currency });
      return { sdk, paymentMethods };
    })().catch((err) => {
      v6Promise = null;
      throw err;
    });
  }
  return v6Promise;
}

let v5Promise = null;

// v5 fallback. Only loaded when v6 has failed, so the two never share window.paypal.
export function loadPayPalV5({ clientId, currency = 'USD' }) {
  if (!v5Promise) {
    const src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${currency}&intent=capture&components=buttons`;
    v5Promise = loadScript(src, () => typeof window.paypal?.Buttons === 'function')
      .then(() => window.paypal)
      .catch((err) => {
        v5Promise = null;
        throw err;
      });
  }
  return v5Promise;
}
