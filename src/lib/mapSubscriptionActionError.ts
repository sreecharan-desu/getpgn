/** Map Razorpay pause/resume/cancel API errors to safe client messages. */
export function mapSubscriptionActionError(
  error: unknown,
  action: 'pause' | 'resume' | 'cancel',
): { status: number; message: string } {
  const err = error as {
    statusCode?: number;
    error?: { description?: string };
    message?: string;
  };

  const description = (err?.error?.description ?? err?.message ?? '').toLowerCase();

  if (description.includes('feature is not enabled')) {
    return {
      status: 503,
      message: `Subscription ${action} isn't enabled on this Razorpay account. Contact Razorpay support.`,
    };
  }

  if (action === 'pause' && description.includes('active')) {
    return {
      status: 400,
      message: 'Only an active subscription can be paused.',
    };
  }

  if (action === 'resume' && description.includes('paused')) {
    return {
      status: 400,
      message: 'Only a paused subscription can be resumed.',
    };
  }

  const labels = { pause: 'pause', resume: 'resume', cancel: 'cancel' };
  return {
    status: 502,
    message: `We couldn't ${labels[action]} your subscription. Please try again.`,
  };
}
