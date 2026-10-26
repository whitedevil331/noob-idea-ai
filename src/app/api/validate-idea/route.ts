import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import {
  IdeaInputSchema,
  safeParseValidationReport,
} from '@/lib/schemas/validationSchema';
import {
  globalRateLimiter,
  globalValidationCache,
  hashIdeaPrompt,
  scrubSensitivePII,
} from '@/lib/security/rateLimiter';
import { buildDeterministicHeuristicReport } from '@/lib/engine/validationOrchestrator';

const SYSTEM_PROMPT = `You are a Principal Full-Stack & Venture Systems Architect conducting a brutal, rigorous, 4-stage validation of a startup venture idea.

You simulate 4 distinct specialist agents in sequence:
1. MARKET SIZING AGENT: TAM in Billions USD, SAM in Millions USD, SOM in Millions USD, primary buyer persona, urgency score (1-10), willingness to pay in USD.
2. COMPETITIVE MOAT AGENT: 2-3 incumbents with name, core weakness, pricing model; plus unfair moat strategy.
3. SYSTEMS ARCHITECTURE & CLOUD FINOPS AGENT: Recommended stack (frontend, backend, database, infrastructure), estimated monthly cloud/GPU cost in USD, critical bottleneck, security/compliance notes.
4. RED-TEAM CRITIC AGENT: Overall viability score (0-100), verdict ("GO_BUILD" | "PIVOT_REQUIRED" | "HIGH_RISK_DROP"), brutal feedback, first 90 days roadmap (3 milestone strings).

Return ONLY valid JSON matching this schema:
{
  "market": {
    "tamBillionsUsd": number,
    "samMillionsUsd": number,
    "somMillionsUsd": number,
    "primaryBuyerPersona": string,
    "urgencyScore": number,
    "willingnessToPayUsd": number
  },
  "competitors": {
    "incumbents": [
      { "name": string, "coreWeakness": string, "pricingModel": string }
    ],
    "unfairMoatStrategy": string
  },
  "architecture": {
    "recommendedStack": {
      "frontend": string,
      "backend": string,
      "database": string,
      "infrastructure": string
    },
    "estimatedMonthlyCloudCostUsd": number,
    "criticalBottleneck": string,
    "securityComplianceNotes": [string]
  },
  "critic": {
    "overallViabilityScore": number,
    "verdict": "GO_BUILD" | "PIVOT_REQUIRED" | "HIGH_RISK_DROP",
    "brutalFeedback": string,
    "first90DaysRoadmap": [string]
  }
}`;

export async function POST(req: NextRequest) {
  const startTime = performance.now();

  try {
    const rawBody = await req.json();
    const parsedInput = IdeaInputSchema.safeParse(rawBody);

    if (!parsedInput.success) {
      return NextResponse.json(
        { error: 'Invalid input schema', details: parsedInput.error.format() },
        { status: 400 }
      );
    }

    const { title, problemStatement, targetMarket, monthlyBudgetUsd } = parsedInput.data;
    const userId = rawBody.userId || req.headers.get('x-user-id') || 'api_client';

    // 1. Rate Limiting
    const rateLimit = globalRateLimiter.consume(userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Rate limit exceeded. Retry after ${rateLimit.retryAfterSeconds} seconds.`,
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    // 2. PII Sanitization
    const scrubbedTitle = scrubSensitivePII(title);
    const scrubbedProblem = scrubSensitivePII(problemStatement);

    // 3. Prompt Hashing & Semantic LRU Cache
    const promptHash = hashIdeaPrompt(scrubbedTitle, scrubbedProblem, targetMarket);
    const cached = globalValidationCache.get(promptHash);

    if (cached) {
      const latencyMs = Math.round(performance.now() - startTime);
      return NextResponse.json({
        success: true,
        report: {
          ...cached,
          telemetry: {
            latencyMs,
            estimatedTokens: 0,
            cacheHit: true,
            timestamp: Date.now(),
          },
        },
      });
    }

    // 4. Server-Side Gemini Execution
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('GEMINI_API_KEY not configured on server, generating heuristic baseline.');
      const latencyMs = Math.round(performance.now() - startTime);
      const report = buildDeterministicHeuristicReport(parsedInput.data, {
        latencyMs,
        estimatedTokens: 0,
        cacheHit: false,
        timestamp: Date.now(),
      });
      globalValidationCache.set(promptHash, report);
      return NextResponse.json({ success: true, report });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${SYSTEM_PROMPT}\n\nVenture Thesis:\nTitle: ${scrubbedTitle}\nSector: ${targetMarket}\nProblem & Architecture: ${scrubbedProblem}\nMonthly Infrastructure Budget: $${monthlyBudgetUsd} USD`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const latencyMs = Math.round(performance.now() - startTime);
      const estimatedTokens = (response as any).usageMetadata?.totalTokenCount || 1100;
      const rawText = response.text || '{}';

      const report = safeParseValidationReport(rawText, {
        title,
        problemStatement,
        targetMarket,
        monthlyBudgetUsd,
        telemetry: {
          latencyMs,
          estimatedTokens,
          cacheHit: false,
          timestamp: Date.now(),
        },
      });

      // Store in LRU cache
      globalValidationCache.set(promptHash, report);
      return NextResponse.json({ success: true, report });
    } catch (modelErr: any) {
      console.warn('Gemini server execution error, providing heuristic fallback:', modelErr?.message);
      const latencyMs = Math.round(performance.now() - startTime);
      const report = buildDeterministicHeuristicReport(parsedInput.data, {
        latencyMs,
        estimatedTokens: 0,
        cacheHit: false,
        timestamp: Date.now(),
      });
      globalValidationCache.set(promptHash, report);
      return NextResponse.json({ success: true, report });
    }
  } catch (err: any) {
    console.error('Validation API Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Validation Engine Failure' },
      { status: 500 }
    );
  }
}
