'use client';

import React, { useEffect, useState, use, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Building2,
  User,
  ShieldCheck,
  Send,
  Lock,
  Globe,
  FileText,
  Image as ImageIcon,
  History,
  RefreshCw,
  ExternalLink,
  Cpu,
  AlertTriangle,
  GitFork,
  Copy,
  Check,
  Eye,
  EyeOff,
  ScanLine,
} from 'lucide-react';

import {
  fetchComplaintAnalysisAction,
  triggerComplaintAnalysisAction,
  runVisionDetectionAction,
} from '@/app/actions/ai';
import {
  fetchRelatedReportsAction,
  triggerRelatedReportsAction,
  markRelatedReportReviewedAction,
} from '@/app/actions/related';

import { StoredAIAnalysis, JoinedRelatedReport } from '@/lib/ai/types';
import { scoreToSeverityLevel } from '@/lib/ai/rules';
import { OfficialNav } from '@/components/layout/OfficialNav';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAuth } from '@/components/providers/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import {
  fetchComplaintDetail,
  fetchAllDepartments,
  fetchAssignableOfficials,
  updateComplaintStatusWorkflow,
  assignComplaint,
  addComplaintUpdate,
  DetailedComplaint,
} from '@/lib/official';
import { getSignedPhotoUrl } from '@/lib/storage';
import {
  ComplaintStatus,
  Department,
  UserProfile,
  VisionDetectionResponse,
} from '@/types';
import { getCategoryLabel, formatComplaintDate } from '@/lib/complaints';
import { cn } from '@/lib/utils';

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_OPTIONS: { value: ComplaintStatus; label: string; description: string }[] = [
  { value: 'submitted', label: 'Submitted', description: 'Queued for intake verification' },
  { value: 'under_review', label: 'Under Review', description: 'Verification of report & location in progress' },
  { value: 'assigned', label: 'Assigned', description: 'Dispatched to department & field official' },
  { value: 'in_progress', label: 'In Progress', description: 'Ground workforce active on-site' },
  { value: 'resolved', label: 'Resolved', description: 'Work complete with verification notes' },
  { value: 'needs_information', label: 'Needs Information', description: 'Awaiting citizen photographic/location details' },
  { value: 'rejected', label: 'Rejected', description: 'Duplicate, fraudulent, or outside civic jurisdiction' },
];

function OfficialComplaintDetailContent({ params }: PageProps) {
  const routeParams = useParams();
  const resolvedParams = use(params);
  const complaintId = ((routeParams?.id as string) || resolvedParams?.id || '').trim();

  const { user, role, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [complaint, setComplaint] = useState<DetailedComplaint | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [officials, setOfficials] = useState<UserProfile[]>([]);
  const [signedPhotoUrl, setSignedPhotoUrl] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Status Workflow state
  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus>('submitted');
  const [statusMessage, setStatusMessage] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isStatusPublic, setIsStatusPublic] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Department & Official Assignment state
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedOfficialId, setSelectedOfficialId] = useState<string>('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignFeedback, setAssignFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Timeline Update Note state
  const [noteMessage, setNoteMessage] = useState('');
  const [isNotePublic, setIsNotePublic] = useState(true);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteFeedback, setNoteFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // AI-Assisted Analysis state (Step 6)
  const [aiAnalysis, setAiAnalysis] = useState<StoredAIAnalysis | null>(null);
  const [aiHistory, setAiHistory] = useState<StoredAIAnalysis[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAiHistory, setShowAiHistory] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Related Reports & Duplicate Intelligence state (Step 7)
  const [relatedReports, setRelatedReports] = useState<JoinedRelatedReport[]>([]);
  const [isCheckingRelated, setIsCheckingRelated] = useState(false);
  const [relatedFeedback, setRelatedFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [togglingReviewId, setTogglingReviewId] = useState<string | null>(null);

  // Computer Vision Microservice state (YOLOv8 Object Detection)
  const [visionDetections, setVisionDetections] = useState<VisionDetectionResponse | null>(null);
  const [isScanningVision, setIsScanningVision] = useState(false);
  const [visionError, setVisionError] = useState<string | null>(null);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);


  // Role Access Control: Only official and admin
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push(`/login?redirectTo=/official/complaints/${complaintId}`);
      } else if (role === 'citizen') {
        router.push('/citizen');
      }
    }
  }, [user, role, authLoading, router, complaintId]);

  // Load Data
  useEffect(() => {
    let isMounted = true;

    if (user && (role === 'official' || role === 'admin') && complaintId) {
      const loadComplaintData = async () => {
        try {
          const supabase = createClient();

          // 1. Fetch core complaint details first
          const compRes = await fetchComplaintDetail(supabase, complaintId);

          if (!isMounted) return;

          if (compRes.error || !compRes.complaint) {
            setNotFound(true);
            setIsLoading(false);
            return;
          }

          const item = compRes.complaint;
          setComplaint(item);
          setSelectedStatus(item.status);
          setSelectedDeptId(item.department_id || '');
          setSelectedOfficialId(item.assigned_to || '');
          setResolutionNotes(item.resolution_notes || '');
          setIsLoading(false); // Core complaint data is ready to display immediately!

          // 2. Fetch auxiliary department and staff data non-blockingly
          try {
            const [deptsRes, officialsRes] = await Promise.all([
              fetchAllDepartments(supabase),
              fetchAssignableOfficials(supabase),
            ]);
            if (isMounted) {
              if (!deptsRes.error && deptsRes.departments) setDepartments(deptsRes.departments);
              if (!officialsRes.error && officialsRes.officials) setOfficials(officialsRes.officials);
            }
          } catch (auxErr) {
            console.warn('Departments/officials fetch warning:', auxErr);
          }

          // 3. Fetch AI Analysis and Related Reports non-blockingly using canonical UUID
          try {
            const [aiRes, relRes] = await Promise.allSettled([
              fetchComplaintAnalysisAction(item.id),
              fetchRelatedReportsAction(item.id),
            ]);

            if (isMounted) {
              if (aiRes.status === 'fulfilled' && aiRes.value) {
                setAiAnalysis(aiRes.value.latest);
                setAiHistory(aiRes.value.history);
              }
              if (relRes.status === 'fulfilled' && relRes.value && relRes.value.reports) {
                setRelatedReports(relRes.value.reports);
              }
            }
          } catch (aiErr) {
            console.warn('AI analysis / related reports warning:', aiErr);
          }

          // 4. Get signed URL for photo if present and trigger vision detection non-blockingly
          if (item.image_url) {
            let fetchedPhotoUrl: string | null = null;
            try {
              fetchedPhotoUrl = await getSignedPhotoUrl(item.image_url);
              if (isMounted) setSignedPhotoUrl(fetchedPhotoUrl);
            } catch (photoErr) {
              console.warn('Photo URL fetch warning:', photoErr);
            }

            // Non-blocking background YOLO detection
            try {
              if (isMounted) setIsScanningVision(true);
              const visionRes = await runVisionDetectionAction(item.id, 0.25, fetchedPhotoUrl);
              if (isMounted) {
                if (visionRes.success && visionRes.data) {
                  setVisionDetections(visionRes.data);
                  setVisionError(null);
                } else if (visionRes.error) {
                  setVisionError(visionRes.error);
                }
              }
            } catch {
              if (isMounted) {
                setVisionError('Computer vision service is temporarily unavailable.');
              }

            } finally {
              if (isMounted) {
                setIsScanningVision(false);
              }
            }
          }
        } catch {
          if (isMounted) {
            setNotFound(true);
            setIsLoading(false);
          }
        } finally {
          if (isMounted) {
            setIsRefreshing(false);
          }
        }
      };

      loadComplaintData();
    }

    return () => {
      isMounted = false;
    };
  }, [user, role, complaintId, isRefreshing]);

  // Handle on-demand/re-scan by official
  const handleRunVisionScan = async () => {
    if (!complaint || !complaint.image_url) return;
    setIsScanningVision(true);
    setVisionError(null);

    try {
      const res = await runVisionDetectionAction(complaint.id, 0.25, signedPhotoUrl);
      if (res.success && res.data) {
        setVisionDetections(res.data);
        setVisionError(null);
      } else {
        setVisionError(res.error || 'Failed to detect objects in complaint photo.');
      }
    } catch {
      setVisionError('Computer vision service is temporarily unavailable.');
    } finally {
      setIsScanningVision(false);
    }
  };

  // Handle on-demand/re-analysis by official
  const handleRunAiAnalysis = async () => {
    if (!complaint) return;
    setIsAnalyzing(true);
    setAiFeedback(null);

    try {
      const res = await triggerComplaintAnalysisAction(complaint.id, {
        title: complaint.title,
        description: complaint.description,
        category: complaint.category,
        address: complaint.address,
      });

      if (res.success && res.result) {
        setAiFeedback({
          type: 'success',
          text: `Rules analysis completed (${res.result.modelName}).`,
        });
        const freshAi = await fetchComplaintAnalysisAction(complaint.id);
        if (freshAi.latest) {
          setAiAnalysis(freshAi.latest);
          setAiHistory(freshAi.history);
        }
      } else {
        setAiFeedback({
          type: 'error',
          text: res.error || 'AI analysis could not be completed.',
        });
      }
    } catch {
      setAiFeedback({
        type: 'error',
        text: 'AI analysis service temporarily unavailable.',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle on-demand related reports detection
  const handleCheckRelatedReports = async () => {
    if (!complaint) return;
    setIsCheckingRelated(true);
    setRelatedFeedback(null);

    try {
      const res = await triggerRelatedReportsAction(complaint.id, {
        id: complaint.id,
        title: complaint.title,
        description: complaint.description,
        category: complaint.category,
        address: complaint.address,
        latitude: complaint.latitude,
        longitude: complaint.longitude,
      });

      if (res.success) {
        setRelatedFeedback({
          type: 'success',
          text: `Similarity analysis complete. Found ${res.matchesCount} related report candidate(s).`,
        });
        const fresh = await fetchRelatedReportsAction(complaint.id);
        setRelatedReports(fresh.reports || []);
      } else {
        setRelatedFeedback({
          type: 'error',
          text: res.error || 'Failed to detect related reports.',
        });
      }
    } catch {
      setRelatedFeedback({
        type: 'error',
        text: 'Related report analysis service temporarily unavailable.',
      });
    } finally {
      setIsCheckingRelated(false);
    }
  };

  // Handle marking related report as reviewed / unreviewed
  const handleToggleReview = async (reportId: string, currentReviewed: boolean) => {
    setTogglingReviewId(reportId);
    try {
      const res = await markRelatedReportReviewedAction(reportId, !currentReviewed);
      if (res.success) {
        setRelatedReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, reviewed: !currentReviewed } : r))
        );
      }
    } finally {
      setTogglingReviewId(null);
    }
  };

  // Handle Status Update Workflow
  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint || !user) return;

    setStatusFeedback(null);

    if (selectedStatus === complaint.status) {
      setStatusFeedback({
        type: 'error',
        text: 'Complaint is already in this status. Select a different status to transition.',
      });
      return;
    }
    if (selectedStatus === 'resolved' && !resolutionNotes.trim()) {
      setStatusFeedback({
        type: 'error',
        text: 'Resolution notes are required when marking a complaint as resolved.',
      });
      return;
    }

    if (selectedStatus === 'rejected' && !statusMessage.trim()) {
      setStatusFeedback({
        type: 'error',
        text: 'Please provide an update message explaining the reason for rejection.',
      });
      return;
    }

    if (selectedStatus === 'needs_information' && !statusMessage.trim()) {
      setStatusFeedback({
        type: 'error',
        text: 'Please specify what additional information is required from the citizen.',
      });
      return;
    }

    setIsUpdatingStatus(true);
    const supabase = createClient();

    const transitionMessage =
      statusMessage.trim() ||
      `Complaint status updated from ${complaint.status} to ${selectedStatus}.`;

    const res = await updateComplaintStatusWorkflow(supabase, {
      complaintId: complaint.id,
      newStatus: selectedStatus,
      oldStatus: complaint.status,
      updatedBy: user.id,
      message: transitionMessage,
      isPublic: isStatusPublic,
      resolutionNotes: selectedStatus === 'resolved' ? resolutionNotes : undefined,
    });

    setIsUpdatingStatus(false);

    if (res.success) {
      setStatusFeedback({
        type: 'success',
        text: `Status successfully updated to ${selectedStatus}.`,
      });
      setStatusMessage('');
      setIsRefreshing(true);
    } else {
      setStatusFeedback({
        type: 'error',
        text: res.error || 'Failed to update status. Please try again.',
      });
    }
  };

  // Handle Department and Official Assignment
  const handleAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint || !user) return;

    setAssignFeedback(null);
    setIsAssigning(true);

    const supabase = createClient();

    const res = await assignComplaint(supabase, {
      complaintId: complaint.id,
      departmentId: selectedDeptId || null,
      assignedToId: selectedOfficialId || null,
      assignedById: user.id,
      notes: assignmentNotes,
      currentDepartmentId: complaint.department_id,
      currentAssignedToId: complaint.assigned_to,
    });

    setIsAssigning(false);

    if (res.success) {
      setAssignFeedback({
        type: 'success',
        text: 'Operational assignment successfully updated.',
      });
      setAssignmentNotes('');
      setIsRefreshing(true);
    } else {
      setAssignFeedback({
        type: 'error',
        text: res.error || 'Failed to update assignment.',
      });
    }
  };

  // Handle Timeline Note Submission
  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint || !user) return;

    if (!noteMessage.trim()) {
      setNoteFeedback({
        type: 'error',
        text: 'Please enter a message for the update.',
      });
      return;
    }

    setNoteFeedback(null);
    setIsAddingNote(true);

    const supabase = createClient();

    const res = await addComplaintUpdate(supabase, {
      complaintId: complaint.id,
      updatedBy: user.id,
      message: noteMessage,
      isPublic: isNotePublic,
      currentStatus: complaint.status,
    });

    setIsAddingNote(false);

    if (res.success) {
      setNoteFeedback({
        type: 'success',
        text: 'Update added to the complaint timeline.',
      });
      setNoteMessage('');
      setIsRefreshing(true);
    } else {
      setNoteFeedback({
        type: 'error',
        text: res.error || 'Failed to add update.',
      });
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
        <LoadingState message="Loading complaint operational workspace..." />
      </div>
    );
  }

  if (notFound || !complaint) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
        <OfficialNav />
        <Container size="md" className="py-20 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-navy-800 text-alert-400 flex items-center justify-center mx-auto border border-navy-700">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white">Complaint Not Found</h1>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            The requested civic issue could not be found or you do not have permission to view it.
          </p>
          <Link href="/official/complaints">
            <Button variant="secondary" size="sm" leftIcon={<ArrowLeft size={14} />}>
              Back to Complaints
            </Button>
          </Link>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      <OfficialNav />

      <main className="flex-1 py-6 sm:py-8">
        <Container size="lg" className="space-y-6">
          {/* Top Bar Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-navy-800">
            <Link
              href="/official/complaints"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Back to Complaints</span>
            </Link>

            <div className="flex items-center gap-2">
              <Button
                variant="outline-dark"
                size="sm"
                onClick={() => setIsRefreshing(true)}
                disabled={isRefreshing}
                leftIcon={<RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />}
              >
                Refresh
              </Button>
              <div className="font-mono text-xs font-bold text-slate-400 px-2.5 py-1 rounded bg-navy-950 border border-navy-800">
                ID: {complaint.id.slice(0, 8)}...
              </div>
            </div>
          </div>

          {/* Header Card */}
          <div className="p-6 rounded-2xl bg-navy-950 border border-navy-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-lg font-black text-alert-400">
                  Report #{complaint.complaint_number}
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-navy-900 border border-navy-700 text-slate-200">
                  {getCategoryLabel(complaint.category)}
                </span>
                <SeverityBadge severity={complaint.severity} />
                <StatusBadge status={complaint.status} />
              </div>

              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-500" />
                <span>Submitted {formatComplaintDate(complaint.created_at)}</span>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {complaint.title}
            </h1>

            {/* Sub-meta tags */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-300 pt-2 border-t border-navy-900">
              {complaint.address && (
                <div className="flex items-center gap-1.5">
                  <MapPin size={13} className="text-alert-400 shrink-0" />
                  <span>{complaint.address}</span>
                </div>
              )}

              {complaint.citizen_profile?.full_name && (
                <div className="flex items-center gap-1.5">
                  <User size={13} className="text-civic-400 shrink-0" />
                  <span>
                    Reported by <strong>{complaint.citizen_profile.full_name}</strong>
                    {complaint.citizen_profile.phone ? ` (${complaint.citizen_profile.phone})` : ''}
                  </span>
                </div>
              )}

              {complaint.department && (
                <div className="flex items-center gap-1.5">
                  <Building2 size={13} className="text-emerald-400 shrink-0" />
                  <span>{complaint.department.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Main 2-Column Operational Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (Details, Photo, Timeline) - 7 cols */}
            <div className="lg:col-span-7 space-y-6">
              {/* Description Card */}
              <Card className="border-navy-800 bg-navy-950 shadow-md">
                <CardHeader className="py-4 px-6 border-b border-navy-800 bg-navy-900/40">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <FileText size={15} className="text-civic-400" />
                    <span>Issue Description</span>
                  </h2>
                </CardHeader>
                <CardBody className="p-6 space-y-4">
                  <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                    {complaint.description}
                  </p>

                  {(complaint.latitude !== null && complaint.longitude !== null) && (
                    <div className="p-3 rounded-xl bg-navy-900/60 border border-navy-800 text-xs text-slate-400 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={14} className="text-slate-500" />
                        <span>Coordinates: {complaint.latitude}, {complaint.longitude}</span>
                      </div>
                      <a
                        href={`https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-civic-400 hover:text-civic-300 font-medium flex items-center gap-1 text-[11px]"
                      >
                        <span>View Map</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* AI-ASSISTED ANALYSIS CARD (Rules Engine) */}
              <Card className="border-navy-800 bg-navy-950 shadow-md overflow-hidden">
                <CardHeader className="py-4 px-6 border-b border-navy-800 bg-navy-900/40 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-civic-500/10 text-civic-400 flex items-center justify-center border border-civic-500/20">
                      <Cpu size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-white tracking-wide">
                          AI-Assisted Analysis
                        </h2>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-navy-900 border border-navy-700 text-slate-300">
                          Rules Engine
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Source: <span className="text-slate-300 font-mono font-semibold">{aiAnalysis?.analysis_source || 'rules'}</span> • Model: <span className="text-slate-300 font-mono font-semibold">{aiAnalysis?.model_name || 'fixmybharat-rules-v1'}</span>
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline-dark"
                    size="sm"
                    onClick={handleRunAiAnalysis}
                    disabled={isAnalyzing}
                    leftIcon={<RefreshCw size={12} className={isAnalyzing ? 'animate-spin' : ''} />}
                    className="text-xs"
                  >
                    {isAnalyzing ? 'Analyzing...' : aiAnalysis ? 'Re-analyze' : 'Run Analysis'}
                  </Button>
                </CardHeader>

                <CardBody className="p-6 space-y-5">
                  {aiFeedback && (
                    <div
                      className={cn(
                        'p-2.5 rounded-lg text-xs font-medium',
                        aiFeedback.type === 'success'
                          ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-800'
                          : 'bg-red-950/80 text-red-200 border border-red-800'
                      )}
                    >
                      {aiFeedback.text}
                    </div>
                  )}

                  {aiAnalysis ? (
                    <>
                      {/* Category Comparison Box (Part 11) */}
                      <div className="p-4 rounded-xl bg-navy-900/60 border border-navy-800 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="p-3 rounded-lg bg-navy-950 border border-navy-800/80">
                            <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                              Citizen Category
                            </span>
                            <span className="text-sm font-bold text-white">
                              {getCategoryLabel(complaint.category)}
                            </span>
                          </div>

                          <div className="p-3 rounded-lg bg-navy-950 border border-navy-800/80">
                            <span className="block text-[11px] font-semibold text-civic-400 uppercase tracking-wider mb-1">
                              AI Suggested Category
                            </span>
                            <span className="text-sm font-bold text-civic-300">
                              {getCategoryLabel(aiAnalysis.predicted_category || complaint.category)}
                            </span>
                          </div>
                        </div>

                        {/* Mismatch Alert or Match Confirmation */}
                        {aiAnalysis.predicted_category &&
                        aiAnalysis.predicted_category.toLowerCase() !== complaint.category.toLowerCase() ? (
                          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs">
                            <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                            <span>
                              <strong>Category mismatch — review recommended.</strong> Citizen selected{' '}
                              <em>{getCategoryLabel(complaint.category)}</em>, while rules inference suggests{' '}
                              <em>{getCategoryLabel(aiAnalysis.predicted_category)}</em>.
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                            <CheckCircle2 size={13} />
                            <span>Category alignment: Rules inference corroborates citizen-reported category.</span>
                          </div>
                        )}
                      </div>

                      {/* Metrics Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        {/* Rule Confidence */}
                        <div className="p-3.5 rounded-xl bg-navy-900/60 border border-navy-800 space-y-1">
                          <span className="text-[11px] font-semibold text-slate-400">Rule Confidence</span>
                          <div className="text-xl font-black text-white">
                            {aiAnalysis.confidence !== null && aiAnalysis.confidence !== undefined
                              ? `${Math.round(Number(aiAnalysis.confidence) * 100)}%`
                              : '78%'}
                          </div>
                          <p className="text-[10px] text-slate-400">Deterministic signal weight</p>
                        </div>

                        {/* Severity Score */}
                        <div className="p-3.5 rounded-xl bg-navy-900/60 border border-navy-800 space-y-1">
                          <span className="text-[11px] font-semibold text-slate-400">Severity Score</span>
                          <div className="text-xl font-black text-alert-400">
                            {aiAnalysis.severity_score !== null && aiAnalysis.severity_score !== undefined
                              ? `${Number(aiAnalysis.severity_score)} / 100`
                              : '50 / 100'}
                          </div>
                          <div className="w-full bg-navy-950 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-alert-500 h-1.5 rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min(100, Math.max(0, Number(aiAnalysis.severity_score || 50)))}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Suggested Severity */}
                        <div className="p-3.5 rounded-xl bg-navy-900/60 border border-navy-800 space-y-1">
                          <span className="text-[11px] font-semibold text-slate-400">Suggested Severity</span>
                          <div className="pt-0.5">
                            <SeverityBadge
                              severity={scoreToSeverityLevel(Number(aiAnalysis.severity_score || 50))}
                            />
                          </div>
                          <p className="text-[10px] text-slate-400">Rules-based assessment</p>
                        </div>
                      </div>

                      {/* Explanation (Why?) */}
                      <div className="p-3.5 rounded-xl bg-navy-900/60 border border-navy-800 space-y-1.5">
                        <span className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                          Why? (Inference Reasoning)
                        </span>
                        <p className="text-xs text-slate-200 leading-relaxed">
                          {aiAnalysis.explanation ||
                            'Keyword pattern matching detected standard operational factors.'}
                        </p>
                      </div>

                      {/* Disclaimer & History Toggle */}
                      <div className="p-2.5 rounded-lg bg-navy-900/30 border border-navy-800/50 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
                        <span>Current analysis uses transparent rules. A trained AI/ML model can be connected later.</span>
                        {aiHistory.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setShowAiHistory(!showAiHistory)}
                            className="text-civic-400 hover:text-civic-300 font-semibold"
                          >
                            {showAiHistory ? 'Hide History' : `History (${aiHistory.length})`}
                          </button>
                        )}
                      </div>

                      {/* Analysis History List (Part 12) */}
                      {showAiHistory && aiHistory.length > 1 && (
                        <div className="pt-2 border-t border-navy-900 space-y-2 text-xs">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Analysis History
                          </span>
                          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                            {aiHistory.map((h) => (
                              <div
                                key={h.id}
                                className="p-2.5 rounded-lg bg-navy-900/60 border border-navy-800/60 flex items-center justify-between text-[11px]"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-200">
                                    {getCategoryLabel(h.predicted_category)}
                                  </span>
                                  <span className="text-slate-400">Score: {h.severity_score}/100</span>
                                  <span className="text-slate-500 font-mono text-[10px]">({h.analysis_source})</span>
                                </div>
                                <span className="text-slate-500">{formatComplaintDate(h.created_at)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-8 rounded-xl bg-navy-900/40 border border-dashed border-navy-800 text-center space-y-3">
                      <Cpu size={28} className="mx-auto text-slate-600" />
                      <div className="space-y-1">
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                          No analysis recorded yet
                        </h3>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                          Click below to execute rules-based category and severity inference on this complaint.
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleRunAiAnalysis}
                        disabled={isAnalyzing}
                        leftIcon={<RefreshCw size={12} className={isAnalyzing ? 'animate-spin' : ''} />}
                      >
                        {isAnalyzing ? 'Analyzing...' : 'Generate Analysis'}
                      </Button>
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* RELATED REPORTS & DUPLICATE INTELLIGENCE (Step 7) */}
              <Card className="border-navy-800 bg-navy-950 shadow-md overflow-hidden">
                <CardHeader className="py-4 px-6 border-b border-navy-800 bg-navy-900/40 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20">
                      <GitFork size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-white tracking-wide">
                          Related Reports
                        </h2>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-navy-900 border border-navy-700 text-slate-300">
                          Deterministic Similarity
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Signal correlation across category, text, and geographic proximity
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline-dark"
                    size="sm"
                    onClick={handleCheckRelatedReports}
                    disabled={isCheckingRelated}
                    leftIcon={<RefreshCw size={12} className={isCheckingRelated ? 'animate-spin' : ''} />}
                    className="text-xs"
                  >
                    {isCheckingRelated ? 'Scanning...' : 'Re-check Matches'}
                  </Button>
                </CardHeader>

                <CardBody className="p-6 space-y-4">
                  {relatedFeedback && (
                    <div
                      className={cn(
                        'p-2.5 rounded-lg text-xs font-medium',
                        relatedFeedback.type === 'success'
                          ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-800'
                          : 'bg-red-950/80 text-red-200 border border-red-800'
                      )}
                    >
                      {relatedFeedback.text}
                    </div>
                  )}

                  {relatedReports.length === 0 ? (
                    <div className="p-8 rounded-xl bg-navy-900/40 border border-dashed border-navy-800 text-center space-y-2">
                      <Copy size={24} className="mx-auto text-slate-600" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        No potentially related reports found
                      </h3>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        No existing complaints exceeded the 40% similarity threshold across category, description, and geographic proximity.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {relatedReports.map((report) => {
                        const score = Number(report.match_score || 0);
                        const percent = Math.round(score * 100);
                        const isDuplicate = score >= 0.80;
                        const isLikely = score >= 0.60;

                        return (
                          <div
                            key={report.id}
                            className="p-4 rounded-xl bg-navy-900/60 border border-navy-800 space-y-3"
                          >
                            {/* Match Header Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    'px-2.5 py-0.5 rounded-full text-xs font-bold border',
                                    isDuplicate
                                      ? 'bg-amber-950/70 text-amber-300 border-amber-700/80'
                                      : isLikely
                                      ? 'bg-sky-950/70 text-sky-300 border-sky-700/80'
                                      : 'bg-slate-800 text-slate-300 border-slate-700'
                                  )}
                                >
                                  {isDuplicate ? 'Possible Duplicate' : isLikely ? 'Likely Related' : 'Weak Relationship'}
                                </span>

                                <span className="text-xs font-black text-white px-2 py-0.5 rounded bg-navy-950 border border-navy-800 font-mono">
                                  {percent}% match
                                </span>

                                {report.reviewed ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                                    <Check size={11} />
                                    <span>Reviewed</span>
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-slate-400">
                                    Pending review
                                  </span>
                                )}
                              </div>

                              <Button
                                variant={report.reviewed ? 'ghost' : 'outline-dark'}
                                size="sm"
                                onClick={() => handleToggleReview(report.id, report.reviewed)}
                                disabled={togglingReviewId === report.id}
                                leftIcon={<Check size={11} />}
                                className="text-xs py-1 px-2.5 h-auto"
                              >
                                {togglingReviewId === report.id
                                  ? 'Saving...'
                                  : report.reviewed
                                  ? 'Mark Unreviewed'
                                  : 'Mark as Reviewed'}
                              </Button>
                            </div>

                            {/* Complaint Details Link */}
                            {report.related_complaint ? (
                              <div className="space-y-1.5 pt-1 border-t border-navy-900">
                                <div className="flex items-center justify-between gap-2">
                                  <Link
                                    href={`/official/complaints/${report.related_complaint.id}`}
                                    target="_blank"
                                    className="font-bold text-sm text-white hover:text-civic-300 transition-colors inline-flex items-center gap-1.5"
                                  >
                                    <span>
                                      Report #{report.related_complaint.complaint_number}: {report.related_complaint.title}
                                    </span>
                                    <ExternalLink size={12} className="text-slate-500" />
                                  </Link>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-navy-950 border border-navy-800 text-slate-300">
                                      {getCategoryLabel(report.related_complaint.category)}
                                    </span>
                                    <StatusBadge status={report.related_complaint.status as ComplaintStatus} />
                                  </div>
                                </div>

                                {report.related_complaint.address && (
                                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                    <MapPin size={12} className="text-slate-500 shrink-0" />
                                    <span>{report.related_complaint.address}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-xs text-slate-400 italic">
                                Referenced complaint record
                              </div>
                            )}

                            {/* Match Reason */}
                            {report.match_reason && (
                              <div className="p-2.5 rounded-lg bg-navy-950/80 border border-navy-800/80 text-xs">
                                <span className="font-semibold text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">
                                  Match Signals
                                </span>
                                <p className="text-slate-300 italic">
                                  &ldquo;{report.match_reason}&rdquo;
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Footnote Guardrail Notice (Parts 17 & 20) */}
                  <div className="p-2.5 rounded-lg bg-navy-900/30 border border-navy-800/50 text-[11px] text-slate-400">
                    Potentially related complaints are flagged for official review. The system never automatically merges, rejects, or closes complaints.
                  </div>
                </CardBody>
              </Card>

              {/* Photographic Evidence & YOLO Object Detections */}
              <Card className="border-navy-800 bg-navy-950 shadow-md">
                <CardHeader className="py-4 px-6 border-b border-navy-800 bg-navy-900/40 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon size={15} className="text-civic-400" />
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                      Photographic Evidence
                    </h2>
                  </div>

                  {complaint.image_url && (
                    <div className="flex items-center gap-2">
                      {visionDetections && visionDetections.detections.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                          className="text-xs h-7 px-2.5 text-slate-300 hover:text-white"
                          leftIcon={showBoundingBoxes ? <EyeOff size={12} /> : <Eye size={12} />}
                        >
                          {showBoundingBoxes ? 'Hide Boxes' : 'Show Boxes'}
                        </Button>
                      )}

                      <Button
                        variant="outline-dark"
                        size="sm"
                        onClick={handleRunVisionScan}
                        disabled={isScanningVision}
                        className="text-xs h-7 px-2.5"
                        leftIcon={<RefreshCw size={12} className={isScanningVision ? 'animate-spin' : ''} />}
                      >
                        {isScanningVision ? 'Scanning...' : visionDetections ? 'Re-scan YOLO' : 'Scan with YOLO'}
                      </Button>
                    </div>
                  )}
                </CardHeader>

                <CardBody className="p-6 space-y-5">
                  {signedPhotoUrl ? (
                    <div className="space-y-4">
                      {/* Photo Container with Bounding Box Overlay */}
                      <div className="rounded-xl overflow-hidden border border-navy-800 bg-black/60 flex items-center justify-center p-2">
                        <div className="relative inline-block max-w-full">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={signedPhotoUrl}
                            alt={`Evidence for ${complaint.title}`}
                            className="block max-h-[420px] w-auto max-w-full rounded-lg object-contain select-none"
                          />

                          {/* Bounding Box Overlay */}
                          {showBoundingBoxes && visionDetections?.detections && visionDetections.detections.length > 0 && (
                            <div className="absolute inset-0 pointer-events-none">
                              {visionDetections.detections.map((det, idx) => {
                                const { norm_x1, norm_y1, norm_width, norm_height } = det.box;
                                return (
                                  <div
                                    key={idx}
                                    className="absolute border-2 border-amber-400 bg-amber-400/15 rounded-sm transition-all"
                                    style={{
                                      left: `${norm_x1 * 100}%`,
                                      top: `${norm_y1 * 100}%`,
                                      width: `${norm_width * 100}%`,
                                      height: `${norm_height * 100}%`,
                                    }}
                                  >
                                    <span className="absolute -top-5 left-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-navy-950/90 text-amber-300 border border-amber-400/60 shadow whitespace-nowrap">
                                      {det.class_name} {Math.round(det.confidence * 100)}%
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Private Storage: complaint-photos</span>
                        <a
                          href={signedPhotoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-civic-400 hover:text-civic-300 font-semibold flex items-center gap-1 text-xs"
                        >
                          <span>Open Full Size</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>

                      {/* Clearly Labeled "YOLO Object Detections" Section */}
                      <div className="p-4 rounded-xl bg-navy-900/60 border border-navy-800 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-navy-800/80 pb-3">
                          <div className="flex items-center gap-2">
                            <ScanLine size={16} className="text-civic-400" />
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                              YOLO Object Detections
                            </h3>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-navy-950 border border-navy-700 text-amber-300 font-mono">
                              yolov8n.pt (CPU)
                            </span>
                          </div>

                          {visionDetections && (
                            <span className="text-[11px] font-semibold text-slate-300 bg-navy-950 px-2.5 py-1 rounded-md border border-navy-800">
                              {visionDetections.total_detections} {visionDetections.total_detections === 1 ? 'object' : 'objects'} detected (≥25% confidence)
                            </span>
                          )}
                        </div>

                        {/* Loading State */}
                        {isScanningVision && (
                          <div className="p-4 rounded-lg bg-navy-950/60 border border-navy-800 text-center text-xs text-slate-400 space-y-2">
                            <RefreshCw size={18} className="mx-auto text-civic-400 animate-spin" />
                            <p>Analyzing photographic evidence with local YOLOv8 CPU microservice...</p>
                          </div>
                        )}

                        {/* Error / Offline State */}
                        {visionError && !isScanningVision && (
                          <div className="p-3.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs space-y-1.5">
                            <div className="flex items-center gap-2 font-bold text-amber-300">
                              <AlertTriangle size={15} />
                              <span>Vision Microservice Offline</span>
                            </div>
                            <p className="text-[11px] text-amber-200/90 leading-relaxed">
                              {visionError}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Notice: Complaint status, assignment, and rules-based analysis remain fully operational.
                            </p>
                          </div>
                        )}

                        {/* Successful Detections View */}
                        {visionDetections && !isScanningVision && (
                          <div className="space-y-3">
                            {visionDetections.detections.length > 0 ? (
                              <>
                                {/* Class Summary Badges */}
                                <div className="flex flex-wrap gap-1.5">
                                  {Object.entries(
                                    visionDetections.detections.reduce<Record<string, { count: number; maxConf: number }>>(
                                      (acc, det) => {
                                        const name = det.class_name;
                                        if (!acc[name]) acc[name] = { count: 0, maxConf: 0 };
                                        acc[name].count += 1;
                                        acc[name].maxConf = Math.max(acc[name].maxConf, det.confidence);
                                        return acc;
                                      },
                                      {}
                                    )
                                  ).map(([clsName, info]) => (
                                    <span
                                      key={clsName}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-navy-950 border border-navy-700 text-slate-200"
                                    >
                                      <span className="font-bold text-amber-300">{clsName}</span>
                                      <span className="text-[11px] text-slate-400">×{info.count}</span>
                                      <span className="text-[10px] text-emerald-400 font-mono">
                                        {Math.round(info.maxConf * 100)}%
                                      </span>
                                    </span>
                                  ))}
                                </div>

                                {/* Detailed Detection Rows */}
                                <div className="max-h-48 overflow-y-auto rounded-lg border border-navy-800 bg-navy-950 divide-y divide-navy-800/60">
                                  {visionDetections.detections.map((det, idx) => (
                                    <div
                                      key={idx}
                                      className="p-2.5 flex items-center justify-between text-xs hover:bg-navy-900/40 transition-colors"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="w-5 text-right font-mono text-[10px] text-slate-500">
                                          #{idx + 1}
                                        </span>
                                        <span className="font-semibold text-white capitalize">
                                          {det.class_name}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-3">
                                        <span className="text-[11px] font-mono text-slate-400">
                                          [{Math.round(det.box.x1)}, {Math.round(det.box.y1)}, {Math.round(det.box.width)}×{Math.round(det.box.height)}]
                                        </span>
                                        <span
                                          className={cn(
                                            'px-2 py-0.5 rounded text-[10px] font-bold font-mono',
                                            det.confidence >= 0.75
                                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                              : det.confidence >= 0.5
                                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                              : 'bg-navy-900 text-slate-300 border border-navy-700'
                                          )}
                                        >
                                          {Math.round(det.confidence * 100)}%
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <div className="p-3 text-center text-xs text-slate-400 bg-navy-950 rounded-lg border border-navy-800">
                                No COCO objects identified above the 25% confidence threshold.
                              </div>
                            )}

                            {/* Advisory Notice */}
                            <p className="text-[10px] text-slate-400 leading-normal italic">
                              {visionDetections.model_limitations_notice ||
                                'Note: YOLO detections are advisory indicators and do not automatically override category or severity.'}
                            </p>
                          </div>
                        )}

                        {!visionDetections && !isScanningVision && !visionError && (
                          <div className="p-3 text-center text-xs text-slate-400 bg-navy-950 rounded-lg border border-navy-800">
                            Click &ldquo;Scan with YOLO&rdquo; to analyze this photo with the local vision microservice.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : complaint.image_url ? (
                    <div className="p-8 rounded-xl bg-navy-900/60 border border-navy-800 text-center text-xs text-slate-400 space-y-2">
                      <ImageIcon size={24} className="mx-auto text-slate-500" />
                      <p>Photo attached in storage ({complaint.image_url})</p>
                      <p className="text-[11px] text-slate-500">Generating secure access view...</p>
                    </div>
                  ) : (
                    <div className="p-8 rounded-xl bg-navy-900/40 border border-dashed border-navy-800 text-center text-xs text-slate-500 space-y-2">
                      <ImageIcon size={24} className="mx-auto text-slate-600" />
                      <p>No photo was attached by the citizen during submission.</p>
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Verified Resolution Notes Card (if resolved) */}
              {(complaint.resolution_notes || complaint.resolved_at) && (
                <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-800 shadow-md space-y-3">
                  <div className="flex items-center gap-2 text-emerald-300 font-extrabold text-sm uppercase tracking-wider">
                    <ShieldCheck size={18} />
                    <span>Resolution Verification</span>
                  </div>

                  {complaint.resolution_notes && (
                    <p className="text-sm text-emerald-100 bg-navy-950/80 p-4 rounded-xl border border-emerald-800/60 leading-relaxed">
                      {complaint.resolution_notes}
                    </p>
                  )}

                  {complaint.resolved_at && (
                    <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 size={13} />
                      <span>Resolved on {formatComplaintDate(complaint.resolved_at)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Timeline Updates Section */}
              <Card className="border-navy-800 bg-navy-950 shadow-md">
                <CardHeader className="py-4 px-6 border-b border-navy-800 bg-navy-900/40 flex flex-row items-center justify-between">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <History size={15} className="text-civic-400" />
                    <span>Operational Timeline</span>
                  </h2>
                  <span className="text-xs text-slate-400">
                    {complaint.updates?.length || 0} updates
                  </span>
                </CardHeader>
                <CardBody className="p-6 space-y-6">
                  {/* Timeline Feed */}
                  {complaint.updates && complaint.updates.length > 0 ? (
                    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-navy-800">
                      {complaint.updates.map((update) => (
                        <div key={update.id} className="relative group space-y-1">
                          {/* Dot */}
                          <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-civic-500 border-2 border-navy-950" />

                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">
                                {update.updater_name || 'Civic Operations'}
                              </span>
                              {update.is_public ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-sky-950 border border-sky-800 text-sky-300 font-semibold">
                                  <Globe size={10} /> Public
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-950 border border-amber-800 text-amber-300 font-semibold">
                                  <Lock size={10} /> Internal
                                </span>
                              )}
                            </div>

                            <span className="text-[11px] text-slate-500">
                              {formatComplaintDate(update.created_at)}
                            </span>
                          </div>

                          {update.old_status && update.new_status && update.old_status !== update.new_status && (
                            <div className="text-xs text-slate-400 font-medium">
                              Transitioned from{' '}
                              <span className="font-semibold text-slate-300">{update.old_status}</span> to{' '}
                              <span className="font-semibold text-alert-400">{update.new_status}</span>
                            </div>
                          )}

                          {update.message && (
                            <p className="text-xs text-slate-300 p-3 rounded-xl bg-navy-900/60 border border-navy-800 leading-relaxed">
                              {update.message}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-4">
                      No operational updates logged on this complaint yet.
                    </p>
                  )}

                  {/* Add Timeline Note Form */}
                  <form onSubmit={handleNoteSubmit} className="pt-4 border-t border-navy-900 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Add Timeline Note
                      </span>
                      <div className="flex items-center gap-2 text-xs">
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                          <input
                            type="radio"
                            name="noteVisibility"
                            checked={isNotePublic}
                            onChange={() => setIsNotePublic(true)}
                            className="text-civic-500"
                          />
                          <span className="flex items-center gap-1">
                            <Globe size={11} /> Public to Citizen
                          </span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 ml-2">
                          <input
                            type="radio"
                            name="noteVisibility"
                            checked={!isNotePublic}
                            onChange={() => setIsNotePublic(false)}
                            className="text-civic-500"
                          />
                          <span className="flex items-center gap-1">
                            <Lock size={11} /> Internal Only
                          </span>
                        </label>
                      </div>
                    </div>

                    <textarea
                      rows={3}
                      value={noteMessage}
                      onChange={(e) => setNoteMessage(e.target.value)}
                      placeholder={
                        isNotePublic
                          ? 'Add a public message visible to the citizen tracking this report...'
                          : 'Add an internal operational note for civic officials...'
                      }
                      className="w-full p-3 rounded-xl bg-navy-900 border border-navy-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-civic-500 resize-none"
                    />

                    {noteFeedback && (
                      <div
                        className={cn(
                          'p-2.5 rounded-lg text-xs font-medium',
                          noteFeedback.type === 'success'
                            ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-800'
                            : 'bg-red-950/80 text-red-200 border border-red-800'
                        )}
                      >
                        {noteFeedback.text}
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        variant="accent"
                        size="sm"
                        disabled={isAddingNote || !noteMessage.trim()}
                        leftIcon={<Send size={13} />}
                      >
                        {isAddingNote ? 'Saving...' : 'Add Note'}
                      </Button>
                    </div>
                  </form>
                </CardBody>
              </Card>
            </div>

            {/* Right Column (Action Controls) - 5 cols */}
            <div className="lg:col-span-5 space-y-6">
              {/* STATUS WORKFLOW CARD */}
              <Card className="border-navy-800 bg-navy-950 shadow-md">
                <CardHeader className="py-4 px-6 border-b border-navy-800 bg-navy-900/40">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center justify-between">
                    <span>Complaint Status Workflow</span>
                    <StatusBadge status={complaint.status} />
                  </h2>
                </CardHeader>
                <CardBody className="p-6">
                  <form onSubmit={handleStatusSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Transition To Status
                      </label>
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value as ComplaintStatus)}
                        className="w-full p-2.5 rounded-xl bg-navy-900 border border-navy-800 text-sm text-white font-medium focus:outline-none focus:ring-1 focus:ring-civic-500"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label} — {opt.description}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Specialized field: Resolution Notes (Required when resolved) */}
                    {selectedStatus === 'resolved' && (
                      <div className="space-y-1.5 animate-in fade-in duration-200 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60">
                        <label className="block text-xs font-bold text-emerald-200">
                          Resolution Notes <span className="text-red-400">*</span>
                        </label>
                        <p className="text-[11px] text-emerald-300/80">
                          Explain how the issue was remediated on-site.
                        </p>
                        <textarea
                          rows={3}
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          placeholder="e.g. Road maintenance team filled the pothole with bitumen asphalt and inspected stability."
                          className="w-full p-2.5 rounded-lg bg-navy-900 border border-emerald-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                          required
                        />
                      </div>
                    )}

                    {/* Specialized field: Reason when Rejected */}
                    {selectedStatus === 'rejected' && (
                      <div className="space-y-1.5 animate-in fade-in duration-200 p-3.5 rounded-xl bg-red-950/40 border border-red-800/60">
                        <label className="block text-xs font-bold text-red-200">
                          Rejection Reason <span className="text-red-400">*</span>
                        </label>
                        <p className="text-[11px] text-red-300/80">
                          Explain why this issue cannot be processed. Visible to citizen.
                        </p>
                        <textarea
                          rows={2}
                          value={statusMessage}
                          onChange={(e) => setStatusMessage(e.target.value)}
                          placeholder="e.g. Duplicate of active report #1004 or private property outside municipal jurisdiction."
                          className="w-full p-2.5 rounded-lg bg-navy-900 border border-red-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
                          required
                        />
                      </div>
                    )}

                    {/* Specialized field: What info needed when Needs Information */}
                    {selectedStatus === 'needs_information' && (
                      <div className="space-y-1.5 animate-in fade-in duration-200 p-3.5 rounded-xl bg-purple-950/40 border border-purple-800/60">
                        <label className="block text-xs font-bold text-purple-200">
                          Information Required <span className="text-red-400">*</span>
                        </label>
                        <p className="text-[11px] text-purple-300/80">
                          Tell the citizen what details (e.g. landmark, clearer photo) are missing.
                        </p>
                        <textarea
                          rows={2}
                          value={statusMessage}
                          onChange={(e) => setStatusMessage(e.target.value)}
                          placeholder="e.g. Please specify the exact lane number or provide a clear landmark near the intersection."
                          className="w-full p-2.5 rounded-lg bg-navy-900 border border-purple-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                          required
                        />
                      </div>
                    )}

                    {/* General status update message */}
                    {selectedStatus !== 'rejected' && selectedStatus !== 'needs_information' && (
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-400">
                          Workflow Note (Optional)
                        </label>
                        <textarea
                          rows={2}
                          value={statusMessage}
                          onChange={(e) => setStatusMessage(e.target.value)}
                          placeholder="Add detail regarding this status transition..."
                          className="w-full p-2.5 rounded-lg bg-navy-900 border border-navy-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-civic-500 resize-none"
                        />
                      </div>
                    )}

                    {/* Visibility */}
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Citizen Visibility:</span>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isStatusPublic}
                          onChange={(e) => setIsStatusPublic(e.target.checked)}
                          className="text-civic-500 rounded"
                        />
                        <span className="text-slate-300">Show to citizen</span>
                      </label>
                    </div>

                    {statusFeedback && (
                      <div
                        className={cn(
                          'p-2.5 rounded-lg text-xs font-medium',
                          statusFeedback.type === 'success'
                            ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-800'
                            : 'bg-red-950/80 text-red-200 border border-red-800'
                        )}
                      >
                        {statusFeedback.text}
                      </div>
                    )}

                    <Button
                      type="submit"
                      variant="accent"
                      className="w-full"
                      size="sm"
                      disabled={isUpdatingStatus || selectedStatus === complaint.status}
                    >
                      {isUpdatingStatus ? 'Updating Status...' : 'Apply Status Transition'}
                    </Button>
                  </form>
                </CardBody>
              </Card>

              {/* DEPARTMENT & OFFICIAL ASSIGNMENT CARD */}
              <Card className="border-navy-800 bg-navy-950 shadow-md">
                <CardHeader className="py-4 px-6 border-b border-navy-800 bg-navy-900/40">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center justify-between">
                    <span>Department & Official Assignment</span>
                    <Building2 size={15} className="text-civic-400" />
                  </h2>
                </CardHeader>
                <CardBody className="p-6">
                  <form onSubmit={handleAssignmentSubmit} className="space-y-4">
                    {/* Department Dropdown */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Assigned Department
                      </label>
                      <select
                        value={selectedDeptId}
                        onChange={(e) => setSelectedDeptId(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-navy-900 border border-navy-800 text-sm text-white focus:outline-none focus:ring-1 focus:ring-civic-500"
                      >
                        <option value="">-- Unassigned --</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Assignable Official Dropdown */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Designated Official
                      </label>
                      <select
                        value={selectedOfficialId}
                        onChange={(e) => setSelectedOfficialId(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-navy-900 border border-navy-800 text-sm text-white focus:outline-none focus:ring-1 focus:ring-civic-500"
                      >
                        <option value="">-- Unassigned --</option>
                        {officials.map((off) => (
                          <option key={off.id} value={off.id}>
                            {off.full_name || off.id.slice(0, 8)} ({off.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Assignment Note */}
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Assignment Note
                      </label>
                      <input
                        type="text"
                        value={assignmentNotes}
                        onChange={(e) => setAssignmentNotes(e.target.value)}
                        placeholder="e.g. Assigned to Zonal Field Inspector for verification."
                        className="w-full p-2.5 rounded-xl bg-navy-900 border border-navy-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-civic-500"
                      />
                    </div>

                    {assignFeedback && (
                      <div
                        className={cn(
                          'p-2.5 rounded-lg text-xs font-medium',
                          assignFeedback.type === 'success'
                            ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-800'
                            : 'bg-red-950/80 text-red-200 border border-red-800'
                        )}
                      >
                        {assignFeedback.text}
                      </div>
                    )}

                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full"
                      size="sm"
                      disabled={isAssigning}
                    >
                      {isAssigning ? 'Saving Assignment...' : 'Save Assignment Record'}
                    </Button>
                  </form>
                </CardBody>
              </Card>

              {/* Assignment Audit History Card */}
              {complaint.assignments && complaint.assignments.length > 0 && (
                <Card className="border-navy-800 bg-navy-950 shadow-md">
                  <CardHeader className="py-3 px-6 border-b border-navy-800 bg-navy-900/40">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Assignment History ({complaint.assignments.length})
                    </span>
                  </CardHeader>
                  <CardBody className="p-4 space-y-2.5 text-xs">
                    {complaint.assignments.map((asgn) => (
                      <div
                        key={asgn.id}
                        className="p-2.5 rounded-lg bg-navy-900/60 border border-navy-800/80 space-y-1"
                      >
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="font-semibold text-slate-300">
                            {asgn.notes || 'Assignment update'}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {formatComplaintDate(asgn.assigned_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </CardBody>
                </Card>
              )}
            </div>
          </div>
        </Container>
      </main>

      <footer className="py-6 border-t border-navy-800 bg-navy-950 text-center text-xs text-slate-500">
        <p>FixMyBharat Civic Operations Desk • Built by Team SyncMates</p>
      </footer>
    </div>
  );
}

export default function OfficialComplaintDetailPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
          <LoadingState message="Loading complaint details..." />
        </div>
      }
    >
      <OfficialComplaintDetailContent {...props} />
    </Suspense>
  );
}
