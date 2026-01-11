/**
 * Image Screening Utility for Auto-Moderation
 * 
 * Integrates with Cloud Vision API or similar services
 * for automatic image moderation.
 */

interface ImageScreeningResult {
  allowed: boolean;
  flagged: boolean;
  flagReasons: string[];
  riskScore: number;
  detectedLabels: string[];
  suggestedAction: 'approve' | 'flag' | 'reject';
  rejectionReason?: string;
}

// Hard blockers that result in automatic rejection
const HARD_BLOCKERS = [
  'adult', 'explicit', 'pornography', 'nudity',
  'violence', 'gore', 'graphic_violence',
  'hate_symbol', 'extremist',
];

// Soft flags that allow but tag for review
const SOFT_FLAGS = [
  'face', 'person', 'child', 'minor',
  'injury', 'blood', 'medical',
  'weapon', 'knife', 'gun',
];

// Allowed content types
const ALLOWED_CONTENT = [
  'animal', 'horse', 'equine', 'pony',
  'landscape', 'nature', 'outdoor',
  'building', 'stable', 'barn', 'paddock',
  'riding', 'equestrian', 'sport',
];

/**
 * Screen an image for problematic content
 * 
 * This is a placeholder that should be connected to a real
 * image moderation API (Google Cloud Vision, AWS Rekognition, etc.)
 */
export async function screenImage(
  imageUrl: string,
  context?: {
    contentType?: 'property' | 'profile' | 'review' | 'route' | 'message';
    userId?: string;
    userTrustScore?: number;
  }
): Promise<ImageScreeningResult> {
  // In production, this would call an external API
  // For now, return a safe default
  
  try {
    // Placeholder: Check if URL is valid
    if (!imageUrl || !imageUrl.startsWith('http')) {
      return {
        allowed: false,
        flagged: true,
        flagReasons: ['invalid_url'],
        riskScore: 100,
        detectedLabels: [],
        suggestedAction: 'reject',
        rejectionReason: 'Invalid image URL',
      };
    }

    // In production, you would:
    // 1. Call Cloud Vision API's SafeSearch detection
    // 2. Analyze labels and web detection
    // 3. Check for faces (privacy) and text (contact info)
    
    // For now, assume all images are safe
    return {
      allowed: true,
      flagged: false,
      flagReasons: [],
      riskScore: 0,
      detectedLabels: ['image'],
      suggestedAction: 'approve',
    };
  } catch (error) {
    console.error('Image screening error:', error);
    
    // On error, flag for manual review
    return {
      allowed: true,
      flagged: true,
      flagReasons: ['screening_error'],
      riskScore: 30,
      detectedLabels: [],
      suggestedAction: 'flag',
    };
  }
}

/**
 * Process Cloud Vision API SafeSearch response
 * (Used when connected to real API)
 */
export function processSafeSearchResponse(safeSearch: {
  adult?: string;
  spoof?: string;
  medical?: string;
  violence?: string;
  racy?: string;
}): ImageScreeningResult {
  const flagReasons: string[] = [];
  let riskScore = 0;

  // Map likelihood values to scores
  const likelihoodScores: Record<string, number> = {
    'UNKNOWN': 0,
    'VERY_UNLIKELY': 0,
    'UNLIKELY': 5,
    'POSSIBLE': 25,
    'LIKELY': 50,
    'VERY_LIKELY': 100,
  };

  // Check adult content
  const adultScore = likelihoodScores[safeSearch.adult || 'UNKNOWN'] || 0;
  if (adultScore >= 50) {
    flagReasons.push('adult_content');
    riskScore = Math.max(riskScore, adultScore);
  }

  // Check violence
  const violenceScore = likelihoodScores[safeSearch.violence || 'UNKNOWN'] || 0;
  if (violenceScore >= 50) {
    flagReasons.push('violence');
    riskScore = Math.max(riskScore, violenceScore);
  }

  // Check racy content
  const racyScore = likelihoodScores[safeSearch.racy || 'UNKNOWN'] || 0;
  if (racyScore >= 75) {
    flagReasons.push('racy_content');
    riskScore = Math.max(riskScore, racyScore - 25); // Lower weight for racy
  }

  // Determine action
  let suggestedAction: 'approve' | 'flag' | 'reject' = 'approve';
  let rejectionReason: string | undefined;

  if (riskScore >= 75) {
    suggestedAction = 'reject';
    rejectionReason = 'This image violates our content guidelines.';
  } else if (riskScore >= 25) {
    suggestedAction = 'flag';
  }

  return {
    allowed: suggestedAction !== 'reject',
    flagged: suggestedAction !== 'approve',
    flagReasons,
    riskScore,
    detectedLabels: [],
    suggestedAction,
    rejectionReason,
  };
}

/**
 * Check if image contains text that might be contact info
 * (Used with OCR/text detection)
 */
export function checkImageText(detectedText: string): {
  hasContactInfo: boolean;
  patterns: string[];
} {
  const patterns: string[] = [];

  // Phone number patterns
  if (/\+?\d{1,3}[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/.test(detectedText)) {
    patterns.push('phone_number');
  }

  // Email patterns
  if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(detectedText)) {
    patterns.push('email');
  }

  // Social media handles
  if (/@[a-zA-Z0-9_]+/.test(detectedText)) {
    patterns.push('social_handle');
  }

  return {
    hasContactInfo: patterns.length > 0,
    patterns,
  };
}

export type { ImageScreeningResult };

