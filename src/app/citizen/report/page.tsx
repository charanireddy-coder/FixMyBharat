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
import { ComplaintCategory, Complaint } from '@/types';
import { triggerComplaintAnalysisAction } from '@/app/actions/ai';
import { triggerRelatedReportsAction } from '@/app/actions/related';
import { LocationPreviewMap } from '@/components/map/LocationPreviewMap';

export default function ReportIssuePage() {
  const { user, role, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ComplaintCategory>('pothole');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  // Photo State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

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

  // Handle Photo File Selection
  const handleFileChange = (file: File | null) => {
    setPhotoError(null);
    if (!file) {
      setSelectedFile(null);
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
    setPreviewUrl(URL.createObjectURL(file));
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

    if (!description.trim()) {
      newErrors.description = 'Description is required.';
    } else if (description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters.';
    }

    if (!category) {
      newErrors.category = 'Category selection is required.';
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

      // 1. Upload photo to private bucket if selected
      if (selectedFile) {
        const uploadResult = await uploadComplaintPhoto(selectedFile, user.id);
        if (uploadResult.error) {
          setErrors({ general: `Photo upload failed: ${uploadResult.error}` });
          setIsSubmitting(false);
          return;
        }
        imageStoragePath = uploadResult.path;
      }

      // 2. Insert complaint record into public.complaints
      const result = await createComplaint(
        {
          title,
          description,
          category,
          address,
          latitude: latitude.trim() ? Number(latitude) : null,
          longitude: longitude.trim() ? Number(longitude) : null,
          image_url: imageStoragePath,
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

                  {/* Description */}
                  <Textarea
                    label="Description"
                    required
                    rows={4}
                    placeholder="Describe what is happening, where it is, and any details that may help."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    error={errors.description}
                    hint="Provide helpful context like extent of damage, safety risks, or nearby landmarks (at least 10 characters)."
                    disabled={isSubmitting}
                  />
                </div>

                {/* SECTION 2 — PHOTO */}
                <div className="space-y-4">
                  <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-navy-950">
                      2. Photo Evidence (Optional)
                    </h2>
                    <span className="text-[11px] text-slate-400 font-medium">JPEG, PNG, WebP up to 5MB</span>
                  </div>

                  {photoError && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                      <AlertCircle size={14} className="text-rose-600 shrink-0" />
                      <span>{photoError}</span>
                    </div>
                  )}

                  {!selectedFile ? (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      className="border-2 border-dashed border-slate-300 hover:border-civic-500 rounded-xl p-8 text-center transition-colors cursor-pointer bg-slate-50/50 hover:bg-slate-50"
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
                      <div className="w-12 h-12 rounded-xl bg-civic-50 text-civic-600 flex items-center justify-center mx-auto mb-3 border border-civic-100">
                        <UploadCloud size={24} />
                      </div>
                      <p className="text-sm font-semibold text-navy-950">
                        Click to upload photo or drag and drop
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Clear photos help ground inspectors triage and fix issues faster.
                      </p>
                    </div>
                  ) : (
                    <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center gap-4">
                      <div className="w-20 h-20 rounded-lg bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                        {previewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={previewUrl}
                            alt="Selected preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon size={24} className="text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-navy-950 truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                        <span className="inline-block mt-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Ready for private upload
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFileChange(null)}
                        disabled={isSubmitting}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Remove photo"
                      >
                        <X size={18} />
                      </button>
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
                    isLoading={isSubmitting}
                    disabled={isSubmitting}
                    rightIcon={!isSubmitting ? <ArrowRight size={18} /> : undefined}
                  >
                    {isSubmitting ? 'Submitting Report...' : 'Submit Report'}
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
