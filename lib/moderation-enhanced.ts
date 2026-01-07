/**
 * Enhanced Content Moderation System
 * Detects inappropriate content, leetspeak, payment attempts, and more
 */

export interface ModerationResult {
  flagged: boolean;
  blocked: boolean;
  reasons: Array<{
    type: 'inappropriate_language' | 'payment_attempt' | 'antisocial_behavior' | 'spam' | 'contact_info' | 'sexual_content';
    severity: 'low' | 'medium' | 'high' | 'critical';
    matchedPatterns: string[];
    confidence: number; // 0-100
  }>;
}

/**
 * Normalize text to detect leetspeak and obfuscation
 * Converts: k*nt → kunt, f_ck → fuck, sh1t → shit, @ss → ass
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    // Remove common obfuscation characters
    .replace(/[*_\-\.\s]+/g, '')
    // Leetspeak number replacements
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    // Symbol replacements
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/!/g, 'i')
    .replace(/\+/g, 't')
    // Remove repeated characters (fuuuuck → fuck)
    .replace(/(.)\1{2,}/g, '$1');
}

/**
 * Enhanced profanity patterns with leetspeak detection
 */
const PROFANITY_PATTERNS = [
  // F-word variations
  /\bf+[\W_]*u+[\W_]*c+[\W_]*k+/gi,
  /\bf+[\W_]*u+[\W_]*[ck]+[\W_]*[ie]+n+g*/gi, // fucking
  /\bf+[\W_]*[u4]+[\W_]*[ck]+[\W_]*[e3]+r*/gi, // fucker
  
  // S-word variations  
  /\bs+[\W_]*h+[\W_]*[i1!]+[\W_]*[t+7]+/gi,
  /\bs+[\W_]*h+[\W_]*[i1]+[\W_]*[t+7]+[\W_]*e*/gi, // shite
  
  // C-word variations (most severe)
  /\bc+[\W_]*[u0]+[\W_]*n+[\W_]*[t+7]+/gi,
  /\bc+[\W_]*[o0]+[\W_]*n+[\W_]*[t+7]+/gi, // cont
  /\bk+[\W_]*[u0]+[\W_]*n+[\W_]*[t+7]+/gi, // kunt
  
  // B-word variations
  /\bb+[\W_]*[i1!]+[\W_]*[t+7]+[\W_]*c+[\W_]*h+/gi,
  /\bb+[\W_]*[i1]+[\W_]*[o0]+[\W_]*[t+7]+[\W_]*c+[\W_]*h+/gi, // biotch
  
  // A-word variations
  /\b[@a4]+[\W_]*s+[\W_]*s+[\W_]*h+[\W_]*[o0]+[\W_]*l+[\W_]*e+/gi,
  /\b[@a4]+[\W_]*s+[\W_]*s+[\W_]*w+[\W_]*[i1]+[\W_]*p+[\W_]*e*/gi, // asswipe
  /\b[@a4]+[\W_]*s+[\W_]*s+/gi, // ass (standalone)
  
  // D-word variations
  /\bd+[\W_]*[i1!]+[\W_]*c+[\W_]*k+/gi,
  /\bd+[\W_]*[i1]+[\W_]*c+[\W_]*k+[\W_]*h+[\W_]*e+[\W_]*a+[\W_]*d+/gi, // dickhead
  
  // P-word variations
  /\bp+[\W_]*[i1!]+[\W_]*s+[\W_]*s+/gi,
  /\bp+[\W_]*[u0]+[\W_]*s+[\W_]*s+[\W_]*y+/gi,
  
  // W-word variations
  /\bw+[\W_]*a+[\W_]*n+[\W_]*k+[\W_]*e+[\W_]*r+/gi,
  /\bt+[\W_]*w+[\W_]*[@a4]+[\W_]*[t+7]+/gi, // twat
  
  // B-word variations (additional)
  /\bb+[@a4]+[\W_]*s+[\W_]*[t+7]+[@a4]+[\W_]*r+[\W_]*d+/gi, // bastard
  /\bb+[o0]+[\W_]*l+[\W_]*l+[\W_]*[o0]+[\W_]*[ck]+[\W_]*s+/gi, // bollocks
  
  // Slurs (critical - instant block)
  /n+[\W_]*[i1!]+[\W_]*g+[\W_]*g+[\W_]*[e3a4]+[\W_]*r+/gi,
  /f+[@a4]+[\W_]*g+[\W_]*g+[\W_]*[o0]+[\W_]*[t+7]+/gi,
  /r+[e3]+[\W_]*[t+7]+[@a4]+[\W_]*r+[\W_]*d+/gi,
  /s+[\W_]*p+[@a4]+[\W_]*z+/gi,
  /t+[\W_]*r+[@a4]+[\W_]*n+[\W_]*n+[\W_]*[yi]+/gi,
];

/**
 * Payment and off-platform contact patterns
 */
const PAYMENT_PATTERNS = [
  // Payment platforms
  /\b(pay\s*pal|paypal)\b/gi,
  /\b(ven\s*mo|venmo)\b/gi,
  /\b(cash\s*app|cashapp)\b/gi,
  /\b(zelle?)\b/gi,
  /\b(revolut)\b/gi,
  /\b(wise|transferwise)\b/gi,
  /\b(stripe direct)\b/gi,
  /\b(bitcoin|btc|eth|crypto)\b/gi,
  /\b(western\s*union)\b/gi,
  /\b(money\s*gram)\b/gi,
  
  // Payment phrases
  /\bpay\s*(me\s*)?(direct(ly)?|outside|off\s*platform|cash|separately)\b/gi,
  /\bavoid\s*(the\s*)?(fee|fees|charge|platform)/gi,
  /\b(no|skip|bypass)\s*(fee|fees|charge)/gi,
  /\bsave\s*(the\s*)?fee/gi,
  /\bcheaper\s*if\s*you\s*pay/gi,
  /\bdiscount\s*(for|if)\s*(cash|direct|off)/gi,
  /\bbank\s*(transfer|account|details?)/gi,
  /\bwire\s*(transfer|money)/gi,
  /\bsend\s*(me\s*)?(money|cash|payment)/gi,
  /\b(my|personal)\s*account/gi,
  /\brouting\s*number/gi,
  /\bsort\s*code/gi,
  /\biban/gi,
  /\bswift\s*code/gi,
  
  // Contact methods
  /\b(whatsapp|whats\s*app|wa|wapp)\b/gi,
  /\b(telegram|tg)\b/gi,
  /\b(signal\s*app)\b/gi,
  /\b(wechat|we\s*chat)\b/gi,
  /\b(facebook\s*messenger|fb\s*messenger|messenger)\b/gi,
  /\b(viber|line\s*app)\b/gi,
  /\b(snapchat|snap)\b/gi,
  /\b(instagram|insta|ig)\b/gi,
  /\bcontact\s*me\s*(at|on|via)/gi,
  /\b(email|e-mail|mail)\s*me\s*at/gi,
  /\b(call|text|message|ring)\s*me\s*(at|on)/gi,
  /\bmy\s*(phone|mobile|number|cell)/gi,
  
  // Phone number patterns
  /(\+?\d{1,4}[-.\s]?)?\(?\d{3,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g,
  /\b\d{10,11}\b/g, // 10-11 digit numbers
  
  // Email patterns
  /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi,
  
  // Social handles
  /@[a-z0-9_]{3,}/gi,
];

/**
 * Antisocial behavior patterns
 */
const ANTISOCIAL_PATTERNS = [
  /\bkill\s*(your|ur)\s*self/gi,
  /\bk\s*y\s*s\b/gi,
  /\bgo\s*die\b/gi,
  /\bhope\s*you\s*die/gi,
  /\bthreat(en)?(ing|ed)?/gi,
  /\bharass(ing|ment|ed)?/gi,
  /\bstalk(ing|er|ed)?/gi,
  /\bdoxx?(ing|ed)?/gi,
  /\bswat(ting|ted)?/gi,
  /\bpersonal\s*(info|information|address)/gi,
  /\b(your|ur)\s*address\s*is/gi,
  /\bcome\s*find\s*you/gi,
  /\bwatch\s*(your|ur)\s*back/gi,
  /\bi\s*know\s*where\s*you/gi,
  /\bi'?ll?\s*(get|find|hurt|kill|come|track)/gi,
];

/**
 * Sexual/adult content patterns
 */
const SEXUAL_PATTERNS = [
  /\bsex(ual|y)?/gi,
  /\bnude(s)?/gi,
  /\bporn(o|ography)?/gi,
  /\bxxx/gi,
  /\bmasturbat/gi,
  /\bpenis|vagina|breasts?/gi,
  /\berotic/gi,
  /\bfetish/gi,
  /\bescort/gi,
  /\bhook\s*up/gi,
  /\bone\s*night/gi,
];

/**
 * Spam patterns
 */
const SPAM_PATTERNS = [
  /\bclick\s*here/gi,
  /\bbuy\s*now/gi,
  /\blimited\s*(offer|time)/gi,
  /\bact\s*fast/gi,
  /\bfree\s*money/gi,
  /\bwork\s*from\s*home/gi,
  /\bmake\s*money\s*fast/gi,
  /\bget\s*rich/gi,
  /\b(bit\.ly|tinyurl|goo\.gl)/gi,
  /\bvisit\s*my\s*(site|website|page)/gi,
  /\b(subscribe|follow)\s*me/gi,
];

/**
 * Check content for violations
 */
export function moderateContent(content: string): ModerationResult {
  const normalizedContent = normalizeText(content);
  const reasons: ModerationResult['reasons'] = [];

  // Check profanity (with confidence scoring)
  const profanityMatches: string[] = [];
  PROFANITY_PATTERNS.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      profanityMatches.push(...matches);
    }
  });

  if (profanityMatches.length > 0) {
    const severity = profanityMatches.some(m => 
      /c+[\W_]*[u0o]+[\W_]*n+[\W_]*[t+7]+/i.test(m) || 
      /n+[\W_]*[i1!]+[\W_]*g+[\W_]*g+/i.test(m) ||
      /f+[@a4]+[\W_]*g+[\W_]*g+/i.test(m)
    ) ? 'critical' : profanityMatches.length > 3 ? 'high' : 'medium';

    reasons.push({
      type: 'inappropriate_language',
      severity,
      matchedPatterns: profanityMatches,
      confidence: 95,
    });
  }

  // Check payment attempts (CRITICAL)
  const paymentMatches: string[] = [];
  PAYMENT_PATTERNS.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      paymentMatches.push(...matches);
    }
  });

  if (paymentMatches.length > 0) {
    // Higher confidence if multiple payment indicators
    const confidence = Math.min(70 + (paymentMatches.length * 10), 99);
    
    reasons.push({
      type: 'payment_attempt',
      severity: 'critical',
      matchedPatterns: paymentMatches,
      confidence,
    });
  }

  // Check antisocial behavior (CRITICAL)
  const antisocialMatches: string[] = [];
  ANTISOCIAL_PATTERNS.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      antisocialMatches.push(...matches);
    }
  });

  if (antisocialMatches.length > 0) {
    reasons.push({
      type: 'antisocial_behavior',
      severity: 'critical',
      matchedPatterns: antisocialMatches,
      confidence: 90,
    });
  }

  // Check sexual content
  const sexualMatches: string[] = [];
  SEXUAL_PATTERNS.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      sexualMatches.push(...matches);
    }
  });

  if (sexualMatches.length > 0) {
    reasons.push({
      type: 'sexual_content',
      severity: sexualMatches.length > 2 ? 'high' : 'medium',
      matchedPatterns: sexualMatches,
      confidence: 80,
    });
  }

  // Check spam
  const spamMatches: string[] = [];
  SPAM_PATTERNS.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      spamMatches.push(...matches);
    }
  });

  if (spamMatches.length > 0) {
    reasons.push({
      type: 'spam',
      severity: spamMatches.length > 2 ? 'high' : 'low',
      matchedPatterns: spamMatches,
      confidence: 75,
    });
  }

  // Determine if content should be blocked
  const shouldBlock = reasons.some(r => 
    r.severity === 'critical' && r.confidence >= 70
  );

  return {
    flagged: reasons.length > 0,
    blocked: shouldBlock,
    reasons
  };
}

/**
 * Validate username/display name for appropriateness
 */
export function validateUsername(username: string): {
  valid: boolean;
  reason?: string;
} {
  const normalized = normalizeText(username);
  
  // Check against profanity
  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(username) || pattern.test(normalized)) {
      return {
        valid: false,
        reason: 'Username contains inappropriate language'
      };
    }
  }

  // Check for payment/contact info in username
  const paymentIndicators = [
    'paypal', 'venmo', 'cashapp', 'zelle', '@', '.com', 'whatsapp'
  ];
  
  if (paymentIndicators.some(indicator => normalized.includes(indicator))) {
    return {
      valid: false,
      reason: 'Username cannot contain contact or payment information'
    };
  }

  // Check length
  if (username.length < 2) {
    return {
      valid: false,
      reason: 'Username is too short (minimum 2 characters)'
    };
  }

  if (username.length > 50) {
    return {
      valid: false,
      reason: 'Username is too long (maximum 50 characters)'
    };
  }

  // Check for excessive special characters
  const specialCharCount = (username.match(/[^a-zA-Z0-9\s]/g) || []).length;
  if (specialCharCount > 3) {
    return {
      valid: false,
      reason: 'Username contains too many special characters'
    };
  }

  return { valid: true };
}

/**
 * Get user-friendly blocked message
 */
export function getBlockedMessageText(reasons: ModerationResult['reasons']): string {
  const types = reasons.map(r => r.type);
  
  if (types.includes('payment_attempt')) {
    return '⚠️ This message was blocked because it appears to contain payment or contact information. All payments must be made through Cantra for your protection. Attempting to arrange off-platform payments violates our Terms of Service and may result in account suspension.';
  }
  
  if (types.includes('antisocial_behavior')) {
    return '⚠️ This message was blocked because it contains threatening or harassing language. This behavior violates our Community Guidelines and may result in immediate account termination.';
  }
  
  if (types.includes('inappropriate_language')) {
    return '⚠️ This message was blocked because it contains inappropriate language. Please communicate respectfully with all community members.';
  }

  if (types.includes('sexual_content')) {
    return '⚠️ This message was blocked because it contains inappropriate sexual content. Cantra is a professional platform for equestrian accommodation.';
  }
  
  return '⚠️ This message was blocked because it violates our Community Guidelines. Please review our Terms of Service.';
}

/**
 * Moderate message (backward compatible wrapper)
 */
export function moderateMessage(message: string): ModerationResult {
  return moderateContent(message);
}

