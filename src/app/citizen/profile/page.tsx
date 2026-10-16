/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Shield,
  ArrowLeft,
  LogOut,
  Save,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  FileText,
  PlusCircle,
  MapPin,
  Lock,
} from 'lucide-react';
import { CitizenNav } from '@/components/layout/CitizenNav';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAuth } from '@/components/providers/AuthProvider';
import { formatComplaintDate } from '@/lib/complaints';
import { createClient } from '@/lib/supabase/client';
import {
  updateUserProfileAction,
  fetchUserStatsAction,
  UserStats,
} from '@/app/actions/profile';

export default function CitizenProfilePage() {
  const { user, profile, role, isLoading: authLoading, signOut, refreshProfile } = useAuth();
  const router = useRouter();

  // Profile Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isPending, startTransition] = useTransition();
  const [profileFeedback, setProfileFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Sign-Out Confirmation modal state
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  // Citizen activity statistics
  const [stats, setStats] = useState<UserStats>({
    totalReports: 0,
    resolvedReports: 0,
    inProgressReports: 0,
    pendingReports: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Role Protection: Citizens only
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirectTo=/citizen/profile');
      } else if (role && role !== 'citizen') {
        router.push('/official');
      }
    }
  }, [user, role, authLoading, router]);

  // Sync profile details into state
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
    } else if (user?.email) {
      setFullName(user.email.split('@')[0]);
    }
  }, [profile, user]);

  // Fetch citizen civic stats
  useEffect(() => {
    let isMounted = true;
    if (user && role === 'citizen') {
      fetchUserStatsAction()
        .then((res) => {
          if (isMounted && !res.error) {
            setStats(res.stats);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (isMounted) setLoadingStats(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [user, role]);

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileFeedback(null);

    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setProfileFeedback({
        type: 'error',
        text: 'Please enter a valid full name (at least 2 characters).',
      });
      return;
    }

    startTransition(async () => {
      const res = await updateUserProfileAction({
        fullName: trimmedName,
        phone: phone.trim() || null,
      });

      if (!res.success) {
        setProfileFeedback({
          type: 'error',
          text: res.error || 'Failed to update profile. Please try again.',
        });
      } else {
        await refreshProfile();
        setProfileFeedback({
          type: 'success',
          text: 'Your citizen profile information has been successfully updated.',
        });
        setTimeout(() => setProfileFeedback(null), 5000);
      }
    });
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (newPassword.length < 8) {
      setPasswordFeedback({
        type: 'error',
        text: 'Password must be at least 8 characters long.',
      });
      return;
    }

    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPasswordFeedback({
        type: 'error',
        text: 'Password must contain at least one letter and one number.',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({
        type: 'error',
        text: 'Passwords do not match. Please verify and try again.',
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const supabase = createClient();

      // Current session verification
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setPasswordFeedback({
          type: 'error',
          text: 'Current session has expired. Please log in again to update your password.',
        });
        setIsChangingPassword(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setPasswordFeedback({
          type: 'error',
          text: error.message || 'Failed to change password.',
        });
      } else {
        setPasswordFeedback({
          type: 'success',
          text: 'Password updated successfully.',
        });
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setPasswordFeedback(null);
          setShowPasswordSection(false);
        }, 4000);
      }
    } catch {
      setPasswordFeedback({
        type: 'error',
        text: 'An unexpected error occurred while updating password.',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingState message="Loading your citizen profile..." />
      </div>
    );
  }

  const displayName = profile?.full_name || fullName || user.email?.split('@')[0] || 'Citizen User';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <CitizenNav />

      <main className="flex-1 py-8 sm:py-12">
        <Container size="md" className="space-y-6 sm:space-y-8">
          {/* Top Breadcrumb */}
          <div className="flex items-center justify-between">
            <Link
              href="/citizen"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-navy-950 transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Back to Dashboard</span>
            </Link>
          </div>

          {/* Hero Profile Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-navy-950 via-slate-900 to-navy-900 border border-slate-200 text-white p-6 sm:p-8 shadow-xl">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-civic-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-civic-500 to-alert-500 text-white flex items-center justify-center shadow-lg shadow-civic-500/30 text-2xl font-black shrink-0">
                  {displayName.charAt(0).toUpperCase()}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      {displayName}
                    </h1>
                    <Badge variant="info" size="sm">
                      Verified Citizen
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300">
                    FixMyBharat Public Civic Contributor
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Account ID: {user.id.slice(0, 8)}...
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  id="citizen-signout-btn"
                  variant="outline-dark"
                  size="sm"
                  onClick={() => setShowSignOutModal(true)}
                  leftIcon={<LogOut size={14} />}
                  className="text-xs"
                >
                  Sign Out
                </Button>
              </div>
            </div>

            {/* Civic Impact Metrics Strip */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-8 pt-6 border-t border-navy-800/80">
              <div className="p-3.5 rounded-2xl bg-navy-900/60 border border-navy-800 text-center sm:text-left">
                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Reports Filed</span>
                <span className="text-xl sm:text-2xl font-black text-white mt-1 block">
                  {loadingStats ? '—' : stats.totalReports}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-navy-900/60 border border-navy-800 text-center sm:text-left">
                <span className="text-[11px] font-semibold text-emerald-400 block uppercase tracking-wider">Resolved</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-300 mt-1 block">
                  {loadingStats ? '—' : stats.resolvedReports}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-navy-900/60 border border-navy-800 text-center sm:text-left">
                <span className="text-[11px] font-semibold text-amber-400 block uppercase tracking-wider">In Progress</span>
                <span className="text-xl sm:text-2xl font-black text-amber-300 mt-1 block">
                  {loadingStats ? '—' : stats.inProgressReports}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Columns: Editable Details */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-slate-200 bg-white shadow-md overflow-hidden">
                <CardHeader className="bg-slate-50/80 border-b border-slate-200 py-4 px-6 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <User size={18} className="text-civic-600" />
                    <h2 className="text-base font-bold text-navy-950">Profile & Contact Details</h2>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">Public Civic Identity</span>
                </CardHeader>

                <CardBody className="p-6 space-y-6">
                  {profileFeedback && (
                    <div
                      className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 transition-all ${
                        profileFeedback.type === 'success'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-rose-50 border-rose-200 text-rose-800'
                      }`}
                    >
                      {profileFeedback.type === 'success' ? (
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle size={16} className="text-rose-600 shrink-0" />
                      )}
                      <span>{profileFeedback.text}</span>
                    </div>
                  )}

                  <form onSubmit={handleProfileSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label htmlFor="citizen-fullname" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Full Name <span className="text-rose-600">*</span>
                      </label>
                      <input
                        id="citizen-fullname"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Chandra Sekhar"
                        required
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-civic-500/20 focus:border-civic-600 transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="citizen-phone" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Phone Number
                      </label>
                      <input
                        id="citizen-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-civic-500/20 focus:border-civic-600 transition-all"
                      />
                      <p className="text-[11px] text-slate-500">
                        Used to notify you via SMS/WhatsApp when municipal workers update your complaints.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Registered Email Address
                      </label>
                      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm">
                        <span className="font-semibold text-navy-950">{user.email}</span>
                        <Badge variant="success" size="sm">
                          Verified
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Your registered email address is securely verified in Supabase Auth. Email changes require confirmation links sent to both current and new email addresses to prevent account takeover.
                      </p>
                    </div>

                    <div className="pt-3 flex justify-end">
                      <Button
                        id="save-citizen-profile-btn"
                        type="submit"
                        variant="primary"
                        disabled={isPending}
                        leftIcon={<Save size={15} />}
                      >
                        {isPending ? 'Saving...' : 'Save Profile Changes'}
                      </Button>
                    </div>
                  </form>
                </CardBody>
              </Card>

              {/* Password & Security Card */}
              <Card className="border-slate-200 bg-white shadow-md overflow-hidden">
                <CardHeader className="bg-slate-50/80 border-b border-slate-200 py-4 px-6 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <KeyRound size={18} className="text-civic-600" />
                    <h2 className="text-base font-bold text-navy-950">Password & Security</h2>
                  </div>
                  <Button
                    id="toggle-citizen-password-btn"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPasswordSection(!showPasswordSection)}
                    className="text-xs text-slate-600"
                  >
                    {showPasswordSection ? 'Cancel' : 'Change Password'}
                  </Button>
                </CardHeader>

                <CardBody className="p-6">
                  {showPasswordSection ? (
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                      {passwordFeedback && (
                        <div
                          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                            passwordFeedback.type === 'success'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-rose-50 border-rose-200 text-rose-800'
                          }`}
                        >
                          {passwordFeedback.type === 'success' ? (
                            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                          ) : (
                            <AlertCircle size={16} className="text-rose-600 shrink-0" />
                          )}
                          <span>{passwordFeedback.text}</span>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label htmlFor="citizen-new-password" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                          New Password <span className="text-rose-600">*</span>
                        </label>
                        <input
                          id="citizen-new-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          required
                          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-civic-500/20 focus:border-civic-600 transition-all"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="citizen-confirm-password" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                          Confirm New Password <span className="text-rose-600">*</span>
                        </label>
                        <input
                          id="citizen-confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter new password"
                          required
                          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-civic-500/20 focus:border-civic-600 transition-all"
                        />
                      </div>

                      <div className="pt-2 flex justify-end gap-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowPasswordSection(false)}
                          className="text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          id="submit-citizen-password-btn"
                          type="submit"
                          variant="primary"
                          size="sm"
                          disabled={isChangingPassword}
                          leftIcon={<Lock size={14} />}
                        >
                          {isChangingPassword ? 'Saving...' : 'Update Password'}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-800">Password Active</p>
                        <p className="text-slate-500">Keep your civic account credentials secure.</p>
                      </div>
                      <Button
                        id="open-citizen-password-btn"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPasswordSection(true)}
                        className="text-xs"
                      >
                        Change Password
                      </Button>
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>

            {/* Right Column: Account Stats & Shortcuts */}
            <div className="space-y-6">
              <Card className="border-slate-200 bg-white shadow-md overflow-hidden">
                <CardHeader className="bg-slate-50/80 border-b border-slate-200 py-4 px-6">
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-civic-600" />
                    <h3 className="text-sm font-bold text-navy-950">Citizen Security</h3>
                  </div>
                </CardHeader>
                <CardBody className="p-6 space-y-4 text-xs">
                  <div className="space-y-1 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                      Account Role
                    </span>
                    <span className="font-bold text-navy-950 capitalize flex items-center justify-between">
                      <span>{profile?.role || role || 'citizen'}</span>
                      <span className="text-[10px] font-normal text-slate-400 font-mono">Immutable</span>
                    </span>
                  </div>

                  <div className="space-y-1 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                      Joined Date
                    </span>
                    <span className="font-medium text-slate-700">
                      {profile?.created_at
                        ? formatComplaintDate(profile.created_at)
                        : user?.created_at
                        ? formatComplaintDate(user.created_at)
                        : 'Active'}
                    </span>
                  </div>

                  <div className="space-y-1 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                      Civic User Identifier
                    </span>
                    <span className="font-mono text-slate-500 text-[11px] break-all block">
                      {user.id}
                    </span>
                  </div>
                </CardBody>
              </Card>

              {/* Fast Navigation Shortcuts */}
              <Card className="border-slate-200 bg-white shadow-md overflow-hidden">
                <CardHeader className="bg-slate-50/80 border-b border-slate-200 py-4 px-6">
                  <h3 className="text-sm font-bold text-navy-950">Civic Shortcuts</h3>
                </CardHeader>
                <CardBody className="p-4 space-y-2">
                  <Link
                    href="/citizen/report"
                    className="flex items-center justify-between p-3 rounded-xl bg-civic-50/50 hover:bg-civic-50 border border-civic-200 text-xs text-civic-950 font-semibold transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <PlusCircle size={15} className="text-civic-600" />
                      <span>Report a New Issue</span>
                    </div>
                  </Link>

                  <Link
                    href="/citizen/reports"
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-xs text-slate-700 hover:text-navy-950 transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText size={14} className="text-slate-500" />
                      <span>View All My Reports</span>
                    </div>
                  </Link>

                  <Link
                    href="/citizen/map"
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-xs text-slate-700 hover:text-navy-950 transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <MapPin size={14} className="text-slate-500" />
                      <span>Explore Civic Map</span>
                    </div>
                  </Link>
                </CardBody>
              </Card>
            </div>
          </div>
        </Container>
      </main>

      {/* Sign Out Confirmation Modal */}
      <Modal
        isOpen={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        title="Confirm Sign Out"
        subtitle="End your FixMyBharat session"
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowSignOutModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => {
                setShowSignOutModal(false);
                signOut();
              }}
              leftIcon={<LogOut size={14} />}
            >
              Confirm Sign Out
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 leading-relaxed">
          Are you sure you want to sign out of your FixMyBharat account? You will need to sign back in with your credentials to submit complaints and track updates.
        </p>
      </Modal>

      <footer className="py-6 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
        <p>FixMyBharat Civic Operations Desk • Built by Team SyncMates</p>
      </footer>
    </div>
  );
}
