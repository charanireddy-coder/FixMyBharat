import {
  AnalysisInput,
  AnalysisResult,
  ComplaintAnalyzer,
} from './types';
import {
  CATEGORY_RULES,
  SEVERITY_SIGNALS,
  scoreToSeverityLevel,
} from './rules';
import { ComplaintCategory } from '@/types';
import { getCategoryLabel } from '@/lib/complaints';

export class RulesComplaintAnalyzer implements ComplaintAnalyzer {
  public analyze(input: AnalysisInput): AnalysisResult {
    const textToAnalyze = `${input.title} ${input.description} ${input.address || ''}`;

    // 1. Category Inference via Pattern Weights
    let bestCategory: ComplaintCategory = 'other';
    let highestScore = 0;
    const categoryMatchesMap: Record<string, string[]> = {};

    for (const rule of CATEGORY_RULES) {
      let ruleScore = 0;
      const matchedLabels: string[] = [];

      for (const pattern of rule.patterns) {
        if (pattern.regex.test(textToAnalyze)) {
          ruleScore += pattern.weight;
          matchedLabels.push(pattern.label);
        }
      }

      if (ruleScore > 0) {
        categoryMatchesMap[rule.category] = matchedLabels;
      }

      if (ruleScore > highestScore) {
        highestScore = ruleScore;
        bestCategory = rule.category;
      }
    }

    // Determine deterministic rule confidence (0.50 to 0.95)
    let confidence = 0.50;
    if (highestScore >= 12) {
      confidence = 0.94;
    } else if (highestScore >= 8) {
      confidence = 0.88;
    } else if (highestScore >= 5) {
      confidence = 0.78;
    } else if (highestScore >= 3) {
      confidence = 0.68;
    } else if (highestScore > 0) {
      confidence = 0.58;
    } else {
      // If no category keywords matched, fallback to 'other'
      bestCategory = 'other';
      confidence = 0.50;
    }

    const matchedCategorySignals = categoryMatchesMap[bestCategory] || [];

    // 2. Severity Scoring (0 to 100)
    let rawSeverityScore = 30; // Medium baseline

    // Inherent category gravity
    if (bestCategory === 'open_manhole') {
      rawSeverityScore += 15;
    } else if (bestCategory === 'drainage' || bestCategory === 'water_leakage') {
      rawSeverityScore += 5;
    }

    const matchedSeveritySignals: string[] = [];

    for (const signal of SEVERITY_SIGNALS) {
      if (signal.regex.test(textToAnalyze)) {
        rawSeverityScore += signal.delta;
        matchedSeveritySignals.push(signal.label);
      }
    }

    // Strictly clamp severity score between 5 and 100
    const severityScore = Math.max(5, Math.min(100, Math.round(rawSeverityScore)));
    const severity = scoreToSeverityLevel(severityScore);

    // 3. Transparent Human-Readable Explanation
    const explanationParts: string[] = [];

    if (matchedCategorySignals.length > 0) {
      explanationParts.push(
        `Detected ${getCategoryLabel(bestCategory)} signals (${matchedCategorySignals.slice(0, 2).map((s) => `'${s}'`).join(', ')}).`
      );
    } else {
      explanationParts.push(
        `No specific category keywords detected; assigned general civic classification.`
      );
    }

    if (matchedSeveritySignals.length > 0) {
      explanationParts.push(
        `Elevated by ${matchedSeveritySignals.slice(0, 2).join(' and ')}, resulting in a severity score of ${severityScore} (${severity.toUpperCase()}).`
      );
    } else {
      explanationParts.push(
        `Standard baseline operational indicators suggest a moderate score of ${severityScore} (${severity.toUpperCase()}).`
      );
    }

    const explanation = explanationParts.join(' ');

    return {
      predictedCategory: bestCategory,
      confidence,
      severityScore,
      severity,
      explanation,
      analysisSource: 'rules',
      modelName: 'fixmybharat-rules-v1',
      matchedCategorySignals,
      matchedSeveritySignals,
    };
  }
}

// Global default analyzer instance
const defaultAnalyzer = new RulesComplaintAnalyzer();

export function analyzeComplaint(input: AnalysisInput): AnalysisResult {
  return defaultAnalyzer.analyze(input);
}
