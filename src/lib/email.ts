import { Resend } from 'resend';

// Initialize Resend. If key is missing during build, fail gracefully or log a warning.
const apiKey = process.env.RESEND_API_KEY || '';
export const resend = apiKey ? new Resend(apiKey) : null;

/**
 * Sends a password reset email to the specified user email with the given token.
 * 
 * @param email Recipient email address
 * @param token Password reset token
 */
export async function sendPasswordResetEmail(email: string, token: string): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    if (!resend) {
      console.warn('[Email Utility] RESEND_API_KEY is not configured. Logging email contents instead:');
      console.warn(`To: ${email}`);
      console.warn(`Subject: Reset your GetPGN password`);
      console.warn(`Link: ${resetUrl}`);
      return { success: true, error: 'Resend not configured, logged instead.' };
    }

    const { data, error } = await resend.emails.send({
      from,
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

    if (error) {
      console.error('[Email Utility] Resend send error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Email Utility] Failed to send email:', err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Sends an email verification link for new account signups.
 *
 * @param email Recipient email address
 * @param token Verification token
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const verifyUrl = `${appUrl}/verify-email?token=${token}`;

    if (!resend) {
      console.warn('[Email Utility] RESEND_API_KEY is not configured. Logging email contents instead:');
      console.warn(`To: ${email}`);
      console.warn(`Subject: Verify your GetPGN email`);
      console.warn(`Link: ${verifyUrl}`);
      return { success: true, error: 'Resend not configured, logged instead.' };
    }

    const { data, error } = await resend.emails.send({
      from,
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

    if (error) {
      console.error('[Email Utility] Resend send error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Email Utility] Failed to send email:', err);
    return { success: false, error: errorMsg };
  }
}
