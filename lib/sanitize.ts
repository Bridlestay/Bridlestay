/**
 * Input Sanitization Utilities
 * Prevents XSS attacks and cleans user input
 */

/**
 * Remove HTML tags from a string
 * Use for plain text fields like names, titles, etc.
 */
export function stripHtml(input: string): string {
  if (!input) return '';
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Escape HTML special characters
 * Converts < > & " ' to HTML entities
 */
export function escapeHtml(input: string): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitize text input for database storage
 * Removes dangerous characters while preserving readability
 */
export function sanitizeText(input: string, maxLength?: number): string {
  if (!input) return '';
  
  let sanitized = input
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters (except newlines and tabs)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
  
  // Enforce max length if specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Sanitize multi-line text (descriptions, reviews, messages)
 * Preserves line breaks but removes dangerous content
 */
export function sanitizeMultilineText(input: string, maxLength?: number): string {
  if (!input) return '';
  
  let sanitized = input
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters (except newlines, carriage returns, tabs)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove excessive newlines (max 2 in a row)
    .replace(/\n{3,}/g, '\n\n')
    // Strip HTML tags
    .replace(/<[^>]*>/g, '')
    .trim();
  
  // Enforce max length if specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Sanitize URL
 * Only allows http, https, mailto protocols
 */
export function sanitizeUrl(input: string): string {
  if (!input) return '';
  
  const trimmed = input.trim().toLowerCase();
  
  // Only allow safe protocols
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:')
  ) {
    return input.trim();
  }
  
  // If no protocol, assume https
  if (!trimmed.includes('://')) {
    return `https://${input.trim()}`;
  }
  
  // Reject dangerous protocols (javascript:, data:, etc.)
  return '';
}

/**
 * Sanitize username/display name
 */
export function sanitizeName(input: string, maxLength = 100): string {
  if (!input) return '';
  
  return stripHtml(input)
    .replace(/[^\p{L}\p{N}\s\-'\.]/gu, '') // Allow letters, numbers, spaces, hyphens, apostrophes, dots
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, maxLength);
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(input: string): string {
  if (!input) return '';
  
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9@.\-_+]/g, '');
}

/**
 * Check if string contains potential script injection
 */
export function containsScriptInjection(input: string): boolean {
  if (!input) return false;
  
  const dangerous = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick=, onload=, etc.
    /data:/i,
    /vbscript:/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<svg.*onload/i,
  ];
  
  return dangerous.some((pattern) => pattern.test(input));
}

/**
 * Sanitize property/route title
 */
export function sanitizeTitle(input: string, maxLength = 200): string {
  return sanitizeText(stripHtml(input), maxLength);
}

/**
 * Sanitize property/route description
 */
export function sanitizeDescription(input: string, maxLength = 5000): string {
  return sanitizeMultilineText(input, maxLength);
}

/**
 * Sanitize review content
 */
export function sanitizeReview(input: string, maxLength = 2000): string {
  return sanitizeMultilineText(input, maxLength);
}

/**
 * Sanitize message content
 */
export function sanitizeMessage(input: string, maxLength = 5000): string {
  return sanitizeMultilineText(input, maxLength);
}

