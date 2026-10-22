import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

export const COMPLAINT_PHOTOS_BUCKET = 'complaint-photos';
export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface PhotoValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates photo format and size prior to upload.
 */
export function validatePhoto(file: File): PhotoValidationResult {
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Please upload an image in JPEG, PNG, or WebP format.',
    };
  }

  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    return {
      valid: false,
      error: 'Image file size exceeds the 5 MB limit.',
    };
  }

  return { valid: true };
}

/**
 * Uploads a complaint photo to the private complaint-photos bucket.
 * Follows the mandatory security path structure: ${userId}/${randomUUID}.${ext}
 * Returns the storage path (not a public URL).
 */
export async function uploadComplaintPhoto(
  file: File,
  userId: string
): Promise<{ path: string | null; error: string | null }> {
  const validation = validatePhoto(file);
  if (!validation.valid) {
    return { path: null, error: validation.error || 'Invalid photo' };
  }

  try {
    const supabase = createClient();
    const ext = file.name.split('.').pop()?.toLowerCase() || 'webp';
    const cleanExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'webp';
    const fileName = `${crypto.randomUUID()}.${cleanExt}`;
    const storagePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(COMPLAINT_PHOTOS_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return {
        path: null,
        error: uploadError.message || 'Failed to upload photo to storage.',
      };
    }

    return { path: storagePath, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Photo upload failed';
    return { path: null, error: msg };
  }
}

/**
 * Generates a signed URL for a photo in the private complaint-photos bucket.
 * Safe for authenticated citizen/official viewing. Supports both client and server contexts.
 */
export async function getSignedPhotoUrl(
  path: string | null,
  expiresIn = 3600,
  supabaseClient?: SupabaseClient
): Promise<string | null> {
  if (!path) return null;

  try {
    const supabase = supabaseClient || createClient();
    const { data, error } = await supabase.storage
      .from(COMPLAINT_PHOTOS_BUCKET)
      .createSignedUrl(path, expiresIn);

    if (error || !data?.signedUrl) {
      return null;
    }

    return data.signedUrl;
  } catch {
    return null;
  }
}
