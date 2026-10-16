export interface DepartmentKnowledge {
  name: string;
  description: string;
  handles: string[];
}

export const DEPARTMENTS_KNOWLEDGE: DepartmentKnowledge[] = [
  {
    name: 'Roads and Infrastructure',
    description: 'Responsible for municipal roadways, road surfaces, potholes, pavement stability, and pedestrian footpaths.',
    handles: ['Potholes', 'Damaged roads', 'Footpath breaks', 'Kerb stone damage', 'Road caving'],
  },
  {
    name: 'Sanitation',
    description: 'Responsible for solid waste management, municipal garbage clearance, street sweeping, and community bins.',
    handles: ['Garbage accumulation', 'Overflowing community bins', 'Illegal waste dumping', 'Sanitation hazards'],
  },
  {
    name: 'Water Supply',
    description: 'Responsible for public potable water pipelines, municipal main supply lines, and pipe leakages.',
    handles: ['Water main leakage', 'Burst pipes', 'Contaminated water supply', 'Low pressure line breaks'],
  },
  {
    name: 'Drainage',
    description: 'Responsible for stormwater drains, wastewater channels, monsoon flooding, and uncovered manholes.',
    handles: ['Open manholes', 'Clogged storm drains', 'Sewage overflow', 'Monsoon waterlogging'],
  },
  {
    name: 'Street Lighting',
    description: 'Responsible for public illumination, lampposts, faulty LED fixtures, and electrical supply poles.',
    handles: ['Non-functional streetlights', 'Damaged light poles', 'Dark public corridors', 'Flickering fixtures'],
  },
  {
    name: 'Public Works',
    description: 'Responsible for general civic infrastructure, public parks, municipal boundaries, and other civic assets.',
    handles: ['Public wall damage', 'Civic structure maintenance', 'Other general civic infrastructure'],
  },
];

export const STATUS_EXPLANATIONS: Record<string, { label: string; stage: number; description: string; nextStep: string }> = {
  submitted: {
    label: 'Submitted',
    stage: 1,
    description: 'Your report has been successfully recorded and placed in the triage intake queue.',
    nextStep: 'A municipal triage officer will review the report and verify the issue details and location.',
  },
  under_review: {
    label: 'Under Review',
    stage: 2,
    description: 'Civic personnel are verifying the validity, category alignment, and location of your report.',
    nextStep: 'The report will be assigned to the designated municipal department and field officer.',
  },
  assigned: {
    label: 'Assigned',
    stage: 3,
    description: 'The complaint has been dispatched to the appropriate department and a designated field official.',
    nextStep: 'The field crew will schedule on-site inspection and mobilize remediation workforce.',
  },
  in_progress: {
    label: 'In Progress',
    stage: 4,
    description: 'Ground workforce is actively working on-site to repair or resolve the reported civic issue.',
    nextStep: 'Once fieldwork is finished, the official will submit resolution verification notes.',
  },
  resolved: {
    label: 'Resolved',
    stage: 5,
    description: 'The issue has been completely remediated and verified with official resolution notes.',
    nextStep: 'You can inspect the verified resolution notes on your complaint detail page.',
  },
  needs_information: {
    label: 'Needs Information',
    stage: 0,
    description: 'The municipal team requires additional details (such as a specific landmark or clearer photo) to proceed.',
    nextStep: 'Please check your complaint detail page and notifications for details on what is required.',
  },
  rejected: {
    label: 'Rejected',
    stage: 0,
    description: 'The report could not be processed because it is outside municipal jurisdiction, a duplicate, or invalid.',
    nextStep: 'An official explanation note is logged in your report activity timeline.',
  },
};

export const EMERGENCY_HELPLINES = [
  { name: 'National All-in-One Emergency', number: '112', desc: 'Police, Fire, and Ambulance combined' },
  { name: 'Police Helpline', number: '100', desc: 'Immediate law enforcement / safety' },
  { name: 'Fire Service', number: '101', desc: 'Fire hazards and structural rescue' },
  { name: 'Ambulance / Medical Emergency', number: '108 / 102', desc: 'Critical medical transport' },
  { name: 'Disaster Management Helpline', number: '1077', desc: 'Flooding, cyclones, building collapse' },
  { name: 'Women Helpline', number: '1091', desc: 'Safety and assistance for women' },
];

export const SUGGESTED_QUESTIONS = [
  'How do I report a pothole?',
  'What happens after I submit a complaint?',
  'How can I check my complaint status?',
  'What information should I include in a report?',
  'Which department handles streetlights or water leakage?',
  'Show my recent complaints',
];
