import { z } from 'zod';

export const TargetMarketEnum = z.enum([
  'B2B_SAAS',
  'DEV_TOOLS',
  'DEPIN_WEB3',
  'D2C_CONSUMER',
  'PHYSICAL_AI',
]);
export type TargetMarket = z.infer<typeof TargetMarketEnum>;

export const VerdictEnum = z.enum([
  'GO_BUILD',
  'PIVOT_REQUIRED',
  'HIGH_RISK_DROP',
]);
export type Verdict = z.infer<typeof VerdictEnum>;

export const IdeaInputSchema = z.object({
  title: z
    .string()
    .min(3, { message: 'Title must be at least 3 characters' })
    .max(100, { message: 'Title must not exceed 100 characters' }),
  problemStatement: z
    .string()
    .min(20, { message: 'Problem statement must be at least 20 characters for deep technical analysis' }),
  targetMarket: TargetMarketEnum,
  monthlyBudgetUsd: z
    .number()
    .min(0, { message: 'Monthly budget must be 0 or greater' })
    .default(500),
});

export type IdeaInput = z.infer<typeof IdeaInputSchema>;

export const MarketAnalysisSchema = z.object({
  tamBillionsUsd: z.number().describe('Total Addressable Market in Billions USD'),
  samMillionsUsd: z.number().describe('Serviceable Addressable Market in Millions USD'),
  somMillionsUsd: z.number().describe('Serviceable Obtainable Market in Millions USD'),
  primaryBuyerPersona: z.string().describe('Exact role, profile, and buying motivation'),
  urgencyScore: z.number().min(1).max(10).describe('1-10 pain urgency score'),
  willingnessToPayUsd: z.number().describe('Estimated monthly willingness to pay per unit/user in USD'),
});

export const CompetitorIncumbentSchema = z.object({
  name: z.string(),
  coreWeakness: z.string(),
  pricingModel: z.string(),
});

export const CompetitorsAnalysisSchema = z.object({
  incumbents: z.array(CompetitorIncumbentSchema).min(1),
  unfairMoatStrategy: z.string().describe('Asymmetric leverage or proprietary defensibility vector'),
});

export const ArchitectureStackSchema = z.object({
  frontend: z.string(),
  backend: z.string(),
  database: z.string(),
  infrastructure: z.string(),
});

export const ArchitectureAnalysisSchema = z.object({
  recommendedStack: ArchitectureStackSchema,
  estimatedMonthlyCloudCostUsd: z.number().describe('Estimated cloud/GPU run-rate in USD'),
  criticalBottleneck: z.string().describe('Hardest engineering or scaling bottleneck'),
  securityComplianceNotes: z.array(z.string()).min(1),
});

export const CriticAnalysisSchema = z.object({
  overallViabilityScore: z.number().min(0).max(100).describe('Composite 0-100 venture viability index'),
  verdict: VerdictEnum,
  brutalFeedback: z.string().describe('Unfiltered red-team critique exposing fatal assumptions'),
  first90DaysRoadmap: z.array(z.string()).min(3).describe('Concrete tactical milestones for days 0-30, 31-60, 61-90'),
});

export const TelemetrySchema = z.object({
  latencyMs: z.number(),
  estimatedTokens: z.number(),
  cacheHit: z.boolean(),
  timestamp: z.number(),
});

export const FullIdeaValidationReportSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  problemStatement: z.string(),
  targetMarket: TargetMarketEnum,
  monthlyBudgetUsd: z.number(),
  market: MarketAnalysisSchema,
  competitors: CompetitorsAnalysisSchema,
  architecture: ArchitectureAnalysisSchema,
  critic: CriticAnalysisSchema,
  telemetry: TelemetrySchema,
});

export type MarketAnalysis = z.infer<typeof MarketAnalysisSchema>;
export type CompetitorsAnalysis = z.infer<typeof CompetitorsAnalysisSchema>;
export type ArchitectureAnalysis = z.infer<typeof ArchitectureAnalysisSchema>;
export type CriticAnalysis = z.infer<typeof CriticAnalysisSchema>;
export type Telemetry = z.infer<typeof TelemetrySchema>;
export type FullIdeaValidationReport = z.infer<typeof FullIdeaValidationReportSchema>;

/**
 * Extracts and cleans JSON from raw LLM output, handling markdown fences and extraneous characters.
 */
export function extractJsonFromText(rawText: string): unknown {
  const trimmed = rawText.trim();
  // Try direct parse first
  try {
    return JSON.parse(trimmed);
  } catch {
    // Look for markdown block ```json ... ``` or ``` ... ```
    const markdownMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (markdownMatch && markdownMatch[1]) {
      try {
        return JSON.parse(markdownMatch[1]);
      } catch {
        // continue
      }
    }
    // Look for first '{' and last '}'
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const candidate = trimmed.substring(firstBrace, lastBrace + 1);
      return JSON.parse(candidate);
    }
    throw new Error('Unable to extract valid JSON from LLM output');
  }
}

/**
 * Safely parses and validates LLM output against FullIdeaValidationReportSchema.
 */
export function safeParseValidationReport(
  rawText: string,
  baseMeta?: { title: string; problemStatement: string; targetMarket: TargetMarket; monthlyBudgetUsd: number; telemetry: Telemetry }
): FullIdeaValidationReport {
  const parsed = extractJsonFromText(rawText);
  const data = typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, any>) : {};

  // If LLM returned only the sub-objects (market, competitors, architecture, critic)
  const fullPayload = {
    id: data.id || `val_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: data.title || baseMeta?.title || 'Untitled Venture',
    problemStatement: data.problemStatement || baseMeta?.problemStatement || '',
    targetMarket: data.targetMarket || baseMeta?.targetMarket || 'B2B_SAAS',
    monthlyBudgetUsd: data.monthlyBudgetUsd ?? baseMeta?.monthlyBudgetUsd ?? 500,
    market: data.market,
    competitors: data.competitors,
    architecture: data.architecture,
    critic: data.critic,
    telemetry: data.telemetry || baseMeta?.telemetry || {
      latencyMs: 0,
      estimatedTokens: 0,
      cacheHit: false,
      timestamp: Date.now(),
    },
  };

  return FullIdeaValidationReportSchema.parse(fullPayload);
}
