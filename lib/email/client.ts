import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not defined in environment variables');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

export const FROM_EMAIL = 'BridleStay <noreply@bridlestay.com>';
export const SUPPORT_EMAIL = 'support@bridlestay.com';
export const NO_REPLY_EMAIL = 'noreply@bridlestay.com';

