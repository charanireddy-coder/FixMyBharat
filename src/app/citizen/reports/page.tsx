'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PlusCircle,
  MapPin,
  Calendar,
  Image as ImageIcon,
  ArrowRight,
  Search,
  Filter,
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
import { Complaint, ComplaintStatus } from '@/types';
import { getCategoryLabel, formatComplaintDate } from '@/lib/complaints';
import { getSignedPhotoUrl } from '@/lib/storage';
import { cn } from '@/lib/utils';

type FilterTab = 'all' | 'submitted' | 'in_progress' | 'resolved';

export default function MyReportsPage() {
  const { user, role, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentFilter, setCurrentFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Protect route
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirectTo=/citizen/reports');
      } else if (role && role !== 'citizen') {
        router.push('/official');
      }
    }
  }, [user, role, authLoading, router]);

  useEffect(() => {
    let isMounted = true;

    if (user && role === 'citizen') {
      const loadReports = async () => {
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
            const list = (data as Complaint[]) || [];
            setComplaints(list);

            // Fetch signed URLs for reports with photos
            const urlMap: Record<string, string> = {};
            const itemsWithPhotos = list.filter((c) => c.image_url);
            await Promise.all(
              itemsWithPhotos.map(async (c) => {
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

      loadReports();
    }

    return () => {
      isMounted = false;
    };
  }, [user, role]);

  // Simple filtering
  const filteredComplaints = useMemo(() => {
    return complaints.filter((item) => {
      // Tab filter
      if (currentFilter !== 'all') {
        if (item.status !== (currentFilter as ComplaintStatus)) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesNumber = (item.complaint_number || '').toLowerCase().includes(query);
        const matchesAddress = (item.address || '').toLowerCase().includes(query);
        const matchesCategory = getCategoryLabel(item.category).toLowerCase().includes(query);
        return matchesTitle || matchesNumber || matchesAddress || matchesCategory;
      }

      return true;
    });
  }, [complaints, currentFilter, searchQuery]);

  if (authLoading || (!user && isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingState message="Loading your reports..." />
      </div>
    );
  }

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'submitted', label: 'Submitted' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'resolved', label: 'Resolved' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <CitizenNav />

      <main className="flex-1 py-8 sm:py-10">
        <Container size="lg" className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 tracking-tight">
                My Reports
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Track status and view updates for all civic complaints submitted by your account.
              </p>
            </div>

            <Link href="/citizen/report">
              <Button variant="accent" size="md" leftIcon={<PlusCircle size={16} />}>
                Report an Issue
              </Button>
            </Link>
          </div>

          {/* Filtering and Search Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {tabs.map((tab) => {
                const isActive = currentFilter === tab.id;
                const count =
                  tab.id === 'all'
                    ? complaints.length
                    : complaints.filter((c) => c.status === (tab.id as ComplaintStatus)).length;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCurrentFilter(tab.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5',
                      isActive
                        ? 'bg-navy-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-navy-950 hover:bg-slate-100'
                    )}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                        isActive ? 'bg-navy-800 text-slate-200' : 'bg-slate-200 text-slate-600'
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by title, number, or area..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-civic-500 focus:ring-1 focus:ring-civic-500 outline-none text-slate-900 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Reports List */}
          {isLoading ? (
            <div className="p-16 text-center bg-white rounded-xl border border-slate-200">
              <LoadingState message="Loading reports..." />
            </div>
          ) : filteredComplaints.length === 0 ? (
            <EmptyState
              icon={<Filter size={24} />}
              title={complaints.length === 0 ? 'No reports yet' : 'No matching reports'}
              description={
                complaints.length === 0
                  ? 'Your civic reports will appear here after you submit an issue.'
                  : 'Try selecting a different filter tab or clearing your search query.'
              }
              actionLabel={complaints.length === 0 ? 'Report an Issue' : 'Clear Filters'}
              onAction={() => {
                if (complaints.length === 0) {
                  router.push('/citizen/report');
                } else {
                  setCurrentFilter('all');
                  setSearchQuery('');
                }
              }}
            />
          ) : (
            <div className="space-y-3">
              {filteredComplaints.map((item) => {
                const thumbnailUrl = signedUrls[item.id];
                return (
                  <Card
                    key={item.id}
                    hoverable
                    className="border-slate-200 bg-white transition-all duration-150"
                  >
                    <Link href={`/citizen/reports/${item.id}`} className="block">
                      <CardBody className="p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          {/* Left: Thumbnail & Details */}
                          <div className="flex items-start gap-4">
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
        </Container>
      </main>
    </div>
  );
}
