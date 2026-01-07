/**
 * Content Moderation System
 * Enhanced version with leetspeak detection, username validation, and comprehensive pattern matching
 */

// Re-export everything from the enhanced moderation system
export {
  moderateMessage,
  moderateContent,
  validateUsername,
  getBlockedMessageText,
  type ModerationResult
} from './moderation-enhanced';

/**
 * Get severity emoji
 */
export function getSeverityEmoji(severity: string): string {
  switch (severity) {
    case 'critical':
      return '🚨';
    case 'high':
      return '⚠️';
    case 'medium':
      return '⚡';
    case 'low':
      return 'ℹ️';
    default:
      return '•';
  }
}

/**
 * Get human-readable label for flag reason
 */
export function getReasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    // Content violations
    'profanity': 'Profanity',
    'harassment': 'Harassment',
    'hate_speech': 'Hate Speech',
    'threats': 'Threats/Violence',
    'sexual_content': 'Sexual Content',
    'spam': 'Spam',
    'scam': 'Scam/Fraud',
    // Platform policy violations
    'off_platform_payment': 'Off-Platform Payment',
    'contact_info': 'Contact Information Sharing',
    'phone_number': 'Phone Number Sharing',
    'email_address': 'Email Address Sharing',
    'social_media': 'Social Media Sharing',
    // Safety concerns
    'personal_info': 'Personal Information',
    'doxxing': 'Doxxing',
    'impersonation': 'Impersonation',
    // Other
    'inappropriate': 'Inappropriate Content',
    'misinformation': 'Misinformation',
    'other': 'Other Violation',
    'manual_review': 'Flagged for Manual Review',
  };
  
  return labels[reason] || reason.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}