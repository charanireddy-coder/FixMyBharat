'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Map as MapIcon,
  Search,
  Flame,
  Layers,
  RefreshCw,
  ExternalLink,
  MapPin,
  X,
  AlertCircle,
} from 'lucide-react';
import { OfficialNav } from '@/components/layout/OfficialNav';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { LoadingState } from '@/components/ui/LoadingState';
import { CivicMap } from '@/components/map/CivicMap';
import { MapLegend } from '@/components/map/MapLegend';
import { useAuth } from '@/components/providers/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { Complaint, Department } from '@/types';
import { getCategoryLabel, CATEGORY_OPTIONS } from '@/lib/complaints';
import { calculateReportedHotspots, isValidCoordinate, HotspotCluster } from '@/lib/map/hotspots';
import { cn } from '@/lib/utils';

export default function OfficialMapPage() {
  const { user, role, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [showHotspots, setShowHotspots] = useState(true);

  // Active interaction
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(false);

  // Auth Guard: Only official / admin
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirectTo=/official/map');
      } else if (role === 'citizen') {
        router.push('/citizen/map');
      }
    }
  }, [user, role, authLoading, router]);

  // Load Complaints and Departments
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!user || (role !== 'official' && role !== 'admin')) return;

      try {
        const supabase = createClient();

        const [compRes, deptsRes] = await Promise.all([
          supabase
            .from('complaints')
            .select('*')
            .order('created_at', { ascending: false }),
          supabase
            .from('departments')
            .select('*')
            .order('name', { ascending: true }),
        ]);

        if (!isMounted) return;

        if (!compRes.error && compRes.data) {
          setComplaints(compRes.data as Complaint[]);
        }
        if (!deptsRes.error && deptsRes.data) {
          setDepartments(deptsRes.data as Department[]);
        }
      } catch (err) {
        console.error('Failed to load map data:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user, role, isRefreshing]);

  const handleRefresh = () => {
    setIsRefreshing(true);
  };

  // Filter complaints in real time
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = c.title.toLowerCase().includes(q);
        const matchesAddress = (c.address || '').toLowerCase().includes(q);
        const matchesNumber = (c.complaint_number || '').toString().includes(q);
        if (!matchesTitle && !matchesAddress && !matchesNumber) return false;
      }

      // 2. Category Filter
      if (categoryFilter !== 'all' && c.category.toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }

      // 3. Status Filter
      if (statusFilter !== 'all' && c.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      // 4. Severity Filter
      if (severityFilter !== 'all' && c.severity.toLowerCase() !== severityFilter.toLowerCase()) {
        return false;
      }

      // 5. Department Filter
      if (departmentFilter !== 'all' && c.department_id !== departmentFilter) {
        return false;
      }

      return true;
    });
  }, [complaints, searchQuery, categoryFilter, statusFilter, severityFilter, departmentFilter]);

  // Complaints with valid coordinates among the filtered set
  const mappedComplaints = useMemo(() => {
    return filteredComplaints.filter((c) => isValidCoordinate(c.latitude, c.longitude));
  }, [filteredComplaints]);

  // Calculate hotspots based strictly on the current filtered dataset (Part 16)
  const hotspots: HotspotCluster[] = useMemo(() => {
    return calculateReportedHotspots(filteredComplaints, 400, 2);
  }, [filteredComplaints]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    categoryFilter !== 'all' ||
    statusFilter !== 'all' ||
    severityFilter !== 'all' ||
    departmentFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setSeverityFilter('all');
    setDepartmentFilter('all');
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
        <OfficialNav />
        <div className="flex-1 flex items-center justify-center p-6">
          <LoadingState message="Loading civic map and location records..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      <OfficialNav />

      <main className="flex-1 py-6 sm:py-8">
        <Container size="xl" className="space-y-6">
          {/* Page Heading Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-navy-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <MapIcon size={18} />
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Civic Issue Map
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-navy-950 border border-navy-800 text-slate-300">
                  OpenStreetMap
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400">
                Explore reported civic issues by location, category, severity, and status.
              </p>
            </div>

            {/* Quick Metrics Bar */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="px-3 py-1.5 rounded-xl bg-navy-950 border border-navy-800 text-xs">
                <span className="text-slate-400 block text-[10px]">Total Reports</span>
                <span className="font-bold text-white text-sm">{complaints.length}</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-navy-950 border border-navy-800 text-xs">
                <span className="text-slate-400 block text-[10px]">Mapped on Canvas</span>
                <span className="font-bold text-sky-400 text-sm">{mappedComplaints.length}</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-navy-950 border border-navy-800 text-xs">
                <span className="text-slate-400 block text-[10px]">Issue Hotspots</span>
                <span className="font-bold text-orange-400 text-sm">{hotspots.length}</span>
              </div>

              <Button
                variant="outline-dark"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                leftIcon={<RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />}
              >
                Refresh
              </Button>
            </div>
          </div>

          {/* Operational Filter Bar (Part 8 & 16) */}
          <div className="p-4 rounded-2xl bg-navy-950 border border-navy-800 shadow-md space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Search */}
              <div className="relative">
                <Input
                  placeholder="Search title, address, #..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search size={14} className="text-slate-400" />}
                  className="bg-navy-900 border-navy-700 text-xs text-white placeholder:text-slate-500"
                />
              </div>

              {/* Category Filter */}
              <div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-navy-700 bg-navy-900 text-white outline-none cursor-pointer focus:border-sky-500"
                >
                  <option value="all">Category: All Categories</option>
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      Category: {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-navy-700 bg-navy-900 text-white outline-none cursor-pointer focus:border-sky-500"
                >
                  <option value="all">Status: All Statuses</option>
                  <option value="submitted">Submitted</option>
                  <option value="under_review">Under Review</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="needs_information">Needs Information</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* Severity Filter */}
              <div>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-navy-700 bg-navy-900 text-white outline-none cursor-pointer focus:border-sky-500"
                >
                  <option value="all">Severity: All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Department Filter (real departments) */}
              <div>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-navy-700 bg-navy-900 text-white outline-none cursor-pointer focus:border-sky-500"
                >
                  <option value="all">Department: All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      Dept: {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filter Controls Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-navy-900 text-xs">
              <div className="flex items-center gap-4">
                {/* Hotspot Toggle (Part 14) */}
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={showHotspots}
                    onChange={(e) => setShowHotspots(e.target.checked)}
                    className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 bg-navy-900 border-navy-700"
                  />
                  <span className="flex items-center gap-1 font-semibold text-xs text-orange-400">
                    <Flame size={14} />
                    <span>Reported Issue Hotspots ({hotspots.length})</span>
                  </span>
                </label>

                {/* Legend Toggle */}
                <button
                  type="button"
                  onClick={() => setShowLegend(!showLegend)}
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition-colors font-medium text-xs"
                >
                  <Layers size={13} />
                  <span>{showLegend ? 'Hide Legend' : 'Show Legend'}</span>
                </button>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 text-xs text-alert-400 hover:text-alert-300 font-semibold"
                >
                  <X size={13} />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>
          </div>

          {/* Map + List Split Experience (Part 9) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Interactive Leaflet Map (Col 8) */}
            <div className="lg:col-span-8 space-y-3 relative">
              {mappedComplaints.length === 0 ? (
                <div className="h-[580px] rounded-2xl bg-navy-950 border border-dashed border-navy-800 flex flex-col items-center justify-center p-8 text-center space-y-3">
                  <MapIcon size={36} className="text-slate-600 mx-auto" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      {complaints.length === 0
                        ? 'No civic reports yet.'
                        : hasActiveFilters
                        ? 'No reports match these filters.'
                        : 'No mapped reports yet.'}
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      {hasActiveFilters
                        ? 'Try loosening your filter parameters to view more civic issues.'
                        : 'Reports without valid coordinates are omitted from map visualization.'}
                    </p>
                  </div>
                  {hasActiveFilters && (
                    <Button variant="secondary" size="sm" onClick={clearFilters}>
                      Reset All Filters
                    </Button>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <CivicMap
                    complaints={filteredComplaints}
                    selectedComplaintId={selectedComplaintId}
                    onSelectComplaint={(c) => setSelectedComplaintId(c.id)}
                    showHotspots={showHotspots}
                    hotspotClusters={hotspots}
                    height="620px"
                    baseHref="/official/complaints"
                  />

                  {/* Floating Legend on Desktop */}
                  {showLegend && (
                    <div className="absolute top-4 right-4 z-20">
                      <MapLegend />
                    </div>
                  )}
                </div>
              )}

              {/* Informational Sub-notice */}
              <div className="p-3 rounded-xl bg-navy-950/80 border border-navy-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
                <span>
                  Showing <strong>{mappedComplaints.length}</strong> mapped issues of {filteredComplaints.length} filtered records.
                </span>
                <span>Click any marker to open preview popup or view full report.</span>
              </div>
            </div>

            {/* Right Column: Complaint List & Hotspots List (Col 4) */}
            <div className="lg:col-span-4 space-y-4">
              {/* Reported Hotspots Widget (if any) */}
              {showHotspots && hotspots.length > 0 && (
                <div className="p-4 rounded-2xl bg-navy-950 border border-orange-950/80 shadow-md space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-orange-400 text-xs font-bold uppercase tracking-wider">
                      <Flame size={14} />
                      <span>Reported Issue Hotspots</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-orange-950 text-orange-300 border border-orange-800/80">
                      {hotspots.length} clusters
                    </span>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {hotspots.map((h) => (
                      <div
                        key={h.id}
                        className="p-2.5 rounded-xl bg-navy-900/80 border border-navy-800/90 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs">
                            {h.complaintCount} reports clustered
                          </span>
                          <span className="text-[10px] uppercase font-bold text-orange-300">
                            ~{Math.round(h.radiusMeters)}m radius
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-300">
                          <span>Dominant: <strong>{getCategoryLabel(h.dominantCategory)}</strong></span>
                          <SeverityBadge severity={h.highestSeverity} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-[10px] text-slate-500 italic">
                    Cluster calculations are based strictly on currently filtered report locations.
                  </p>
                </div>
              )}

              {/* Filtered Complaints List Card */}
              <div className="p-4 rounded-2xl bg-navy-950 border border-navy-800 shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Complaint Feed ({filteredComplaints.length})
                  </h3>
                  <span className="text-[11px] text-slate-400">Click to locate</span>
                </div>

                {filteredComplaints.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 space-y-2">
                    <AlertCircle size={20} className="mx-auto text-slate-500" />
                    <p>No complaints match current filters.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {filteredComplaints.map((item) => {
                      const isSelected = selectedComplaintId === item.id;
                      const hasCoords = isValidCoordinate(item.latitude, item.longitude);

                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            setSelectedComplaintId(item.id);
                          }}
                          className={cn(
                            'p-3 rounded-xl border text-xs cursor-pointer transition-all duration-150 space-y-2',
                            isSelected
                              ? 'bg-navy-900 border-sky-500 shadow-md ring-1 ring-sky-500'
                              : 'bg-navy-900/60 border-navy-800 hover:border-navy-700 hover:bg-navy-900'
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[11px] font-bold text-alert-400">
                              Report #{item.complaint_number}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <SeverityBadge severity={item.severity} />
                              <StatusBadge status={item.status} />
                            </div>
                          </div>

                          <h4 className="font-bold text-white text-xs line-clamp-1">
                            {item.title}
                          </h4>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-navy-900">
                            <span className="truncate max-w-[170px]">
                              {item.address || getCategoryLabel(item.category)}
                            </span>

                            <div className="flex items-center gap-1">
                              {hasCoords ? (
                                <span className="text-emerald-400 font-semibold text-[10px] flex items-center gap-0.5">
                                  <MapPin size={10} /> Mapped
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[10px]">No GPS</span>
                              )}
                              <Link
                                href={`/official/complaints/${item.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-civic-400 hover:text-civic-300 p-0.5"
                                title="Open full complaint details"
                              >
                                <ExternalLink size={12} />
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Container>
      </main>
    </div>
  );
}
