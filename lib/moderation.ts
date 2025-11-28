// Content moderation utilities

export interface ModerationResult {
  flagged: boolean;
  blocked: boolean;
  reasons: Array<{
    type: 'inappropriate_language' | 'payment_attempt' | 'antisocial_behavior' | 'spam';
    severity: 'low' | 'medium' | 'high' | 'critical';
    matchedPatterns: string[];
  }>;
}

// Inappropriate language patterns
const INAPPROPRIATE_WORDS = [
  // Profanity
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'damn', 'crap',
  'piss', 'cock', 'dick', 'pussy', 'cunt', 'wanker', 'twat',
  // Slurs and discriminatory language
  'nigger', 'faggot', 'retard', 'spaz',
  // General insults
  'scam', 'fake', 'fraud', 'idiot', 'stupid', 'moron', 'dumb',
  'loser', 'pathetic', 'worthless', 'hate',
];

// Payment-related keywords (attempts to move off-platform)
const PAYMENT_KEYWORDS = [
  'paypal', 'venmo', 'cashapp', 'cash app', 'zelle', 'wire transfer',
  'bank transfer', 'western union', 'moneygram', 'bitcoin', 'crypto',
  'send money', 'pay outside', 'off platform', 'directly to me',
  'my account', 'bank account', 'routing number', 'sort code',
  'avoid fees', 'no fees', 'cheaper if', 'discount if you pay',
  'whatsapp', 'telegram', 'signal', 'contact me at',
  'email me', 'call me', 'text me', 'phone number'
];

// Antisocial behavior patterns
const ANTISOCIAL_PATTERNS = [
  'kill yourself', 'kys', 'die', 'threat', 'harass',
  'stalk', 'doxx', 'personal information', 'address is',
  'come find you', 'watch out'
];

// Spam patterns
const SPAM_PATTERNS = [
  'click here', 'buy now', 'limited offer', 'act fast',
  'free money', 'work from home', 'make money fast',
  'http://', 'https://', 'www.', '.com/', '.co.uk/',
  'bit.ly', 'tinyurl'
];

/**
 * Check message content for violations
 */
export function moderateMessage(message: string): ModerationResult {
  const lowerMessage = message.toLowerCase();
  const reasons: ModerationResult['reasons'] = [];
  
  // Check for inappropriate language
  const inappropriateMatches = INAPPROPRIATE_WORDS.filter(word => 
    lowerMessage.includes(word.toLowerCase())
  );
  if (inappropriateMatches.length > 0) {
    reasons.push({
      type: 'inappropriate_language',
      severity: inappropriateMatches.length > 3 ? 'high' : 'medium',
      matchedPatterns: inappropriateMatches
    });
  }

  // Check for payment attempts (HIGH PRIORITY - likely scam)
  const paymentMatches = PAYMENT_KEYWORDS.filter(keyword =>
    lowerMessage.includes(keyword.toLowerCase())
  );
  if (paymentMatches.length > 0) {
    reasons.push({
      type: 'payment_attempt',
      severity: 'critical', // Always critical - major policy violation
      matchedPatterns: paymentMatches
    });
  }

  // Check for antisocial behavior
  const antisocialMatches = ANTISOCIAL_PATTERNS.filter(pattern =>
    lowerMessage.includes(pattern.toLowerCase())
  );
  if (antisocialMatches.length > 0) {
    reasons.push({
      type: 'antisocial_behavior',
      severity: 'critical', // Threats are always critical
      matchedPatterns: antisocialMatches
    });
  }

  // Check for spam
  const spamMatches = SPAM_PATTERNS.filter(pattern =>
    lowerMessage.includes(pattern.toLowerCase())
  );
  if (spamMatches.length > 0) {
    reasons.push({
      type: 'spam',
      severity: spamMatches.length > 2 ? 'high' : 'low',
      matchedPatterns: spamMatches
    });
  }

  // Determine if message should be blocked
  const shouldBlock = reasons.some(r => 
    r.severity === 'critical' || 
    (r.type === 'payment_attempt' && r.severity === 'critical')
  );

  return {
    flagged: reasons.length > 0,
    blocked: shouldBlock,
    reasons
  };
}

/**
 * Get user-friendly message for blocked content
 */
export function getBlockedMessageText(reasons: ModerationResult['reasons']): string {
  const types = reasons.map(r => r.type);
  
  if (types.includes('payment_attempt')) {
    return '⚠️ This message was blocked because it appears to contain payment information. All payments must be made through BridleStay for your protection. Attempting to arrange off-platform payments violates our Terms of Service.';
  }
  
  if (types.includes('antisocial_behavior')) {
    return '⚠️ This message was blocked because it contains threatening or harassing language. This behavior violates our Community Guidelines.';
  }
  
  if (types.includes('inappropriate_language')) {
    return '⚠️ This message was blocked because it contains inappropriate language. Please communicate respectfully.';
  }
  
  return '⚠️ This message was blocked because it violates our Community Guidelines.';
}

/**
 * Get severity emoji
 */
export function getSeverityEmoji(severity: string): string {
  switch (severity) {
    case 'critical': return '🚨';
    case 'high': return '⚠️';
    case 'medium': return '⚡';
    case 'low': return 'ℹ️';
    default: return '❓';
  }
}

/**
 * Get reason label
 */
export function getReasonLabel(reason: string): string {
  switch (reason) {
    case 'inappropriate_language': return 'Inappropriate Language';
    case 'payment_attempt': return 'Off-Platform Payment Attempt';
    case 'antisocial_behavior': return 'Threatening/Harassment';
    case 'spam': return 'Spam/Advertising';
    default: return 'Other';
  }
}

