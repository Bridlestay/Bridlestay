/**
 * Comment moderation for routes
 * Uses the same patterns as message moderation
 */

export interface ModerationResult {
  flagged: boolean;
  blocked: boolean;
  severity: "low" | "medium" | "high" | "critical";
  reason: string;
}

/**
 * Moderate route comment text
 * @param text Comment text to moderate
 * @returns Moderation result
 */
export function moderateComment(text: string): ModerationResult {
  const lowerText = text.toLowerCase();
  
  // Critical violations (block immediately)
  const criticalPatterns = [
    /\bf+u+c+k+/i,
    /\bs+h+i+t+/i,
    /\bc+u+n+t+/i,
    /\bb+i+t+c+h+/i,
    /\ba+s+s+h+o+l+e+/i,
    /\bd+i+c+k+h+e+a+d+/i,
    /kill (yourself|myself)/i,
    /want to die/i,
  ];
  
  for (const pattern of criticalPatterns) {
    if (pattern.test(lowerText)) {
      return {
        flagged: true,
        blocked: true,
        severity: "critical",
        reason: "Inappropriate language",
      };
    }
  }
  
  // Payment bypass attempts (block)
  const paymentPatterns = [
    /pay (me )?direct/i,
    /cash payment/i,
    /avoid (the )?fee/i,
    /off platform/i,
    /whatsapp|telegram|signal/i,
    /my (phone|mobile|number)/i,
    /\d{4,}[- ]?\d{4,}/,  // Phone number pattern
  ];
  
  for (const pattern of paymentPatterns) {
    if (pattern.test(lowerText)) {
      return {
        flagged: true,
        blocked: true,
        severity: "critical",
        reason: "Attempted third-party payment arrangement",
      };
    }
  }
  
  // High severity (flag for review)
  const highSeverityPatterns = [
    /dangerous/i,
    /unsafe/i,
    /hazard/i,
    /broken bridge/i,
    /deep water/i,
  ];
  
  for (const pattern of highSeverityPatterns) {
    if (pattern.test(lowerText)) {
      return {
        flagged: true,
        blocked: false,
        severity: "high",
        reason: "Safety concern reported",
      };
    }
  }
  
  // Medium severity (flag for review)
  const mediumSeverityPatterns = [
    /spam/i,
    /advertisement/i,
    /buy now/i,
    /click here/i,
  ];
  
  for (const pattern of mediumSeverityPatterns) {
    if (pattern.test(lowerText)) {
      return {
        flagged: true,
        blocked: false,
        severity: "medium",
        reason: "Possible spam",
      };
    }
  }
  
  // All clear
  return {
    flagged: false,
    blocked: false,
    severity: "low",
    reason: "",
  };
}



