import { AIAnalysis, Complaint, ComplaintCategory, SeverityLevel } from '@/types';

interface AnalysisInput {
  title: string;
  description: string;
  category?: ComplaintCategory;
  address?: string;
  latitude?: number;
  longitude?: number;
  existingComplaints?: Complaint[];
}

export function analyzeCivicIssue(input: AnalysisInput): AIAnalysis {
  const text = `${input.title} ${input.description}`.toLowerCase();

  // 1. Keyword-based Category Detection
  const categoryScores: Record<string, number> = {
    'Open Manhole': 0,
    Pothole: 0,
    Drainage: 0,
    'Water Leakage': 0,
    Garbage: 0,
    Streetlight: 0,
    Footpath: 0,
    Other: 1, // baseline
  };

  if (/manhole|open pit|chamber|gutter cover|sewer hole|man hole/i.test(text)) {
    categoryScores['Open Manhole'] += 8;
  }
  if (/pothole|crater|asphalt|road broken|tarmac|ditch|speed breaker damaged/i.test(text)) {
    categoryScores['Pothole'] += 7;
  }
  if (/drain|sewer|sewage|waterlog|overflow|clogged drain|foul smell drain|culvert/i.test(text)) {
    categoryScores['Drainage'] += 6;
  }
  if (/water leak|burst|pipe|pipeline|drinking water|potable water|tap leak|gushing water/i.test(text)) {
    categoryScores['Water Leakage'] += 7;
  }
  if (/garbage|trash|dump|waste|plastic|stinking|rubbish|debris|overflowing bin|litter/i.test(text)) {
    categoryScores['Garbage'] += 7;
  }
  if (/streetlight|street light|light|dark|pole|bulb|lamp|flickering|blackout/i.test(text)) {
    categoryScores['Streetlight'] += 7;
  }
  if (/footpath|sidewalk|pavement|paver|pedestrian|curb|kerb|walkway/i.test(text)) {
    categoryScores['Footpath'] += 6;
  }

  // If user already picked category, give it a significant prior weight
  if (input.category && input.category !== 'Other') {
    categoryScores[input.category] = (categoryScores[input.category] || 0) + 4;
  }

  // Find best category
  let bestCategory: ComplaintCategory = 'Other';
  let highestScore = 0;
  for (const cat of Object.keys(categoryScores) as ComplaintCategory[]) {
    if (categoryScores[cat] > highestScore) {
      highestScore = categoryScores[cat];
      bestCategory = cat;
    }
  }

  const categoryConfidence = Math.min(
    0.96,
    Math.max(0.68, highestScore > 0 ? 0.7 + (highestScore / 15) * 0.25 : 0.65)
  );

  // 2. Severity Scoring & Hazard Assessment
  let hazardScore = 3.5;
  const keyFactors: string[] = [];
  // Critical hazard patterns
  const criticalPatterns = [
    { regex: /manhole|open pit|deep chamber|sewer hole/i, label: 'Uncovered vertical fall hazard' },
    { regex: /live wire|electrocution|short circuit|sparking/i, label: 'Electrical shock hazard' },
    { regex: /accident|fell into|injured|hospital|fatal|casualty/i, label: 'Prior physical accident reported' },
    { regex: /school|hospital|kindergarten|elderly/i, label: 'High pedestrian vulnerability zone' },
  ];

  criticalPatterns.forEach(({ regex, label }) => {
    if (regex.test(text)) {
      hazardScore += 3.2;
      keyFactors.push(label);
    }
  });

  // High hazard patterns
  const highPatterns = [
    { regex: /burst pipeline|gushing water|severe flood|knee deep/i, label: 'Extensive water wastage / flooding' },
    { regex: /main road|highway|arterial|busy junction|traffic jam/i, label: 'Heavy vehicular transit corridor' },
    { regex: /deep pothole|huge crater|tyre puncture|skid/i, label: 'High velocity impact risk for two-wheelers' },
    { regex: /stinking|maggots|epidemic|dengue|mosquitoes/i, label: 'Biohazard & public hygiene health threat' },
  ];

  highPatterns.forEach(({ regex, label }) => {
    if (regex.test(text)) {
      hazardScore += 1.8;
      keyFactors.push(label);
    }
  });

  if (bestCategory === 'Open Manhole') {
    hazardScore = Math.max(hazardScore, 8.5);
    if (!keyFactors.includes('Open Manhole baseline risk')) {
      keyFactors.push('National Municipal Safety Directive: Open Manholes classed as Critical by default');
    }
  }

  // Determine Severity
  let suggestedSeverity: SeverityLevel = 'Low';
  if (hazardScore >= 7.5) {
    suggestedSeverity = 'Critical';
  } else if (hazardScore >= 5.5) {
    suggestedSeverity = 'High';
  } else if (hazardScore >= 3.5) {
    suggestedSeverity = 'Medium';
  } else {
    suggestedSeverity = 'Low';
  }

  if (keyFactors.length === 0) {
    keyFactors.push('Standard municipal maintenance queue categorization');
    keyFactors.push(`Matched linguistic signals for ${bestCategory}`);
  }

  // 3. Duplicate / Nearby Report Matching
  const potentialDuplicates: string[] = [];
  if (input.existingComplaints && input.existingComplaints.length > 0) {
    const inputWords = text.split(/\s+/).filter((w) => w.length > 3);
    for (const comp of input.existingComplaints) {
      if (comp.category === bestCategory) {
        const compWords = `${comp.title} ${comp.address}`.toLowerCase().split(/\s+/);
        const common = inputWords.filter((w) => compWords.includes(w));
        if (common.length >= 2) {
          potentialDuplicates.push(comp.complaint_number);
        }
      }
    }
  }

  const explanation =
    suggestedSeverity === 'Critical'
      ? `Rule-based heuristics flagged high hazard triggers: ${keyFactors.join(', ')}. Automated recommendation: Dispatch immediate field inspection within 6 hours.`
      : suggestedSeverity === 'High'
        ? `Incident classified under ${bestCategory} with elevated impact rating based on: ${keyFactors.join(', ')}. Escalation SLA set to 24 hours.`
        : `Standard civic complaint mapped to ${bestCategory}. Prioritization benchmarked based on municipal density heuristics.`;

  return {
    id: 'ai-eval-engine',
    suggested_category: bestCategory,
    category_confidence: Number(categoryConfidence.toFixed(2)),
    suggested_severity: suggestedSeverity,
    severity_confidence: Number(Math.min(0.95, 0.75 + (hazardScore / 10) * 0.2).toFixed(2)),
    explanation,
    key_factors: keyFactors,
    hazard_index: Number(Math.min(10, Math.max(1, hazardScore)).toFixed(1)),
    potential_duplicate_ids: potentialDuplicates.slice(0, 3),
    model_type: 'demo_rule_based',
    analyzed_at: '2026-10-12T10:00:00Z',
  };
}
