import { after } from 'next/server';
import {
  sendProWelcomeEmail,
  sendWelcomeEmail,
  type ProWelcomeEmailDetails,
} from '@/lib/email';

export function queueWelcomeEmail(email: string, username: string): void {
  if (!email.trim()) return;

  after(() => {
    void sendWelcomeEmail(email, username).catch((err) => {
      console.error('[Welcome Email] Background send failed:', err);
    });
  });
}

export function queueProWelcomeEmail(
  email: string,
  details: ProWelcomeEmailDetails,
): void {
  if (!email.trim()) return;

  after(() => {
    void sendProWelcomeEmail(email, details).catch((err) => {
      console.error('[Pro Welcome Email] Background send failed:', err);
    });
  });
}
