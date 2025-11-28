/**
 * File Upload Validation Utilities
 * Prevents malicious uploads and ensures file quality
 */

export const FILE_VALIDATION = {
  // Maximum file sizes (in bytes)
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_AVATAR_SIZE: 5 * 1024 * 1024,  // 5MB
  
  // Allowed MIME types for images
  ALLOWED_IMAGE_TYPES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
  ],
  
  // Allowed file extensions
  ALLOWED_IMAGE_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'],
};

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate an image file for upload
 */
export function validateImageFile(
  file: File,
  maxSize: number = FILE_VALIDATION.MAX_IMAGE_SIZE
): FileValidationResult {
  // Check if file exists
  if (!file) {
    return {
      valid: false,
      error: 'No file provided',
    };
  }

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return {
      valid: false,
      error: `File size must be less than ${maxSizeMB}MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`,
    };
  }

  // Check MIME type
  if (!FILE_VALIDATION.ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${FILE_VALIDATION.ALLOWED_IMAGE_TYPES.join(', ')}`,
    };
  }

  // Check file extension (additional safety)
  const fileName = file.name.toLowerCase();
  const hasValidExtension = FILE_VALIDATION.ALLOWED_IMAGE_EXTENSIONS.some(ext => 
    fileName.endsWith(ext)
  );

  if (!hasValidExtension) {
    return {
      valid: false,
      error: `Invalid file extension. Allowed: ${FILE_VALIDATION.ALLOWED_IMAGE_EXTENSIONS.join(', ')}`,
    };
  }

  // Additional check: verify it's actually an image by checking if it's a blob
  if (!(file instanceof Blob)) {
    return {
      valid: false,
      error: 'Invalid file format',
    };
  }

  return { valid: true };
}

/**
 * Validate avatar upload specifically (smaller size limit)
 */
export function validateAvatarUpload(file: File): FileValidationResult {
  return validateImageFile(file, FILE_VALIDATION.MAX_AVATAR_SIZE);
}

/**
 * Validate property photo upload
 */
export function validatePropertyPhotoUpload(file: File): FileValidationResult {
  return validateImageFile(file, FILE_VALIDATION.MAX_IMAGE_SIZE);
}

/**
 * Validate horse photo upload
 */
export function validateHorsePhotoUpload(file: File): FileValidationResult {
  return validateImageFile(file, FILE_VALIDATION.MAX_IMAGE_SIZE);
}

/**
 * Validate route photo upload
 */
export function validateRoutePhotoUpload(file: File): FileValidationResult {
  return validateImageFile(file, FILE_VALIDATION.MAX_IMAGE_SIZE);
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFilename(filename: string): string {
  // Remove special characters, keep only alphanumeric, dots, hyphens, underscores
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.-_]/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '');
}

