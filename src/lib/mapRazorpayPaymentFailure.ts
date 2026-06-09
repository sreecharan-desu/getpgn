/** Map Razorpay Checkout payment.failed payloads to actionable user messages. */
export function mapRazorpayPaymentFailure(error: {
  description?: string;
  reason?: string;
  source?: string;
  step?: string;
}): string {
  const description = error.description ?? '';
  const reason = error.reason ?? '';
  const source = error.source ?? '';
  const lower = description.toLowerCase();

  if (
    reason === 'card_declined' ||
    source === 'issuer_bank' ||
    lower.includes('declined by the bank')
  ) {
    if (error.step === 'payment_authorization') {
      return (
        'Your bank verified the OTP but declined the recurring mandate at the final step. ' +
        'This is separate from a normal payment — try a credit card from HDFC/ICICI/Axis/SBI, ' +
        'ask your bank to enable e-mandate/recurring debits, or contact Razorpay support ' +
        '(mention mandate registration failed after OTP).'
      );
    }
    return (
      'Your bank declined the subscription authorisation (e-mandate). ' +
      'Try a different credit card, confirm online/recurring payments are enabled with your bank, ' +
      'or contact Razorpay support with the failed payment ID from your dashboard.'
    );
  }

  if (
    lower.includes('upi') ||
    lower.includes('cancelled the payment') ||
    lower.includes('delay in response') ||
    lower.includes('something went wrong')
  ) {
    return (
      'UPI subscription setup did not complete. Try again, use UPI QR if available, ' +
      'or pay with a card that supports recurring mandates.'
    );
  }

  if (
    lower.includes('recurring') &&
    (lower.includes('not enabled') || lower.includes('does not support'))
  ) {
    return (
      "Recurring payments aren't enabled on this Razorpay account yet. " +
      'Contact Razorpay support to enable Subscriptions and card mandates.'
    );
  }

  if (description.trim()) return description;

  return 'Payment failed. Try a different card that supports recurring payments, or contact support.';
}
