'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Filter,
  MapPin,
  Calendar,
  Building2,
  RefreshCw,
  X,
  ArrowUpDown,
  ExternalLink,
} from 'lucide-react';
import { OfficialNav } from '@/components/layout/OfficialNav';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAuth } from '@/components/providers/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { fetchAllDepartments } from '@/lib/official';
import {
  Complaint,
  ComplaintStatus,
  ComplaintCategory,
  ComplaintSeverity,
  Department,
} from '@/types';
import { CATEGORY_OPTIONS, getCategoryLabel, formatComplaintDate } from '@/lib/complaints';

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'needs_information', label: 'Needs Information' },
];

const SEVERITY_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Severities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

function ComplaintsManagementContent() {
  const { user, role, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialStatus = searchParams.get('status') || 'all';
  const initialCategory = searchParams.get('category') || 'all';
  const initialDepartment = searchParams.get('department') || 'all';

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState(initialDepartment);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Role Protection
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirectTo=/official/complaints');
      } else if (role === 'citizen') {
        router.push('/citizen');
      }
    }
  }, [user, role, authLoading, router]);

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Fetch complaints and departments
  useEffect(() => {
    let isMounted = true;

    if (user && (role === 'official' || role === 'admin')) {
      const loadData = async () => {
        try {
          const supabase = createClient();

          const [complaintsRes, deptsRes] = await Promise.all([
            supabase.from('complaints').select('*').order('created_at', { ascending: false }),
            fetchAllDepartments(supabase),
          ]);

          if (!isMounted) return;

          if (!complaintsRes.error && complaintsRes.data) {
            setComplaints(complaintsRes.data as Complaint[]);
          }
          if (!deptsRes.error) {
            setDepartments(deptsRes.departments);
          }
        } catch {
          // Keep empty
        } finally {
          if (isMounted) {
            setIsLoading(false);
            setIsRefreshing(false);
          }
        }
      };

      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [user, role, isRefreshing]);

  // Department mapping lookup
  const deptMap = useMemo(() => {
    const map = new Map<string, string>();
    departments.forEach((d) => map.set(d.id, d.name));
    return map;
  }, [departments]);

  // Client-side filtering across criteria
  const filteredComplaints = useMemo(() => {
    return complaints
      .filter((item) => {
        // Status filter
        if (statusFilter !== 'all' && item.status !== (statusFilter as ComplaintStatus)) {
          return false;
        }

        // Category filter
        if (categoryFilter !== 'all' && item.category !== (categoryFilter as ComplaintCategory)) {
          return false;
        }

        // Severity filter
        if (severityFilter !== 'all' && item.severity !== (severityFilter as ComplaintSeverity)) {
          return false;
        }

        // Department filter
        if (departmentFilter !== 'all') {
          if (departmentFilter === 'unassigned') {
            if (item.department_id) return false;
          } else if (item.department_id !== departmentFilter) {
            return false;
          }
        }

        // Debounced Search filter (complaint number, title, address, description)
        if (debouncedSearch) {
          const q = debouncedSearch.toLowerCase();
          const matchNumber = String(item.complaint_number).toLowerCase().includes(q);
          const matchTitle = item.title.toLowerCase().includes(q);
          const matchAddress = item.address?.toLowerCase().includes(q) ?? false;
          const matchDesc = item.description.toLowerCase().includes(q);

          if (!matchNumber && !matchTitle && !matchAddress && !matchDesc) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'newest') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        } else {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
      });
  }, [
    complaints,
    statusFilter,
    categoryFilter,
    severityFilter,
    departmentFilter,
    debouncedSearch,
    sortOrder,
  ]);

  const resetFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setSeverityFilter('all');
    setDepartmentFilter('all');
  };

  const hasActiveFilters =
    statusFilter !== 'all' ||
    categoryFilter !== 'all' ||
    severityFilter !== 'all' ||
    departmentFilter !== 'all' ||
    searchQuery.trim().length > 0;

  if (authLoading || (!user && isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
        <LoadingState message="Loading complaints queue..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      <OfficialNav />

      <main className="flex-1 py-8 sm:py-10">
        <Container size="lg" className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-navy-800">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                All Civic Complaints
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Filter, triage, assign, and track reported civic issues across departments.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline-dark"
                size="sm"
                onClick={() => setIsRefreshing(true)}
                disabled={isRefreshing}
                leftIcon={<RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />}
              >
                Refresh
              </Button>
              <Button
                variant="outline-dark"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                leftIcon={<ArrowUpDown size={14} />}
              >
                {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
              </Button>
            </div>
          </div>

          {/* Search & Filters Bar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-navy-950 border border-navy-800 shadow-md space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search by complaint #, title, keyword, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-navy-900 border border-navy-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-civic-500 focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {/* Status */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full py-2 px-2.5 rounded-lg bg-navy-900 border border-navy-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-civic-500"
                >
                  {STATUS_FILTER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full py-2 px-2.5 rounded-lg bg-navy-900 border border-navy-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-civic-500"
                >
                  <option value="all">All Categories</option>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Severity */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Severity
                </label>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="w-full py-2 px-2.5 rounded-lg bg-navy-900 border border-navy-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-civic-500"
                >
                  {SEVERITY_FILTER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department (Dynamic) */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Department
                </label>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="w-full py-2 px-2.5 rounded-lg bg-navy-900 border border-navy-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-civic-500"
                >
                  <option value="all">All Departments</option>
                  <option value="unassigned">Unassigned Only</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filter Count & Reset */}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-navy-900">
              <span className="text-slate-400">
                Showing <strong className="text-white font-bold">{filteredComplaints.length}</strong> of{' '}
                {complaints.length} reports
              </span>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-civic-400 hover:text-civic-300 font-semibold flex items-center gap-1"
                >
                  <X size={12} />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>
          </div>

          {/* Complaints Table / List */}
          {isLoading ? (
            <div className="py-16 flex justify-center">
              <LoadingState message="Filtering reports..." />
            </div>
          ) : filteredComplaints.length === 0 ? (
            <Card className="border-navy-800 bg-navy-950/70 text-center py-16 px-6">
              <CardBody className="space-y-4 max-w-md mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-navy-900 text-slate-400 flex items-center justify-center mx-auto border border-navy-800">
                  <Filter size={24} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-white">No complaints found</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    No reports match the selected filters or search query. Try clearing your filters.
                  </p>
                </div>
                {hasActiveFilters && (
                  <Button variant="secondary" size="sm" onClick={resetFilters}>
                    Reset All Filters
                  </Button>
                )}
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredComplaints.map((item) => {
                const deptName = item.department_id ? deptMap.get(item.department_id) : 'Unassigned';
                return (
                  <Link
                    key={item.id}
                    href={`/official/complaints/${item.id}`}
                    className="group block p-4 sm:p-5 rounded-2xl bg-navy-950 border border-navy-800 hover:border-navy-700 hover:bg-navy-900/60 transition-all duration-150 shadow-md"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left Block */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-300 group-hover:text-alert-400 transition-colors">
                            #{item.complaint_number}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-navy-900 border border-navy-800 text-slate-300">
                            {getCategoryLabel(item.category)}
                          </span>
                          <SeverityBadge severity={item.severity} />
                          <StatusBadge status={item.status} />
                        </div>

                        <h3 className="font-bold text-white text-sm sm:text-base group-hover:text-civic-300 transition-colors line-clamp-1">
                          {item.title}
                        </h3>

                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-400">
                          {item.address && (
                            <div className="flex items-center gap-1 max-w-[280px] truncate text-slate-400">
                              <MapPin size={12} className="shrink-0 text-slate-500" />
                              <span className="truncate">{item.address}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-1 text-slate-400">
                            <Building2 size={12} className="shrink-0 text-slate-500" />
                            <span className={item.department_id ? 'text-slate-300 font-medium' : 'text-slate-500'}>
                              {deptName}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-slate-500">
                            <Calendar size={12} />
                            <span>{formatComplaintDate(item.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Action */}
                      <div className="shrink-0 flex items-center justify-end">
                        <span className="text-xs font-semibold text-slate-400 group-hover:text-white flex items-center gap-1 transition-colors">
                          <span>View Detail</span>
                          <ExternalLink size={13} />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Container>
      </main>

      <footer className="py-6 border-t border-navy-800 bg-navy-950 text-center text-xs text-slate-500">
        <p>FixMyBharat Civic Operations Desk • Built by Team SyncMates</p>
      </footer>
    </div>
  );
}

export default function ComplaintsManagementPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
          <LoadingState message="Loading complaints desk..." />
        </div>
      }
    >
      <ComplaintsManagementContent />
    </Suspense>
  );
}
