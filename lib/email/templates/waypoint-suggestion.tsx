import * as React from 'react';

interface WaypointSuggestionEmailProps {
  routeOwnerName: string;
  routeTitle: string;
  waypointName: string;
  suggesterName: string;
  waypointTag: string;
  waypointDescription?: string;
  routeUrl: string;
}

export const WaypointSuggestionEmail = ({
  routeOwnerName,
  routeTitle,
  waypointName,
  suggesterName,
  waypointTag,
  waypointDescription,
  routeUrl,
}: WaypointSuggestionEmailProps) => {
  const tagLabels: Record<string, string> = {
    poi: 'Point of Interest',
    instruction: 'Instruction',
    caution: 'Caution',
    note: 'Note',
  };

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
            background-color: #f9fafb;
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
            font-size: 26px;
            font-weight: 600;
          }
          .content {
            background: #ffffff;
            padding: 30px;
            border: 1px solid #e5e7eb;
            border-top: none;
            border-radius: 0 0 8px 8px;
          }
          .greeting {
            font-size: 16px;
            margin-bottom: 20px;
          }
          .suggestion-box {
            background: #f3f4f6;
            border-left: 4px solid #16a34a;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
          }
          .waypoint-name {
            font-size: 18px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 8px;
          }
          .waypoint-tag {
            display: inline-block;
            background: #16a34a;
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
            margin-bottom: 12px;
          }
          .waypoint-description {
            color: #4b5563;
            font-size: 14px;
            line-height: 1.6;
          }
          .suggester-info {
            font-size: 14px;
            color: #6b7280;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid #e5e7eb;
          }
          .route-info {
            background: #f9fafb;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
            font-size: 14px;
          }
          .route-title {
            font-weight: 600;
            color: #111827;
            margin-bottom: 4px;
          }
          .cta-button {
            display: inline-block;
            background: #16a34a;
            color: white;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 13px;
            color: #6b7280;
          }
          .tip {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 12px 16px;
            border-radius: 6px;
            margin-top: 20px;
            font-size: 14px;
            color: #92400e;
          }
        `}</style>
      </head>
      <body>
        <div className="header">
          <h1>🗺️ New Waypoint Suggestion</h1>
        </div>
        <div className="content">
          <div className="greeting">
            Hi {routeOwnerName},
          </div>

          <p>
            <strong>{suggesterName}</strong> has suggested a new waypoint for your route <strong>{routeTitle}</strong>.
          </p>

          <div className="suggestion-box">
            <div className="waypoint-name">{waypointName}</div>
            <span className="waypoint-tag">{tagLabels[waypointTag] || waypointTag}</span>
            {waypointDescription && (
              <div className="waypoint-description">{waypointDescription}</div>
            )}
            <div className="suggester-info">
              Suggested by {suggesterName}
            </div>
          </div>

          <p>
            You can review this suggestion and choose to approve it (add to your route) or decline it.
          </p>

          <div style={{ textAlign: 'center' }}>
            <a href={routeUrl} className="cta-button">
              Review Suggestion
            </a>
          </div>

          <div className="tip">
            <strong>💡 Tip:</strong> Community waypoint suggestions help make your route more useful for other riders. When you approve a suggestion, it becomes a permanent waypoint on your route.
          </div>
        </div>

        <div className="footer">
          <p>
            This is an automated notification from Padoq.<br />
            You can manage your notification preferences in your account settings.
          </p>
        </div>
      </body>
    </html>
  );
};

export default WaypointSuggestionEmail;
