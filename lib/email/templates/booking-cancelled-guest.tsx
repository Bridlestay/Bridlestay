import * as React from 'react';

interface BookingCancelledGuestEmailProps {
  guestName: string;
  propertyName: string;
  hostName: string;
  checkIn: string;
  checkOut: string;
  refundAmount: string;
  bookingId: string;
  cancellationReason?: string;
  cancelledBy: 'guest' | 'host';
}

export const BookingCancelledGuestEmail = ({
  guestName,
  propertyName,
  hostName,
  checkIn,
  checkOut,
  refundAmount,
  bookingId,
  cancellationReason,
  cancelledBy,
}: BookingCancelledGuestEmailProps) => {
  const isHostCancelled = cancelledBy === 'host';

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
            background: ${isHostCancelled ? '#dc2626' : '#f59e0b'};
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
            background: ${isHostCancelled ? '#fee2e2' : '#fef3c7'};
            border-left: 4px solid ${isHostCancelled ? '#dc2626' : '#f59e0b'};
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .refund-box {
            background: #f0fdf4;
            border: 2px solid #10b981;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
          }
          .refund-amount {
            font-size: 32px;
            font-weight: 700;
            color: #10b981;
            margin: 10px 0;
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
          .details-box {
            background: #f9fafb;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
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
          <h1>{isHostCancelled ? '❌' : '🔄'} Booking Cancelled</h1>
        </div>
        
        <div className="content">
          <p>Hi {guestName},</p>
          
          {isHostCancelled ? (
            <>
              <p>We're sorry to inform you that your booking at <strong>{propertyName}</strong> has been cancelled by the host.</p>
              
              <div className="alert-box">
                <p style={{ margin: 0, fontWeight: '600' }}>
                  We sincerely apologize for this inconvenience. This is not the experience we want for our guests.
                </p>
              </div>

              {cancellationReason && (
                <div className="details-box">
                  <h4 style={{ marginTop: 0 }}>Reason for Cancellation:</h4>
                  <p style={{ margin: 0, fontStyle: 'italic' }}>"{cancellationReason}"</p>
                </div>
              )}
            </>
          ) : (
            <>
              <p>Your cancellation for <strong>{propertyName}</strong> has been processed.</p>
            </>
          )}

          <div className="details-box">
            <h4 style={{ marginTop: 0 }}>Cancelled Booking Details:</h4>
            <p style={{ margin: '5px 0' }}><strong>Booking ID:</strong> #{bookingId.slice(0, 8).toUpperCase()}</p>
            <p style={{ margin: '5px 0' }}><strong>Property:</strong> {propertyName}</p>
            <p style={{ margin: '5px 0' }}><strong>Host:</strong> {hostName}</p>
            <p style={{ margin: '5px 0' }}><strong>Check-in:</strong> {checkIn}</p>
            <p style={{ margin: '5px 0' }}><strong>Check-out:</strong> {checkOut}</p>
          </div>

          <div className="refund-box">
            <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#6b7280' }}>Your Refund Amount:</p>
            <div className="refund-amount">{refundAmount}</div>
            <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
              Refund will be processed within 5-10 business days
            </p>
          </div>

          {isHostCancelled && (
            <>
              <h3>What Can You Do Now?</h3>
              <ul style={{ paddingLeft: '20px', color: '#4b5563' }}>
                <li>Search for alternative properties in the same area</li>
                <li>Contact our support team if you need assistance finding a new place</li>
                <li>Your refund will be processed automatically - no action needed</li>
              </ul>

              <div style={{ textAlign: 'center' }}>
                <a href="https://bridlestay.com/search" className="button">
                  Find Alternative Properties
                </a>
              </div>

              <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '20px' }}>
                <strong>Note:</strong> Host cancellations are taken very seriously at BridleStay. 
                Repeated cancellations may result in penalties or removal from our platform.
              </p>
            </>
          )}

          <p>If you have any questions about your refund or need assistance, please contact us at 
            <a href="mailto:support@bridlestay.com" style={{ color: '#2d5016' }}> support@bridlestay.com</a>
          </p>

          <p style={{ marginTop: '30px' }}>
            {isHostCancelled ? 'We apologize again for the inconvenience.' : 'We hope to see you again soon!'}<br/>
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

