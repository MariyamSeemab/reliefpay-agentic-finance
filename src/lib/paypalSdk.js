let sdkPromise = null;

// Loads the PayPal JS SDK v5 once and resolves window.paypal.
export function loadPayPalSdk({ clientId, currency = 'USD' }) {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    if (window.paypal) {
      resolve(window.paypal);
      return;
    }
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${currency}&intent=capture&components=buttons`;
    script.async = true;
    script.onload = () => {
      if (window.paypal) resolve(window.paypal);
      else reject(new Error('PayPal SDK loaded but window.paypal is missing'));
    };
    script.onerror = () => {
      script.remove();
      sdkPromise = null;
      reject(new Error('Failed to load the PayPal SDK'));
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
}
