export type UserRole = 'citizen' | 'official' | 'admin';

export type ComplaintCategory =
  | 'pothole'
  | 'garbage'
  | 'water_leakage'
  | 'drainage'
  | 'streetlight'
  | 'footpath'
  | 'open_manhole'
  | 'other'
  | 'Pothole'
  | 'Garbage'
  | 'Water Leakage'
  | 'Drainage'
  | 'Streetlight'
  | 'Footpath'
  | 'Open Manhole'
  | 'Other';

export type ComplaintStatus =
  | 'submitted'
  | 'under_review'
  | 'assigned'
  | 'in_progress'
  | 'resolved'
  | 'rejected'
  | 'needs_information'
  | 'Submitted'
  | 'Under Review'
  | 'Assigned'
  | 'In Progress'
  | 'Resolved'
  | 'Rejected'
  | 'Needs Information';

export type ComplaintSeverity =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'
  | 'Low'
  | 'Medium'
  | 'High'
  | 'Critical';

export type SeverityLevel = ComplaintSeverity;

export interface UserProfile {
  id: string;
  full_name: string;
  phone?: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
  email?: string;
  avatar_url?: string;
  ward?: string;
  department_id?: string;
  badge_number?: string;
  designation?: string;
  is_blocked?: boolean;
  blocked_reason?: string | null;
  blocked_at?: string | null;
  blocked_by?: string | null;
}

export type Profile = UserProfile;

export interface Department {
  id: string;
  name: string;
  code?: string;
  description?: string | null;
  contact_email?: string;
  contact_phone?: string;
  active_staff_count?: number;
  avg_sla_hours?: number;
  icon_name?: string;
  created_at?: string;
}

export interface AIAnalysis {
  id: string;
  complaint_id?: string;
  suggested_category: ComplaintCategory;
  category_confidence: number; // 0 to 1
  suggested_severity: SeverityLevel;
  severity_confidence: number; // 0 to 1
  explanation: string;
  key_factors: string[];
  hazard_index: number; // 1 to 10
  potential_duplicate_ids?: string[];
  model_type: 'demo_rule_based' | 'production_ml';
  analyzed_at: string;
}

// ----------------------------------------------------
// YOLO COMPUTER VISION MICROSERVICE TYPES
// ----------------------------------------------------

export interface VisionBoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  height: number;
  norm_x1: number;
  norm_y1: number;
  norm_width: number;
  norm_height: number;
}

export interface VisionDetection {
  class_id: number;
  class_name: string;
  confidence: number;
  box: VisionBoundingBox;
}

export interface VisionImageDimensions {
  width: number;
  height: number;
}

export interface VisionDetectionResponse {
  status: string;
  model: string;
  device: string;
  image: VisionImageDimensions;
  total_detections: number;
  detections: VisionDetection[];
  model_limitations_notice?: string;
}

export interface PhotoExifData {
  capturedAt?: string | null;
  cameraMake?: string | null;
  cameraModel?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  altitude?: number | null;
  hasGps: boolean;
  orientation?: number | null;
}

export interface StoredPhotoMetadata {
  exif?: PhotoExifData | null;
  vision?: {
    model: string;
    detections: VisionDetection[];
    totalDetections: number;
    detectedTags: string[];
    approved: boolean;
    reason: string;
  } | null;
  fileInfo?: {
    name?: string;
    size?: number;
    mimeType?: string;
    uploadedAt?: string;
  };
}

export interface PhotoApprovalResult {
  approved: boolean;
  status: 'approved' | 'rejected';
  reason: string;
  model: string;
  detections: VisionDetection[];
  totalDetections: number;
  imageDimensions?: VisionImageDimensions;
  detectedTags: string[];
  exif?: PhotoExifData | null;
}


export interface RelatedReport {
  id: string;
  complaint_id: string;
  related_complaint_id: string;
  related_complaint_number: string;
  related_title: string;
  similarity_score: number;
  distance_meters: number;
  match_reason: string;
  is_confirmed_duplicate: boolean;
  created_at: string;
}

export interface ComplaintUpdate {
  id: string;
  complaint_id: string;
  updated_by?: string | null;
  old_status?: string | null;
  new_status?: string | null;
  message?: string | null;
  is_public: boolean;
  created_at: string;
  // joined / display fields
  updater_name?: string;
}

export interface Assignment {
  id: string;
  complaint_id: string;
  department_id?: string | null;
  assigned_to?: string | null;
  assigned_by?: string | null;
  notes?: string | null;
  assigned_at: string;
  completed_at?: string | null;
  // joined / display fields
  department_name?: string;
  assignee_name?: string;
  assigner_name?: string;
}

export interface Complaint {
  id: string;
  complaint_number: string;
  user_id: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  address: string;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  department_id?: string | null;
  assigned_to?: string | null;
  ai_category?: string | null;
  ai_confidence?: number | null;
  ai_severity_reason?: string | null;
  resolved_at?: string | null;
  resolution_notes?: string | null;
  created_at: string;
  updated_at: string;
  // Aliases and optional joins
  citizen_id?: string;
  citizen_name?: string;
  citizen_phone?: string;
  department_name?: string;
  photo_url?: string;
  photo_metadata?: StoredPhotoMetadata | null;
}

export interface ComplaintFilterOptions {
  search?: string;
  status?: ComplaintStatus | 'All';
  category?: ComplaintCategory | 'All';
  severity?: SeverityLevel | 'All';
  department?: string | 'All';
  ward?: string | 'All';
  sortBy?: 'newest' | 'oldest' | 'severity_desc' | 'upvotes';
}
