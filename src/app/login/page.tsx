'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Landmark, Mail, Lock, ArrowRight, AlertCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import { LoadingState } from '@/components/ui/LoadingState';
import { createClient } from '@/lib/supabase/client';
import { getCurrentProfile, getAuthErrorMessage } from '@/lib/auth';
import { useAuth } from '@/components/providers/AuthProvider';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotPasswordNotice, setForgotPasswordNotice] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');

  const { user, role, isLoading: authLoading, refreshProfile } = useAuth();
  const supabase = createClient();

  // If already authenticated, redirect to appropriate workspace immediately
  useEffect(() => {
    if (!authLoading && user && role) {
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.push(role === 'citizen' ? '/citizen' : '/official');
      }
    }
  }, [user, role, authLoading, redirectTo, router]);

  const validate = () => {
    const newErrors: { email?: string; password?: string; general?: string } = {};
    if (!email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setForgotPasswordNotice(false);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setErrors({ general: getAuthErrorMessage(signInError) });
        setIsSubmitting(false);
        return;
      }

      // Fetch user profile to determine role
      await refreshProfile();
      const profileResult = await getCurrentProfile(supabase);

      const targetRole = profileResult.role || 'citizen';
      const targetDestination = redirectTo || (targetRole === 'citizen' ? '/citizen' : '/official');

      router.push(targetDestination);
    } catch (err: unknown) {
      setErrors({ general: getAuthErrorMessage(err) });
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingState message="Verifying session..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50 relative overflow-hidden">
      {/* Background ambient accents */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 10%, #0EA5E9 0%, #F97316 20%, transparent 60%)',
        }}
      />

      <Container size="sm" className="relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8 space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-civic-500 to-alert-500 flex items-center justify-center text-white shadow-md shadow-civic-500/20 group-hover:scale-105 transition-transform duration-200">
              <Landmark size={20} />
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-navy-950">
              FixMy<span className="text-alert-500">Bharat</span>
            </span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 tracking-tight mt-4">
            Welcome back.
          </h1>
          <p className="text-sm text-slate-600 max-w-sm mx-auto">
            Sign in to report issues and track civic action.
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-slate-200/90 shadow-xl bg-white/95 backdrop-blur-sm">
          <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Civic Account Access
            </span>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-civic-600">
              <Shield size={13} />
              <span>Secure Authentication</span>
            </div>
          </CardHeader>

          <CardBody className="p-6 sm:p-8 space-y-5">
            {/* General Error Notice */}
            {errors.general && (
              <div
                role="alert"
                className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-150"
              >
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium">{errors.general}</span>
              </div>
            )}

            {/* Forgot Password Notice */}
            {forgotPasswordNotice && (
              <div
                role="status"
                className="p-3.5 rounded-lg bg-civic-50 border border-civic-200 text-civic-900 text-xs space-y-1 animate-in fade-in duration-150"
              >
                <div className="font-bold flex items-center gap-1.5">
                  <Shield size={14} className="text-civic-600" />
                  <span>Password Recovery</span>
                </div>
                <p className="text-slate-600">
                  Self-service password reset is in preparation. For urgent credential assistance, please contact municipal tech support or sign up with an active email address.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Email Field */}
              <Input
                label="Email Address"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="citizen@fixmybharat.in"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                leftIcon={<Mail size={16} />}
                disabled={isSubmitting}
              />

              {/* Password Field */}
              <div className="space-y-1">
                <Input
                  label="Password"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errors.password}
                  leftIcon={<Lock size={16} />}
                  disabled={isSubmitting}
                />
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setForgotPasswordNotice(!forgotPasswordNotice)}
                    className="text-xs font-semibold text-civic-600 hover:text-civic-800 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  variant="accent"
                  size="lg"
                  className="w-full"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                  rightIcon={!isSubmitting ? <ArrowRight size={18} /> : undefined}
                >
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </Button>
              </div>
            </form>

            {/* Switch to Signup */}
            <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
              Don&apos;t have an account yet?{' '}
              <Link
                href="/signup"
                className="font-bold text-civic-600 hover:text-civic-800 underline underline-offset-2"
              >
                Create an Account
              </Link>
            </div>
          </CardBody>
        </Card>

        {/* Footer Note */}
        <div className="mt-8 text-center text-xs text-slate-400">
          <p>© 2026 FixMyBharat • Initiative by Team SyncMates</p>
        </div>
      </Container>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <LoadingState message="Loading login..." />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
