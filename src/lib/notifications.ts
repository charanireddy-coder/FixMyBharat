import { SupabaseClient } from '@supabase/supabase-js';

export interface CitizenNotificationComplaint {
  id: string;
  complaint_number: string;
  title: string;
  category: string;
  status: string;
  created_at?: string;
}

export interface CitizenNotificationItem {
  id: string;
  complaint_id: string;
  updated_by?: string | null;
  old_status?: string | null;
  new_status?: string | null;
  message?: string | null;
  is_public: boolean;
  created_at: string;
  complaint: CitizenNotificationComplaint;
}

export interface FetchNotificationsResult {
  notifications: CitizenNotificationItem[];
  error: string | null;
}

/**
 * Fetches all public complaint updates for complaints filed by the signed-in citizen.
 * Supabase Row Level Security (RLS) ensures citizens can only query public updates
 * associated with complaints where user_id equals auth.uid().
 */
export async function fetchCitizenNotifications(
  supabase: SupabaseClient
): Promise<FetchNotificationsResult> {
  try {
    const { data, error } = await supabase
      .from('complaint_updates')
      .select(`
        id,
        complaint_id,
        updated_by,
        old_status,
        new_status,
        message,
        is_public,
        created_at,
        complaint:complaints (
          id,
          complaint_number,
          title,
          category,
          status,
          created_at
        )
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) {
      return { notifications: [], error: error.message };
    }

    if (!data) {
      return { notifications: [], error: null };
    }

    // Filter out any orphaned records where joined complaint is null or inaccessible
    const validNotifications: CitizenNotificationItem[] = [];

    for (const item of data) {
      const rawItem = item as unknown as {
        id: string;
        complaint_id: string;
        updated_by?: string | null;
        old_status?: string | null;
        new_status?: string | null;
        message?: string | null;
        is_public: boolean;
        created_at: string;
        complaint?: CitizenNotificationComplaint | CitizenNotificationComplaint[] | null;
      };

      // PostgREST may return single object or single-item array depending on relationship definitions
      let complaintData: CitizenNotificationComplaint | null = null;
      if (Array.isArray(rawItem.complaint) && rawItem.complaint.length > 0) {
        complaintData = rawItem.complaint[0];
      } else if (rawItem.complaint && typeof rawItem.complaint === 'object') {
        complaintData = rawItem.complaint as CitizenNotificationComplaint;
      }

      if (complaintData) {
        validNotifications.push({
          id: rawItem.id,
          complaint_id: rawItem.complaint_id,
          updated_by: rawItem.updated_by,
          old_status: rawItem.old_status,
          new_status: rawItem.new_status,
          message: rawItem.message,
          is_public: rawItem.is_public,
          created_at: rawItem.created_at,
          complaint: complaintData,
        });
      }
    }

    return { notifications: validNotifications, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch notifications';
    return { notifications: [], error: msg };
  }
}

/**
 * Local storage key for citizen read notification tracking.
 * Note: Database schema does not include an is_read column on complaint_updates.
 * Read status is stored client-side per user session.
 */
function getStorageKey(userId: string): string {
  return `fmb_read_notifications_${userId}`;
}

export function getReadNotificationIds(userId: string): Set<string> {
  if (typeof window === 'undefined' || !userId) {
    return new Set<string>();
  }

  try {
    const stored = window.localStorage.getItem(getStorageKey(userId));
    if (!stored) return new Set<string>();
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      return new Set<string>(parsed);
    }
  } catch {
    // Gracefully handle JSON parse or storage errors
  }

  return new Set<string>();
}

export function markNotificationAsRead(userId: string, notificationId: string): void {
  if (typeof window === 'undefined' || !userId || !notificationId) return;

  try {
    const current = getReadNotificationIds(userId);
    current.add(notificationId);
    window.localStorage.setItem(getStorageKey(userId), JSON.stringify(Array.from(current)));
  } catch {
    // Ignore storage quota errors
  }
}

export function markNotificationAsUnread(userId: string, notificationId: string): void {
  if (typeof window === 'undefined' || !userId || !notificationId) return;

  try {
    const current = getReadNotificationIds(userId);
    current.delete(notificationId);
    window.localStorage.setItem(getStorageKey(userId), JSON.stringify(Array.from(current)));
  } catch {
    // Ignore storage quota errors
  }
}

export function markAllNotificationsAsRead(userId: string, notificationIds: string[]): void {
  if (typeof window === 'undefined' || !userId) return;

  try {
    const current = getReadNotificationIds(userId);
    notificationIds.forEach((id) => current.add(id));
    window.localStorage.setItem(getStorageKey(userId), JSON.stringify(Array.from(current)));
  } catch {
    // Ignore storage quota errors
  }
}

export function isNotificationRead(userId: string, notificationId: string): boolean {
  if (!userId || !notificationId) return false;
  const set = getReadNotificationIds(userId);
  return set.has(notificationId);
}
