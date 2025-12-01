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
