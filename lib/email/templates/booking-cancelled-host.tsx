import * as React from 'react';

interface BookingCancelledHostEmailProps {
  hostName: string;
  guestName: string;
  propertyName: string;
  checkIn: string;
  checkOut: string;
  bookingId: string;
  lostEarnings: string;
  cancellationReason?: string;
}

export const BookingCancelledHostEmail = ({
  hostName,
  guestName,
  propertyName,
  checkIn,
  checkOut,
  bookingId,
  lostEarnings,
  cancellationReason,
}: BookingCancelledHostEmailProps) => {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <style>{`
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: #f59e0b;
            color: white;
            padding: 30px 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .content {
            background: #ffffff;
            padding: 30px;
            border: 1px solid #e5e7eb;
            border-top: none;
          }
          .alert-box {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .details-box {
            background: #f9fafb;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
          }
          .earnings-box {
            background: #fee2e2;
            border: 2px solid #dc2626;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
          }
          .button {
            display: inline-block;
            background: #2d5016;
            color: white;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            color: #6b7280;
            font-size: 12px;
            padding: 20px;
            border-top: 1px solid #e5e7eb;
            margin-top: 30px;
          }
        `}</style>
      </head>
      <body>
        <div className="header">
          <h1>📅 Booking Cancelled</h1>
        </div>
        
        <div className="content">
          <p>Hi {hostName},</p>
          
          <p>We wanted to let you know that <strong>{guestName}</strong> has cancelled their booking at <strong>{propertyName}</strong>.</p>

          <div className="details-box">
            <h4 style={{ marginTop: 0 }}>Cancelled Booking Details:</h4>
            <p style={{ margin: '5px 0' }}><strong>Booking ID:</strong> #{bookingId.slice(0, 8).toUpperCase()}</p>
            <p style={{ margin: '5px 0' }}><strong>Guest:</strong> {guestName}</p>
            <p style={{ margin: '5px 0' }}><strong>Check-in:</strong> {checkIn}</p>
            <p style={{ margin: '5px 0' }}><strong>Check-out:</strong> {checkOut}</p>
          </div>

          {cancellationReason && (
            <div className="alert-box">
              <h4 style={{ marginTop: 0 }}>Cancellation Reason:</h4>
              <p style={{ margin: 0, fontStyle: 'italic' }}>"{cancellationReason}"</p>
            </div>
          )}

          <div className="earnings-box">
            <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#6b7280' }}>Lost Earnings:</p>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#dc2626' }}>{lostEarnings}</div>
            <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
              Your calendar has been automatically unblocked for these dates
            </p>
          </div>

          <h3>What Happens Now?</h3>
          <ul style={{ paddingLeft: '20px', color: '#4b5563' }}>
            <li>The dates are now available for new bookings</li>
            <li>The guest will receive a full refund per our cancellation policy</li>
            <li>You can adjust your availability or pricing if needed</li>
            <li>No action is required from you</li>
          </ul>

          <div style={{ textAlign: 'center' }}>
            <a href="https://bridlestay.com/host/availability" className="button">
              Manage Availability
            </a>
          </div>

          <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '20px' }}>
            <strong>Tip:</strong> To minimize cancellations, ensure your calendar is up-to-date and 
            communicate clearly with guests about your property and expectations.
          </p>

          <p>Questions? Contact us at 
            <a href="mailto:support@bridlestay.com" style={{ color: '#2d5016' }}> support@bridlestay.com</a>
          </p>

          <p style={{ marginTop: '30px' }}>
            Best regards,<br/>
            <strong>The BridleStay Team</strong>
          </p>
        </div>

        <div className="footer">
          <p>© {new Date().getFullYear()} BridleStay. All rights reserved.</p>
          <p>
            <a href="https://bridlestay.com/cancellation-policy" style={{ color: '#6b7280' }}>Cancellation Policy</a> | 
            <a href="https://bridlestay.com/help" style={{ color: '#6b7280' }}>Help</a>
          </p>
        </div>
      </body>
    </html>
  );
};

