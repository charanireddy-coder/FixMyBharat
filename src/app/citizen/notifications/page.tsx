'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  Check,
  ArrowRight,
  Search,
  RefreshCw,
  AlertCircle,
  Building2,
  Info,
  Calendar,
  ArrowUpRight,
} from 'lucide-react';
import { CitizenNav } from '@/components/layout/CitizenNav';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAuth } from '@/components/providers/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import {
  CitizenNotificationItem,
  fetchCitizenNotifications,
  getReadNotificationIds,
  markNotificationAsRead,
  markNotificationAsUnread,
  markAllNotificationsAsRead,
} from '@/lib/notifications';
import { getCategoryLabel, formatComplaintDate } from '@/lib/complaints';
import { ComplaintStatus } from '@/types';
import { cn } from '@/lib/utils';

type NotificationFilter = 'all' | 'unread' | 'status_changes';

export default function CitizenNotificationsPage() {
  const { user, role, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [notifications, setNotifications] = useState<CitizenNotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & search
  const [currentFilter, setCurrentFilter] = useState<NotificationFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Route protection
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirectTo=/citizen/notifications');
      } else if (role && role !== 'citizen') {
        router.push('/official');
      }
    }
  }, [user, role, authLoading, router]);

  // Load notifications from Supabase
  useEffect(() => {
    let isMounted = true;

    if (user && role === 'citizen') {
      const load = async () => {
        try {
          const supabase = createClient();
          const res = await fetchCitizenNotifications(supabase);

          if (!isMounted) return;

          if (res.error) {
            setErrorMessage(res.error);
            setNotifications([]);
          } else {
            setErrorMessage(null);
            setNotifications(res.notifications);
            const storedReadIds = getReadNotificationIds(user.id);
            setReadIds(storedReadIds);
          }
        } catch (err: unknown) {
          if (!isMounted) return;
          const msg = err instanceof Error ? err.message : 'Failed to load notifications.';
          setErrorMessage(msg);
          setNotifications([]);
        } finally {
          if (isMounted) {
            setIsLoading(false);
            setIsRefreshing(false);
          }
        }
      };

      load();
    }

    return () => {
      isMounted = false;
    };
  }, [user, role, isRefreshing]);

  // Read state handlers
  const handleToggleRead = (id: string, currentlyRead: boolean) => {
    if (!user) return;

    if (currentlyRead) {
      markNotificationAsUnread(user.id, id);
      setReadIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } else {
      markNotificationAsRead(user.id, id);
      setReadIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    }
  };

  const handleMarkAllRead = () => {
    if (!user || notifications.length === 0) return;
    const allIds = notifications.map((n) => n.id);
    markAllNotificationsAsRead(user.id, allIds);
    setReadIds(new Set(allIds));
  };

  const handleNotificationClick = (id: string) => {
    if (!user) return;
    markNotificationAsRead(user.id, id);
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  // Filtered list
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      const isRead = readIds.has(item.id);

      // Filter tab
      if (currentFilter === 'unread' && isRead) {
        return false;
      }
      if (currentFilter === 'status_changes') {
        const hasTransition =
          item.old_status &&
          item.new_status &&
          item.old_status !== item.new_status;
        if (!hasTransition) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.complaint.title.toLowerCase().includes(q);
        const matchesNumber = (item.complaint.complaint_number || '').toLowerCase().includes(q);
        const matchesCategory = getCategoryLabel(item.complaint.category).toLowerCase().includes(q);
        const matchesMessage = (item.message || '').toLowerCase().includes(q);
        return matchesTitle || matchesNumber || matchesCategory || matchesMessage;
      }

      return true;
    });
  }, [notifications, readIds, currentFilter, searchQuery]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !readIds.has(n.id)).length;
  }, [notifications, readIds]);

  const statusChangesCount = useMemo(() => {
    return notifications.filter(
      (n) => n.old_status && n.new_status && n.old_status !== n.new_status
    ).length;
  }, [notifications]);

  if (authLoading || (!user && isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingState message="Loading your civic notifications..." />
      </div>
    );
  }

  const tabs: { id: NotificationFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All Updates', count: notifications.length },
    { id: 'unread', label: 'Unread', count: unreadCount },
    { id: 'status_changes', label: 'Status Changes', count: statusChangesCount },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <CitizenNav />

      <main className="flex-1 py-8 sm:py-10">
        <Container size="lg" className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-civic-50 text-civic-600 flex items-center justify-center border border-civic-200">
                  <Bell size={18} />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 tracking-tight">
                  Civic Notifications
                </h1>
                {unreadCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-alert-500 text-white shadow-xs">
                    {unreadCount} New
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600 mt-1">
                Verified public updates, status changes, and official notes published on your civic complaints.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsRefreshing(true);
                }}
                disabled={isRefreshing}
                leftIcon={<RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />}
              >
                Refresh
              </Button>

              {unreadCount > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleMarkAllRead}
                  leftIcon={<CheckCheck size={14} />}
                >
                  Mark All Read
                </Button>
              )}
            </div>
          </div>

          {/* Architecture / Local Read State Disclaimer Notice */}
          <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-200 text-sky-950 text-xs flex items-start gap-3">
            <Info size={17} className="text-sky-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-sky-900">
                Official Updates Stream & Local Read Receipts
              </p>
              <p className="text-sky-800 leading-relaxed">
                Updates shown here are logged by verified municipal officials in{' '}
                <code className="font-mono font-bold text-sky-900 bg-sky-100 px-1 py-0.5 rounded">
                  public.complaint_updates
                </code>
                . Read tracking is maintained locally in your browser session. Direct push, SMS, and email delivery remain inactive pending municipal notification gateway configuration.
              </p>
            </div>
          </div>

          {/* Controls: Filter Tabs + Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {tabs.map((tab) => {
                const isActive = currentFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCurrentFilter(tab.id)}
                    className={cn(
                      'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2',
                      isActive
                        ? 'bg-navy-950 text-white shadow-xs'
                        : 'text-slate-600 hover:text-navy-950 hover:bg-slate-100'
                    )}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-full font-bold',
                        isActive
                          ? 'bg-navy-800 text-slate-200'
                          : 'bg-slate-200 text-slate-600'
                      )}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-72">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search updates or report #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-navy-950 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-civic-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsRefreshing(true)}>
                Retry
              </Button>
            </div>
          )}

          {/* Notifications Feed */}
          {isLoading ? (
            <div className="py-16">
              <LoadingState message="Fetching official complaint updates..." />
            </div>
          ) : filteredNotifications.length > 0 ? (
            <div className="space-y-3.5">
              {filteredNotifications.map((item) => {
                const isRead = readIds.has(item.id);
                const hasTransition =
                  item.old_status &&
                  item.new_status &&
                  item.old_status !== item.new_status;

                return (
                  <Card
                    key={item.id}
                    className={cn(
                      'border transition-all duration-200 bg-white hover:border-slate-300 shadow-xs overflow-hidden',
                      isRead
                        ? 'border-slate-200 bg-white/95'
                        : 'border-civic-300/80 bg-gradient-to-r from-civic-50/30 to-white shadow-sm ring-1 ring-civic-200/50'
                    )}
                  >
                    <CardBody className="p-5 sm:p-6 space-y-4">
                      {/* Top Meta Line: Report #, Status, Unread Dot, Timestamp */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          {/* Unread Pill */}
                          {!isRead && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-civic-600 text-white tracking-wide uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                              Unread
                            </span>
                          )}

                          {/* Complaint Number Link */}
                          <Link
                            href={`/citizen/reports/${item.complaint.id}`}
                            onClick={() => handleNotificationClick(item.id)}
                            className="font-mono text-xs font-bold text-civic-700 hover:text-civic-900 bg-civic-50 px-2 py-0.5 rounded border border-civic-200/80 transition-colors"
                          >
                            Report #{item.complaint.complaint_number}
                          </Link>

                          {/* Category Badge */}
                          <span className="text-[11px] font-semibold text-slate-600 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                            {getCategoryLabel(item.complaint.category)}
                          </span>

                          {/* Current Status Badge */}
                          <StatusBadge status={item.complaint.status as ComplaintStatus} />
                        </div>

                        {/* Timestamp */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Calendar size={13} className="text-slate-400" />
                          <span>{formatComplaintDate(item.created_at)}</span>
                        </div>
                      </div>

                      {/* Complaint Title Link */}
                      <div>
                        <Link
                          href={`/citizen/reports/${item.complaint.id}`}
                          onClick={() => handleNotificationClick(item.id)}
                          className="group inline-flex items-center gap-1.5"
                        >
                          <h2 className="text-base sm:text-lg font-bold text-navy-950 group-hover:text-civic-700 transition-colors">
                            {item.complaint.title}
                          </h2>
                          <ArrowUpRight
                            size={15}
                            className="text-slate-400 group-hover:text-civic-700 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                          />
                        </Link>
                      </div>

                      {/* Status Transition Ribbon (if status changed) */}
                      {hasTransition && (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                            Status Transition:
                          </span>
                          <span className="font-semibold text-slate-700 capitalize">
                            {item.old_status?.replace('_', ' ')}
                          </span>
                          <ArrowRight size={13} className="text-civic-600" />
                          <span className="font-bold text-navy-950 capitalize bg-white px-2 py-0.5 rounded border border-slate-200">
                            {item.new_status?.replace('_', ' ')}
                          </span>
                        </div>
                      )}

                      {/* Update Message Content */}
                      {item.message ? (
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                          {item.message}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 italic">
                          Official status change recorded by municipal operations desk.
                        </div>
                      )}

                      {/* Footer Actions: Source, Toggle Read, View Report Link */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-2 text-slate-500">
                          <Building2 size={13} className="text-slate-400" />
                          <span>Published by Civic Operations Desk</span>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleToggleRead(item.id, isRead)}
                            className="text-xs font-semibold text-slate-600 hover:text-navy-950 px-2.5 py-1 rounded-md hover:bg-slate-100 transition-colors flex items-center gap-1"
                          >
                            <Check size={13} />
                            <span>{isRead ? 'Mark as Unread' : 'Mark as Read'}</span>
                          </button>

                          <Link
                            href={`/citizen/reports/${item.complaint.id}`}
                            onClick={() => handleNotificationClick(item.id)}
                          >
                            <Button variant="outline" size="sm" rightIcon={<ArrowRight size={13} />}>
                              View Report
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <Card className="border-slate-200 bg-white text-center py-16 px-6 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-civic-50 text-civic-600 flex items-center justify-center mx-auto mb-4 border border-civic-100">
                <Bell size={26} />
              </div>

              {currentFilter === 'unread' ? (
                <div className="space-y-2 max-w-sm mx-auto">
                  <h3 className="text-base font-bold text-navy-950">All Caught Up!</h3>
                  <p className="text-xs text-slate-500">
                    You have marked all official complaint notifications as read.
                  </p>
                  <div className="pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentFilter('all')}
                    >
                      View All Updates
                    </Button>
                  </div>
                </div>
              ) : searchQuery.trim() ? (
                <div className="space-y-2 max-w-sm mx-auto">
                  <h3 className="text-base font-bold text-navy-950">No Matching Updates</h3>
                  <p className="text-xs text-slate-500">
                    No notifications matched &ldquo;{searchQuery}&rdquo;. Try another search term.
                  </p>
                  <div className="pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchQuery('')}
                    >
                      Clear Search
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 max-w-sm mx-auto">
                  <h3 className="text-base font-bold text-navy-950">No Updates Yet</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    When civic officials review, reassign, or remediate your submitted civic complaints, verified public updates will appear in this timeline.
                  </p>
                  <div className="pt-4 flex items-center justify-center gap-2">
                    <Link href="/citizen/report">
                      <Button variant="accent" size="sm">
                        Report an Issue
                      </Button>
                    </Link>
                    <Link href="/citizen/reports">
                      <Button variant="outline" size="sm">
                        View My Reports
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </Card>
          )}
        </Container>
      </main>
    </div>
  );
}
