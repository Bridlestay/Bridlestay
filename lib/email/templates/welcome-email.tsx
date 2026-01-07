import * as React from 'react';

interface WelcomeEmailProps {
  userName: string;
  userEmail: string;
}

export const WelcomeEmail = ({ userName, userEmail }: WelcomeEmailProps) => {
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
            padding: 40px 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .header h1 {
            margin: 0 0 10px 0;
            font-size: 32px;
            font-weight: 600;
          }
          .horse-emoji {
            font-size: 48px;
            margin-bottom: 15px;
          }
          .content {
            background: #ffffff;
            padding: 30px;
            border: 1px solid #e5e7eb;
            border-top: none;
          }
          .feature-box {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #2d5016;
          }
          .feature-box h3 {
            margin-top: 0;
            color: #2d5016;
          }
          .cta-box {
            background: #f0fdf4;
            padding: 25px;
            border-radius: 8px;
            text-align: center;
            margin: 25px 0;
          }
          .button {
            display: inline-block;
            background: #2d5016;
            color: white;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 10px 5px;
          }
          .steps-list {
            counter-reset: step-counter;
            list-style: none;
            padding-left: 0;
          }
          .steps-list li {
            counter-increment: step-counter;
            margin-bottom: 20px;
            padding-left: 50px;
            position: relative;
          }
          .steps-list li::before {
            content: counter(step-counter);
            position: absolute;
            left: 0;
            top: 0;
            background: #2d5016;
            color: white;
            width: 35px;
            height: 35px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
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
          <div className="horse-emoji">🐴</div>
          <h1>Welcome to Cantra!</h1>
          <p style={{ margin: '5px 0 0 0', fontSize: '16px' }}>The home of equestrian travel</p>
        </div>
        
        <div className="content">
          <p style={{ fontSize: '18px' }}>Hi {userName},</p>
          
          <p style={{ fontSize: '16px' }}>
            We&apos;re thrilled to have you join the Cantra community! 🎉
          </p>

          <p>
            Whether you&apos;re searching for the perfect equestrian-friendly accommodation or sharing your own property 
            with fellow horse lovers, you&apos;re in the right place.
          </p>

          <div className="cta-box">
            <h3 style={{ margin: '0 0 15px 0', color: '#2d5016' }}>Ready to Get Started?</h3>
            <a href="https://cantra.app/profile" className="button">
              Complete Your Profile
            </a>
            <a href="https://cantra.app/search" className="button" style={{ background: '#4a7c2a' }}>
              Search Properties
            </a>
          </div>

          <h2 style={{ color: '#2d5016', marginTop: '35px' }}>🚀 Quick Start Guide</h2>
          
          <ol className="steps-list">
            <li>
              <strong>Add Your Horses</strong><br/>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>
                Create profiles for your horses with photos, breed info, and any special requirements.
              </span>
            </li>
            <li>
              <strong>Complete Your Profile</strong><br/>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>
                Add a photo, tell us about yourself, and share your riding experience.
              </span>
            </li>
            <li>
              <strong>Explore Properties</strong><br/>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>
                Search for accommodations with stables, paddocks, and bridleway access.
              </span>
            </li>
          </ol>

          <div className="feature-box">
            <h3>🏡 Want to List Your Property?</h3>
            <p style={{ margin: '5px 0' }}>
              Turn your equestrian facilities into income! List your property, barns, or stable blocks 
              and connect with travelers who share your passion for horses.
            </p>
            <a href="https://cantra.app/host/property/new" style={{ color: '#2d5016', fontWeight: '600' }}>
              List Your Property →
            </a>
          </div>

          <h3>What Makes Cantra Special?</h3>
          <ul style={{ paddingLeft: '20px', color: '#4b5563' }}>
            <li>
              <strong>Horse-First Design:</strong> Every property includes detailed equine facilities information
            </li>
            <li>
              <strong>Community Reviews:</strong> Honest feedback from fellow equestrians you can trust
            </li>
            <li>
              <strong>Secure Payments:</strong> Protected transactions with transparent pricing
            </li>
            <li>
              <strong>Local Routes:</strong> Discover nearby bridleways and trails
            </li>
          </ul>

          <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '8px', marginTop: '25px' }}>
            <h4 style={{ marginTop: 0, color: '#2d5016' }}>💡 Pro Tip</h4>
            <p style={{ margin: 0 }}>
              Adding detailed horse profiles now will make booking faster later! Include photos, 
              breed information, and any special needs to help hosts prepare for your visit.
            </p>
          </div>

          <h3 style={{ marginTop: '35px' }}>Need Help Getting Started?</h3>
          <p>Our team is here to help:</p>
          <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
            <li>📧 Email: <a href="mailto:support@cantra.app" style={{ color: '#2d5016' }}>support@cantra.app</a></li>
            <li>📖 <a href="https://cantra.app/help" style={{ color: '#2d5016' }}>Help Center & FAQs</a></li>
            <li>🤝 <a href="https://cantra.app/how-it-works/guests" style={{ color: '#2d5016' }}>How It Works (Guests)</a></li>
            <li>🏠 <a href="https://cantra.app/how-it-works/hosts" style={{ color: '#2d5016' }}>How It Works (Hosts)</a></li>
          </ul>

          <p style={{ marginTop: '35px', fontSize: '16px' }}>
            Thank you for choosing Cantra. We can&apos;t wait to see where your equestrian adventures take you!
          </p>

          <p style={{ fontSize: '16px' }}>
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
          <p style={{ marginTop: '15px' }}>
            You&apos;re receiving this email because you created an account at Cantra.
          </p>
        </div>
      </body>
    </html>
  );
};

