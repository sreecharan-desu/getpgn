import { Resend } from 'resend';
import {
  describeResendError,
  getAppUrl,
  getEmailFromAddress,
  getResendApiKey,
  logEmailMisconfiguration,
} from '@/lib/emailConfig';

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    logEmailMisconfiguration();
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

type SendResult = { success: boolean; data?: unknown; error?: string };

async function sendEmail(payload: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<SendResult> {
  const client = getResendClient();
  const from = getEmailFromAddress();

  if (!client) {
    console.warn('[Email Utility] RESEND_API_KEY is not configured. Logging email contents instead:');
    console.warn(`From: ${from}`);
    console.warn(`To: ${payload.to}`);
    console.warn(`Subject: ${payload.subject}`);
    console.warn(`Text: ${payload.text.slice(0, 200)}…`);
    return { success: true, error: 'Resend not configured, logged instead.' };
  }

  let lastError: { name?: string; message?: string; statusCode?: number | null } | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data, error } = await client.emails.send({
        from,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      });

      if (!error) {
        return { success: true, data };
      }

      lastError = error;
      console.error('[Email Utility] Resend send error:', JSON.stringify(error));

      if (error.name === 'validation_error') {
        break;
      }

      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Email Utility] Failed to send email:', err);
      lastError = { name: 'application_error', message: errorMsg, statusCode: null };
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        continue;
      }
    }
  }

  const described = lastError ? describeResendError(lastError) : 'Email send failed.';
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
