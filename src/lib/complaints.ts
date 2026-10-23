import { ComplaintCategory, Complaint, StoredPhotoMetadata } from '@/types';
import { createClient } from '@/lib/supabase/client';

export const CATEGORY_OPTIONS: { value: ComplaintCategory; label: string }[] = [
  { value: 'pothole', label: 'Pothole' },
  { value: 'garbage', label: 'Garbage' },
  { value: 'water_leakage', label: 'Water Leakage' },
  { value: 'drainage', label: 'Drainage' },
  { value: 'streetlight', label: 'Streetlight' },
  { value: 'footpath', label: 'Footpath' },
  { value: 'open_manhole', label: 'Open Manhole' },
  { value: 'other', label: 'Other' },
];

export const CATEGORY_LABELS: Record<string, string> = {
  pothole: 'Pothole',
  garbage: 'Garbage',
  water_leakage: 'Water Leakage',
  drainage: 'Drainage',
  streetlight: 'Streetlight',
  footpath: 'Footpath',
  open_manhole: 'Open Manhole',
  other: 'Other',
};

export function getCategoryLabel(category?: string | null): string {
  if (!category) return 'Civic Issue';
  const key = category.toLowerCase().replace(/[\s-]+/g, '_');
  return CATEGORY_LABELS[key] || category;
}

export function formatComplaintDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

export interface CreateComplaintInput {
  title: string;
  description: string;
  category: ComplaintCategory;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  image_url?: string | null;
  photo_metadata?: StoredPhotoMetadata | null;
}

/**
 * Inserts a complaint into public.complaints adhering to the strict citizen INSERT RLS policy.
 * Fixed system values: status="submitted", severity="medium".
 * All official/AI/resolution fields are strictly omitted.
 */
export async function createComplaint(
  input: CreateComplaintInput,
  userId: string
): Promise<{ complaint: Complaint | null; error: string | null }> {
  try {
    const supabase = createClient();

    // Guardrail: Prohibit blocked/suspended users from submitting complaints
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_blocked, blocked_reason')
      .eq('id', userId)
      .maybeSingle();

    if (profile?.is_blocked) {
      const reasonText = profile.blocked_reason
        ? `Reason: ${profile.blocked_reason}`
        : 'Reason: Repeated spam, fraudulent submissions, or policy violations.';
      return {
        complaint: null,
        error: `Your reporting access has been suspended by administration. ${reasonText}`,
      };
    }

    const insertPayload = {
      user_id: userId,
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      address: input.address.trim(),
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      image_url: input.image_url ?? null,
      photo_metadata: input.photo_metadata ?? null,
      status: 'submitted' as const,
      severity: 'medium' as const,
    };

    const { data, error } = await supabase
      .from('complaints')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      return {
        complaint: null,
        error: "We couldn't submit your report right now. Please try again.",
      };
    }

    return { complaint: data as Complaint, error: null };
  } catch {
    return {
      complaint: null,
      error: "We couldn't submit your report right now. Please try again.",
    };
  }
}
