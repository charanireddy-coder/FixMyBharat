'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { OfficialNav } from '@/components/layout/OfficialNav';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAuth } from '@/components/providers/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { fetchAllDepartments } from '@/lib/official';
import { Department } from '@/types';

export default function OfficialDepartmentsPage() {
  const { user, role, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [complaintCounts, setComplaintCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Access Control: Only official and admin
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirectTo=/official/departments');
      } else if (role === 'citizen') {
        router.push('/citizen');
      }
    }
  }, [user, role, authLoading, router]);

  useEffect(() => {
    let isMounted = true;

    if (user && (role === 'official' || role === 'admin')) {
      const loadDeptData = async () => {
        try {
          const supabase = createClient();

          const [deptsRes, complaintsRes] = await Promise.all([
            fetchAllDepartments(supabase),
            supabase.from('complaints').select('department_id'),
          ]);

          if (!isMounted) return;

          if (!deptsRes.error) {
            setDepartments(deptsRes.departments);
          }

          if (!complaintsRes.error && complaintsRes.data) {
            const counts: Record<string, number> = {};
            complaintsRes.data.forEach((c: { department_id: string | null }) => {
              if (c.department_id) {
                counts[c.department_id] = (counts[c.department_id] || 0) + 1;
              }
            });
            setComplaintCounts(counts);
          }
        } catch {
          // Keep defaults
        } finally {
          if (isMounted) {
            setIsLoading(false);
            setIsRefreshing(false);
          }
        }
      };

      loadDeptData();
    }

    return () => {
      isMounted = false;
    };
  }, [user, role, isRefreshing]);

  if (authLoading || (!user && isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
        <LoadingState message="Loading municipal departments..." />
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
                Municipal Departments
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Overview of municipal engineering, sanitation, and infrastructure units handling civic reports.
              </p>
            </div>

            <Button
              variant="outline-dark"
              size="sm"
              onClick={() => setIsRefreshing(true)}
              disabled={isRefreshing}
              leftIcon={<RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />}
            >
              Refresh
            </Button>
          </div>

          {/* Department Cards Grid */}
          {isLoading ? (
            <div className="py-16 flex justify-center">
              <LoadingState message="Loading departments..." />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {departments.map((dept) => {
                const count = complaintCounts[dept.id] || 0;
                return (
                  <Card
                    key={dept.id}
                    className="border-navy-800 bg-navy-950 shadow-md hover:border-navy-700 transition-all flex flex-col justify-between"
                  >
                    <CardHeader className="py-4 px-6 border-b border-navy-800 bg-navy-900/40 flex flex-row items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-navy-900 text-civic-400 flex items-center justify-center border border-navy-800">
                          <Building2 size={16} />
                        </div>
                        <span className="font-bold text-white text-sm">
                          {dept.name}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-navy-900 border border-navy-800 text-slate-300">
                        {count} reports
                      </span>
                    </CardHeader>
                    <CardBody className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {dept.description || 'Civic infrastructure and public works operations.'}
                      </p>

                      <div className="pt-4 border-t border-navy-900 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 font-mono">
                          ID: {dept.id.slice(0, 8)}...
                        </span>
                        <Link href={`/official/complaints?department=${dept.id}`}>
                          <Button
                            variant="outline-dark"
                            size="sm"
                            className="text-xs"
                            rightIcon={<ArrowRight size={12} />}
                          >
                            View Reports
                          </Button>
                        </Link>
                      </div>
                    </CardBody>
                  </Card>
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
