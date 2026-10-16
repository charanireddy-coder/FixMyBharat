'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getCurrentProfile } from '@/lib/auth';
import { UserProfile, UserRole } from '@/types';

interface AuthContextValue {
  user: {
    id: string;
    email?: string;
    created_at?: string;
  } | null;
  profile: UserProfile | null;
  role: UserRole | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  role: null,
  isLoading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ id: string; email?: string; created_at?: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const supabase = createClient();

  const syncUserProfile = useCallback(async () => {
    try {
      const result = await getCurrentProfile(supabase);
      if (result.user) {
        setUser(result.user);
        setProfile(result.profile);
        setRole(result.role);
      } else {
        setUser(null);
        setProfile(null);
        setRole(null);
      }
    } catch {
      setUser(null);
      setProfile(null);
      setRole(null);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    let isMounted = true;

    // Use onAuthStateChange which automatically handles INITIAL_SESSION, SIGNED_IN, SIGNED_OUT
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        try {
          const result = await getCurrentProfile(supabase);
          if (!isMounted) return;
          if (result.user) {
            setUser(result.user);
            setProfile(result.profile);
            setRole(result.role);
          } else {
            setUser(null);
            setProfile(null);
            setRole(null);
          }
        } catch {
          if (!isMounted) return;
          setUser(null);
          setProfile(null);
          setRole(null);
        }
      } else {
        setUser(null);
        setProfile(null);
        setRole(null);
      }

      if (isMounted) {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setRole(null);
      router.push('/login');
    } catch {
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  }, [supabase, router]);

  const refreshProfile = useCallback(async () => {
    await syncUserProfile();
  }, [syncUserProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isLoading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
