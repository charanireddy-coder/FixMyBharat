import { SupabaseClient } from '@supabase/supabase-js';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { UserProfile, UserRole } from '@/types';

export interface CurrentProfileResult {
  user: {
    id: string;
    email?: string;
    created_at?: string;
  } | null;
  profile: UserProfile | null;
  role: UserRole | null;
  error?: string | null;
}

/**
 * Retrieves the current authenticated user's profile and role directly from public.profiles.
 * Never trusts role from localStorage.
 */
export async function getCurrentProfile(
  customClient?: SupabaseClient
): Promise<CurrentProfileResult> {
  const supabase = customClient || createBrowserClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      user: null,
      profile: null,
      role: null,
      error: userError ? userError.message : 'No active session',
    };
  }

  // Attempt to fetch profile from public.profiles
  let { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, phone, role, created_at, updated_at')
    .eq('id', user.id)
    .maybeSingle();

  // If newly registered, wait briefly once for the database trigger to finish inserting
  if (!profile && !profileError) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const retry = await supabase
      .from('profiles')
      .select('id, full_name, phone, role, created_at, updated_at')
      .eq('id', user.id)
      .maybeSingle();
    profile = retry.data;
    profileError = retry.error;
  }

  if (profileError || !profile) {
    return {
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
      profile: null,
      role: 'citizen',
      error: profileError ? profileError.message : 'Profile record pending',
    };
  }

  const role = (profile.role as UserRole) || 'citizen';

  return {
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    },
    profile: profile as UserProfile,
    role,
    error: null,
  };
}

/**
 * Formats Supabase Auth errors into human-friendly, professional civic-tech error messages.
 */
export function getAuthErrorMessage(error: unknown): string {
  if (!error) return '';

  let rawMessage = '';
  if (error instanceof Error) {
    rawMessage = error.message;
  } else if (typeof error === 'object' && error !== null && 'message' in error) {
    rawMessage = String((error as { message: unknown }).message);
  } else if (typeof error === 'string') {
    rawMessage = error;
  }

  const message = rawMessage.toLowerCase();

  if (
    message.includes('invalid login credentials') ||
    message.includes('invalid email or password') ||
    message.includes('invalid_grant')
  ) {
    return 'Email or password is incorrect.';
  }

  if (
    message.includes('user already registered') ||
    message.includes('already exists') ||
    message.includes('email address is already in use')
  ) {
    return 'An account with this email already exists.';
  }

  if (
    message.includes('password should be') ||
    message.includes('weak password') ||
    message.includes('password is too short') ||
    message.includes('password must be')
  ) {
    return 'Please choose a stronger password.';
  }

  if (
    message.includes('network') ||
    message.includes('failed to fetch') ||
    message.includes('timeout') ||
    message.includes('connection refused')
  ) {
    return "We couldn't complete the request. Please try again.";
  }

  if (
    message.includes('over_email_send_rate_limit') ||
    message.includes('email rate limit')
  ) {
    return 'Email verification rate limit reached. Please wait a few minutes before trying again.';
  }

  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  if (
    (message.includes('email') && message.includes('invalid')) ||
    message.includes('email address')
  ) {
    return 'Please enter a valid email address from a supported email provider.';
  }

  if (message.includes('email not confirmed')) {
    return 'Please verify your email address before signing in.';
  }

  return rawMessage || "We couldn't complete the request. Please try again.";
}
