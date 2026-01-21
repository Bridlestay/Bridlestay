import * as React from 'react';

interface ReviewReminderEmailProps {
  recipientName: string;
  recipientType: 'guest' | 'host';
  otherPartyName: string;
  propertyName: string;
  checkIn: string;
  checkOut: string;
  bookingId: string;
}

export const ReviewReminderEmail = ({
  recipientName,
  recipientType,
  otherPartyName,
  propertyName,
  checkIn,
  checkOut,
  bookingId,
}: ReviewReminderEmailProps) => {
  const isGuest = recipientType === 'guest';
  const reviewSubject = isGuest ? propertyName : otherPartyName;
  const reviewType = isGuest ? 'property' : 'guest';

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
          .stay-details {
            background: #f9fafb;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
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
          .star-rating {
            font-size: 32px;
            text-align: center;
            margin: 20px 0;
            color: #fbbf24;
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
          <h1>⭐ How Was Your {isGuest ? 'Stay' : 'Guest'}?</h1>
        </div>
        
        <div className="content">
          <p>Hi {recipientName},</p>
          
          <p>We hope you had a wonderful experience {isGuest ? `at ${propertyName}` : `hosting ${otherPartyName}`}!</p>

          <div className="stay-details">
            <h4 style={{ marginTop: 0 }}>Your Recent {isGuest ? 'Stay' : 'Booking'}:</h4>
            <p style={{ margin: '5px 0' }}><strong>{isGuest ? 'Property' : 'Guest'}:</strong> {reviewSubject}</p>
            <p style={{ margin: '5px 0' }}><strong>Check-in:</strong> {checkIn}</p>
            <p style={{ margin: '5px 0' }}><strong>Check-out:</strong> {checkOut}</p>
          </div>

          <div className="star-rating">
            ⭐⭐⭐⭐⭐
          </div>

          <p style={{ textAlign: 'center', fontSize: '18px', fontWeight: '600' }}>
            {isGuest 
              ? 'Share your experience and help future guests!' 
              : 'Help other hosts by reviewing your guest'}
          </p>

          <div style={{ textAlign: 'center' }}>
            <a href={`https://padoq.com/profile?review=${bookingId}`} className="button">
              Leave a Review
            </a>
          </div>

          <h3>Why Your Review Matters:</h3>
          <ul style={{ paddingLeft: '20px', color: '#4b5563' }}>
            {isGuest ? (
              <>
                <li>Help other equestrians find the perfect place</li>
                <li>Give valuable feedback to your host</li>
                <li>Build trust in the padoq community</li>
                <li>Your honest opinion makes a difference</li>
              </>
            ) : (
              <>
                <li>Help other hosts understand guest behavior</li>
                <li>Provide valuable feedback for the guest</li>
                <li>Build trust in the padoq community</li>
                <li>Recognition for being a great guest</li>
              </>
            )}
          </ul>

          <div className="info-box">
            <p style={{ margin: 0 }}>
              <strong>⏰ Reminder:</strong> You have 14 days to leave a review before the deadline expires.
            </p>
          </div>

          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            Reviews are public and help maintain quality across the padoq community. 
            Please be honest, constructive, and respectful in your feedback.
          </p>

          <p>Thank you for being part of padoq! 🐎</p>

          <p style={{ marginTop: '30px' }}>
            Best regards,<br/>
            <strong>The padoq Team</strong>
          </p>
        </div>

        <div className="footer">
          <p>© {new Date().getFullYear()} padoq. All rights reserved.</p>
          <p>
            <a href="https://padoq.com/help" style={{ color: '#6b7280' }}>Help Center</a> | 
            <a href="https://padoq.com/privacy" style={{ color: '#6b7280' }}>Privacy</a>
          </p>
        </div>
      </body>
    </html>
  );
};

