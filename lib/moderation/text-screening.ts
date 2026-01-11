/**
 * Text Screening Utility for Auto-Moderation
 * 
 * Hybrid detection approach:
 * 1. Rule-based pattern matching (fast, cheap)
 * 2. NLP intent analysis (when needed)
 * 3. Context & trust weighting
 */

// Pattern categories and their risk contributions
const PATTERN_CATEGORIES = {
  off_platform_payment: { baseRisk: 40, autoAction: 'block' as const },
  contact_info: { baseRisk: 30, autoAction: 'flag' as const },
  profanity: { baseRisk: 20, autoAction: 'flag' as const },
  spam: { baseRisk: 25, autoAction: 'flag' as const },
  harassment: { baseRisk: 50, autoAction: 'block' as const },
  hate_speech: { baseRisk: 80, autoAction: 'block' as const },
  unsafe: { baseRisk: 60, autoAction: 'block' as const },
};

// Built-in patterns (supplemented by database patterns)
const BUILT_IN_PATTERNS: Pattern[] = [
  // Off-platform payment attempts
  { pattern: /whatsapp/i, category: 'off_platform_payment', severity: 'high', riskContribution: 40 },
  { pattern: /telegram/i, category: 'off_platform_payment', severity: 'high', riskContribution: 40 },
  { pattern: /paypal/i, category: 'off_platform_payment', severity: 'high', riskContribution: 50 },
  { pattern: /venmo/i, category: 'off_platform_payment', severity: 'high', riskContribution: 50 },
  { pattern: /cash\s*(on\s*)?arrival/i, category: 'off_platform_payment', severity: 'high', riskContribution: 60 },
  { pattern: /pay\s*(me\s*)?(in\s*)?cash/i, category: 'off_platform_payment', severity: 'high', riskContribution: 60 },
  { pattern: /bank\s*transfer/i, category: 'off_platform_payment', severity: 'medium', riskContribution: 35 },
  { pattern: /pay\s*(me\s*)?direct(ly)?/i, category: 'off_platform_payment', severity: 'high', riskContribution: 50 },
  { pattern: /off\s*(the\s*)?platform/i, category: 'off_platform_payment', severity: 'high', riskContribution: 60 },
  { pattern: /outside\s*(the\s*)?app/i, category: 'off_platform_payment', severity: 'high', riskContribution: 50 },
  { pattern: /bypass\s*(the\s*)?fee/i, category: 'off_platform_payment', severity: 'high', riskContribution: 70 },
  { pattern: /avoid\s*(the\s*)?fee/i, category: 'off_platform_payment', severity: 'high', riskContribution: 70 },
  
  // Contact info patterns
  { pattern: /dm\s*me/i, category: 'contact_info', severity: 'medium', riskContribution: 30 },
  { pattern: /text\s*me/i, category: 'contact_info', severity: 'medium', riskContribution: 30 },
  { pattern: /call\s*me\s*(at|on)?/i, category: 'contact_info', severity: 'medium', riskContribution: 35 },
  { pattern: /my\s*number\s*is/i, category: 'contact_info', severity: 'medium', riskContribution: 40 },
  { pattern: /email\s*me\s*(at)?/i, category: 'contact_info', severity: 'medium', riskContribution: 30 },
  { pattern: /contact\s*me\s*(at|on)?/i, category: 'contact_info', severity: 'low', riskContribution: 20 },
  
  // Phone number patterns (various formats)
  { pattern: /\+?\d{1,3}[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g, category: 'contact_info', severity: 'medium', riskContribution: 35 },
  { pattern: /\b0\d{10}\b/g, category: 'contact_info', severity: 'medium', riskContribution: 35 }, // UK mobile
  
  // Email patterns
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, category: 'contact_info', severity: 'medium', riskContribution: 30 },
  
  // URL patterns
  { pattern: /https?:\/\/[^\s]+/gi, category: 'spam', severity: 'low', riskContribution: 15 },
  { pattern: /www\.[^\s]+/gi, category: 'spam', severity: 'low', riskContribution: 15 },
];

interface Pattern {
  pattern: RegExp;
  category: keyof typeof PATTERN_CATEGORIES;
  severity: 'low' | 'medium' | 'high' | 'critical';
  riskContribution: number;
}

interface ScreeningResult {
  isClean: boolean;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  matchedPatterns: MatchedPattern[];
  suggestedAction: 'approve' | 'flag' | 'block' | 'review';
  blockedReason?: string;
  categories: string[];
}

interface MatchedPattern {
  category: string;
  pattern: string;
  match: string;
  severity: string;
  riskContribution: number;
}

/**
 * Screen text content for problematic patterns
 */
export function screenText(text: string, context?: {
  contentType?: string;
  userTrustScore?: number;
  isFirstMessage?: boolean;
}): ScreeningResult {
  if (!text || typeof text !== 'string') {
    return {
      isClean: true,
      riskScore: 0,
      riskLevel: 'low',
      matchedPatterns: [],
      suggestedAction: 'approve',
      categories: [],
    };
  }

  const normalizedText = text.toLowerCase().trim();
  const matchedPatterns: MatchedPattern[] = [];
  let totalRiskScore = 0;
  const categories = new Set<string>();

  // Check against all patterns
  for (const patternDef of BUILT_IN_PATTERNS) {
    const matches = normalizedText.match(patternDef.pattern);
    
    if (matches) {
      for (const match of matches) {
        matchedPatterns.push({
          category: patternDef.category,
          pattern: patternDef.pattern.source,
          match: match.substring(0, 50), // Limit match length
          severity: patternDef.severity,
          riskContribution: patternDef.riskContribution,
        });
        
        totalRiskScore += patternDef.riskContribution;
        categories.add(patternDef.category);
      }
    }
  }

  // Apply trust score modifier (trusted users get benefit of doubt)
  if (context?.userTrustScore !== undefined) {
    const trustModifier = (context.userTrustScore - 50) / 100; // -0.5 to +0.5
    totalRiskScore = Math.round(totalRiskScore * (1 - trustModifier * 0.3));
  }

  // First message from new users is more suspicious
  if (context?.isFirstMessage && totalRiskScore > 0) {
    totalRiskScore = Math.round(totalRiskScore * 1.2);
  }

  // Cap at 100
  totalRiskScore = Math.min(100, totalRiskScore);

  // Determine risk level
  let riskLevel: ScreeningResult['riskLevel'] = 'low';
  if (totalRiskScore >= 70) riskLevel = 'critical';
  else if (totalRiskScore >= 50) riskLevel = 'high';
  else if (totalRiskScore >= 25) riskLevel = 'medium';

  // Determine suggested action
  let suggestedAction: ScreeningResult['suggestedAction'] = 'approve';
  let blockedReason: string | undefined;

  if (totalRiskScore >= 70) {
    suggestedAction = 'block';
    blockedReason = getBlockedReason(Array.from(categories));
  } else if (totalRiskScore >= 40) {
    suggestedAction = 'review';
  } else if (totalRiskScore > 0) {
    suggestedAction = 'flag';
  }

  return {
    isClean: matchedPatterns.length === 0,
    riskScore: totalRiskScore,
    riskLevel,
    matchedPatterns,
    suggestedAction,
    blockedReason,
    categories: Array.from(categories),
  };
}

/**
 * Get user-friendly blocked reason message
 */
function getBlockedReason(categories: string[]): string {
  if (categories.includes('off_platform_payment')) {
    return 'For your protection, please keep all payments on the platform. This ensures you\'re covered by our refund and support policies.';
  }
  if (categories.includes('hate_speech')) {
    return 'This message contains content that violates our community guidelines.';
  }
  if (categories.includes('harassment')) {
    return 'This message contains content that may be considered harassment.';
  }
  if (categories.includes('unsafe')) {
    return 'This message contains potentially unsafe content.';
  }
  return 'This message was blocked for safety reasons. Please review our community guidelines.';
}

/**
 * Quick check for off-platform payment attempts
 */
export function hasOffPlatformPaymentIntent(text: string): boolean {
  const result = screenText(text);
  return result.categories.includes('off_platform_payment');
}

/**
 * Check if text contains contact information
 */
export function hasContactInfo(text: string): boolean {
  const result = screenText(text);
  return result.categories.includes('contact_info');
}

/**
 * Get a safe preview of text (redacting detected patterns)
 */
export function getSafePreview(text: string, maxLength: number = 200): string {
  let safeText = text;
  
  // Redact phone numbers
  safeText = safeText.replace(/\+?\d{1,3}[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g, '[PHONE]');
  safeText = safeText.replace(/\b0\d{10}\b/g, '[PHONE]');
  
  // Redact emails
  safeText = safeText.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
  
  // Truncate
  if (safeText.length > maxLength) {
    safeText = safeText.substring(0, maxLength) + '...';
  }
  
  return safeText;
}

/**
 * Screen content for messaging context
 */
export function screenMessage(
  message: string,
  context: {
    userTrustScore: number;
    isFirstMessage: boolean;
    recipientType: 'host' | 'guest';
  }
): {
  allowed: boolean;
  result: ScreeningResult;
  showBanner: boolean;
  bannerType?: 'warning' | 'blocked';
} {
  const result = screenText(message, {
    contentType: 'message',
    userTrustScore: context.userTrustScore,
    isFirstMessage: context.isFirstMessage,
  });

  // Determine if message should be blocked
  const blocked = result.suggestedAction === 'block';
  
  // Show banner for first-time or when patterns detected
  const showBanner = context.isFirstMessage || 
    (result.categories.includes('off_platform_payment') || result.categories.includes('contact_info'));

  return {
    allowed: !blocked,
    result,
    showBanner,
    bannerType: blocked ? 'blocked' : (showBanner && !result.isClean ? 'warning' : undefined),
  };
}

export type { ScreeningResult, MatchedPattern };

