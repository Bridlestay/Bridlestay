import * as React from 'react';

interface BookingConfirmationEmailProps {
  guestName: string;
  propertyName: string;
  hostName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  horses: number;
  totalAmount: string;
  bookingId: string;
  propertyAddress: string;
  hostEmail: string;
  hostPhone?: string;
}

export const BookingConfirmationEmail = ({
  guestName,
  propertyName,
  hostName,
  checkIn,
  checkOut,
  guests,
  horses,
  totalAmount,
  bookingId,
  propertyAddress,
  hostEmail,
  hostPhone,
}: BookingConfirmationEmailProps) => {
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
            background: linear-gradient(135deg, #2d5016 0%, #4a7c2a 100%);
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
          .booking-details {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .detail-row:last-child {
            border-bottom: none;
          }
          .detail-label {
            font-weight: 600;
            color: #6b7280;
          }
          .detail-value {
            color: #111827;
          }
          .total-row {
            background: #2d5016;
            color: white;
            padding: 15px 20px;
            border-radius: 6px;
            margin-top: 15px;
            font-size: 18px;
            font-weight: 700;
            display: flex;
            justify-content: space-between;
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
          .info-box {
            background: #f0fdf4;
            border-left: 4px solid #2d5016;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
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
          <h1>🐴 Booking Confirmed!</h1>
        </div>
        
        <div className="content">
          <p>Hi {guestName},</p>
          
          <p>Great news! Your booking at <strong>{propertyName}</strong> has been confirmed and payment has been processed successfully.</p>

          <div className="booking-details">
            <h3 style={{ marginTop: 0 }}>Booking Details</h3>
            
            <div className="detail-row">
              <span className="detail-label">Booking ID:</span>
              <span className="detail-value">#{bookingId.slice(0, 8).toUpperCase()}</span>
            </div>
            
            <div className="detail-row">
              <span className="detail-label">Property:</span>
              <span className="detail-value">{propertyName}</span>
            </div>
            
            <div className="detail-row">
              <span className="detail-label">Check-in:</span>
              <span className="detail-value">{checkIn}</span>
            </div>
            
            <div className="detail-row">
              <span className="detail-label">Check-out:</span>
              <span className="detail-value">{checkOut}</span>
            </div>
            
            <div className="detail-row">
              <span className="detail-label">Guests:</span>
              <span className="detail-value">{guests}</span>
            </div>
            
            <div className="detail-row">
              <span className="detail-label">Horses:</span>
              <span className="detail-value">{horses}</span>
            </div>
            
            <div className="total-row">
              <span>Total Paid:</span>
              <span>{totalAmount}</span>
            </div>
          </div>

          <div className="info-box">
            <h4 style={{ marginTop: 0 }}>📍 Property Location</h4>
            <p style={{ margin: '5px 0' }}><strong>{propertyAddress}</strong></p>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '5px 0' }}>Full address and check-in instructions will be shared 48 hours before your arrival.</p>
          </div>

          <div className="info-box">
            <h4 style={{ marginTop: 0 }}>👤 Your Host</h4>
            <p style={{ margin: '5px 0' }}><strong>{hostName}</strong></p>
            <p style={{ fontSize: '14px', margin: '5px 0' }}>Email: {hostEmail}</p>
            {hostPhone && <p style={{ fontSize: '14px', margin: '5px 0' }}>Phone: {hostPhone}</p>}
          </div>

          <div style={{ textAlign: 'center' }}>
            <a href={`https://cantra.app/dashboard`} className="button">
              View Booking Details
            </a>
          </div>

          <h3>What Happens Next?</h3>
          <ol style={{ paddingLeft: '20px' }}>
            <li><strong>48 hours before check-in:</strong> You'll receive full address and check-in instructions</li>
            <li><strong>During your stay:</strong> Contact your host directly if you need anything</li>
            <li><strong>After check-out:</strong> Leave a review to help future guests</li>
          </ol>

          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            <strong>Important:</strong> Your payment has been secured by Stripe and will be released to the host 24 hours after check-in. 
            Please review our <a href="https://cantra.app/cancellation-policy" style={{ color: '#2d5016' }}>Cancellation Policy</a> if your plans change.
          </p>

          <p>Have questions? Reply to this email or contact us at <a href="mailto:support@cantra.app" style={{ color: '#2d5016' }}>support@cantra.app</a></p>

          <p style={{ marginTop: '30px' }}>
            Happy trails! 🐎<br/>
            <strong>The Cantra Team</strong>
          </p>
        </div>

        <div className="footer">
          <p>© {new Date().getFullYear()} Cantra. All rights reserved.</p>
          <p>
            <a href="https://cantra.app/terms" style={{ color: '#6b7280' }}>Terms</a> | 
            <a href="https://cantra.app/privacy" style={{ color: '#6b7280' }}>Privacy</a> | 
            <a href="https://cantra.app/help" style={{ color: '#6b7280' }}>Help</a>
          </p>
        </div>
      </body>
    </html>
  );
};

