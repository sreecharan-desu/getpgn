/** Shared Resend / app URL configuration for transactional email. */

export function getResendApiKey(): string | null {
  const key = process.env.RESEND_API_KEY?.trim();
  return key || null;
}

export function getAppUrl(): string {
  const raw =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.NODE_ENV === 'production' ? 'https://getpgn.in' : 'http://localhost:3000');
  return raw.replace(/\/$/, '');
}

/** Resend accepts `email@domain.com` or `Name <email@domain.com>`. */
export function getEmailFromAddress(): string {
  const configured = process.env.EMAIL_FROM?.trim();
  if (configured) return configured;

  const appUrl = getAppUrl();
  if (appUrl.includes('getpgn.in')) {
    return 'GetPGN <support@mail.getpgn.in>';
  }

  return 'GetPGN <onboarding@resend.dev>';
}

export function logEmailMisconfiguration(): void {
  if (!getResendApiKey()) {
    console.error(
      '[Email] RESEND_API_KEY is missing or empty. Password reset and verification emails cannot be sent.',
    );
  }

  if (process.env.NODE_ENV === 'production' && !process.env.EMAIL_FROM?.trim()) {
    console.warn(
      '[Email] EMAIL_FROM is not set. Using default sender — verify mail.getpgn.in in Resend and set EMAIL_FROM=GetPGN <support@mail.getpgn.in> on Vercel.',
    );
  }
}

export function describeResendError(error: {
  name?: string;
  message?: string;
  statusCode?: number | null;
}): string {
  const name = error.name ?? 'unknown_error';
  const message = error.message ?? 'Unknown Resend error';

  if (name === 'validation_error' && message.includes('testing emails')) {
    return `${message} Fix: verify your domain at resend.com/domains and set EMAIL_FROM to that domain.`;
  }

  if (name === 'missing_api_key' || message.toLowerCase().includes('unauthorized')) {
    return `${message} Fix: check RESEND_API_KEY on Vercel (no quotes, no trailing spaces).`;
  }

  if (name === 'validation_error' && message.includes('from')) {
    return `${message} Fix: set EMAIL_FROM to a verified domain address, e.g. GetPGN <support@mail.getpgn.in>.`;
  }

  if (name === 'application_error' && message.includes('could not be resolved')) {
    return `${message} Fix: ensure Vercel can reach api.resend.com and RESEND_API_KEY is valid.`;
  }

  return message;
}
