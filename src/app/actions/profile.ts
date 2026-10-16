'use server';

import { createClient } from '@/lib/supabase/server';
import { query } from '@/lib/db';
import { UserProfile } from '@/types';

export interface UpdateProfileInput {
  fullName: string;
  phone?: string | null;
}

export interface UserStats {
  totalReports: number;
  resolvedReports: number;
  inProgressReports: number;
  pendingReports: number;
}

/**
 * Server action to safely update the authenticated user's profile.
 * Updates both the database public.profiles record and auth user_metadata.
 */
export async function updateUserProfileAction(
  input: UpdateProfileInput
): Promise<{ success: boolean; profile: UserProfile | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, profile: null, error: 'Unauthorized. Please sign in to update profile.' };
    }

    const trimmedName = (input.fullName || '').trim();
    if (!trimmedName || trimmedName.length < 2) {
      return { success: false, profile: null, error: 'Full name must be at least 2 characters.' };
    }
    if (trimmedName.length > 80) {
      return { success: false, profile: null, error: 'Full name cannot exceed 80 characters.' };
    }

    const trimmedPhone = (input.phone || '').trim() || null;
    if (trimmedPhone && !/^[+0-9\s-]{7,20}$/.test(trimmedPhone)) {
      return {
        success: false,
        profile: null,
        error: 'Please enter a valid phone number (e.g., +91 98765 43210 or 9876543210).',
      };
    }

    // 1. Update public.profiles in PostgreSQL using query pool
    const updateSql = `
      UPDATE public.profiles
      SET full_name = $1,
          phone = $2,
          updated_at = NOW()
      WHERE id = $3
      RETURNING id, full_name, phone, role, created_at, updated_at;
    `;

    const dbRes = await query<UserProfile>(updateSql, [trimmedName, trimmedPhone, user.id]);

    let updatedProfile: UserProfile | null = null;
    if (dbRes.rows && dbRes.rows.length > 0) {
      updatedProfile = dbRes.rows[0];
    } else {
      // Fallback: If no row returned, try upserting preserving existing role or metadata
      const safeRole = (user.user_metadata?.role as string) || 'citizen';
      const upsertSql = `
        INSERT INTO public.profiles (id, full_name, phone, role, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE
        SET full_name = EXCLUDED.full_name,
            phone = EXCLUDED.phone,
            updated_at = NOW()
        RETURNING id, full_name, phone, role, created_at, updated_at;
      `;
      const upsertRes = await query<UserProfile>(upsertSql, [user.id, trimmedName, trimmedPhone, safeRole]);
      if (upsertRes.rows && upsertRes.rows.length > 0) {
        updatedProfile = upsertRes.rows[0];
      }
    }

    // 2. Also keep Supabase Auth user_metadata synchronized
    try {
      await supabase.auth.updateUser({
        data: {
          full_name: trimmedName,
          phone: trimmedPhone || undefined,
        },
      });
    } catch {
      // Non-fatal if metadata update encounters network warning
    }

    return {
      success: true,
      profile: updatedProfile,
      error: null,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update profile';
    console.error('[Profile-Action] Update profile error:', msg);
    return {
      success: false,
      profile: null,
      error: msg,
    };
  }
}

/**
 * Server action to retrieve profile statistics for the authenticated user.
 */
export async function fetchUserStatsAction(): Promise<{
  stats: UserStats;
  error: string | null;
}> {
  const defaultStats: UserStats = {
    totalReports: 0,
    resolvedReports: 0,
    inProgressReports: 0,
    pendingReports: 0,
  };

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { stats: defaultStats, error: 'Unauthorized' };
    }

    // Fetch user role from profiles
    const roleRes = await query<{ role: string }>(
      'SELECT role FROM public.profiles WHERE id = $1',
      [user.id]
    );
    const role = roleRes.rows?.[0]?.role || 'citizen';

    if (role === 'citizen') {
      const statsRes = await query<{
        total: string;
        resolved: string;
        in_progress: string;
        pending: string;
      }>(
        `SELECT
           COUNT(*)::text AS total,
           COUNT(*) FILTER (WHERE status = 'resolved')::text AS resolved,
           COUNT(*) FILTER (WHERE status = 'in_progress')::text AS in_progress,
           COUNT(*) FILTER (WHERE status IN ('submitted', 'under_review', 'assigned'))::text AS pending
         FROM public.complaints
         WHERE user_id = $1`,
        [user.id]
      );

      const row = statsRes.rows?.[0];
      return {
        stats: {
          totalReports: Number(row?.total || 0),
          resolvedReports: Number(row?.resolved || 0),
          inProgressReports: Number(row?.in_progress || 0),
          pendingReports: Number(row?.pending || 0),
        },
        error: null,
      };
    } else {
      // Official / Admin statistics (assigned to them or general operations)
      const officialStatsRes = await query<{
        assigned_total: string;
        assigned_resolved: string;
        assigned_active: string;
      }>(
        `SELECT
           COUNT(*)::text AS assigned_total,
           COUNT(*) FILTER (WHERE status = 'resolved')::text AS assigned_resolved,
           COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'rejected'))::text AS assigned_active
         FROM public.complaints
         WHERE assigned_to = $1`,
        [user.id]
      );

      const row = officialStatsRes.rows?.[0];
      return {
        stats: {
          totalReports: Number(row?.assigned_total || 0),
          resolvedReports: Number(row?.assigned_resolved || 0),
          inProgressReports: Number(row?.assigned_active || 0),
          pendingReports: 0,
        },
        error: null,
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch user stats';
    return {
      stats: defaultStats,
      error: msg,
    };
  }
}
