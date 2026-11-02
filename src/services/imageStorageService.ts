import { getSupabase } from '../lib/supabase';
import { generateUUID } from '../utils/slugify';

export const BUCKET_NAME = 'business-images';
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
}

export interface UploadResult {
  publicUrl: string;
  storagePath: string;
}

/**
 * Validate an image file in the browser before upload:
 * - Allowed types: JPEG, PNG, WebP
 * - Maximum size: 5 MB
 */
export function validateImageFile(file: File | null | undefined): ImageValidationResult {
  if (!file) {
    return { isValid: false, error: 'Please select an image file.' };
  }

  // Check file type
  const mimeType = (file.type || '').toLowerCase();
  const extension = getFileExtension(file).toLowerCase();

  const isMimeAllowed = ALLOWED_MIME_TYPES.includes(mimeType);
  const isExtAllowed = ALLOWED_EXTENSIONS.includes(extension);

  // If MIME type is present, it must be allowed; and extension must be allowed
  if (!isExtAllowed || (mimeType && !isMimeAllowed)) {
    return {
      isValid: false,
      error: 'Invalid file type. Allowed formats: JPEG, PNG, and WebP only.',
    };
  }

  // Check file size (5 MB max)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `Image size (${sizeInMB} MB) exceeds the 5 MB maximum limit.`,
    };
  }

  if (file.size === 0) {
    return {
      isValid: false,
      error: 'The selected file is empty. Please choose a valid image.',
    };
  }

  return { isValid: true };
}

/**
 * Extract clean file extension from file name or MIME type
 */
export function getFileExtension(file: File): string {
  if (file.name && file.name.includes('.')) {
    const parts = file.name.split('.');
    const ext = parts[parts.length - 1].toLowerCase().trim();
    return ext === 'jpeg' ? 'jpg' : ext;
  }

  // Fallback to MIME type mapping
  switch (file.type) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/jpeg':
      return 'jpg';
    default:
      return '';
  }
}

/**
 * Generate a unique, safe Storage path:
 * <business-id>/<random-uuid>.<extension>
 */
export function generateStoragePath(businessId: string, file: File): string {
  const ext = getFileExtension(file);
  const randomId = generateUUID();
  const cleanBusinessId = businessId.trim();
  return `${cleanBusinessId}/${randomId}.${ext}`;
}

/**
 * Determine if a URL points to an image in the business-images bucket,
 * and extract the relative storage path (<business-id>/<filename>).
 * Returns null if the URL is not hosted in the Supabase business-images bucket.
 */
export function extractStoragePath(url: string | null | undefined): string | null {
  if (!url) return null;

  // Supabase public URL format:
  // https://<project>.supabase.co/storage/v1/object/public/business-images/<business-id>/<file>.<ext>
  const marker = `/${BUCKET_NAME}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;

  const rawPath = url.slice(idx + marker.length);
  // Remove query params or hashes
  const cleanPath = rawPath.split('?')[0].split('#')[0];
  const decoded = decodeURIComponent(cleanPath).trim();

  // Validate that it has at least a businessId and filename: e.g. "uuid/filename.jpg"
  if (decoded && decoded.includes('/') && !decoded.startsWith('/')) {
    return decoded;
  }
  return null;
}

/**
 * Check if an image URL is from our Supabase business-images bucket.
 */
export function isSupabaseStorageUrl(url: string | null | undefined): boolean {
  return extractStoragePath(url) !== null;
}

/**
 * Upload an image file for a business to Supabase Storage:
 * - Path: <business-id>/<random-uuid>.<extension>
 * - upsert: false
 * - Actual MIME type and Cache-Control header
 * - Returns the resulting public URL and storagePath
 */
export async function uploadBusinessImage(
  businessId: string,
  file: File
): Promise<UploadResult> {
  const validation = validateImageFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid image file.');
  }

  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase is not configured. Please connect Supabase in the admin settings.');
  }

  const storagePath = generateStoragePath(businessId, file);
  const mimeType = file.type || (getFileExtension(file) === 'png' ? 'image/png' : 'image/jpeg');

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file, {
      upsert: false,
      contentType: mimeType,
      cacheControl: '3600',
    });

  if (error || !data) {
    console.error('Supabase storage upload error:', error);
    throw new Error(`Image upload failed: ${error?.message || 'Storage service error'}`);
  }

  // Obtain public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  if (!urlData || !urlData.publicUrl) {
    throw new Error('Failed to retrieve public URL for uploaded image.');
  }

  return {
    publicUrl: urlData.publicUrl,
    storagePath,
  };
}

/**
 * Delete an image by its storage path (<business-id>/<filename>).
 * Safe to call; errors are caught and logged.
 */
export async function deleteBusinessImage(storagePath: string): Promise<boolean> {
  if (!storagePath) return false;

  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
    if (error) {
      console.warn('Failed to delete image from Supabase storage:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Exception deleting image from storage:', err);
    return false;
  }
}

/**
 * Delete an old image only if it is hosted in the business-images bucket.
 * Never deletes externally hosted or local assets.
 */
export async function deleteOldBusinessImageIfInBucket(
  url: string | null | undefined
): Promise<boolean> {
  const path = extractStoragePath(url);
  if (!path) {
    // Not from business-images bucket, do not delete
    return false;
  }
  return deleteBusinessImage(path);
}

export const imageStorageService = {
  validateImageFile,
  getFileExtension,
  generateStoragePath,
  extractStoragePath,
  isSupabaseStorageUrl,
  uploadBusinessImage,
  deleteBusinessImage,
  deleteOldBusinessImageIfInBucket,
};
