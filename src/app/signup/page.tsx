'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Landmark, Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import { LoadingState } from '@/components/ui/LoadingState';
import { createClient } from '@/lib/supabase/client';
import { getAuthErrorMessage } from '@/lib/auth';
import { useAuth } from '@/components/providers/AuthProvider';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState<{
    autoLoggedIn: boolean;
    email: string;
  } | null>(null);

  const router = useRouter();
  const { user, role, isLoading: authLoading, refreshProfile } = useAuth();
  const supabase = createClient();

  // If already authenticated and not on success screen, redirect to appropriate workspace
  useEffect(() => {
    if (!authLoading && user && role && !signupSuccess) {
      router.push(role === 'citizen' ? '/citizen' : '/official');
    }
  }, [user, role, authLoading, signupSuccess, router]);

  const validate = () => {
    const newErrors: {
      fullName?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
      general?: string;
    } = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required.';
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters.';
    }

    if (!email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Password confirmation does not match.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      // Create user in Supabase Auth.
      // Database trigger automatically creates the corresponding public.profiles entry.
      // Do NOT manually insert into profiles table from frontend.
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (signUpError) {
        console.error('Supabase sign-up error:', signUpError);
        setErrors({ general: getAuthErrorMessage(signUpError) });
        setIsSubmitting(false);
        return;
      }

      const hasSession = !!data.session;
      if (hasSession) {
        await refreshProfile();
      }

      setSignupSuccess({
        autoLoggedIn: hasSession,
        email: email.trim(),
      });
      setIsSubmitting(false);
    } catch (err: unknown) {
      console.error('Signup submission caught error:', err);
      setErrors({ general: getAuthErrorMessage(err) });
      setIsSubmitting(false);
    }
  };

  if (authLoading && !signupSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingState message="Checking session..." />
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
            Create your FixMyBharat account.
          </h1>
          <p className="text-sm text-slate-600 max-w-sm mx-auto">
            Join your community in making civic problems visible and actionable.
          </p>
        </div>

        {/* Signup Card */}
        <Card className="border-slate-200/90 shadow-xl bg-white/95 backdrop-blur-sm">
          <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Citizen Registration
            </span>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-civic-600">
              <Shield size={13} />
              <span>Public Infrastructure</span>
            </div>
          </CardHeader>

          <CardBody className="p-6 sm:p-8 space-y-5">
            {/* Success State */}
            {signupSuccess ? (
              <div className="text-center py-6 space-y-4 animate-in fade-in duration-200">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 size={32} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xl font-bold text-navy-950">Registration Successful</h3>
                  {signupSuccess.autoLoggedIn ? (
                    <p className="text-sm text-slate-600 max-w-sm mx-auto">
                      Your citizen account has been created. You can now access your citizen workspace and report civic issues.
                    </p>
                  ) : (
                    <p className="text-sm text-slate-600 max-w-sm mx-auto">
                      Your account has been registered for <strong>{signupSuccess.email}</strong>. If a verification link was dispatched to your inbox, please verify it and then sign in.
                    </p>
                  )}
                </div>

                <div className="pt-4 flex flex-col gap-2.5">
                  {signupSuccess.autoLoggedIn ? (
                    <Link href="/citizen">
                      <Button variant="accent" size="lg" className="w-full">
                        Enter Citizen Dashboard
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/login">
                      <Button variant="accent" size="lg" className="w-full">
                        Proceed to Login
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <>
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

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  {/* Full Name Field */}
                  <Input
                    label="Full Name"
                    type="text"
                    name="fullName"
                    autoComplete="name"
                    placeholder="Chandra Sekhar"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    error={errors.fullName}
                    leftIcon={<User size={16} />}
                    disabled={isSubmitting}
                  />

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
                  <Input
                    label="Password"
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={errors.password}
                    leftIcon={<Lock size={16} />}
                    disabled={isSubmitting}
                  />

                  {/* Confirm Password Field */}
                  <Input
                    label="Confirm Password"
                    type="password"
                    name="confirmPassword"
                    autoComplete="new-password"
                    placeholder="Re-enter password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    error={errors.confirmPassword}
                    leftIcon={<Lock size={16} />}
                    disabled={isSubmitting}
                  />

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
                      {isSubmitting ? 'Creating Account...' : 'Create Account'}
                    </Button>
                  </div>
                </form>

                {/* Switch to Login */}
                <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
                  Already have an account?{' '}
                  <Link
                    href="/login"
                    className="font-bold text-civic-600 hover:text-civic-800 underline underline-offset-2"
                  >
                    Sign In
                  </Link>
                </div>
              </>
            )}
          </CardBody>
        </Card>

        {/* Footer Note */}
        <div className="mt-8 text-center text-xs text-slate-400">
          <p>© 2026 FixMyBharat • Built by Team SyncMates</p>
        </div>
      </Container>
    </div>
  );
}
