import jwt from 'jsonwebtoken';
import { getJwtSecret } from '@/lib/security';

const TOKEN_TYPE = 'validation-session';
const TOKEN_TTL_SEC = 24 * 60 * 60;

interface ValidationSessionPayload {
  sub: string;
  typ: string;
}

/** Short-lived token allowing move re-validation without consuming another scan. */
export function createValidationSessionToken(userId: string): string {
  return jwt.sign({ typ: TOKEN_TYPE }, getJwtSecret(), {
    subject: userId,
    expiresIn: TOKEN_TTL_SEC,
  });
}

export function verifyValidationSessionToken(
  token: string | undefined | null,
  userId: string,
): boolean {
  if (!token || typeof token !== 'string') return false;
  try {
    const payload = jwt.verify(token, getJwtSecret()) as ValidationSessionPayload & {
      sub?: string;
    };
    const subject = payload.sub ?? (payload as jwt.JwtPayload).sub;
    return subject === userId && payload.typ === TOKEN_TYPE;
  } catch {
    return false;
  }
}
