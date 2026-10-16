'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, PlusCircle, FileText } from 'lucide-react';
import { CitizenNav } from '@/components/layout/CitizenNav';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { CivicMap } from '@/components/map/CivicMap';
import { useAuth } from '@/components/providers/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { Complaint } from '@/types';
import { isValidCoordinate } from '@/lib/map/hotspots';

export default function CitizenMapPage() {
  const { user, role, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Auth Guard: Only citizens
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirectTo=/citizen/map');
      } else if (role && role !== 'citizen') {
        router.push('/official/map');
      }
    }
  }, [user, role, authLoading, router]);

  // Load only the citizen's own complaints (Part 12 & Part 23)
  useEffect(() => {
    let isMounted = true;

    async function loadCitizenComplaints() {
      if (!user || role !== 'citizen') return;

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('complaints')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!isMounted) return;

        if (!error && data) {
          setComplaints(data as Complaint[]);
        }
      } catch (err) {
        console.error('Error fetching citizen map reports:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadCitizenComplaints();

    return () => {
      isMounted = false;
    };
  }, [user, role]);

  const mappedComplaints = complaints.filter((c) =>
    isValidCoordinate(c.latitude, c.longitude)
  );

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
        <CitizenNav />
        <div className="flex-1 flex items-center justify-center p-6">
          <LoadingState message="Loading your mapped reports..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <CitizenNav />

      <main className="flex-1 py-8 sm:py-10">
        <Container size="lg" className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1.5 rounded-lg bg-civic-50 text-civic-600 border border-civic-100">
                  <MapPin size={18} />
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  My Civic Reports Map
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-500">
                Geographic visualization of the civic issues reported by your account.
              </p>
            </div>

            <Link href="/citizen/report">
              <Button variant="accent" size="sm" leftIcon={<PlusCircle size={15} />}>
                Report an Issue
              </Button>
            </Link>
          </div>

          {/* Map Content */}
          {mappedComplaints.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white border border-dashed border-slate-300 text-center space-y-4 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <MapPin size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800">
                  {complaints.length === 0 ? 'No civic reports yet.' : 'No mapped reports yet.'}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {complaints.length === 0
                    ? 'Submit your first civic report to track its progress on the map.'
                    : 'Your submitted reports do not have valid GPS coordinates attached.'}
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <Link href="/citizen/report">
                  <Button variant="accent" size="sm" leftIcon={<PlusCircle size={14} />}>
                    Report an Issue
                  </Button>
                </Link>
                {complaints.length > 0 && (
                  <Link href="/citizen/reports">
                    <Button variant="secondary" size="sm" leftIcon={<FileText size={14} />}>
                      View My Reports List
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-md">
                <CivicMap
                  complaints={complaints}
                  showHotspots={false} // Citizens see only their own complaints, no global hotspots
                  height="540px"
                  baseHref="/citizen/reports"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 px-1">
                <span>
                  Showing <strong>{mappedComplaints.length}</strong> of your {complaints.length} total reports.
                </span>
                <span className="italic">
                  Click any pin to inspect the report status and details.
                </span>
              </div>
            </div>
          )}
        </Container>
      </main>
    </div>
  );
}
