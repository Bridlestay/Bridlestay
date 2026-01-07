import { resend, FROM_EMAIL } from './client';
import { render } from '@react-email/render';
import { BookingConfirmationEmail } from './templates/booking-confirmation';
import { BookingRequestHostEmail } from './templates/booking-request-host';
import { BookingCancelledGuestEmail } from './templates/booking-cancelled-guest';
import { BookingCancelledHostEmail } from './templates/booking-cancelled-host';
import { ReviewReminderEmail } from './templates/review-reminder';
import { WelcomeEmail } from './templates/welcome-email';
import { NewMessageEmail } from './templates/new-message';
import { formatGBP } from '../fees';

interface SendBookingConfirmationParams {
  to: string;
  guestName: string;
  propertyName: string;
  hostName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  horses: number;
  totalAmountPennies: number;
  bookingId: string;
  propertyAddress: string;
  hostEmail: string;
  hostPhone?: string;
}

export async function sendBookingConfirmation(params: SendBookingConfirmationParams) {
  try {
    const emailHtml = await render(
      BookingConfirmationEmail({
        ...params,
        totalAmount: formatGBP(params.totalAmountPennies),
      })
    );

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: `🐴 Booking Confirmed at ${params.propertyName}`,
      html: emailHtml,
    });

    if (error) {
      console.error('Failed to send booking confirmation email:', error);
      return { success: false, error };
    }

    console.log('Booking confirmation email sent:', data?.id);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    return { success: false, error };
  }
}

interface SendBookingRequestHostParams {
  to: string;
  hostName: string;
  guestName: string;
  propertyName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  horses: number;
  nightsCount: number;
  hostEarningsPennies: number;
  bookingId: string;
  guestProfileUrl: string;
  message?: string;
}

export async function sendBookingRequestHost(params: SendBookingRequestHostParams) {
  try {
    const emailHtml = await render(
      BookingRequestHostEmail({
        ...params,
        totalAmount: formatGBP(params.hostEarningsPennies),
      })
    );

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: `🔔 New Booking Request for ${params.propertyName}`,
      html: emailHtml,
    });

    if (error) {
      console.error('Failed to send booking request host email:', error);
      return { success: false, error };
    }

    console.log('Booking request host email sent:', data?.id);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending booking request host email:', error);
    return { success: false, error };
  }
}

interface SendBookingCancelledGuestParams {
  to: string;
  guestName: string;
  propertyName: string;
  hostName: string;
  checkIn: string;
  checkOut: string;
  refundAmountPennies: number;
  bookingId: string;
  cancellationReason?: string;
  cancelledBy: 'guest' | 'host';
}

export async function sendBookingCancelledGuest(params: SendBookingCancelledGuestParams) {
  try {
    const emailHtml = await render(
      BookingCancelledGuestEmail({
        ...params,
        refundAmount: formatGBP(params.refundAmountPennies),
      })
    );

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: `${params.cancelledBy === 'host' ? '❌' : '🔄'} Booking Cancelled - ${params.propertyName}`,
      html: emailHtml,
    });

    if (error) {
      console.error('Failed to send cancellation email to guest:', error);
      return { success: false, error };
    }

    console.log('Cancellation email sent to guest:', data?.id);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending cancellation email to guest:', error);
    return { success: false, error };
  }
}

interface SendBookingCancelledHostParams {
  to: string;
  hostName: string;
  guestName: string;
  propertyName: string;
  checkIn: string;
  checkOut: string;
  bookingId: string;
  lostEarningsPennies: number;
  cancellationReason?: string;
}

export async function sendBookingCancelledHost(params: SendBookingCancelledHostParams) {
  try {
    const emailHtml = await render(
      BookingCancelledHostEmail({
        ...params,
        lostEarnings: formatGBP(params.lostEarningsPennies),
      })
    );

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: `📅 Booking Cancelled by Guest - ${params.propertyName}`,
      html: emailHtml,
    });

    if (error) {
      console.error('Failed to send cancellation email to host:', error);
      return { success: false, error };
    }

    console.log('Cancellation email sent to host:', data?.id);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending cancellation email to host:', error);
    return { success: false, error };
  }
}

interface SendReviewReminderParams {
  to: string;
  recipientName: string;
  recipientType: 'guest' | 'host';
  otherPartyName: string;
  propertyName: string;
  checkIn: string;
  checkOut: string;
  bookingId: string;
}

export async function sendReviewReminder(params: SendReviewReminderParams) {
  try {
    const emailHtml = await render(
      ReviewReminderEmail(params)
    );

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: `⭐ How was your ${params.recipientType === 'guest' ? 'stay' : 'guest'}? Leave a review`,
      html: emailHtml,
    });

    if (error) {
      console.error('Failed to send review reminder email:', error);
      return { success: false, error };
    }

    console.log('Review reminder email sent:', data?.id);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending review reminder email:', error);
    return { success: false, error };
  }
}

interface SendWelcomeEmailParams {
  to: string;
  userName: string;
}

export async function sendWelcomeEmail(params: SendWelcomeEmailParams) {
  try {
    const emailHtml = await render(
      WelcomeEmail({
        userName: params.userName,
        userEmail: params.to,
      })
    );

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: '🐴 Welcome to Cantra! Your Equestrian Journey Starts Here',
      html: emailHtml,
    });

    if (error) {
      console.error('Failed to send welcome email:', error);
      return { success: false, error };
    }

    console.log('Welcome email sent:', data?.id);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error };
  }
}

interface SendNewMessageParams {
  to: string;
  recipientName: string;
  senderName: string;
  propertyName?: string;
  messagePreview: string;
  messageId: string;
}

export async function sendNewMessageNotification(params: SendNewMessageParams) {
  try {
    const emailHtml = await render(
      NewMessageEmail(params)
    );

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: `💬 New message from ${params.senderName}`,
      html: emailHtml,
    });

    if (error) {
      console.error('Failed to send new message notification:', error);
      return { success: false, error };
    }

    console.log('New message notification sent:', data?.id);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending new message notification:', error);
    return { success: false, error };
  }
}

// Simple text email for when we don't need a full template
interface SendSimpleEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendSimpleEmail({ to, subject, html }: SendSimpleEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Failed to send email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}

