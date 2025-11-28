import * as React from 'react';

interface NewMessageEmailProps {
  recipientName: string;
  senderName: string;
  propertyName?: string;
  messagePreview: string;
  messageId: string;
}

export const NewMessageEmail = ({
  recipientName,
  senderName,
  propertyName,
  messagePreview,
  messageId,
}: NewMessageEmailProps) => {
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
          .message-preview {
            background: #f9fafb;
            border-left: 4px solid #2d5016;
            padding: 20px;
            margin: 20px 0;
            border-radius: 6px;
            font-style: italic;
            color: #4b5563;
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
            padding: 15px;
            border-radius: 6px;
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
          <h1>💬 New Message from {senderName}</h1>
        </div>
        
        <div className="content">
          <p>Hi {recipientName},</p>
          
          <p>You have a new message from <strong>{senderName}</strong>{propertyName && ` about ${propertyName}`}.</p>

          <div className="message-preview">
            "{messagePreview.length > 200 ? messagePreview.substring(0, 200) + '...' : messagePreview}"
          </div>

          <div style={{ textAlign: 'center' }}>
            <a href={`https://bridlestay.com/messages?conversation=${messageId}`} className="button">
              View & Reply
            </a>
          </div>

          <div className="info-box">
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
              <strong>💡 Tip:</strong> Quick responses help build trust in the BridleStay community. 
              Try to reply within 24 hours when possible.
            </p>
          </div>

          <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '25px' }}>
            <strong>Note:</strong> All messages are monitored for safety and policy compliance. 
            Please keep all booking arrangements within the BridleStay platform.
          </p>

          <p style={{ marginTop: '30px' }}>
            Best regards,<br/>
            <strong>The BridleStay Team</strong>
          </p>
        </div>

        <div className="footer">
          <p>© {new Date().getFullYear()} BridleStay. All rights reserved.</p>
          <p>
            <a href="https://bridlestay.com/account" style={{ color: '#6b7280' }}>Notification Settings</a> | 
            <a href="https://bridlestay.com/help" style={{ color: '#6b7280' }}>Help</a>
          </p>
          <p style={{ marginTop: '15px' }}>
            You're receiving this because someone sent you a message on BridleStay.<br/>
            You can manage your email preferences in your account settings.
          </p>
        </div>
      </body>
    </html>
  );
};

