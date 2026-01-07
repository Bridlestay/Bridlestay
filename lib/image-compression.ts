/**
 * Client-side image compression utility
 * Compresses images before upload to reduce bandwidth and storage costs
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  maxSizeMB?: number;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 0.85,
  maxSizeMB: 2,
};

/**
 * Compress an image file
 * Returns a new compressed File object
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Skip compression for small files (under 500KB)
  if (file.size < 500 * 1024) {
    return file;
  }

  // Skip non-image files
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // HEIC/HEIF can't be compressed in browser - return as-is
  if (file.type === 'image/heic' || file.type === 'image/heif') {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          // Calculate new dimensions
          let { width, height } = img;
          
          if (width > opts.maxWidth! || height > opts.maxHeight!) {
            const ratio = Math.min(
              opts.maxWidth! / width,
              opts.maxHeight! / height
            );
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          // Create canvas and draw resized image
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file); // Fallback to original
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file); // Fallback to original
                return;
              }

              // If compressed is larger, return original
              if (blob.size >= file.size) {
                resolve(file);
                return;
              }

              // Create new file with same name
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });

              resolve(compressedFile);
            },
            'image/jpeg',
            opts.quality
          );
        } catch (error) {
          resolve(file); // Fallback to original on error
        }
      };
      
      img.onerror = () => resolve(file); // Fallback to original
      img.src = event.target?.result as string;
    };
    
    reader.onerror = () => resolve(file); // Fallback to original
    reader.readAsDataURL(file);
  });
}

/**
 * Compress multiple images
 */
export async function compressImages(
  files: File[],
  options?: CompressionOptions
): Promise<File[]> {
  return Promise.all(files.map((file) => compressImage(file, options)));
}

/**
 * Property photo compression (larger for detail)
 */
export function compressPropertyPhoto(file: File): Promise<File> {
  return compressImage(file, {
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 0.85,
  });
}

/**
 * Avatar compression (smaller, square)
 */
export function compressAvatar(file: File): Promise<File> {
  return compressImage(file, {
    maxWidth: 512,
    maxHeight: 512,
    quality: 0.9,
  });
}

/**
 * Horse photo compression
 */
export function compressHorsePhoto(file: File): Promise<File> {
  return compressImage(file, {
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 0.85,
  });
}

