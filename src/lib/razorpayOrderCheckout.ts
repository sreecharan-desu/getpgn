import { friendlyError } from '@/lib/friendlyError';
import { loadRazorpayScript } from '@/lib/razorpayCheckout';

declare global {
  interface Window {
    Razorpay?: new (options: unknown) => {
      open: () => void;
      on: (event: string, handler: (response: unknown) => void) => void;
    };
  }
}

interface OpenOrganizerOrderCheckoutOptions {
  scans: number;
  username?: string;
  onVerified: (payload: {
    scans: number;
    availableScans: number;
  }) => void | Promise<void>;
  onError: (message: string) => void;
}

export async function openOrganizerOrderCheckout({
  scans,
  username,
  onVerified,
  onError,
}: OpenOrganizerOrderCheckoutOptions): Promise<void> {
  const scriptLoaded = await loadRazorpayScript();
  if (!scriptLoaded || !window.Razorpay) {
    onError('Payment checkout could not load. Check your connection and try again.');
    return;
  }

  let orderPayload: {
    orderId: string;
    amount: number;
    keyId: string;
    scans: number;
  };

  try {
    const res = await fetch('/api/organizer/order/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scans }),
    });
    const data = await res.json();
    if (!res.ok) {
      onError(data.error ?? friendlyError(null, "We couldn't start checkout."));
      return;
    }
    orderPayload = {
      orderId: data.orderId,
      amount: data.amount,
      keyId: data.keyId,
      scans: data.scans,
    };
  } catch {
    onError(friendlyError(null, 'Network error. Please try again.'));
    return;
  }

  const rzp = new window.Razorpay({
    key: orderPayload.keyId,
    amount: orderPayload.amount * 100,
    currency: 'INR',
    name: 'GetPGN',
    description: `${orderPayload.scans.toLocaleString('en-IN')} Enterprise scan pack`,
    order_id: orderPayload.orderId,
    prefill: { name: username },
    theme: { color: '#0a0a0a' },
    handler: async (response: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }) => {
      try {
        const verifyRes = await fetch('/api/organizer/order/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) {
          onError(verifyData.error ?? friendlyError(null, 'Payment verification failed.'));
          return;
        }
        await onVerified({
          scans: orderPayload.scans,
          availableScans: verifyData.account?.availableScans ?? orderPayload.scans,
        });
      } catch {
        onError(friendlyError(null, 'Payment verification failed.'));
      }
    },
    modal: {
      ondismiss: () => {
        /* user closed */
      },
    },
  });

  rzp.on('payment.failed', (response: unknown) => {
    const resp = response as { error?: { description?: string } };
    onError(resp?.error?.description ?? friendlyError(null, 'Payment failed.'));
  });

  rzp.open();
}
