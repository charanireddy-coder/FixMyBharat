'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  UploadCloud,
  X,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Info,
  ImageIcon,
  Sparkles,
  Eye,
  EyeOff,
  RefreshCw,
  Camera,
  Compass,
  Calendar,
  ShieldAlert,
} from 'lucide-react';
import { CitizenNav } from '@/components/layout/CitizenNav';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAuth } from '@/components/providers/AuthProvider';
import { CATEGORY_OPTIONS, createComplaint } from '@/lib/complaints';
import { uploadComplaintPhoto, validatePhoto } from '@/lib/storage';
import { ComplaintCategory, Complaint, PhotoApprovalResult, StoredPhotoMetadata } from '@/types';
import { triggerComplaintAnalysisAction, verifyAndApprovePhotoAction } from '@/app/actions/ai';
import { triggerRelatedReportsAction } from '@/app/actions/related';
import { LocationPreviewMap } from '@/components/map/LocationPreviewMap';
import { formatExifTimestamp } from '@/lib/exif';
import { cn } from '@/lib/utils';

export default function ReportIssuePage() {
  const { user, profile, role, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ComplaintCategory>('pothole');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [gpsFromExif, setGpsFromExif] = useState(false);

  // Photo & AI Verification State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isVerifyingPhoto, setIsVerifyingPhoto] = useState(false);
  const [photoApproval, setPhotoApproval] = useState<PhotoApprovalResult | null>(null);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);

  // Submission State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedComplaint, setSubmittedComplaint] = useState<Complaint | null>(null);

  // Authentication check
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirectTo=/citizen/report');
      } else if (role && role !== 'citizen') {
        router.push('/official');
      }
    }
  }, [user, role, authLoading, router]);

  // Clean up preview object URL on unmount or file change
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Handle Photo File Selection & AI Verification
  const handleFileChange = async (file: File | null) => {
    setPhotoError(null);
    setPhotoApproval(null);

    if (!file) {
      setSelectedFile(null);
      setGpsFromExif(false);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      return;
    }

    const validation = validatePhoto(file);
    if (!validation.valid) {
      setPhotoError(validation.error || 'Invalid file format');
      return;
    }

    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Run Real-Time AI Computer Vision Verification & Approval
    setIsVerifyingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('category', category);

      const res = await verifyAndApprovePhotoAction(formData);
      if (res.success && res.approval) {
        setPhotoApproval(res.approval);

        // Auto-extract GPS coordinates from camera EXIF metadata
        if (
          res.approval.exif?.hasGps &&
          typeof res.approval.exif.latitude === 'number' &&
          typeof res.approval.exif.longitude === 'number'
        ) {
          setLatitude(res.approval.exif.latitude.toString());
          setLongitude(res.approval.exif.longitude.toString());
          setGpsFromExif(true);
        }

        if (!res.approval.approved) {
          setPhotoError(res.approval.reason);
        }
      } else if (res.error) {
        setPhotoError(res.error);
      }
    } catch {
      setPhotoError('Could not verify photo. Please check your network connection.');
    } finally {
      setIsVerifyingPhoto(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Form Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required.';
    } else if (title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters.';
    }

    // Description is strictly limited between 10 and 500 characters
    if (!description.trim()) {
      newErrors.description = 'Description is required.';
    } else if (description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters.';
    } else if (description.length > 500) {
      newErrors.description = 'Description cannot exceed 500 characters.';
    }

    if (!category) {
      newErrors.category = 'Category selection is required.';
    }

    // Photo Evidence is Compulsory & Must be Approved
    if (!selectedFile) {
      newErrors.photo = 'Photo evidence is compulsory to report an issue. Please upload a clear photo.';
    } else if (isVerifyingPhoto) {
      newErrors.photo = 'Please wait for AI photo verification to complete before submitting.';
    } else if (photoApproval && !photoApproval.approved) {
      newErrors.photo = photoApproval.reason || 'Please upload an approved photo before submitting.';
    }

    if (!address.trim()) {
      newErrors.address = 'Street address or location is required.';
    } else if (address.trim().length < 5) {
      newErrors.address = 'Address must be at least 5 characters.';
    }

    if (latitude.trim()) {
      const latNum = Number(latitude);
      if (isNaN(latNum) || latNum < -90 || latNum > 90) {
        newErrors.latitude = 'Latitude must be a valid number between -90 and 90.';
      }
    }

    if (longitude.trim()) {
      const lonNum = Number(longitude);
      if (isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
        newErrors.longitude = 'Longitude must be a valid number between -180 and 180.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submission Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      let imageStoragePath: string | null = null;

      // 1. Upload photo to private bucket (Compulsory)
      if (!selectedFile) {
        setErrors({ photo: 'Photo evidence is compulsory to report an issue.' });
        setIsSubmitting(false);
        return;
      }

      const uploadResult = await uploadComplaintPhoto(selectedFile, user.id);
      if (uploadResult.error) {
        setErrors({ general: `Photo upload failed: ${uploadResult.error}` });
        setIsSubmitting(false);
        return;
      }
      imageStoragePath = uploadResult.path;

      // 2. Prepare structured photo metadata (EXIF + YOLO vision + file attributes)
      const photoMetadata: StoredPhotoMetadata = {
        exif: photoApproval?.exif || null,
        vision: photoApproval
          ? {
              model: photoApproval.model,
              detections: photoApproval.detections,
              totalDetections: photoApproval.totalDetections,
              detectedTags: photoApproval.detectedTags,
              approved: photoApproval.approved,
              reason: photoApproval.reason,
            }
          : null,
        fileInfo: {
          name: selectedFile.name,
          size: selectedFile.size,
          mimeType: selectedFile.type,
          uploadedAt: new Date().toISOString(),
        },
      };

      // 3. Insert complaint record into public.complaints
      const result = await createComplaint(
        {
          title,
          description,
          category,
          address,
          latitude: latitude.trim() ? Number(latitude) : null,
          longitude: longitude.trim() ? Number(longitude) : null,
          image_url: imageStoragePath,
          photo_metadata: photoMetadata,
        },
        user.id
      );

      if (result.error || !result.complaint) {
        setErrors({
          general: result.error || "We couldn't submit your report right now. Please try again.",
        });
        setIsSubmitting(false);
        return;
      }

      // 3. Trigger non-blocking AI rules-based analysis & related report detection
      triggerComplaintAnalysisAction(result.complaint.id, {
        title,
        description,
        category,
        address,
      }).catch((aiErr) => {
        // Non-blocking notice: never fail citizen reporting if AI service encounters an issue
        console.warn('Non-blocking AI analysis execution notice:', aiErr);
      });

      triggerRelatedReportsAction(result.complaint.id, {
        id: result.complaint.id,
        title,
        description,
        category,
        address,
        latitude: latitude.trim() ? Number(latitude) : null,
        longitude: longitude.trim() ? Number(longitude) : null,
      }).catch((relErr) => {
        console.warn('Non-blocking related reports execution notice:', relErr);
      });

      // 4. Success state
      setSubmittedComplaint(result.complaint);
      setIsSubmitting(false);
    } catch {
      setErrors({
        general: "We couldn't submit your report right now. Please try again.",
      });
      setIsSubmitting(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingState message="Checking session..." />
      </div>
    );
  }

  // Success Confirmation Screen
  if (submittedComplaint) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
        <CitizenNav />
        <main className="flex-1 py-12">
          <Container size="sm">
            <Card className="border-slate-200/90 shadow-xl bg-white overflow-hidden text-center">
              <CardHeader className="bg-emerald-50 border-b border-emerald-100 py-4 px-6 flex items-center justify-center gap-2 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Report Successfully Filed</span>
              </CardHeader>
              <CardBody className="p-8 sm:p-10 space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 size={36} />
                </div>

                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 tracking-tight">
                    Thank you for reporting.
                  </h1>
                  <p className="text-sm text-slate-600 max-w-md mx-auto">
                    Your civic issue has been recorded and submitted for municipal verification.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left max-w-md mx-auto space-y-2.5 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-slate-500 font-semibold uppercase tracking-wider">
                      Complaint Reference
                    </span>
                    <span className="font-mono font-bold text-civic-700 text-sm">
                      {submittedComplaint.complaint_number || 'PENDING'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Title:</span>
                    <span className="font-bold text-navy-950 truncate max-w-[200px]">
                      {submittedComplaint.title}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Location:</span>
                    <span className="font-medium text-slate-800 truncate max-w-[200px]">
                      {submittedComplaint.address}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Initial Status:</span>
                    <span className="font-semibold text-civic-600">Submitted</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link href={`/citizen/reports/${submittedComplaint.id}`} className="w-full sm:w-auto">
                    <Button variant="accent" size="md" className="w-full" rightIcon={<ArrowRight size={16} />}>
                      View My Report
                    </Button>
                  </Link>
                  <Link href="/citizen" className="w-full sm:w-auto">
                    <Button variant="outline" size="md" className="w-full">
                      Back to Dashboard
                    </Button>
                  </Link>
                </div>
              </CardBody>
            </Card>
          </Container>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <CitizenNav />

      <main className="flex-1 py-8 sm:py-12">
        <Container size="md">
          {/* Page Heading */}
          <div className="mb-8 space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 tracking-tight">
              Report an Issue
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl">
              Help your community by reporting a civic problem with the details our teams need to act.
            </p>
          </div>

          {/* Submission Form Card */}
          <Card className="border-slate-200/90 shadow-xl bg-white overflow-hidden">
            <CardBody className="p-6 sm:p-10 space-y-8">
              {/* General Error Banner */}
              {errors.general && (
                <div
                  role="alert"
                  className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5"
                >
                  <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <span className="font-medium">{errors.general}</span>
                </div>
              )}

              {/* Account Blocked / Suspended Notice */}
              {profile?.is_blocked && (
                <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-900 text-sm space-y-2 shadow-xs">
                  <div className="flex items-center gap-2 font-bold text-rose-900">
                    <ShieldAlert size={18} className="text-rose-600 shrink-0" />
                    <span>Account Reporting Access Suspended</span>
                  </div>
                  <p className="text-xs text-rose-800 leading-relaxed">
                    Your reporting privileges have been suspended by municipal administration due to policy violations, spam, or invalid submissions.
                  </p>
                  {profile.blocked_reason && (
                    <div className="p-2.5 rounded-lg bg-rose-100/80 border border-rose-200 text-xs font-semibold text-rose-950">
                      <strong>Administrative Reason:</strong> {profile.blocked_reason}
                    </div>
                  )}
                  <p className="text-[11px] text-rose-700">
                    If you believe this is in error, please contact civic support with your registered email ({user?.email}).
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-8" noValidate>
                {/* SECTION 1 — ISSUE DETAILS */}
                <div className="space-y-4">
                  <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-navy-950">
                      1. Issue Details
                    </h2>
                    <span className="text-[11px] text-slate-400 font-medium">* Required</span>
                  </div>

                  {/* Title */}
                  <Input
                    label="Issue Title"
                    required
                    placeholder="Large pothole near main road"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    error={errors.title}
                    hint="A brief summary of what requires attention (at least 5 characters)."
                    disabled={isSubmitting}
                  />

                  {/* Category */}
                  <Select
                    label="Category"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
                    options={CATEGORY_OPTIONS}
                    error={errors.category}
                    hint="Select the public service domain most closely related to the issue."
                    disabled={isSubmitting}
                  />

                  {/* Description — Strictly limited to 500 characters */}
                  <Textarea
                    label="Description"
                    required
                    rows={4}
                    maxLength={500}
                    showCount
                    placeholder="Describe what is happening, where it is, and any details that may help."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    error={errors.description}
                    hint="Provide helpful context like extent of damage, safety risks, or nearby landmarks (between 10 and 500 characters)."
                    disabled={isSubmitting}
                  />
                </div>

                {/* SECTION 2 — PHOTO EVIDENCE (COMPULSORY & AI APPROVED) */}
                <div className="space-y-4">
                  <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold uppercase tracking-wider text-navy-950 flex items-center gap-1.5">
                        <span>2. Photo Evidence (Compulsory)</span>
                        <span className="text-rose-600 font-bold">*</span>
                      </h2>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        Required
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">JPEG, PNG, WebP up to 5MB</span>
                  </div>

                  {photoError && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 shadow-xs">
                      <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-semibold">Photo Evidence Notice</p>
                        <p className="text-rose-700">{photoError}</p>
                      </div>
                    </div>
                  )}

                  {errors.photo && !photoError && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 shadow-xs">
                      <AlertCircle size={16} className="text-rose-600 shrink-0" />
                      <span className="font-medium">{errors.photo}</span>
                    </div>
                  )}

                  {!selectedFile ? (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      className={cn(
                        "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
                        errors.photo
                          ? "border-rose-400 bg-rose-50/30 hover:bg-rose-50/50"
                          : "border-slate-300 hover:border-civic-500 bg-slate-50/50 hover:bg-slate-50"
                      )}
                      onClick={() => document.getElementById('photo-upload-input')?.click()}
                    >
                      <input
                        id="photo-upload-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileChange(e.target.files[0]);
                          }
                        }}
                        disabled={isSubmitting}
                      />
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 border shadow-xs transition-transform hover:scale-105",
                        errors.photo
                          ? "bg-rose-100 text-rose-600 border-rose-200"
                          : "bg-civic-50 text-civic-600 border-civic-100"
                      )}>
                        <UploadCloud size={26} />
                      </div>
                      <p className="text-sm font-bold text-navy-950">
                        Click to upload photo or drag and drop
                      </p>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        <strong className="text-rose-600 font-semibold">Compulsory:</strong> Clear photographic evidence is required. Our AI Computer Vision system will detect features, verify quality, and approve it before submission.
                      </p>
                      <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-2xs">
                        <Sparkles size={12} className="text-civic-500" />
                        <span>Real-Time AI Vision Detection & Approval</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Photo Preview Container */}
                      <div className="relative rounded-2xl border border-slate-200 bg-slate-900 overflow-hidden shadow-sm">
                        <div className="p-3 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold text-slate-200 truncate max-w-[180px] sm:max-w-[300px]">
                              {selectedFile.name}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono shrink-0">
                              ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {photoApproval && photoApproval.detections.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors flex items-center gap-1"
                              >
                                {showBoundingBoxes ? <EyeOff size={12} /> : <Eye size={12} />}
                                <span>{showBoundingBoxes ? 'Hide Detections' : 'Show Detections'}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleFileChange(null)}
                              disabled={isSubmitting || isVerifyingPhoto}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-colors"
                              title="Remove photo"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Image Display with Real YOLO Bounding Box Overlay */}
                        <div className="relative p-3 flex items-center justify-center bg-black/70 min-h-[220px]">
                          {previewUrl && (
                            <div className="relative inline-block max-w-full">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={previewUrl}
                                alt="Selected preview"
                                className="block max-h-[340px] w-auto max-w-full rounded-lg object-contain select-none"
                              />

                              {/* Bounding Box Overlay */}
                              {showBoundingBoxes && photoApproval?.detections && photoApproval.detections.length > 0 && (
                                <div className="absolute inset-0 pointer-events-none">
                                  {photoApproval.detections.map((det, idx) => {
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

                              {/* Scanning Radar Laser Line */}
                              {isVerifyingPhoto && (
                                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
                                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-civic-400 to-transparent shadow-[0_0_12px_rgba(14,165,233,0.9)] animate-pulse" />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* AI Verification Active State */}
                      {isVerifyingPhoto && (
                        <div className="p-4 rounded-xl bg-civic-50/80 border border-civic-200 text-civic-900 text-xs flex items-center justify-between shadow-2xs">
                          <div className="flex items-center gap-3">
                            <RefreshCw size={18} className="animate-spin text-civic-600 shrink-0" />
                            <div>
                              <p className="font-bold text-sm text-navy-950">
                                AI Vision Scanning Photo...
                              </p>
                              <p className="text-slate-600 mt-0.5">
                                Detecting civic infrastructure, road defect features, and validating evidence authenticity.
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-civic-700 bg-civic-100 px-2 py-1 rounded font-bold">
                            YOLO Vision
                          </span>
                        </div>
                      )}

                      {/* AI Approved Verdict Card */}
                      {!isVerifyingPhoto && photoApproval && photoApproval.approved && (
                        <div className="p-4 rounded-xl bg-emerald-50/90 border border-emerald-200 text-xs space-y-2.5 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-emerald-800">
                              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                              <span className="font-extrabold text-sm text-emerald-950">
                                Photo Verified & Approved by AI
                              </span>
                            </div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                              <Sparkles size={10} />
                              Approved
                            </span>
                          </div>

                          <p className="text-emerald-900 font-medium leading-relaxed">
                            {photoApproval.reason}
                          </p>

                          {photoApproval.detectedTags && photoApproval.detectedTags.length > 0 && (
                            <div className="pt-1 flex flex-wrap items-center gap-1.5">
                              <span className="text-[11px] font-semibold text-slate-500 mr-1">
                                Detected Features:
                              </span>
                              {photoApproval.detectedTags.map((tag, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white border border-emerald-200 text-emerald-800 shadow-2xs"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[11px] text-slate-500">
                            <span>Engine: <strong className="text-slate-700">{photoApproval.model}</strong></span>
                            <button
                              type="button"
                              onClick={() => handleFileChange(selectedFile)}
                              className="text-civic-700 font-semibold hover:underline flex items-center gap-1"
                            >
                              <RefreshCw size={11} /> Re-verify Photo
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Photo Identification & Metadata Card */}
                      {!isVerifyingPhoto && selectedFile && (
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 text-xs space-y-3 shadow-2xs">
                          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                            <div className="flex items-center gap-2">
                              <Camera size={15} className="text-civic-600" />
                              <span className="font-bold text-navy-950 uppercase tracking-wider text-[11px]">
                                Photo Identification & Metadata
                              </span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                              {photoApproval?.exif?.hasGps ? '📍 EXIF GPS Attached' : 'Camera Data Extracted'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {/* Device & Camera */}
                            <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 flex items-start gap-2">
                              <Camera size={14} className="text-slate-400 shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                  Camera / Device
                                </span>
                                <span className="font-semibold text-slate-800 truncate block">
                                  {photoApproval?.exif?.cameraMake || photoApproval?.exif?.cameraModel
                                    ? `${photoApproval.exif.cameraMake || ''} ${photoApproval.exif.cameraModel || ''}`.trim()
                                    : 'Standard Digital Sensor'}
                                </span>
                              </div>
                            </div>

                            {/* Captured Timestamp */}
                            <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 flex items-start gap-2">
                              <Calendar size={14} className="text-slate-400 shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                  Original Capture Time
                                </span>
                                <span className="font-semibold text-slate-800 truncate block">
                                  {photoApproval?.exif?.capturedAt
                                    ? formatExifTimestamp(photoApproval.exif.capturedAt)
                                    : 'Timestamp recorded upon upload'}
                                </span>
                              </div>
                            </div>

                            {/* GPS Coordinates */}
                            <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 flex items-start gap-2 sm:col-span-2">
                              <Compass size={14} className={photoApproval?.exif?.hasGps ? "text-emerald-600 shrink-0 mt-0.5" : "text-slate-400 shrink-0 mt-0.5"} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                    Embedded Photo Coordinates (EXIF)
                                  </span>
                                  {gpsFromExif && (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                      Auto-Synchronized with Map Pin
                                    </span>
                                  )}
                                </div>
                                <span className="font-mono text-xs text-slate-800 block mt-0.5">
                                  {photoApproval?.exif?.hasGps
                                    ? `Lat ${photoApproval.exif.latitude}°, Lng ${photoApproval.exif.longitude}°${
                                        photoApproval.exif.altitude ? ` • Alt ${photoApproval.exif.altitude}m` : ''
                                      }`
                                    : 'No camera GPS tag embedded (Pin your location on the map below)'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* AI Rejected State */}
                      {!isVerifyingPhoto && photoApproval && !photoApproval.approved && (
                        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-2 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-rose-800">
                              <AlertCircle size={18} className="text-rose-600 shrink-0" />
                              <span className="font-extrabold text-sm text-rose-950">
                                Photo Not Approved
                              </span>
                            </div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-rose-800 bg-rose-100 px-2 py-0.5 rounded font-bold">
                              Rejected
                            </span>
                          </div>
                          <p className="text-rose-800 font-medium">
                            {photoApproval.reason}
                          </p>
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => document.getElementById('photo-upload-input')?.click()}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-xs transition-colors"
                            >
                              Upload a Clearer Photo
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* SECTION 3 — LOCATION */}
                <div className="space-y-4">
                  <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-navy-950">
                      3. Location
                    </h2>
                    <span className="text-[11px] text-slate-400 font-medium">* Address Required</span>
                  </div>

                  {gpsFromExif && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                        <span>
                          <strong>Location Auto-Synchronized:</strong> GPS coordinates were automatically populated from your photo&apos;s camera metadata.
                        </span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded shrink-0">
                        Verified EXIF
                      </span>
                    </div>
                  )}

                  <Input
                    label="Street Address / Area Landmark"
                    required
                    placeholder="e.g. 100 Feet Road, near Indiranagar Metro Station"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    error={errors.address}
                    hint="Include road name, cross street, or prominent building nearby."
                    leftIcon={<MapPin size={16} />}
                    disabled={isSubmitting}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <Input
                      label="Latitude (Optional)"
                      type="number"
                      step="any"
                      placeholder="e.g. 12.9716"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      error={errors.latitude}
                      hint="Numeric coordinate (-90 to 90)"
                      disabled={isSubmitting}
                    />
                    <Input
                      label="Longitude (Optional)"
                      type="number"
                      step="any"
                      placeholder="e.g. 77.5946"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      error={errors.longitude}
                      hint="Numeric coordinate (-180 to 180)"
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Interactive Map Pin & Geolocation Preview (Part 13) */}
                  <div className="pt-2">
                    <LocationPreviewMap
                      latitude={latitude.trim() ? Number(latitude) : null}
                      longitude={longitude.trim() ? Number(longitude) : null}
                      onCoordinatesChange={(lat, lng) => {
                        setLatitude(lat.toString());
                        setLongitude(lng.toString());
                      }}
                      height="200px"
                    />
                  </div>
                </div>

                {/* SECTION 4 — REVIEW & NOTICE */}
                <div className="p-4 rounded-xl bg-civic-50/70 border border-civic-200 text-xs text-slate-700 space-y-2">
                  <div className="flex items-center gap-2 text-civic-900 font-bold">
                    <Info size={15} className="text-civic-600" />
                    <span>Submission Protocol</span>
                  </div>
                  <p className="leading-relaxed">
                    Your report will initially be submitted for review. Our civic workflow can later assign priority and department.
                  </p>
                </div>

                {/* Submit Action */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
                  <Link href="/citizen" className="w-full sm:w-auto">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      className="w-full sm:w-auto"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  </Link>
                  <Button
                    type="submit"
                    variant="accent"
                    size="lg"
                    className="w-full sm:w-auto"
                    isLoading={isSubmitting || isVerifyingPhoto}
                    disabled={isSubmitting || isVerifyingPhoto || profile?.is_blocked || (photoApproval !== null && !photoApproval.approved)}
                    rightIcon={!isSubmitting && !isVerifyingPhoto && !profile?.is_blocked ? <ArrowRight size={18} /> : undefined}
                  >
                    {profile?.is_blocked
                      ? 'Account Suspended'
                      : isSubmitting
                      ? 'Submitting Report...'
                      : isVerifyingPhoto
                      ? 'Verifying Photo with AI...'
                      : 'Submit Report'}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </Container>
      </main>
    </div>
  );
}
