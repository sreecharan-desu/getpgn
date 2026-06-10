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

  if (lower.includes('start time is past') || lower.includes('cannot do an auth transaction')) {
    return (
      'This checkout session expired. Close the payment window and try upgrading again — ' +
      'a fresh subscription link will be created.'
    );
  }

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
    lower.includes('debit') ||
    (lower.includes('card') && lower.includes('not support'))
  ) {
    return (
      'Debit cards are not supported for Pro subscriptions. Use a credit card ' +
      '(Visa/Mastercard/RuPay credit) or PhonePe UPI.'
    );
  }

  if (
    lower.includes('upi') ||
    lower.includes('cancelled the payment') ||
    lower.includes('delay in response') ||
    lower.includes('something went wrong')
  ) {
    return (
      'PhonePe subscription setup did not complete. On mobile, tap PhonePe and approve in the app. ' +
      'On desktop, scan the QR with PhonePe. Or pay with a credit card instead.'
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

  return (
    'Payment failed. Use a credit card or PhonePe UPI. ' +
    'Debit cards and other UPI apps are not supported for subscriptions.'
  );
}
