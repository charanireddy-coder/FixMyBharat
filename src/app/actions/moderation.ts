'use server';

import { createClient } from '@/lib/supabase/server';
import { query } from '@/lib/db';
import { UserProfile } from '@/types';

export interface UserModerationProfile extends UserProfile {
  total_complaints: number;
  rejected_complaints: number;
  resolved_complaints: number;
  active_complaints: number;
  spam_score?: number; // Calculated percentage of rejected or invalid submissions
}

/**
 * Server action: Block / suspend a citizen user from submitting reports.
 * Restricted strictly to authorized officials and administrators.
 */
export async function blockUserAction(
  targetUserId: string,
  reason: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!targetUserId) {
      return { success: false, error: 'Target user ID is required' };
    }
    const cleanReason = (reason || 'Repeated portal spam or policy violations').trim();

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Unauthorized: Active session required' };
    }

    // Role check: Only officials or admins can block users
    const callerRes = await query<{ role: string }>(
      `SELECT role FROM public.profiles WHERE id = $1`,
      [user.id]
    );
    const callerRole = callerRes.rows[0]?.role;
    if (callerRole !== 'admin' && callerRole !== 'official') {
      return { success: false, error: 'Forbidden: Admin or Official privileges required to moderate users' };
    }

    // Guardrail: Never allow blocking oneself
    if (user.id === targetUserId) {
      return { success: false, error: 'Cannot block your own administrative account' };
    }

    // Guardrail: Never allow blocking other admins
    const targetRes = await query<{ role: string; full_name: string }>(
      `SELECT role, full_name FROM public.profiles WHERE id = $1`,
      [targetUserId]
    );
    if (targetRes.rows.length === 0) {
      return { success: false, error: 'Target user profile not found' };
    }
    if (targetRes.rows[0].role === 'admin') {
      return { success: false, error: 'Cannot block an administrator account' };
    }

    // Execute block update
    await query(
      `UPDATE public.profiles
       SET is_blocked = true,
           blocked_reason = $1,
           blocked_at = NOW(),
           blocked_by = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [cleanReason, user.id, targetUserId]
    );

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to block user';
    console.error('[Moderation-Action] Error blocking user:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Server action: Unblock / restore a citizen user's reporting privileges.
 * Restricted strictly to authorized officials and administrators.
 */
export async function unblockUserAction(
  targetUserId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!targetUserId) {
      return { success: false, error: 'Target user ID is required' };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Unauthorized: Active session required' };
    }

    // Role check: Only officials or admins can unblock users
    const callerRes = await query<{ role: string }>(
      `SELECT role FROM public.profiles WHERE id = $1`,
      [user.id]
    );
    const callerRole = callerRes.rows[0]?.role;
    if (callerRole !== 'admin' && callerRole !== 'official') {
      return { success: false, error: 'Forbidden: Admin or Official privileges required' };
    }

    // Execute unblock update
    await query(
      `UPDATE public.profiles
       SET is_blocked = false,
           blocked_reason = NULL,
           blocked_at = NULL,
           blocked_by = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [targetUserId]
    );

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to unblock user';
    console.error('[Moderation-Action] Error unblocking user:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Server action: Fetch moderation details and complaint statistics for a specific user.
 */
export async function fetchUserModerationDetailsAction(
  targetUserId: string
): Promise<{
  success: boolean;
  profile: UserModerationProfile | null;
  error: string | null;
}> {
  try {
    if (!targetUserId) {
      return { success: false, profile: null, error: 'Target user ID is required' };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, profile: null, error: 'Unauthorized: Active session required' };
    }

    // Fetch profile and complaint aggregation in a single query
    const res = await query<UserModerationProfile>(
      `SELECT 
         p.id,
         p.full_name,
         p.phone,
         p.role,
         p.is_blocked,
         p.blocked_reason,
         p.blocked_at,
         p.blocked_by,
         p.created_at,
         p.updated_at,
         u.email,
         COUNT(c.id)::int AS total_complaints,
         COUNT(c.id) FILTER (WHERE c.status = 'rejected')::int AS rejected_complaints,
         COUNT(c.id) FILTER (WHERE c.status = 'resolved')::int AS resolved_complaints,
         COUNT(c.id) FILTER (WHERE c.status IN ('submitted', 'under_review', 'assigned', 'in_progress'))::int AS active_complaints
       FROM public.profiles p
       LEFT JOIN auth.users u ON u.id = p.id
       LEFT JOIN public.complaints c ON c.user_id = p.id
       WHERE p.id = $1
       GROUP BY p.id, u.email`,
      [targetUserId]
    );

    if (res.rows.length === 0) {
      return { success: false, profile: null, error: 'User profile not found' };
    }

    const row = res.rows[0];
    const total = row.total_complaints || 0;
    const rejected = row.rejected_complaints || 0;
    row.spam_score = total > 0 ? Math.round((rejected / total) * 100) : 0;

    return { success: true, profile: row, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch user moderation details';
    return { success: false, profile: null, error: msg };
  }
}

/**
 * Server action: Fetch all citizen users with their report statistics and spam flags for Admin Moderation.
 */
export async function fetchUsersForModerationAction(filter?: {
  search?: string;
  filterStatus?: 'all' | 'blocked' | 'active' | 'spam_suspects';
}): Promise<{
  success: boolean;
  users: UserModerationProfile[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, users: [], error: 'Unauthorized: Active session required' };
    }

    // Check caller role
    const callerRes = await query<{ role: string }>(
      `SELECT role FROM public.profiles WHERE id = $1`,
      [user.id]
    );
    const callerRole = callerRes.rows[0]?.role;
    if (callerRole !== 'admin' && callerRole !== 'official') {
      return { success: false, users: [], error: 'Forbidden: Admin or Official privileges required' };
    }

    const res = await query<UserModerationProfile>(
      `SELECT 
         p.id,
         p.full_name,
         p.phone,
         p.role,
         p.is_blocked,
         p.blocked_reason,
         p.blocked_at,
         p.blocked_by,
         p.created_at,
         p.updated_at,
         u.email,
         COUNT(c.id)::int AS total_complaints,
         COUNT(c.id) FILTER (WHERE c.status = 'rejected')::int AS rejected_complaints,
         COUNT(c.id) FILTER (WHERE c.status = 'resolved')::int AS resolved_complaints,
         COUNT(c.id) FILTER (WHERE c.status IN ('submitted', 'under_review', 'assigned', 'in_progress'))::int AS active_complaints
       FROM public.profiles p
       LEFT JOIN auth.users u ON u.id = p.id
       LEFT JOIN public.complaints c ON c.user_id = p.id
       GROUP BY p.id, u.email
       ORDER BY p.is_blocked DESC, COUNT(c.id) FILTER (WHERE c.status = 'rejected') DESC, p.created_at DESC`
    );

    let users = res.rows.map((row) => {
      const total = row.total_complaints || 0;
      const rejected = row.rejected_complaints || 0;
      row.spam_score = total > 0 ? Math.round((rejected / total) * 100) : 0;
      return row;
    });

    // Apply search filter if provided
    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      users = users.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.phone?.toLowerCase().includes(q)
      );
    }

    // Apply status filter
    if (filter?.filterStatus === 'blocked') {
      users = users.filter((u) => u.is_blocked);
    } else if (filter?.filterStatus === 'active') {
      users = users.filter((u) => !u.is_blocked);
    } else if (filter?.filterStatus === 'spam_suspects') {
      // Flag users with >= 2 rejected complaints or spam score >= 40%
      users = users.filter((u) => (u.rejected_complaints >= 2 || (u.spam_score || 0) >= 40) && !u.is_blocked);
    }

    return { success: true, users, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch users';
    return { success: false, users: [], error: msg };
  }
}
