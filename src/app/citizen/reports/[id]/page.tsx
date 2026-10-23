'use client';

import React, { useEffect, useState, use, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Check,
  ShieldCheck,
  Image as ImageIcon,
  History,
  Building2,
  ArrowRight,
  Eye,
  EyeOff,
  RefreshCw,
  ScanLine,
  Camera,
  Compass,
} from 'lucide-react';
import { runVisionDetectionAction } from '@/app/actions/ai';
import { CitizenNav } from '@/components/layout/CitizenNav';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAuth } from '@/components/providers/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import {
  Complaint,
  ComplaintStatus,
  ComplaintUpdate,
  VisionDetectionResponse,
} from '@/types';
import { getCategoryLabel, formatComplaintDate } from '@/lib/complaints';
import { getSignedPhotoUrl } from '@/lib/storage';
import { formatExifTimestamp } from '@/lib/exif';
import { cn } from '@/lib/utils';


interface PageProps {
  params: Promise<{ id: string }>;
}

function CitizenReportDetailContent({ params }: PageProps) {
  const routeParams = useParams();
  const resolvedParams = use(params);
  const complaintId = ((routeParams?.id as string) || resolvedParams?.id || '').trim();

  const { user, role, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [updates, setUpdates] = useState<ComplaintUpdate[]>([]);
  const [signedPhotoUrl, setSignedPhotoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<'not_found' | 'unauthorized' | null>(null);

  // YOLO Vision Detection state
  const [visionDetections, setVisionDetections] = useState<VisionDetectionResponse | null>(null);
  const [isScanningVision, setIsScanningVision] = useState(false);
  const [visionError, setVisionError] = useState<string | null>(null);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);


  // Auth protection
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push(`/login?redirectTo=/citizen/reports/${complaintId}`);
      } else if (role && role !== 'citizen') {
        router.push('/official');
      }
    }
  }, [user, role, authLoading, router, complaintId]);

  useEffect(() => {
    let isMounted = true;

    if (user && role === 'citizen' && complaintId) {
      const loadComplaint = async () => {
        try {
          const supabase = createClient();
          const cleanId = complaintId.trim();
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);

          let query = supabase.from('complaints').select('*');
          if (isUuid) {
            query = query.eq('id', cleanId);
          } else if (/^\d+$/.test(cleanId.replace(/^#/, ''))) {
            query = query.eq('complaint_number', Number(cleanId.replace(/^#/, '')));
          } else {
            query = query.eq('id', cleanId);
          }

          const { data, error } = await query.maybeSingle();

          if (!isMounted) return;

          if (error || !data) {
            setErrorStatus('not_found');
            setComplaint(null);
            setIsLoading(false);
            return;
          }

          // Security boundary check: NEVER trust route parameter alone
          if (data.user_id !== user.id) {
            setErrorStatus('unauthorized');
            setComplaint(null);
            setIsLoading(false);
            return;
          }

          const item = data as Complaint;
          setComplaint(item);

          // Fetch public updates for this complaint using canonical UUID
          const { data: updatesData } = await supabase
            .from('complaint_updates')
            .select('*')
            .eq('complaint_id', item.id)
            .eq('is_public', true)
            .order('created_at', { ascending: false });

          if (isMounted) {
            setUpdates((updatesData as ComplaintUpdate[]) || []);
          }

          // Fetch signed URL for image if present and scan with YOLO
          if (item.image_url) {
            const photoUrl = await getSignedPhotoUrl(item.image_url);
            if (isMounted) {
              setSignedPhotoUrl(photoUrl);
            }

            // Non-blocking YOLO vision inference
            try {
              if (isMounted) setIsScanningVision(true);
              const visionRes = await runVisionDetectionAction(item.id, 0.25, photoUrl);
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
                setVisionError('Vision microservice is currently unreachable.');
              }
            } finally {
              if (isMounted) {
                setIsScanningVision(false);
              }
            }
          }
        } catch {
          if (isMounted) {
            setErrorStatus('not_found');
            setComplaint(null);
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      };

      loadComplaint();
    }

    return () => {
      isMounted = false;
    };
  }, [user, role, complaintId]);

  // Handle on-demand/re-scan by citizen
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
      setVisionError('Vision microservice is currently unreachable.');
    } finally {
      setIsScanningVision(false);
    }
  };


  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingState message="Loading report details..." />
      </div>
    );
  }

  // Not Found or Unauthorized State
  if (errorStatus || !complaint) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
        <CitizenNav />
        <main className="flex-1 py-16">
          <Container size="sm">
            <Card className="border-slate-200 text-center p-8 bg-white shadow-md">
              <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={28} />
              </div>
              <h1 className="text-xl font-bold text-navy-950 mb-2">
                {errorStatus === 'unauthorized' ? 'Access Restricted' : 'Report Not Found'}
              </h1>
              <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
                {errorStatus === 'unauthorized'
                  ? 'You do not have authorization to inspect this complaint record.'
                  : 'The requested civic report could not be found or has been relocated.'}
              </p>
              <Link href="/citizen/reports">
                <Button variant="outline" size="sm" leftIcon={<ArrowLeft size={14} />}>
                  Back to My Reports
                </Button>
              </Link>
            </Card>
          </Container>
        </main>
      </div>
    );
  }

  // Standard 5-stage timeline configuration
  const standardStages: { key: ComplaintStatus; label: string; desc: string }[] = [
    { key: 'submitted', label: 'Submitted', desc: 'Received & queued' },
    { key: 'under_review', label: 'Under Review', desc: 'Initial verification' },
    { key: 'assigned', label: 'Assigned', desc: 'Routed to department' },
    { key: 'in_progress', label: 'In Progress', desc: 'Field repair underway' },
    { key: 'resolved', label: 'Resolved', desc: 'Verified remediation' },
  ];

  const stageOrder: Record<string, number> = {
    submitted: 0,
    under_review: 1,
    assigned: 2,
    in_progress: 3,
    resolved: 4,
  };

  const currentStageIndex = stageOrder[complaint.status] ?? 0;
  const isSpecialStatus = complaint.status === 'rejected' || complaint.status === 'needs_information';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <CitizenNav />

      <main className="flex-1 py-8 sm:py-10">
        <Container size="lg" className="space-y-6">
          {/* Breadcrumb / Back Navigation */}
          <div className="flex items-center justify-between">
            <Link
              href="/citizen/reports"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-navy-950 transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Back to My Reports</span>
            </Link>

            <span className="text-xs font-mono font-bold text-civic-700 bg-civic-50 px-3 py-1 rounded-md border border-civic-200">
              Report #{complaint.complaint_number || 'PENDING'}
            </span>
          </div>

          {/* Main Complaint Overview Card */}
          <Card className="border-slate-200 bg-white shadow-lg overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-200 py-4 px-6 sm:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {getCategoryLabel(complaint.category)}
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold text-navy-950 mt-0.5">
                  {complaint.title}
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <SeverityBadge severity={complaint.severity} />
                <StatusBadge status={complaint.status} />
              </div>
            </CardHeader>

            <CardBody className="p-6 sm:p-8 space-y-8">
              {/* STATUS TIMELINE SECTION */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-navy-950 flex items-center gap-2">
                    <Clock size={15} className="text-civic-600" />
                    <span>Resolution Progress Timeline</span>
                  </h2>
                  <span className="text-xs font-semibold text-slate-500">
                    Current: <strong className="text-navy-950 capitalize">{complaint.status.replace('_', ' ')}</strong>
                  </span>
                </div>

                {isSpecialStatus ? (
                  // Custom banner for rejected or needs_information statuses
                  <div
                    className={cn(
                      'p-4 rounded-xl border flex items-start gap-3 text-xs',
                      complaint.status === 'rejected'
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : 'bg-purple-50 border-purple-200 text-purple-900'
                    )}
                  >
                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-sm">
                        {complaint.status === 'rejected'
                          ? 'Report Closed Without Action'
                          : 'Additional Information Requested'}
                      </h3>
                      <p className="mt-1 leading-relaxed">
                        {complaint.status === 'rejected'
                          ? 'This submission was deemed outside municipal jurisdiction or flagged as duplicate by the triage desk.'
                          : 'Civic personnel require additional photographic proof or landmark details to locate the issue.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  // 5-Stage Step Progression
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
                    {standardStages.map((stage, idx) => {
                      const isCompleted = idx < currentStageIndex;
                      const isCurrent = idx === currentStageIndex;
                      const isPending = idx > currentStageIndex;

                      return (
                        <div
                          key={stage.key}
                          className={cn(
                            'flex sm:flex-col items-center gap-3 sm:gap-2 p-3 rounded-xl border transition-all text-left sm:text-center',
                            isCurrent && 'bg-alert-50/70 border-2 border-alert-400 shadow-xs',
                            isCompleted && 'bg-emerald-50/60 border-emerald-200',
                            isPending && 'bg-slate-50/50 border-slate-200 opacity-60'
                          )}
                        >
                          <div
                            className={cn(
                              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                              isCurrent && 'bg-alert-500 text-white animate-pulse',
                              isCompleted && 'bg-emerald-600 text-white',
                              isPending && 'bg-slate-200 text-slate-600'
                            )}
                          >
                            {isCompleted ? <Check size={14} /> : idx + 1}
                          </div>
                          <div>
                            <div
                              className={cn(
                                'text-xs font-bold',
                                isCurrent ? 'text-alert-950 font-extrabold' : 'text-navy-950'
                              )}
                            >
                              {stage.label}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {stage.desc}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* REPORT DETAILS GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-4 border-t border-slate-100">
                {/* Left Column: Description & Metadata */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Issue Description */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Description
                    </h3>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                      {complaint.description}
                    </p>
                  </div>

                  {/* Location & Coordinates */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Location & Landmark
                    </h3>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                      <div className="flex items-start gap-2 text-slate-800">
                        <MapPin size={16} className="text-civic-600 shrink-0 mt-0.5" />
                        <span className="font-medium">{complaint.address}</span>
                      </div>
                      {(complaint.latitude !== null || complaint.longitude !== null) && (
                        <div className="pl-6 text-[11px] text-slate-500 font-mono">
                          Coordinates: {complaint.latitude ?? 'N/A'}, {complaint.longitude ?? 'N/A'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dates & Reference */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <span className="text-[11px] text-slate-500 font-semibold uppercase block mb-1">
                        Submitted On
                      </span>
                      <span className="font-bold text-navy-950 flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" />
                        {formatComplaintDate(complaint.created_at)}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <span className="text-[11px] text-slate-500 font-semibold uppercase block mb-1">
                        Last Activity
                      </span>
                      <span className="font-bold text-navy-950 flex items-center gap-1.5">
                        <Clock size={13} className="text-slate-400" />
                        {formatComplaintDate(complaint.updated_at || complaint.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Photo Evidence & YOLO Object Detections */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Uploaded Photo Evidence
                    </h3>

                    {signedPhotoUrl && (
                      <div className="flex items-center gap-1.5">
                        {visionDetections && visionDetections.detections.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                            className="text-xs h-6 px-2 text-slate-600 hover:text-navy-950"
                            leftIcon={showBoundingBoxes ? <EyeOff size={11} /> : <Eye size={11} />}
                          >
                            {showBoundingBoxes ? 'Hide Boxes' : 'Show Boxes'}
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRunVisionScan}
                          disabled={isScanningVision}
                          className="text-xs h-6 px-2"
                          leftIcon={<RefreshCw size={11} className={isScanningVision ? 'animate-spin' : ''} />}
                        >
                          {isScanningVision ? 'Scanning...' : visionDetections ? 'Re-scan YOLO' : 'Scan with YOLO'}
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-black/60 flex items-center justify-center p-2 min-h-[220px]">
                    {signedPhotoUrl ? (
                      <div className="relative inline-block max-w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={signedPhotoUrl}
                          alt={complaint.title}
                          className="block max-h-[340px] w-auto max-w-full rounded-lg object-contain select-none"
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
                    ) : (
                      <div className="text-center p-8 space-y-2 text-slate-400">
                        <ImageIcon size={32} className="mx-auto text-slate-300" />
                        <p className="text-xs font-medium">No photo was attached with this report.</p>
                      </div>
                    )}
                  </div>

                  {/* YOLO Object Detections Panel */}
                  {signedPhotoUrl && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                        <div className="flex items-center gap-1.5">
                          <ScanLine size={14} className="text-civic-600" />
                          <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider">
                            YOLO Object Detections
                          </h4>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-300 text-slate-700 font-mono">
                          yolov8n.pt (CPU)
                        </span>
                      </div>

                      {/* Loading State */}
                      {isScanningVision && (
                        <div className="p-3 rounded-lg bg-white border border-slate-200 text-center text-xs text-slate-500 space-y-1.5">
                          <RefreshCw size={16} className="mx-auto text-civic-600 animate-spin" />
                          <p>Analyzing photo with local YOLOv8 CPU microservice...</p>
                        </div>
                      )}

                      {/* Error / Offline State */}
                      {visionError && !isScanningVision && (
                        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-amber-800">
                            <AlertTriangle size={14} />
                            <span>Vision Service Offline</span>
                          </div>
                          <p className="text-[11px] text-amber-800/90 leading-relaxed">
                            {visionError}
                          </p>
                        </div>
                      )}

                      {/* Detections List */}
                      {visionDetections && !isScanningVision && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-600">Objects Identified:</span>
                            <span className="font-bold text-navy-950 font-mono">
                              {visionDetections.total_detections} detected (≥25%)
                            </span>
                          </div>

                          {visionDetections.detections.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
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
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-white border border-slate-200 text-slate-800 shadow-xs"
                                >
                                  <strong className="text-civic-700">{clsName}</strong>
                                  <span className="text-[10px] text-slate-500">×{info.count}</span>
                                  <span className="text-[10px] text-emerald-700 font-mono">
                                    {Math.round(info.maxConf * 100)}%
                                  </span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 italic p-2 bg-white rounded border border-slate-200 text-center">
                              No standard COCO objects detected in this photo.
                            </p>
                          )}

                          <p className="text-[10px] text-slate-400 italic leading-snug">
                            {visionDetections.model_limitations_notice ||
                              'Note: YOLO detections are advisory and based on MS COCO classes.'}
                          </p>
                        </div>
                      )}

                      {!visionDetections && !isScanningVision && !visionError && (
                        <div className="p-2 text-center text-xs text-slate-400 bg-white rounded border border-slate-200">
                          Click &ldquo;Scan with YOLO&rdquo; to analyze this photo.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Photo Identification & Metadata Card */}
                  {complaint.photo_metadata && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                        <div className="flex items-center gap-1.5">
                          <Camera size={14} className="text-civic-600" />
                          <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider">
                            Photo Identification Metadata
                          </h4>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-300 text-slate-700">
                          {complaint.photo_metadata.exif?.hasGps ? '📍 EXIF GPS Verified' : 'Standard Metadata'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-lg bg-white border border-slate-200/80">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Camera / Device</span>
                          <span className="font-semibold text-slate-800">
                            {complaint.photo_metadata.exif?.cameraMake || complaint.photo_metadata.exif?.cameraModel
                              ? `${complaint.photo_metadata.exif.cameraMake || ''} ${complaint.photo_metadata.exif.cameraModel || ''}`.trim()
                              : 'Digital Camera Sensor'}
                          </span>
                        </div>

                        <div className="p-2 rounded-lg bg-white border border-slate-200/80">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Capture Timestamp</span>
                          <span className="font-semibold text-slate-800">
                            {complaint.photo_metadata.exif?.capturedAt
                              ? formatExifTimestamp(complaint.photo_metadata.exif.capturedAt)
                              : formatComplaintDate(complaint.created_at)}
                          </span>
                        </div>

                        {complaint.photo_metadata.exif?.hasGps && (
                          <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-200 sm:col-span-2">
                            <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                              📍 Embedded Camera GPS Coordinates
                            </span>
                            <span className="font-mono text-xs font-bold text-emerald-950">
                              {complaint.photo_metadata.exif.latitude}°, {complaint.photo_metadata.exif.longitude}°
                              {complaint.photo_metadata.exif.altitude ? ` (Alt: ${complaint.photo_metadata.exif.altitude}m)` : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* RESOLUTION SECTION (If resolution information exists) */}
              {(complaint.resolution_notes || complaint.resolved_at) && (
                <div className="p-6 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-3 pt-6">
                  <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-sm uppercase tracking-wider">
                    <ShieldCheck size={18} className="text-emerald-700" />
                    <span>Resolution Verification</span>
                  </div>

                  {complaint.resolution_notes && (
                    <p className="text-xs sm:text-sm text-emerald-950 leading-relaxed bg-white/70 p-4 rounded-lg border border-emerald-200/60">
                      {complaint.resolution_notes}
                    </p>
                  )}

                  {complaint.resolved_at && (
                    <div className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 size={13} />
                      <span>Resolved on {formatComplaintDate(complaint.resolved_at)}</span>
                    </div>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          {/* OFFICIAL UPDATES & ACTIVITY TIMELINE CARD */}
          <Card className="border-slate-200 bg-white shadow-md overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-200 py-4 px-6 sm:px-8 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-civic-50 text-civic-700 flex items-center justify-center border border-civic-200">
                  <History size={16} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-navy-950">
                    Official Activity & Updates
                  </h2>
                  <p className="text-xs text-slate-500">
                    Chronological audit trail of verified public actions taken on this report.
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {updates.length} update{updates.length === 1 ? '' : 's'}
              </span>
            </CardHeader>

            <CardBody className="p-6 sm:p-8 space-y-6">
              {updates.length > 0 ? (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {updates.map((update) => {
                    const hasTransition =
                      update.old_status &&
                      update.new_status &&
                      update.old_status !== update.new_status;

                    return (
                      <div key={update.id} className="relative group space-y-2">
                        {/* Dot */}
                        <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-civic-600 border-2 border-white shadow-xs" />

                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-navy-950 flex items-center gap-1.5">
                              <Building2 size={13} className="text-slate-400" />
                              Civic Operations Desk
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-sky-50 border border-sky-200 text-sky-700 font-semibold">
                              Public Notice
                            </span>
                          </div>

                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Calendar size={12} className="text-slate-400" />
                            {formatComplaintDate(update.created_at)}
                          </span>
                        </div>

                        {hasTransition && (
                          <div className="inline-flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                              Status:
                            </span>
                            <span className="font-semibold text-slate-700 capitalize">
                              {update.old_status?.replace('_', ' ')}
                            </span>
                            <ArrowRight size={12} className="text-civic-600" />
                            <span className="font-bold text-navy-950 capitalize bg-white px-2 py-0.5 rounded border border-slate-200">
                              {update.new_status?.replace('_', ' ')}
                            </span>
                          </div>
                        )}

                        {update.message && (
                          <p className="text-xs sm:text-sm text-slate-800 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 leading-relaxed whitespace-pre-line">
                            {update.message}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 space-y-1.5">
                  <History size={24} className="mx-auto text-slate-300" />
                  <p className="text-xs font-semibold text-navy-950">No official updates published yet</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    When municipal staff review, assign, or take action on this report, public operational notes will be visible here.
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
        </Container>
      </main>
    </div>
  );
}

export default function CitizenReportDetailPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <LoadingState message="Loading report details..." />
        </div>
      }
    >
      <CitizenReportDetailContent {...props} />
    </Suspense>
  );
}
