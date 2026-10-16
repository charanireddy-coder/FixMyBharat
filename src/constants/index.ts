import { ComplaintCategory, ComplaintStatus, SeverityLevel } from '@/types';

export const APP_CONFIG = {
  name: 'FixMyBharat',
  tagline: 'Report. Resolve. Improve.',
  supportingMessage: 'Turn everyday civic problems into actionable solutions.',
  teamName: 'Team SyncMates',
  platformType: 'AI-Powered Civic Intelligence Platform',
  version: '1.0.0-PROTOTYPE',
  emergencyDisclaimer:
    'For life-threatening emergencies (Fire, Police, Ambulance), please dial 112 immediately.',
};

export const CATEGORIES: {
  id: ComplaintCategory;
  name: string;
  icon: string;
  description: string;
  departmentCode: string;
  defaultSeverity: SeverityLevel;
}[] = [
  {
    id: 'Pothole',
    name: 'Pothole',
    icon: 'Hammer',
    description: 'Road damage, asphalt craters, surface subsidence causing vehicular danger.',
    departmentCode: 'RD-INFRA',
    defaultSeverity: 'Medium',
  },
  {
    id: 'Open Manhole',
    name: 'Open Manhole',
    icon: 'AlertOctagon',
    description: 'Uncovered sewer chambers, displaced manhole lids presenting fatal hazard.',
    departmentCode: 'DRN-SEW',
    defaultSeverity: 'Critical',
  },
  {
    id: 'Garbage',
    name: 'Garbage Dump',
    icon: 'Trash2',
    description: 'Overflowing dumpsters, illegal waste dumping, uncleared municipal bins.',
    departmentCode: 'SWM-CIVIC',
    defaultSeverity: 'Medium',
  },
  {
    id: 'Water Leakage',
    name: 'Water Leakage',
    icon: 'Droplet',
    description: 'Pipeline bursts, main valve leakage, wastage of treated drinking water.',
    departmentCode: 'WSS-WATER',
    defaultSeverity: 'High',
  },
  {
    id: 'Drainage',
    name: 'Drainage / Sewage',
    icon: 'Waves',
    description: 'Blocked stormwater drains, overflowing sewage lines, foul waterlogging.',
    departmentCode: 'DRN-SEW',
    defaultSeverity: 'High',
  },
  {
    id: 'Streetlight',
    name: 'Streetlight Outage',
    icon: 'Lightbulb',
    description: 'Non-functional lamps, flickering poles, dark arterial corridors at night.',
    departmentCode: 'ELEC-LGT',
    defaultSeverity: 'Low',
  },
  {
    id: 'Footpath',
    name: 'Footpath / Walkway',
    icon: 'Footprints',
    description: 'Broken paving tiles, pedestrian obstruction, illegal pavement encroachment.',
    departmentCode: 'RD-INFRA',
    defaultSeverity: 'Low',
  },
  {
    id: 'Other',
    name: 'Other Civic Issue',
    icon: 'HelpCircle',
    description: 'Stray animal menace, fallen branches, public property defacement.',
    departmentCode: 'HLTH-SAN',
    defaultSeverity: 'Low',
  },
];

export const STATUS_CONFIG: Record<
  ComplaintStatus,
  {
    label: string;
    description: string;
    color: string;
    bgColor: string;
    borderColor: string;
    badgeVariant: 'default' | 'info' | 'warning' | 'success' | 'danger' | 'neutral';
  }
> = {
  submitted: {
    label: 'Submitted',
    description: 'Complaint registered by citizen and queued for initial intake.',
    color: '#0284C7',
    bgColor: '#E0F2FE',
    borderColor: '#BAE6FD',
    badgeVariant: 'info',
  },
  under_review: {
    label: 'Under Review',
    description: 'Municipal control desk verifying geo-coordinates and incident category.',
    color: '#D97706',
    bgColor: '#FEF3C7',
    borderColor: '#FDE68A',
    badgeVariant: 'warning',
  },
  assigned: {
    label: 'Assigned',
    description: 'Dispatched to responsible zonal department & designated field inspector.',
    color: '#4F46E5',
    bgColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    badgeVariant: 'info',
  },
  in_progress: {
    label: 'In Progress',
    description: 'Ground workforce deployed on-site; remediation actively underway.',
    color: '#EA580C',
    bgColor: '#FFEDD5',
    borderColor: '#FED7AA',
    badgeVariant: 'warning',
  },
  resolved: {
    label: 'Resolved',
    description: 'Remediation completed with photographic evidence and verification.',
    color: '#15803D',
    bgColor: '#DCFCE7',
    borderColor: '#BBF7D0',
    badgeVariant: 'success',
  },
  rejected: {
    label: 'Rejected',
    description: 'Deemed outside municipal jurisdiction, fraudulent, or duplicate.',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    borderColor: '#FECACA',
    badgeVariant: 'danger',
  },
  needs_information: {
    label: 'Needs Information',
    description: 'Awaiting additional photographic proof or landmark details from citizen.',
    color: '#9333EA',
    bgColor: '#F3E8FF',
    borderColor: '#E9D5FF',
    badgeVariant: 'neutral',
  },
  Submitted: {
    label: 'Submitted',
    description: 'Complaint registered by citizen and queued for initial intake.',
    color: '#0284C7',
    bgColor: '#E0F2FE',
    borderColor: '#BAE6FD',
    badgeVariant: 'info',
  },
  'Under Review': {
    label: 'Under Review',
    description: 'Municipal control desk verifying geo-coordinates and incident category.',
    color: '#D97706',
    bgColor: '#FEF3C7',
    borderColor: '#FDE68A',
    badgeVariant: 'warning',
  },
  Assigned: {
    label: 'Assigned',
    description: 'Dispatched to responsible zonal department & designated field inspector.',
    color: '#4F46E5',
    bgColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    badgeVariant: 'info',
  },
  'In Progress': {
    label: 'In Progress',
    description: 'Ground workforce deployed on-site; remediation actively underway.',
    color: '#EA580C',
    bgColor: '#FFEDD5',
    borderColor: '#FED7AA',
    badgeVariant: 'warning',
  },
  Resolved: {
    label: 'Resolved',
    description: 'Remediation completed with photographic evidence and verification.',
    color: '#15803D',
    bgColor: '#DCFCE7',
    borderColor: '#BBF7D0',
    badgeVariant: 'success',
  },
  Rejected: {
    label: 'Rejected',
    description: 'Deemed outside municipal jurisdiction, fraudulent, or duplicate.',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    borderColor: '#FECACA',
    badgeVariant: 'danger',
  },
  'Needs Information': {
    label: 'Needs Information',
    description: 'Awaiting additional photographic proof or landmark details from citizen.',
    color: '#9333EA',
    bgColor: '#F3E8FF',
    borderColor: '#E9D5FF',
    badgeVariant: 'neutral',
  },
};

export const SEVERITY_CONFIG: Record<
  SeverityLevel,
  {
    label: string;
    description: string;
    color: string;
    bgColor: string;
    borderColor: string;
    slaHours: number;
    badgeVariant: 'low' | 'medium' | 'high' | 'critical';
  }
> = {
  low: {
    label: 'Low',
    description: 'Minor inconvenience; no immediate safety or health hazard.',
    color: '#15803D',
    bgColor: '#DCFCE7',
    borderColor: '#86EFAC',
    slaHours: 72,
    badgeVariant: 'low',
  },
  medium: {
    label: 'Medium',
    description: 'Moderate impact on public convenience or neighborhood cleanliness.',
    color: '#0284C7',
    bgColor: '#E0F2FE',
    borderColor: '#7DD3FC',
    slaHours: 48,
    badgeVariant: 'medium',
  },
  high: {
    label: 'High',
    description: 'Urgent risk of vehicular damage, water wastage, or drainage overflow.',
    color: '#EA580C',
    bgColor: '#FFEDD5',
    borderColor: '#FDBA74',
    slaHours: 24,
    badgeVariant: 'high',
  },
  critical: {
    label: 'Critical',
    description: 'Immediate threat to human life or public safety (e.g. open manhole).',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    slaHours: 6,
    badgeVariant: 'critical',
  },
  Low: {
    label: 'Low',
    description: 'Minor inconvenience; no immediate safety or health hazard.',
    color: '#15803D',
    bgColor: '#DCFCE7',
    borderColor: '#86EFAC',
    slaHours: 72,
    badgeVariant: 'low',
  },
  Medium: {
    label: 'Medium',
    description: 'Moderate impact on public convenience or neighborhood cleanliness.',
    color: '#0284C7',
    bgColor: '#E0F2FE',
    borderColor: '#7DD3FC',
    slaHours: 48,
    badgeVariant: 'medium',
  },
  High: {
    label: 'High',
    description: 'Urgent risk of vehicular damage, water wastage, or drainage overflow.',
    color: '#EA580C',
    bgColor: '#FFEDD5',
    borderColor: '#FDBA74',
    slaHours: 24,
    badgeVariant: 'high',
  },
  Critical: {
    label: 'Critical',
    description: 'Immediate threat to human life or public safety (e.g. open manhole).',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    slaHours: 6,
    badgeVariant: 'critical',
  },
};

export const DEFAULT_DEPARTMENTS = [
  {
    id: 'dept-roads',
    code: 'RD-INFRA',
    name: 'Roads & Infrastructure Engineering',
    description: 'Pothole repair, arterial bitumen maintenance, paving, footpaths & medians.',
    contact_email: 'roads.infra@civic.bharat.gov.in',
    contact_phone: '+91 1800 233 4001',
    active_staff_count: 64,
    avg_sla_hours: 36,
  },
  {
    id: 'dept-sanitation',
    code: 'SWM-CIVIC',
    name: 'Solid Waste Management & Sanitation',
    description: 'Garbage segregation, secondary collection, bin clearing, street sweeping.',
    contact_email: 'swm.cleancity@civic.bharat.gov.in',
    contact_phone: '+91 1800 233 4002',
    active_staff_count: 112,
    avg_sla_hours: 18,
  },
  {
    id: 'dept-drainage',
    code: 'DRN-SEW',
    name: 'Stormwater Drains & Sewerage Board',
    description: 'Culvert desilting, manhole covers, sewer overflow prevention, flood mitigation.',
    contact_email: 'drainage.sewers@civic.bharat.gov.in',
    contact_phone: '+91 1800 233 4003',
    active_staff_count: 48,
    avg_sla_hours: 12,
  },
  {
    id: 'dept-water',
    code: 'WSS-WATER',
    name: 'Water Supply & Pipeline Operations',
    description: 'Drinking water distribution, burst mains, pressure regulation, tanker delivery.',
    contact_email: 'water.supply@civic.bharat.gov.in',
    contact_phone: '+91 1800 233 4004',
    active_staff_count: 52,
    avg_sla_hours: 20,
  },
  {
    id: 'dept-electrical',
    code: 'ELEC-LGT',
    name: 'Electrical & Street Lighting Wing',
    description: 'LED streetlamp fixtures, pole transformers, underground conduit wiring.',
    contact_email: 'lighting.energy@civic.bharat.gov.in',
    contact_phone: '+91 1800 233 4005',
    active_staff_count: 38,
    avg_sla_hours: 28,
  },
  {
    id: 'dept-health',
    code: 'HLTH-SAN',
    name: 'Public Health & Urban Sanitation',
    description: 'Mosquito control fogging, stray animal management, sanitization drives.',
    contact_email: 'publichealth@civic.bharat.gov.in',
    contact_phone: '+91 1800 233 4006',
    active_staff_count: 42,
    avg_sla_hours: 32,
  },
];
