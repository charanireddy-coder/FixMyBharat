'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  Search,
  UserCheck,
  Ban,
  AlertTriangle,
  RefreshCw,
  XCircle,
  FileSpreadsheet,
  Clock,
  Mail,
  Phone,
  Shield,
  Filter,
} from 'lucide-react';
import { OfficialNav } from '@/components/layout/OfficialNav';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  fetchUsersForModerationAction,
  blockUserAction,
  unblockUserAction,
  UserModerationProfile,
} from '@/app/actions/moderation';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function UserModerationPage() {
  const { user, role, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserModerationProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'blocked' | 'spam_suspects' | 'active'>('all');

  // Modal / Action state
  const [selectedUserForBlock, setSelectedUserForBlock] = useState<UserModerationProfile | null>(null);
  const [blockReason, setBlockReason] = useState('Repeated portal spam / fraudulent complaint submissions');
  const [isSubmittingBlock, setIsSubmittingBlock] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auth Protection
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirectTo=/official/users');
      } else if (role !== 'official' && role !== 'admin') {
        router.push('/citizen');
      }
    }
  }, [user, role, authLoading, router]);

  // Load Users Data
  const loadUsers = async () => {
    try {
      const res = await fetchUsersForModerationAction();
      if (res.success) {
        setUsers(res.users);
      } else {
        setActionFeedback({ type: 'error', text: res.error || 'Failed to load users' });
      }
    } catch {
      setActionFeedback({ type: 'error', text: 'Network error while loading users' });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (user && (role === 'official' || role === 'admin')) {
      loadUsers();
    }
  }, [user, role]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.phone?.toLowerCase().includes(q)
      );
    }

    // Status Tab filter
    if (filterTab === 'blocked') {
      result = result.filter((u) => u.is_blocked);
    } else if (filterTab === 'spam_suspects') {
      result = result.filter((u) => !u.is_blocked && ((u.spam_score || 0) >= 30 || u.rejected_complaints >= 2));
    } else if (filterTab === 'active') {
      result = result.filter((u) => !u.is_blocked);
    }

    return result;
  }, [users, searchQuery, filterTab]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const total = users.length;
    const blocked = users.filter((u) => u.is_blocked).length;
    const suspects = users.filter((u) => !u.is_blocked && ((u.spam_score || 0) >= 30 || u.rejected_complaints >= 2)).length;
    const active = total - blocked;
    return { total, blocked, suspects, active };
  }, [users]);

  // Block Handler
  const handleConfirmBlock = async () => {
    if (!selectedUserForBlock) return;
    setIsSubmittingBlock(true);
    setActionFeedback(null);
    try {
      const res = await blockUserAction(selectedUserForBlock.id, blockReason);
      if (res.success) {
        setActionFeedback({
          type: 'success',
          text: `User ${selectedUserForBlock.full_name || selectedUserForBlock.email} has been suspended from reporting.`,
        });
        setSelectedUserForBlock(null);
        await loadUsers();
      } else {
        setActionFeedback({ type: 'error', text: res.error || 'Failed to block user' });
      }
    } catch {
      setActionFeedback({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setIsSubmittingBlock(false);
    }
  };

  // Unblock Handler
  const handleUnblock = async (u: UserModerationProfile) => {
    setIsSubmittingBlock(true);
    setActionFeedback(null);
    try {
      const res = await unblockUserAction(u.id);
      if (res.success) {
        setActionFeedback({
          type: 'success',
          text: `Reporting privileges restored for ${u.full_name || u.email}.`,
        });
        await loadUsers();
      } else {
        setActionFeedback({ type: 'error', text: res.error || 'Failed to unblock user' });
      }
    } catch {
      setActionFeedback({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setIsSubmittingBlock(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
        <LoadingState message="Loading moderation workspace..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      <OfficialNav />

      <main className="flex-1 py-8">
        <Container size="lg" className="space-y-6">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-navy-800">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                  <ShieldAlert size={18} />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Citizen Moderation & Anti-Spam Control
                </h1>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Monitor user report frequency, identify portal spammers, and manage reporting access suspensions.
              </p>
            </div>

            <Button
              variant="outline-dark"
              size="sm"
              onClick={() => {
                setIsRefreshing(true);
                loadUsers();
              }}
              disabled={isRefreshing}
              leftIcon={<RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />}
              className="text-xs"
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh Users'}
            </Button>
          </div>

          {/* Feedback Alert */}
          {actionFeedback && (
            <div
              className={cn(
                'p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs',
                actionFeedback.type === 'success'
                  ? 'bg-emerald-950 border border-emerald-800 text-emerald-200'
                  : 'bg-rose-950 border border-rose-800 text-rose-200'
              )}
            >
              <span>{actionFeedback.text}</span>
              <button
                type="button"
                onClick={() => setActionFeedback(null)}
                className="opacity-70 hover:opacity-100"
              >
                <XCircle size={14} />
              </button>
            </div>
          )}

          {/* Metrics Overview Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-navy-800 bg-navy-950">
              <CardBody className="p-4 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Total Registered
                </span>
                <span className="text-2xl font-black text-white font-mono">{metrics.total}</span>
                <span className="text-[10px] text-slate-500 block">Citizen & Official accounts</span>
              </CardBody>
            </Card>

            <Card className="border-navy-800 bg-navy-950">
              <CardBody className="p-4 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
                  Active Citizens
                </span>
                <span className="text-2xl font-black text-emerald-300 font-mono">{metrics.active}</span>
                <span className="text-[10px] text-slate-500 block">Full reporting privileges</span>
              </CardBody>
            </Card>

            <Card className="border-navy-800 bg-navy-950">
              <CardBody className="p-4 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400 block">
                  Blocked Spammers
                </span>
                <span className="text-2xl font-black text-rose-400 font-mono">{metrics.blocked}</span>
                <span className="text-[10px] text-slate-500 block">Access restricted by admin</span>
              </CardBody>
            </Card>

            <Card className="border-navy-800 bg-navy-950">
              <CardBody className="p-4 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">
                  High Spam Suspects
                </span>
                <span className="text-2xl font-black text-amber-300 font-mono">{metrics.suspects}</span>
                <span className="text-[10px] text-slate-500 block">≥30% rejections or duplicate flags</span>
              </CardBody>
            </Card>
          </div>

          {/* Search & Tabs Filter Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user by name, email, or phone..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-navy-950 border border-navy-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-civic-500"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-navy-950 border border-navy-800">
              {[
                { id: 'all', label: `All (${metrics.total})` },
                { id: 'blocked', label: `Blocked (${metrics.blocked})` },
                { id: 'spam_suspects', label: `Spam Suspects (${metrics.suspects})` },
                { id: 'active', label: `Active (${metrics.active})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterTab(tab.id as typeof filterTab)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                    filterTab === tab.id
                      ? 'bg-civic-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-navy-900'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* User Moderation Table */}
          <Card className="border-navy-800 bg-navy-950 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-navy-800 bg-navy-900/40 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-5">Citizen / User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4 text-center">Total Reports</th>
                    <th className="py-3 px-4 text-center">Rejected (Spam)</th>
                    <th className="py-3 px-4 text-center">Spam Risk Score</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-5 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-800/60">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 space-y-2">
                        <UserCheck size={28} className="mx-auto text-slate-600" />
                        <p className="text-xs">No users found matching current filter.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const spamScore = u.spam_score || 0;
                      const isSelf = user?.id === u.id;
                      const isTargetAdmin = u.role === 'admin';

                      return (
                        <tr
                          key={u.id}
                          className="hover:bg-navy-900/30 transition-colors"
                        >
                          {/* Citizen Identity */}
                          <td className="py-3.5 px-5">
                            <div className="space-y-0.5">
                              <span className="font-bold text-white text-sm block">
                                {u.full_name || 'Registered Citizen'}
                                {isSelf && (
                                  <span className="ml-1.5 text-[10px] font-bold text-civic-400 bg-civic-950 px-1.5 py-0.5 rounded border border-civic-800">
                                    You
                                  </span>
                                )}
                              </span>
                              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                                {u.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail size={11} className="text-slate-500" />
                                    {u.email}
                                  </span>
                                )}
                                {u.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone size={11} className="text-slate-500" />
                                    {u.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td className="py-3.5 px-4">
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono',
                                u.role === 'admin'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : u.role === 'official'
                                  ? 'bg-sky-950 text-sky-300 border border-sky-800'
                                  : 'bg-navy-900 text-slate-300 border border-navy-700'
                              )}
                            >
                              {u.role}
                            </span>
                          </td>

                          {/* Total Reports */}
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-white text-xs">
                            {u.total_complaints}
                          </td>

                          {/* Rejected Complaints */}
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-xs">
                            <span
                              className={cn(
                                u.rejected_complaints > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'
                              )}
                            >
                              {u.rejected_complaints}
                            </span>
                          </td>

                          {/* Spam Risk Meter */}
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border',
                                spamScore >= 50
                                  ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                                  : spamScore >= 25
                                  ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                              )}
                            >
                              {spamScore}%
                            </span>
                          </td>

                          {/* Status Badge & Reason */}
                          <td className="py-3.5 px-4">
                            {u.is_blocked ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                                  <Ban size={10} /> Suspended
                                </span>
                                {u.blocked_reason && (
                                  <p className="text-[10px] text-rose-200/80 italic max-w-[200px] truncate" title={u.blocked_reason}>
                                    &ldquo;{u.blocked_reason}&rdquo;
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                <UserCheck size={10} /> Active
                              </span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-5 text-right">
                            {isSelf || isTargetAdmin ? (
                              <span className="text-[11px] text-slate-500 italic">Protected</span>
                            ) : u.is_blocked ? (
                              <Button
                                type="button"
                                variant="outline-dark"
                                size="sm"
                                onClick={() => handleUnblock(u)}
                                disabled={isSubmittingBlock}
                                className="text-xs text-emerald-300 border-emerald-800/80 hover:bg-emerald-950"
                                leftIcon={<UserCheck size={12} />}
                              >
                                Unblock
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedUserForBlock(u);
                                  setBlockReason('Repeated portal spam / fraudulent complaint submissions');
                                }}
                                disabled={isSubmittingBlock}
                                className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/40"
                                leftIcon={<Ban size={12} />}
                              >
                                Block User
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Block Confirmation Modal */}
          {selectedUserForBlock && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
              <div className="w-full max-w-md rounded-2xl bg-navy-950 border border-rose-800 shadow-2xl overflow-hidden p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-navy-800">
                  <div className="flex items-center gap-2 text-rose-400">
                    <ShieldAlert size={18} />
                    <h3 className="font-bold text-sm text-white">
                      Suspend Citizen Reporting Privileges
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedUserForBlock(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    <XCircle size={16} />
                  </button>
                </div>

                <div className="space-y-1 text-xs">
                  <p className="text-slate-300">
                    You are suspending reporting access for:
                  </p>
                  <div className="p-3 rounded-xl bg-navy-900 border border-navy-800 space-y-0.5">
                    <p className="font-bold text-white text-sm">
                      {selectedUserForBlock.full_name || 'Citizen User'}
                    </p>
                    <p className="text-slate-400">{selectedUserForBlock.email || selectedUserForBlock.id}</p>
                    <p className="text-[11px] text-slate-500">
                      Total Reports: {selectedUserForBlock.total_complaints} • Rejected: {selectedUserForBlock.rejected_complaints}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <label className="font-bold uppercase tracking-wider text-slate-300 block text-[10px]">
                    Reason for Suspension (Visible to Citizen)
                  </label>

                  {/* Preset Buttons */}
                  <div className="flex flex-wrap gap-1">
                    {[
                      'Repeated portal spam / fraudulent complaint submissions',
                      'Uploading fake or non-civic photos',
                      'Flooding portal with duplicate complaints',
                      'Abusive or prohibited behavior',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setBlockReason(preset)}
                        className={cn(
                          'px-2.5 py-1 rounded text-[10px] transition-colors',
                          blockReason === preset
                            ? 'bg-rose-900 text-rose-100 border border-rose-700 font-bold'
                            : 'bg-navy-900 text-slate-400 border border-navy-800 hover:text-slate-200'
                        )}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={2}
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="Enter explicit reason for suspension..."
                    className="w-full p-2.5 rounded-lg bg-navy-900 border border-navy-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none mt-1"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-navy-800">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedUserForBlock(null)}
                    disabled={isSubmittingBlock}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={handleConfirmBlock}
                    disabled={isSubmittingBlock || !blockReason.trim()}
                    className="text-xs bg-rose-700 hover:bg-rose-800 text-white"
                    leftIcon={<Ban size={13} />}
                  >
                    {isSubmittingBlock ? 'Suspending User...' : 'Confirm Suspension'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Container>
      </main>
    </div>
  );
}
