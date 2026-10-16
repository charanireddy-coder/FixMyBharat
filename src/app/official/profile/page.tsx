/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Shield,
  ShieldAlert,
  LogOut,
  Save,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Activity,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building2,
  Lock,
} from 'lucide-react';
import { OfficialNav } from '@/components/layout/OfficialNav';
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

export default function OfficialProfilePage() {
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

  // Stats state
  const [stats, setStats] = useState<UserStats>({
    totalReports: 0,
    resolvedReports: 0,
    inProgressReports: 0,
    pendingReports: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Guard access: Official or Admin only
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirectTo=/official/profile');
      } else if (role === 'citizen') {
        router.push('/citizen');
      }
    }
  }, [user, role, authLoading, router]);

  // Sync profile details into form fields
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
    } else if (user?.email) {
      setFullName(user.email.split('@')[0]);
    }
  }, [profile, user]);

  // Load operational stats
  useEffect(() => {
    let isMounted = true;
    if (user && (role === 'official' || role === 'admin')) {
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
          text: res.error || 'Failed to update official profile. Please try again.',
        });
      } else {
        await refreshProfile();
        setProfileFeedback({
          type: 'success',
          text: 'Official credentials and contact details updated successfully.',
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
        text: 'New password must be at least 8 characters long.',
      });
      return;
    }

    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPasswordFeedback({
        type: 'error',
        text: 'New password must contain at least one letter and one number.',
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
          text: 'Current session has expired. Please re-authenticate before changing your password.',
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
          text: error.message || 'Failed to update password.',
        });
      } else {
        setPasswordFeedback({
          type: 'success',
          text: 'Password updated successfully. Keep your credentials secure.',
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
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
        <LoadingState message="Loading official profile..." />
      </div>
    );
  }

  const displayName = profile?.full_name || fullName || user.email?.split('@')[0] || 'Authorized Official';
  const isAdmin = role === 'admin';

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      <OfficialNav />

      <main className="flex-1 py-10 sm:py-14">
        <Container size="md" className="space-y-8">
          {/* Top Banner / Hero Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-navy-950 via-slate-900 to-navy-900 border border-navy-800 p-6 sm:p-8 shadow-2xl">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-civic-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-civic-500 via-sky-500 to-alert-500 text-white flex items-center justify-center shadow-xl shadow-civic-500/25 border-2 border-white/10">
                    {isAdmin ? <ShieldAlert size={38} /> : <Shield size={38} />}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-navy-950 flex items-center justify-center" title="Active Duty">
                    <ShieldCheck size={13} className="text-white" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      {displayName}
                    </h1>
                    <Badge variant={isAdmin ? 'danger' : 'warning'} size="sm">
                      {isAdmin ? 'Administrator' : 'Civic Official'}
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 flex items-center justify-center sm:justify-start gap-2">
                    <Building2 size={14} className="text-slate-400" />
                    <span>Municipal Authority Operations Desk</span>
                    <span className="text-slate-500">•</span>
                    <span className="font-mono text-slate-400 text-xs">ID: {user.id.slice(0, 8)}...</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  id="official-signout-btn"
                  variant="outline-dark"
                  size="sm"
                  onClick={() => setShowSignOutModal(true)}
                  leftIcon={<LogOut size={15} />}
                  className="text-xs"
                >
                  Sign Out
                </Button>
              </div>
            </div>

            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-8 pt-6 border-t border-navy-800/80">
              <div className="p-3.5 rounded-2xl bg-navy-900/60 border border-navy-800 text-center sm:text-left">
                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Assigned to Me</span>
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
                <span className="text-[11px] font-semibold text-sky-400 block uppercase tracking-wider">Active Queue</span>
                <span className="text-xl sm:text-2xl font-black text-sky-300 mt-1 block">
                  {loadingStats ? '—' : stats.inProgressReports}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Columns: Editable Profile Form */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-navy-800 bg-navy-950 shadow-xl overflow-hidden">
                <CardHeader className="bg-navy-900/60 border-b border-navy-800 py-4 px-6 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <User size={18} className="text-civic-400" />
                    <h2 className="text-base font-bold text-white">Official Information & Contact Details</h2>
                  </div>
                  <span className="text-xs text-slate-400">Live DB Profile</span>
                </CardHeader>

                <CardBody className="p-6 space-y-6">
                  {profileFeedback && (
                    <div
                      className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 transition-all ${
                        profileFeedback.type === 'success'
                          ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-200'
                          : 'bg-rose-950/60 border-rose-800/80 text-rose-200'
                      }`}
                    >
                      {profileFeedback.type === 'success' ? (
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle size={16} className="text-rose-400 shrink-0" />
                      )}
                      <span>{profileFeedback.text}</span>
                    </div>
                  )}

                  <form onSubmit={handleProfileSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label htmlFor="official-fullname" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Official Full Name <span className="text-rose-400">*</span>
                      </label>
                      <input
                        id="official-fullname"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. S. Ramanujan"
                        required
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-navy-800 bg-navy-900 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-civic-500/30 focus:border-civic-500 transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="official-phone" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Duty Phone Number
                      </label>
                      <input
                        id="official-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-navy-800 bg-navy-900 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-civic-500/30 focus:border-civic-500 transition-all"
                      />
                      <p className="text-[11px] text-slate-400">
                        Used for dispatch escalations, departmental notices, and field communications.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Official Email Address
                      </label>
                      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-navy-900/60 border border-navy-800/80 text-sm">
                        <span className="font-medium text-slate-300">{user.email}</span>
                        <Badge variant="default" size="sm" className="border-navy-700 bg-navy-900 text-slate-400">
                          Primary Verified
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Email is linked to your Supabase security token. Email changes require verification links sent to both your current and new addresses to prevent unauthorized account takeover.
                      </p>
                    </div>

                    <div className="pt-3 flex justify-end">
                      <Button
                        id="save-official-profile-btn"
                        type="submit"
                        variant="accent"
                        disabled={isPending}
                        leftIcon={<Save size={15} />}
                      >
                        {isPending ? 'Saving Changes...' : 'Save Profile Changes'}
                      </Button>
                    </div>
                  </form>
                </CardBody>
              </Card>

              {/* Security & Password Section */}
              <Card className="border-navy-800 bg-navy-950 shadow-xl overflow-hidden">
                <CardHeader className="bg-navy-900/60 border-b border-navy-800 py-4 px-6 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <KeyRound size={18} className="text-alert-400" />
                    <h2 className="text-base font-bold text-white">Access Credentials & Security</h2>
                  </div>
                  <Button
                    id="toggle-password-section-btn"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPasswordSection(!showPasswordSection)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    {showPasswordSection ? 'Cancel' : 'Update Password'}
                  </Button>
                </CardHeader>

                <CardBody className="p-6">
                  {showPasswordSection ? (
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                      {passwordFeedback && (
                        <div
                          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                            passwordFeedback.type === 'success'
                              ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-200'
                              : 'bg-rose-950/60 border-rose-800/80 text-rose-200'
                          }`}
                        >
                          {passwordFeedback.type === 'success' ? (
                            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                          ) : (
                            <AlertCircle size={16} className="text-rose-400 shrink-0" />
                          )}
                          <span>{passwordFeedback.text}</span>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label htmlFor="official-new-password" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                          New Security Password <span className="text-rose-400">*</span>
                        </label>
                        <input
                          id="official-new-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          required
                          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-navy-800 bg-navy-900 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-civic-500/30 focus:border-civic-500 transition-all"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="official-confirm-password" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                          Confirm New Password <span className="text-rose-400">*</span>
                        </label>
                        <input
                          id="official-confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter new password"
                          required
                          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-navy-800 bg-navy-900 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-civic-500/30 focus:border-civic-500 transition-all"
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
                          id="submit-password-change-btn"
                          type="submit"
                          variant="accent"
                          size="sm"
                          disabled={isChangingPassword}
                          leftIcon={<Lock size={14} />}
                        >
                          {isChangingPassword ? 'Updating...' : 'Set New Password'}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between text-xs">
                      <div className="space-y-1">
                        <p className="font-semibold text-white">Password Authentication Active</p>
                        <p className="text-slate-400">Your account is secured via enterprise-grade Argon2/Bcrypt hash verification.</p>
                      </div>
                      <Button
                        id="open-change-password-btn"
                        variant="outline-dark"
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

            {/* Right Column: Municipal Badges & System Details */}
            <div className="space-y-6">
              <Card className="border-navy-800 bg-navy-950 shadow-xl overflow-hidden">
                <CardHeader className="bg-navy-900/60 border-b border-navy-800 py-4 px-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-civic-400" />
                    <h3 className="text-sm font-bold text-white">System Clearance</h3>
                  </div>
                </CardHeader>
                <CardBody className="p-6 space-y-4 text-xs">
                  <div className="space-y-1 p-3 rounded-xl bg-navy-900/60 border border-navy-800">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                      Authority Level
                    </span>
                    <span className="font-bold text-white">
                      {isAdmin ? 'Level 4 • Administrator' : 'Level 2 • Civic Field Official'}
                    </span>
                  </div>

                  <div className="space-y-1 p-3 rounded-xl bg-navy-900/60 border border-navy-800">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                      Assigned Scope
                    </span>
                    <span className="font-medium text-slate-300">
                      All Municipal Jurisdictions & Hotspots
                    </span>
                  </div>

                  <div className="space-y-1 p-3 rounded-xl bg-navy-900/60 border border-navy-800">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                      Registration Date
                    </span>
                    <span className="font-medium text-slate-300">
                      {profile?.created_at
                        ? formatComplaintDate(profile.created_at)
                        : user?.created_at
                        ? formatComplaintDate(user.created_at)
                        : 'Active'}
                    </span>
                  </div>

                  <div className="space-y-1 p-3 rounded-xl bg-navy-900/60 border border-navy-800">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                      Security Token UUID
                    </span>
                    <span className="font-mono text-slate-400 text-[11px] break-all block">
                      {user.id}
                    </span>
                  </div>
                </CardBody>
              </Card>

              {/* Fast Navigation Card */}
              <Card className="border-navy-800 bg-navy-950 shadow-xl overflow-hidden">
                <CardHeader className="bg-navy-900/60 border-b border-navy-800 py-4 px-6">
                  <h3 className="text-sm font-bold text-white">Operational Shortcuts</h3>
                </CardHeader>
                <CardBody className="p-4 space-y-2">
                  <Link
                    href="/official/complaints"
                    className="flex items-center justify-between p-3 rounded-xl bg-navy-900/40 hover:bg-navy-900 border border-navy-800 hover:border-navy-700 text-xs text-slate-300 hover:text-white transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Layers size={14} className="text-civic-400" />
                      <span>Complaints Queue</span>
                    </div>
                    <ArrowRight size={13} className="text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                  </Link>

                  <Link
                    href="/official/map"
                    className="flex items-center justify-between p-3 rounded-xl bg-navy-900/40 hover:bg-navy-900 border border-navy-800 hover:border-navy-700 text-xs text-slate-300 hover:text-white transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Activity size={14} className="text-alert-400" />
                      <span>Civic Hotspots Map</span>
                    </div>
                    <ArrowRight size={13} className="text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                  </Link>

                  <Link
                    href="/official/departments"
                    className="flex items-center justify-between p-3 rounded-xl bg-navy-900/40 hover:bg-navy-900 border border-navy-800 hover:border-navy-700 text-xs text-slate-300 hover:text-white transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 size={14} className="text-sky-400" />
                      <span>Municipal Departments</span>
                    </div>
                    <ArrowRight size={13} className="text-slate-500 group-hover:translate-x-0.5 transition-transform" />
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
        title="Confirm Operational Sign Out"
        subtitle="End your official session"
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
          Are you sure you want to sign out of the Civic Operations Desk? You will need your official credentials to resume handling municipal complaints and triage workflows.
        </p>
      </Modal>

      <footer className="py-6 border-t border-navy-800 bg-navy-950 text-center text-xs text-slate-500">
        <p>FixMyBharat Civic Operations Desk • Built by Team SyncMates</p>
      </footer>
    </div>
  );
}
