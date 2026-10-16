import { ComplaintCategory, ComplaintSeverity } from '@/types';

export interface CategoryRule {
  category: ComplaintCategory;
  patterns: { regex: RegExp; weight: number; label: string }[];
}

export const CATEGORY_RULES: CategoryRule[] = [
  {
    category: 'open_manhole',
    patterns: [
      { regex: /open\s+manhole/i, weight: 6, label: 'open manhole' },
      { regex: /uncovered\s+manhole/i, weight: 6, label: 'uncovered manhole' },
      { regex: /missing\s+manhole(\s+cover|\s+lid)?/i, weight: 6, label: 'missing manhole lid' },
      { regex: /open\s+(drain\s+cover|chamber|pit|sewer\s+lid)/i, weight: 5, label: 'open chamber cover' },
      { regex: /manhole/i, weight: 3, label: 'manhole mention' },
    ],
  },
  {
    category: 'pothole',
    patterns: [
      { regex: /pothole|pot\s*hole/i, weight: 5, label: 'pothole' },
      { regex: /road\s+hole|crater|damaged\s+road|road\s+damage/i, weight: 4, label: 'road damage crater' },
      { regex: /broken\s+(road|asphalt|tar|bitumen)/i, weight: 3, label: 'broken road surface' },
      { regex: /asphalt\s+(subsidence|damage|crater)/i, weight: 3, label: 'asphalt damage' },
      { regex: /cavity\s+on\s+road/i, weight: 3, label: 'road cavity' },
    ],
  },
  {
    category: 'garbage',
    patterns: [
      { regex: /garbage\s+pile|garbage\s+dump|illegal\s+dumping/i, weight: 5, label: 'garbage pile' },
      { regex: /overflowing\s+(bin|dumpster|dustbin)/i, weight: 4, label: 'overflowing dumpster' },
      { regex: /garbage|trash|waste|litter|debris|rubbish/i, weight: 3, label: 'solid waste' },
      { regex: /uncleared\s+(waste|garbage|bins)/i, weight: 3, label: 'uncleared waste' },
    ],
  },
  {
    category: 'water_leakage',
    patterns: [
      { regex: /water\s+leak|leaking\s+pipe|pipeline\s+leak/i, weight: 5, label: 'pipeline leak' },
      { regex: /burst\s+pipe|pipe\s+burst|pipe\s+bursting/i, weight: 5, label: 'pipe burst' },
      { regex: /water\s+flowing\s+(from\s+pipe|on\s+road)/i, weight: 4, label: 'water gushing' },
      { regex: /drinking\s+water\s+wastage|pipeline\s+damaged/i, weight: 4, label: 'drinking water line issue' },
      { regex: /water\s+leakage/i, weight: 4, label: 'water leakage' },
    ],
  },
  {
    category: 'drainage',
    patterns: [
      { regex: /blocked\s+drain|clogged\s+drain|overflowing\s+drain/i, weight: 5, label: 'blocked drainage' },
      { regex: /sewage\s+overflow|drainage\s+overflow|foul\s+drain/i, weight: 5, label: 'sewage overflow' },
      { regex: /waterlogging|water\s+logging|drain\s+blocked/i, weight: 4, label: 'waterlogging' },
      { regex: /drainage|sewer|gutter|culvert/i, weight: 3, label: 'drainage infrastructure' },
    ],
  },
  {
    category: 'streetlight',
    patterns: [
      { regex: /street\s*light|streetlight/i, weight: 5, label: 'streetlight' },
      { regex: /light\s+not\s+working|dark\s+street|broken\s+light/i, weight: 4, label: 'non-functional lighting' },
      { regex: /pole\s+light|lamp\s+post|street\s+lamp/i, weight: 3, label: 'lamp post' },
      { regex: /fused\s+(bulb|light)|blackout\s+on\s+street/i, weight: 3, label: 'street blackout' },
    ],
  },
  {
    category: 'footpath',
    patterns: [
      { regex: /footpath|foot\s*path|sidewalk|pavement/i, weight: 5, label: 'footpath / sidewalk' },
      { regex: /broken\s+pavers|pedestrian\s+path|curb\s+stone/i, weight: 4, label: 'damaged pedestrian path' },
      { regex: /walkway\s+damaged|pedestrian\s+hazard/i, weight: 3, label: 'walkway damage' },
    ],
  },
];

export interface SeveritySignal {
  regex: RegExp;
  delta: number;
  label: string;
}

export const SEVERITY_SIGNALS: SeveritySignal[] = [
  // Critical life/safety hazards (+30 to +35)
  { regex: /open\s+manhole|uncovered\s+manhole|missing\s+manhole\s+lid/i, delta: 35, label: 'Open vertical fall hazard (manhole)' },
  { regex: /live\s+wire|exposed\s+wire|electric(al)?\s+shock|sparking|short\s+circuit/i, delta: 35, label: 'Electrical shock/electrocution hazard' },
  { regex: /accident|injured|injury|casualty|fell\s+into|hospitalized/i, delta: 30, label: 'Prior physical accident or injury reported' },
  { regex: /fire|explosion|gas\s+leak|toxic/i, delta: 30, label: 'Fire or hazardous chemical threat' },

  // Severe disruption & flooding (+20 to +25)
  { regex: /completely\s+blocked|impassable|road\s+closed|traffic\s+halted/i, delta: 25, label: 'Complete road or transit blockage' },
  { regex: /flooding|water\s+entering\s+(homes|houses|shops)|severe\s+waterlog/i, delta: 25, label: 'Property flooding or severe waterlogging' },
  { regex: /dangerous|severe\s+danger|grave\s+risk/i, delta: 20, label: 'Express dangerous hazard condition' },

  // Vulnerable pedestrian & high density zones (+12 to +15)
  { regex: /school|hospital|kindergarten|elderly|children|clinic/i, delta: 15, label: 'Proximity to vulnerable pedestrian zone' },
  { regex: /bus\s+stop|metro\s+station|railway\s+station/i, delta: 12, label: 'High density transit hub' },

  // Moderate operational factors (+8 to +10)
  { regex: /main\s+road|highway|ring\s+road|arterial\s+road|busy\s+junction/i, delta: 10, label: 'High traffic arterial roadway' },
  { regex: /foul\s+smell|mosquitoes|disease|contamination/i, delta: 8, label: 'Sanitation / health contamination risk' },
  { regex: /dark\s+street|pitch\s+dark|no\s+visibility/i, delta: 10, label: 'Complete darkness safety risk' },

  // Mitigating low severity factors (-8 to -10)
  { regex: /minor|small|slight|corner\s+only|low\s+traffic/i, delta: -10, label: 'Reported as minor or isolated issue' },
];

/**
 * Maps numeric severity score (0-100) to ComplaintSeverity enum
 */
export function scoreToSeverityLevel(score: number): ComplaintSeverity {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}
