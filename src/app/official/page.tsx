'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  Hourglass,
  Layers,
  ArrowRight,
  MapPin,
  Calendar,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { OfficialNav } from '@/components/layout/OfficialNav';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { LoadingState } from '@/components/ui/LoadingState';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/components/providers/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import {
  fetchOperationalMetrics,
  fetchReportsRequiringAttention,
  fetchAllDepartments,
  OperationalMetrics,
} from '@/lib/official';
import { Complaint, Department } from '@/types';
import { getCategoryLabel, formatComplaintDate } from '@/lib/complaints';

export default function OfficialDashboardPage() {
  const { user, role, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [metrics, setMetrics] = useState<OperationalMetrics>({
    total: 0,
    submitted: 0,
    under_review: 0,
    in_progress: 0,
    resolved: 0,
    needs_attention: 0,
  });
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Role Protection: Only official and admin
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirectTo=/official');
      } else if (role === 'citizen') {
        router.push('/citizen');
      }
    }
  }, [user, role, authLoading, router]);

  // Data fetching with isMounted pattern (React 19 ESLint compliant)
  useEffect(() => {
    let isMounted = true;

    if (user && (role === 'official' || role === 'admin')) {
      const loadDashboardData = async () => {
        try {
          const supabase = createClient();

          const [metricsRes, complaintsRes, deptsRes] = await Promise.all([
            fetchOperationalMetrics(supabase),
            fetchReportsRequiringAttention(supabase, 8),
            fetchAllDepartments(supabase),
          ]);

          if (!isMounted) return;

          if (!metricsRes.error) {
            setMetrics(metricsRes.metrics);
          }
          if (!complaintsRes.error) {
            setComplaints(complaintsRes.complaints);
          }
          if (!deptsRes.error) {
            setDepartments(deptsRes.departments);
          }
        } catch {
          // Keep empty defaults
        } finally {
          if (isMounted) {
            setIsLoading(false);
            setIsRefreshing(false);
          }
        }
      };

      loadDashboardData();
    }

    return () => {
      isMounted = false;
    };
  }, [user, role, isRefreshing]);

  const handleRefresh = () => {
    setIsRefreshing(true);
  };

  if (authLoading || (!user && isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
        <LoadingState message="Verifying operational credentials..." />
      </div>
    );
  }

  // Department ID lookup map
  const deptMap = new Map<string, string>();
  departments.forEach((d) => deptMap.set(d.id, d.name));

  const isAdmin = role === 'admin';

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      <OfficialNav />

      <main className="flex-1 py-8 sm:py-10">
        <Container size="lg" className="space-y-8">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-navy-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Civic Operations
                </h1>
                <Badge variant={isAdmin ? 'danger' : 'warning'} size="sm">
                  {isAdmin ? 'Administrator' : 'Official Workspace'}
                </Badge>
              </div>
              <p className="text-sm text-slate-300">
                Review, prioritize, assign, and resolve reported civic issues.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline-dark"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                leftIcon={<RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />}
              >
                Refresh
              </Button>
              <Link href="/official/complaints">
                <Button variant="accent" size="sm" rightIcon={<ArrowRight size={14} />}>
                  Manage All Complaints
                </Button>
              </Link>
            </div>
          </div>

          {/* Real Operational Metrics Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-5">
            {/* Total Reports */}
            <div className="p-4 sm:p-5 rounded-2xl bg-navy-950 border border-navy-800 shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">Total Reports</span>
                <div className="w-8 h-8 rounded-lg bg-navy-900 text-slate-300 flex items-center justify-center">
                  <Layers size={16} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white">
                {metrics.total}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Total public civic complaints</p>
            </div>

            {/* New / Submitted */}
            <div className="p-4 sm:p-5 rounded-2xl bg-navy-950 border border-navy-800 shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-sky-400">New / Submitted</span>
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
                  <Clock size={16} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white">
                {metrics.submitted}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-sky-300 mt-1">
                <span>Requires triage</span>
              </div>
            </div>

            {/* Under Review */}
            <div className="p-4 sm:p-5 rounded-2xl bg-navy-950 border border-navy-800 shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-amber-400">Under Review</span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Hourglass size={16} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white">
                {metrics.under_review}
              </div>
              <p className="text-[11px] text-amber-300 mt-1">Being assessed</p>
            </div>

            {/* In Progress */}
            <div className="p-4 sm:p-5 rounded-2xl bg-navy-950 border border-navy-800 shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-orange-400">In Progress</span>
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
                  <AlertCircle size={16} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white">
                {metrics.in_progress}
              </div>
              <p className="text-[11px] text-orange-300 mt-1">Field teams active</p>
            </div>

            {/* Resolved */}
            <div className="p-4 sm:p-5 rounded-2xl bg-navy-950 border border-navy-800 shadow-md col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-emerald-400">Resolved</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 size={16} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white">
                {metrics.resolved}
              </div>
              <p className="text-[11px] text-emerald-300 mt-1">Verified resolutions</p>
            </div>
          </div>

          {/* Needs Attention Alert Bar */}
          {metrics.needs_attention > 0 && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-sm font-medium">
                  <strong className="text-white font-bold">{metrics.needs_attention}</strong> complaints currently require immediate triage or operational assignment.
                </span>
              </div>
              <Link href="/official/complaints?status=submitted">
                <Button variant="outline-dark" size="sm" className="text-xs border-amber-700 hover:bg-amber-900/50">
                  Review Queue
                </Button>
              </Link>
            </div>
          )}

          {/* Reports Requiring Attention */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Reports Requiring Attention</h2>
                <p className="text-xs text-slate-400">
                  Prioritizing active, unassigned, and newly submitted civic issues
                </p>
              </div>

              <Link
                href="/official/complaints"
                className="text-xs font-semibold text-civic-400 hover:text-civic-300 flex items-center gap-1 transition-colors"
              >
                <span>View all reports</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            {isLoading ? (
              <div className="py-12 flex justify-center">
                <LoadingState message="Loading reports requiring attention..." />
              </div>
            ) : complaints.length === 0 ? (
              /* Polished Real Empty State */
              <Card className="border-navy-800 bg-navy-950/70 text-center py-12 px-6">
                <CardBody className="space-y-4 max-w-md mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-navy-900 text-slate-400 flex items-center justify-center mx-auto border border-navy-800">
                    <CheckCircle2 size={28} className="text-emerald-400" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-white">No reports require attention</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      All submitted civic issues have been addressed or there are currently no pending reports in the intake queue.
                    </p>
                  </div>
                  <Link href="/official/complaints">
                    <Button variant="secondary" size="sm">
                      Browse All Complaints
                    </Button>
                  </Link>
                </CardBody>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {complaints.map((item) => {
                  const deptName = item.department_id ? deptMap.get(item.department_id) : null;
                  return (
                    <Link
                      key={item.id}
                      href={`/official/complaints/${item.id}`}
                      className="group block p-5 rounded-2xl bg-navy-950 border border-navy-800 hover:border-navy-700 hover:bg-navy-900/60 transition-all duration-200 shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-300 group-hover:text-alert-400 transition-colors">
                            #{item.complaint_number}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-navy-900 border border-navy-800 text-slate-300">
                            {getCategoryLabel(item.category)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <SeverityBadge severity={item.severity} />
                          <StatusBadge status={item.status} />
                        </div>
                      </div>

                      <h3 className="font-bold text-white text-sm sm:text-base line-clamp-1 group-hover:text-civic-300 transition-colors">
                        {item.title}
                      </h3>

                      <p className="text-xs text-slate-400 line-clamp-2 mt-1 mb-3 leading-relaxed">
                        {item.description}
                      </p>

                      <div className="pt-3 border-t border-navy-900 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                        {item.address ? (
                          <div className="flex items-center gap-1 max-w-[200px] truncate text-slate-400">
                            <MapPin size={12} className="shrink-0 text-slate-500" />
                            <span className="truncate">{item.address}</span>
                          </div>
                        ) : (
                          <div />
                        )}

                        <div className="flex items-center gap-3">
                          {deptName && (
                            <div className="flex items-center gap-1 text-slate-300">
                              <Building2 size={12} className="text-slate-500" />
                              <span>{deptName}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-slate-500">
                            <Calendar size={12} />
                            <span>{formatComplaintDate(item.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </Container>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-navy-800 bg-navy-950 text-center text-xs text-slate-500">
        <p>FixMyBharat Civic Operations Desk • Built by Team SyncMates</p>
      </footer>
    </div>
  );
}
