/** Common disposable / throwaway email domains — raises cost of multi-account farming. */
const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  'throwaway.email',
  'yopmail.com',
  'getnada.com',
  'maildrop.cc',
  'sharklasers.com',
  'grr.la',
  'dispostable.com',
  'trashmail.com',
  'fakeinbox.com',
  'mintemail.com',
  'emailondeck.com',
  'tempail.com',
  'mailnesia.com',
  'spamgourmet.com',
]);

export function getEmailDomain(email: string): string | null {
  const at = email.lastIndexOf('@');
  if (at < 1 || at === email.length - 1) return null;
  return email.slice(at + 1).toLowerCase();
}

export function isDisposableEmail(email: string): boolean {
  const domain = getEmailDomain(email);
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.has(domain);
}
