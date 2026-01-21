import * as React from 'react';

interface BookingRequestHostEmailProps {
  hostName: string;
  guestName: string;
  propertyName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  horses: number;
  nightsCount: number;
  totalAmount: string;
  bookingId: string;
  guestProfileUrl: string;
  message?: string;
}

export const BookingRequestHostEmail = ({
  hostName,
  guestName,
  propertyName,
  checkIn,
  checkOut,
  guests,
  horses,
  nightsCount,
  totalAmount,
  bookingId,
  guestProfileUrl,
  message,
}: BookingRequestHostEmailProps) => {
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
          .earnings-box {
            background: #f0fdf4;
            border: 2px solid #2d5016;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
          }
          .earnings-amount {
            font-size: 32px;
            font-weight: 700;
            color: #2d5016;
            margin: 10px 0;
          }
          .button {
            display: inline-block;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 10px 5px;
          }
          .button-primary {
            background: #2d5016;
            color: white;
          }
          .button-secondary {
            background: #dc2626;
            color: white;
          }
          .alert-box {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .message-box {
            background: #f3f4f6;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
            font-style: italic;
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
          <h1>📬 New Booking Request!</h1>
        </div>
        
        <div className="content">
          <p>Hi {hostName},</p>
          
          <p>You have a new booking request for <strong>{propertyName}</strong> from <strong>{guestName}</strong>.</p>

          <div className="alert-box">
            <p style={{ margin: 0, fontWeight: '600' }}>⏰ <strong>Action Required:</strong> Please respond within 24 hours to accept or decline this request.</p>
          </div>

          <div className="booking-details">
            <h3 style={{ marginTop: 0 }}>Request Details</h3>
            
            <div className="detail-row">
              <span className="detail-label">Booking ID:</span>
              <span className="detail-value">#{bookingId.slice(0, 8).toUpperCase()}</span>
            </div>
            
            <div className="detail-row">
              <span className="detail-label">Guest:</span>
              <span className="detail-value">{guestName}</span>
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
              <span className="detail-label">Duration:</span>
              <span className="detail-value">{nightsCount} {nightsCount === 1 ? 'night' : 'nights'}</span>
            </div>
            
            <div className="detail-row">
              <span className="detail-label">Guests:</span>
              <span className="detail-value">{guests}</span>
            </div>
            
            <div className="detail-row">
              <span className="detail-label">Horses:</span>
              <span className="detail-value">{horses}</span>
            </div>
          </div>

          {message && (
            <div>
              <h4>💬 Message from {guestName}:</h4>
              <div className="message-box">
                "{message}"
              </div>
            </div>
          )}

          <div className="earnings-box">
            <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#6b7280' }}>Your Estimated Earnings:</p>
            <div className="earnings-amount">{totalAmount}</div>
            <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: '#6b7280' }}>After 2.5% platform fee + VAT</p>
          </div>

          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <a href={`https://padoq.com/host/bookings`} className="button button-primary">
              ✅ Accept Booking
            </a>
            <a href={`https://padoq.com/host/bookings`} className="button button-secondary">
              ❌ Decline
            </a>
          </div>

          <div style={{ marginTop: '30px', padding: '15px', background: '#f9fafb', borderRadius: '6px' }}>
            <h4 style={{ marginTop: 0 }}>👤 About the Guest</h4>
            <p style={{ marginBottom: '10px' }}><a href={guestProfileUrl} style={{ color: '#2d5016', fontWeight: '600' }}>View {guestName}'s Profile</a></p>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Check their reviews, verification status, and horse information before accepting.</p>
          </div>

          <h3>What Happens Next?</h3>
          <ul style={{ paddingLeft: '20px', color: '#4b5563' }}>
            <li><strong>If you accept:</strong> Guest will be notified immediately and can prepare for their stay</li>
            <li><strong>Payment:</strong> Funds are held securely by Stripe until 24 hours after check-in</li>
            <li><strong>Communication:</strong> You can message the guest directly through padoq</li>
            <li><strong>If you decline:</strong> The guest will be refunded in full within 5-10 business days</li>
          </ul>

          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            <strong>Remember:</strong> Cancelling after acceptance may result in penalties and affect your listing ranking. 
            Only accept bookings you can honor.
          </p>

          <p>Questions? Contact us at <a href="mailto:support@padoq.com" style={{ color: '#2d5016' }}>support@padoq.com</a></p>

          <p style={{ marginTop: '30px' }}>
            Best regards,<br/>
            <strong>The padoq Team</strong>
          </p>
        </div>

        <div className="footer">
          <p>© {new Date().getFullYear()} padoq. All rights reserved.</p>
          <p>
            <a href="https://padoq.com/host-agreement" style={{ color: '#6b7280' }}>Host Agreement</a> | 
            <a href="https://padoq.com/help" style={{ color: '#6b7280' }}>Help</a>
          </p>
        </div>
      </body>
    </html>
  );
};

