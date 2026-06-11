import {
  describeResendError,
  getAppUrl,
  getEmailFromAddress,
  getResendApiKey,
  logEmailMisconfiguration,
} from '@/lib/emailConfig';

const RESEND_API_URL = 'https://api.resend.com/emails';
const RESEND_TIMEOUT_MS = 20_000;

type SendResult = { success: boolean; data?: unknown; error?: string };

type ResendApiError = {
  name?: string;
  message?: string;
  statusCode?: number;
};

async function sendEmail(payload: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<SendResult> {
  const apiKey = getResendApiKey();
  const from = getEmailFromAddress();

  if (!apiKey) {
    logEmailMisconfiguration();
    console.warn('[Email Utility] RESEND_API_KEY is not configured. Logging email contents instead:');
    console.warn(`From: ${from}`);
    console.warn(`To: ${payload.to}`);
    console.warn(`Subject: ${payload.subject}`);
    console.warn(`Text: ${payload.text.slice(0, 200)}…`);
    return { success: true, error: 'Resend not configured, logged instead.' };
  }

  let lastError: ResendApiError | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS);

    try {
      const response = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'getpgn-email/1.0',
        },
        body: JSON.stringify({
          from,
          to: [payload.to],
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        }),
        signal: controller.signal,
        cache: 'no-store',
      });

      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;

      if (response.ok) {
        return { success: true, data: body };
      }

      const apiError = (body as { name?: string; message?: string }) ?? {};
      lastError = {
        name: apiError.name ?? 'application_error',
        message: apiError.message ?? response.statusText ?? 'Resend API error',
        statusCode: response.status,
      };
      console.error(
        `[Email Utility] Resend API ${response.status}:`,
        JSON.stringify(body),
      );

      if (lastError.name === 'validation_error') {
        break;
      }
    } catch (err) {
      const message =
        err instanceof Error && err.name === 'AbortError'
          ? `Resend request timed out after ${RESEND_TIMEOUT_MS / 1000}s`
          : err instanceof Error
            ? err.message
            : 'Unknown fetch error';
      console.error('[Email Utility] Resend fetch failed:', err);
      lastError = { name: 'application_error', message, statusCode: undefined };
    } finally {
      clearTimeout(timeoutId);
    }

    if (attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  const described = lastError
    ? describeResendError({
        name: lastError.name,
        message: lastError.message,
        statusCode: lastError.statusCode ?? null,
      })
    : 'Email send failed.';
  return { success: false, error: described };
}

/**
 * Sends a password reset email to the specified user email with the given token.
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string,
): Promise<SendResult> {
  const appUrl = getAppUrl();
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  return sendEmail({
    to: email,
    subject: 'Reset your GetPGN password',
    text: `Click the link below to reset your password.\n\n${resetUrl}\n\nThis link expires in 15 minutes.\n\nIf you did not request a password reset, ignore this email.`,
    html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px; background-color: #ffffff; color: #111111;">
          <h2 style="color: #000000; margin-top: 0; font-weight: 800; tracking-tight: -0.025em;">Reset your GetPGN password</h2>
          <p style="font-size: 14px; color: #444444;">Click the button below to reset your password. This link will expire in 15 minutes.</p>
          <div style="margin: 24px 0;">
            <a href="${resetUrl}" style="background-color: #000000; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 14px;">Reset Password</a>
          </div>
          <p style="color: #666666; font-size: 12px;">Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #000000; font-size: 12px;"><a href="${resetUrl}" style="color: #000000; text-decoration: underline;">${resetUrl}</a></p>
          <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 24px 0;" />
          <p style="color: #999999; font-size: 11px; margin-bottom: 0;">If you did not request a password reset, you can safely ignore this email.</p>
        </div>
      `,
  });
}

/**
 * Sends an email verification link for new account signups.
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
): Promise<SendResult> {
  const appUrl = getAppUrl();
  const verifyUrl = `${appUrl}/verify-email?token=${token}`;

  return sendEmail({
    to: email,
    subject: 'Verify your GetPGN email',
    text: `Thanks for signing up for GetPGN.\n\nClick the link below to verify your email address:\n\n${verifyUrl}\n\nThis link expires in 10 minutes.\n\nIf you did not create an account, you can ignore this email.`,
    html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px; background-color: #ffffff; color: #111111;">
          <h2 style="color: #000000; margin-top: 0; font-weight: 800; tracking-tight: -0.025em;">Verify your GetPGN email</h2>
          <p style="font-size: 14px; color: #444444;">Thanks for signing up. Click the button below to verify your email address. This link will expire in 10 minutes.</p>
          <div style="margin: 24px 0;">
            <a href="${verifyUrl}" style="background-color: #000000; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 14px;">Verify email</a>
          </div>
          <p style="color: #666666; font-size: 12px;">Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #000000; font-size: 12px;"><a href="${verifyUrl}" style="color: #000000; text-decoration: underline;">${verifyUrl}</a></p>
          <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 24px 0;" />
          <p style="color: #999999; font-size: 11px; margin-bottom: 0;">If you did not create a GetPGN account, you can safely ignore this email.</p>
        </div>
      `,
  });
}

function formatEmailDate(value: Date | string): string {
  return new Date(value).toLocaleDateString('en-IN', { dateStyle: 'long' });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const emailShell = (title: string, bodyHtml: string, footer: string) => `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px; background-color: #ffffff; color: #111111;">
    <h2 style="color: #000000; margin-top: 0; font-weight: 800; letter-spacing: -0.025em;">${title}</h2>
    ${bodyHtml}
    <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 24px 0;" />
    <p style="color: #999999; font-size: 11px; margin-bottom: 0;">${footer}</p>
  </div>
`;

const ctaButton = (href: string, label: string) => `
  <div style="margin: 24px 0;">
    <a href="${href}" style="background-color: #000000; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 14px;">${label}</a>
  </div>
`;

/** Sent after a user verifies their email address. */
export async function sendWelcomeEmail(
  email: string,
  username: string,
): Promise<SendResult> {
  const appUrl = getAppUrl();
  const dashboardUrl = `${appUrl}/dashboard`;

  const text = [
    `Hi ${username},`,
    '',
    'Welcome to GetPGN — the chess scoresheet digitizer.',
    '',
    'You can scan paper scoresheets, validate moves, export PGN, and (with Pro) save games and share interactive replays.',
    '',
    `Open your dashboard: ${dashboardUrl}`,
    '',
    'Happy scanning!',
    '— The GetPGN team',
  ].join('\n');

  return sendEmail({
    to: email,
    subject: 'Welcome to GetPGN',
    text,
    html: emailShell(
      'Welcome to GetPGN',
      `
        <p style="font-size: 14px; color: #444444;">Hi <strong>${escapeHtml(username)}</strong>,</p>
        <p style="font-size: 14px; color: #444444;">Thanks for joining GetPGN. You can scan paper scoresheets, validate moves, export PGN, and build your game library from the dashboard.</p>
        ${ctaButton(dashboardUrl, 'Go to dashboard')}
        <p style="font-size: 14px; color: #444444; margin-bottom: 0;">Happy scanning!</p>
      `,
      'You received this because you verified your GetPGN account.',
    ),
  });
}

export type ProWelcomeEmailDetails = {
  username: string;
  planType: 'monthly' | 'yearly' | 'enterprise';
  status: 'active' | 'authenticated';
  subscriptionEnd?: Date | string | null;
  subscriptionStart?: Date | string | null;
};

/** Sent when a user subscribes or schedules GetPGN Pro. */
export async function sendProWelcomeEmail(
  email: string,
  details: ProWelcomeEmailDetails,
): Promise<SendResult> {
  const appUrl = getAppUrl();
  const dashboardUrl = `${appUrl}/dashboard`;
  const planLabel =
    details.planType === 'enterprise'
      ? 'Enterprise (organizer library)'
      : details.planType === 'yearly'
        ? 'Pro Yearly (₹1,000/year)'
        : 'Pro Monthly (₹100/month)';
  const isScheduled = details.status === 'authenticated';

  const statusLine = isScheduled
    ? 'Scheduled — autopay is set up'
    : 'Active';

  const billingLines: string[] = [];
  if (isScheduled && details.subscriptionStart) {
    billingLines.push(
      `First plan payment (auto-debit): ${formatEmailDate(details.subscriptionStart)}`,
    );
  }
  if (details.subscriptionEnd) {
    billingLines.push(
      isScheduled
        ? `Pro access until: ${formatEmailDate(details.subscriptionEnd)}`
        : `Renews on: ${formatEmailDate(details.subscriptionEnd)}`,
    );
  }
  if (!isScheduled) {
    billingLines.push('Your Pro features are available now.');
  } else {
    billingLines.push(
      'Today’s checkout only registers your ₹1 mandate — your plan amount is not charged until the date above.',
    );
  }

  const text = [
    `Hi ${details.username},`,
    '',
    'Welcome to GetPGN Pro!',
    '',
    `Plan: ${planLabel}`,
    `Status: ${statusLine}`,
    ...billingLines,
    '',
    `Manage billing: ${dashboardUrl}`,
    '',
    '— The GetPGN team',
  ].join('\n');

  const billingHtml = billingLines
    .map((line) => `<li style="margin-bottom: 6px;">${line}</li>`)
    .join('');

  return sendEmail({
    to: email,
    subject: 'Welcome to GetPGN Pro',
    text,
    html: emailShell(
      'Welcome to GetPGN Pro',
      `
        <p style="font-size: 14px; color: #444444;">Hi <strong>${escapeHtml(details.username)}</strong>,</p>
        <p style="font-size: 14px; color: #444444;">You’re on <strong>${planLabel}</strong>. Here’s your subscription status:</p>
        <ul style="font-size: 14px; color: #444444; padding-left: 20px; margin: 16px 0;">
          <li style="margin-bottom: 6px;"><strong>Status:</strong> ${statusLine}</li>
          ${billingHtml}
        </ul>
        ${ctaButton(dashboardUrl, 'View account & billing')}
        <p style="font-size: 14px; color: #444444; margin-bottom: 0;">Questions? Reply to this email or visit your account settings.</p>
      `,
      'You received this because your GetPGN Pro subscription was created or updated.',
    ),
  });
}

export type OrganizerCreditsEmailDetails = {
  username: string;
  scansAdded: number;
  availableScans: number;
  totalScansPurchased: number;
  source: 'purchase' | 'admin';
};

/** Sent when prepaid scan credits are added to an organizer wallet. */
export async function sendOrganizerCreditsAddedEmail(
  email: string,
  details: OrganizerCreditsEmailDetails,
): Promise<SendResult> {
  const appUrl = getAppUrl();
  const accountUrl = `${appUrl}/account`;
  const sourceLabel =
    details.source === 'admin' ? 'Support credit' : 'Prepaid purchase';

  const text = [
    `Hi ${details.username},`,
    '',
    `${details.scansAdded.toLocaleString()} scan credits were added to your GetPGN wallet.`,
    '',
    `Source: ${sourceLabel}`,
    `Available now: ${details.availableScans.toLocaleString()} scans`,
    `Lifetime purchased: ${details.totalScansPurchased.toLocaleString()} scans`,
    '',
    `View wallet: ${accountUrl}`,
    '',
    '— The GetPGN team',
  ].join('\n');

  return sendEmail({
    to: email,
    subject: `${details.scansAdded.toLocaleString()} scan credits added to your wallet`,
    text,
    html: emailShell(
      'Scan credits added',
      `
        <p style="font-size: 14px; color: #444444;">Hi <strong>${escapeHtml(details.username)}</strong>,</p>
        <p style="font-size: 14px; color: #444444;"><strong>${details.scansAdded.toLocaleString()}</strong> scan credits were added to your organizer wallet (${sourceLabel}).</p>
        <ul style="font-size: 14px; color: #444444; padding-left: 20px; margin: 16px 0;">
          <li style="margin-bottom: 6px;"><strong>Available now:</strong> ${details.availableScans.toLocaleString()} scans</li>
          <li style="margin-bottom: 6px;"><strong>Lifetime purchased:</strong> ${details.totalScansPurchased.toLocaleString()} scans</li>
        </ul>
        ${ctaButton(accountUrl, 'View wallet & history')}
      `,
      'You received this because scan credits were added to your GetPGN organizer wallet.',
    ),
  });
}

export type OrganizerWalletHistoryEmailDetails = {
  username: string;
  scansUsed: number;
  availableScans: number;
  totalScansUsed: number;
  totalScansPurchased: number;
};

/** Sent when a scan is consumed from the prepaid organizer wallet. */
export async function sendOrganizerWalletHistoryEmail(
  email: string,
  details: OrganizerWalletHistoryEmailDetails,
): Promise<SendResult> {
  const appUrl = getAppUrl();
  const accountUrl = `${appUrl}/account`;

  const text = [
    `Hi ${details.username},`,
    '',
    '1 scan credit was used from your GetPGN prepaid wallet.',
    '',
    `Remaining: ${details.availableScans.toLocaleString()} scans`,
    `Total used: ${details.totalScansUsed.toLocaleString()} of ${details.totalScansPurchased.toLocaleString()} purchased`,
    '',
    `Wallet history: ${accountUrl}`,
    '',
    '— The GetPGN team',
  ].join('\n');

  return sendEmail({
    to: email,
    subject: 'Wallet update: 1 scan credit used',
    text,
    html: emailShell(
      'Wallet activity',
      `
        <p style="font-size: 14px; color: #444444;">Hi <strong>${escapeHtml(details.username)}</strong>,</p>
        <p style="font-size: 14px; color: #444444;">1 scan credit was used from your prepaid wallet while digitizing a scoresheet.</p>
        <ul style="font-size: 14px; color: #444444; padding-left: 20px; margin: 16px 0;">
          <li style="margin-bottom: 6px;"><strong>Remaining:</strong> ${details.availableScans.toLocaleString()} scans</li>
          <li style="margin-bottom: 6px;"><strong>Total used:</strong> ${details.totalScansUsed.toLocaleString()} of ${details.totalScansPurchased.toLocaleString()} purchased</li>
        </ul>
        ${ctaButton(accountUrl, 'View wallet history')}
      `,
      'You received this because a scan was charged to your GetPGN organizer wallet.',
    ),
  });
}

export type ProSubscriptionEmailDetails = {
  username: string;
  planType: 'monthly' | 'yearly' | 'enterprise';
  event: 'renewed' | 'cancelled' | 'activated';
  subscriptionEnd?: Date | string | null;
};

/** Pro subscription lifecycle updates (renewal, cancellation, activation). */
export async function sendProSubscriptionEmail(
  email: string,
  details: ProSubscriptionEmailDetails,
): Promise<SendResult> {
  const appUrl = getAppUrl();
  const accountUrl = `${appUrl}/account`;
  const planLabel =
    details.planType === 'enterprise'
      ? 'Enterprise'
      : details.planType === 'yearly'
        ? 'Pro Yearly'
        : 'Pro Monthly';

  const subject =
    details.event === 'renewed'
      ? 'Your GetPGN Pro subscription renewed'
      : details.event === 'cancelled'
        ? 'Your GetPGN Pro subscription was cancelled'
        : 'Your GetPGN Pro subscription is active';

  const headline =
    details.event === 'renewed'
      ? 'Pro subscription renewed'
      : details.event === 'cancelled'
        ? 'Pro subscription cancelled'
        : 'Pro subscription active';

  const bodyLines: string[] = [];
  if (details.event === 'renewed') {
    bodyLines.push(`Your ${planLabel} plan renewed successfully.`);
    if (details.subscriptionEnd) {
      bodyLines.push(`Next renewal: ${formatEmailDate(details.subscriptionEnd)}`);
    }
    bodyLines.push('Your Pro features remain available.');
  } else if (details.event === 'cancelled') {
    bodyLines.push(`Your ${planLabel} subscription is set to cancel.`);
    if (details.subscriptionEnd) {
      bodyLines.push(`Pro access continues until ${formatEmailDate(details.subscriptionEnd)}.`);
    } else {
      bodyLines.push('Pro access continues until the end of your current billing period.');
    }
  } else {
    bodyLines.push(`Your ${planLabel} subscription is now active.`);
    if (details.subscriptionEnd) {
      bodyLines.push(`Renews on ${formatEmailDate(details.subscriptionEnd)}.`);
    }
  }

  const text = [
    `Hi ${details.username},`,
    '',
    ...bodyLines,
    '',
    `Manage billing: ${accountUrl}`,
    '',
    '— The GetPGN team',
  ].join('\n');

  const bodyHtml = bodyLines
    .map((line) => `<li style="margin-bottom: 6px;">${line}</li>`)
    .join('');

  return sendEmail({
    to: email,
    subject,
    text,
    html: emailShell(
      headline,
      `
        <p style="font-size: 14px; color: #444444;">Hi <strong>${escapeHtml(details.username)}</strong>,</p>
        <ul style="font-size: 14px; color: #444444; padding-left: 20px; margin: 16px 0;">
          ${bodyHtml}
        </ul>
        ${ctaButton(accountUrl, 'View account & billing')}
      `,
      'You received this because your GetPGN Pro subscription status changed.',
    ),
  });
}

/** Sent after a user changes their password while signed in. */
export async function sendPasswordChangedEmail(
  email: string,
  username: string,
): Promise<SendResult> {
  const appUrl = getAppUrl();
  const accountUrl = `${appUrl}/account`;

  const text = [
    `Hi ${username},`,
    '',
    'Your GetPGN password was changed successfully.',
    '',
    'If you did not make this change, reset your password immediately or contact support.',
    '',
    `Account settings: ${accountUrl}`,
    '',
    '— The GetPGN team',
  ].join('\n');

  return sendEmail({
    to: email,
    subject: 'Your GetPGN password was changed',
    text,
    html: emailShell(
      'Password changed',
      `
        <p style="font-size: 14px; color: #444444;">Hi <strong>${escapeHtml(username)}</strong>,</p>
        <p style="font-size: 14px; color: #444444;">Your GetPGN account password was changed successfully.</p>
        <p style="font-size: 14px; color: #444444;">If you did not make this change, reset your password immediately or contact support.</p>
        ${ctaButton(accountUrl, 'Account settings')}
      `,
      'You received this because your GetPGN password was changed.',
    ),
  });
}

export type ReferrerFriendSignedUpDetails = {
  referrerUsername: string;
  refereeUsername: string;
  rewardScans: number;
};

/** Sent when someone signs up using a referral link. */
export async function sendReferrerFriendSignedUpEmail(
  email: string,
  details: ReferrerFriendSignedUpDetails,
): Promise<SendResult> {
  const appUrl = getAppUrl();
  const referralsUrl = `${appUrl}/account?tab=referrals`;

  const text = [
    `Hi ${details.referrerUsername},`,
    '',
    `@${details.refereeUsername} just signed up for GetPGN using your referral link.`,
    '',
    `When they complete their first scoresheet scan, you'll both receive ${details.rewardScans} bonus scans.`,
    '',
    `Track referrals: ${referralsUrl}`,
    '',
    '— The GetPGN team',
  ].join('\n');

  return sendEmail({
    to: email,
    subject: `@${details.refereeUsername} joined with your referral link`,
    text,
    html: emailShell(
      'New referral signup',
      `
        <p style="font-size: 14px; color: #444444;">Hi <strong>${escapeHtml(details.referrerUsername)}</strong>,</p>
        <p style="font-size: 14px; color: #444444;"><strong>@${escapeHtml(details.refereeUsername)}</strong> just signed up for GetPGN using your referral link.</p>
        <p style="font-size: 14px; color: #444444;">When they complete their first scoresheet scan, you'll both receive <strong>${details.rewardScans} bonus scans</strong>.</p>
        ${ctaButton(referralsUrl, 'View referrals')}
      `,
      'You received this because someone signed up with your GetPGN referral link.',
    ),
  });
}
