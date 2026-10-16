'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PlusCircle,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  MapPin,
  Calendar,
  Image as ImageIcon,
} from 'lucide-react';
import { CitizenNav } from '@/components/layout/CitizenNav';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAuth } from '@/components/providers/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { Complaint } from '@/types';
import { getCategoryLabel, formatComplaintDate } from '@/lib/complaints';
import { getSignedPhotoUrl } from '@/lib/storage';

export default function CitizenDashboardPage() {
  const { user, profile, role, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Redirect if not authenticated or not citizen
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirectTo=/citizen');
      } else if (role && role !== 'citizen') {
        router.push('/official');
      }
    }
  }, [user, role, authLoading, router]);

  useEffect(() => {
    let isMounted = true;

    if (user && role === 'citizen') {
      const loadData = async () => {
        try {
          const supabase = createClient();
          const { data, error } = await supabase
            .from('complaints')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (!isMounted) return;

          if (error) {
            setComplaints([]);
          } else {
            const complaintsList = (data as Complaint[]) || [];
            setComplaints(complaintsList);

            // Fetch signed URLs for recent complaints with photos
            const urlMap: Record<string, string> = {};
            const recentWithPhotos = complaintsList.slice(0, 5).filter((c) => c.image_url);
            await Promise.all(
              recentWithPhotos.map(async (c) => {
                if (c.image_url) {
                  const url = await getSignedPhotoUrl(c.image_url);
                  if (url) urlMap[c.id] = url;
                }
              })
            );
            if (isMounted) {
              setSignedUrls(urlMap);
            }
          }
        } catch {
          if (isMounted) {
            setComplaints([]);
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      };

      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [user, role]);

  if (authLoading || (!user && isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingState message="Loading your dashboard..." />
      </div>
    );
  }

  // Determine user first name for welcome greeting
  const firstName = profile?.full_name
    ? profile.full_name.trim().split(' ')[0]
    : user?.email
    ? user.email.split('@')[0]
    : 'Citizen';

  // Calculate stats from real data
  const totalReports = complaints.length;
  const submittedCount = complaints.filter((c) => c.status === 'submitted').length;
  const inProgressCount = complaints.filter((c) => c.status === 'in_progress').length;
  const resolvedCount = complaints.filter((c) => c.status === 'resolved').length;

  const recentComplaints = complaints.slice(0, 5);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <CitizenNav />

      <main className="flex-1 py-8 sm:py-10">
        <Container size="lg" className="space-y-8">
          {/* Welcome Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 tracking-tight">
                Good to see you, {firstName}.
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Report civic issues, track progress, and help make your city better.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/citizen/report">
                <Button variant="accent" size="md" leftIcon={<PlusCircle size={16} />}>
                  Report an Issue
                </Button>
              </Link>
              <Link href="/citizen/reports">
                <Button variant="outline" size="md" leftIcon={<FileText size={16} />}>
                  View My Reports
                </Button>
              </Link>
            </div>
          </div>

          {/* Compact Dashboard Summary Cards (Calculated from authenticated user's complaints) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Reports */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Total Reports</span>
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                  <FileText size={16} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-navy-950">
                {totalReports}
              </div>
              <p className="text-[11px] text-slate-500">All submitted civic issues</p>
            </div>

            {/* Submitted */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-civic-600">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Submitted</span>
                <div className="w-8 h-8 rounded-lg bg-civic-50 flex items-center justify-center text-civic-600 border border-civic-100">
                  <Clock size={16} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-navy-950">
                {submittedCount}
              </div>
              <p className="text-[11px] text-slate-500">Awaiting initial official intake</p>
            </div>

            {/* In Progress */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-alert-600">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">In Progress</span>
                <div className="w-8 h-8 rounded-lg bg-alert-50 flex items-center justify-center text-alert-600 border border-alert-100">
                  <AlertTriangle size={16} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-navy-950">
                {inProgressCount}
              </div>
              <p className="text-[11px] text-slate-500">Ground remediation underway</p>
            </div>

            {/* Resolved */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-emerald-600">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Resolved</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                  <CheckCircle2 size={16} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-navy-950">
                {resolvedCount}
              </div>
              <p className="text-[11px] text-slate-500">Successfully completed</p>
            </div>
          </div>

          {/* Recent Reports Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-navy-950 tracking-tight">
                  Recent Reports
                </h2>
                <p className="text-xs text-slate-500">
                  Status of your latest community submissions
                </p>
              </div>

              {complaints.length > 0 && (
                <Link
                  href="/citizen/reports"
                  className="text-xs font-semibold text-civic-600 hover:text-civic-800 flex items-center gap-1 transition-colors"
                >
                  <span>View all reports</span>
                  <ArrowRight size={13} />
                </Link>
              )}
            </div>

            {isLoading ? (
              <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
                <LoadingState message="Loading your complaints..." />
              </div>
            ) : complaints.length === 0 ? (
              /* Polished Empty State */
              <EmptyState
                title="No reports yet"
                description="Your civic reports will appear here after you submit an issue."
                actionLabel="Report an Issue"
                onAction={() => router.push('/citizen/report')}
              />
            ) : (
              /* Complaint Cards List */
              <div className="space-y-3">
                {recentComplaints.map((item) => {
                  const thumbnailUrl = signedUrls[item.id];
                  return (
                    <Card
                      key={item.id}
                      hoverable
                      className="border-slate-200 bg-white transition-all duration-150"
                    >
                      <Link href={`/citizen/reports/${item.id}`} className="block">
                        <CardBody className="p-4 sm:p-5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            {/* Left: Thumbnail & Details */}
                            <div className="flex items-start gap-4">
                              {/* Thumbnail preview if exists */}
                              <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                {thumbnailUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={thumbnailUrl}
                                    alt={item.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <ImageIcon size={22} className="text-slate-400" />
                                )}
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-mono font-bold text-civic-700 bg-civic-50 px-2 py-0.5 rounded border border-civic-200">
                                    {item.complaint_number || 'PENDING'}
                                  </span>
                                  <span className="text-xs font-semibold text-slate-500">
                                    • {getCategoryLabel(item.category)}
                                  </span>
                                </div>

                                <h3 className="text-base font-bold text-navy-950 line-clamp-1 hover:text-civic-600 transition-colors">
                                  {item.title}
                                </h3>

                                <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap pt-0.5">
                                  {item.address && (
                                    <span className="flex items-center gap-1 line-clamp-1">
                                      <MapPin size={12} className="text-slate-400 shrink-0" />
                                      {item.address}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1 shrink-0">
                                    <Calendar size={12} className="text-slate-400" />
                                    {formatComplaintDate(item.created_at)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Right: Badges & Arrow */}
                            <div className="flex items-center sm:flex-col sm:items-end justify-between gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                              <div className="flex items-center gap-2">
                                <SeverityBadge severity={item.severity} />
                                <StatusBadge status={item.status} />
                              </div>
                              <span className="text-xs font-semibold text-civic-600 sm:flex items-center gap-1 hidden">
                                View Details <ArrowRight size={12} />
                              </span>
                            </div>
                          </div>
                        </CardBody>
                      </Link>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </Container>
      </main>
    </div>
  );
}
