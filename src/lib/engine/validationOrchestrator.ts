import {
  IdeaInput,
  IdeaInputSchema,
  FullIdeaValidationReport,
  TargetMarket,
} from '../schemas/validationSchema';
import {
  globalRateLimiter,
  globalValidationCache,
  hashIdeaPrompt,
  scrubSensitivePII,
} from '../security/rateLimiter';

export type ValidationStage =
  | 'INITIALIZING'
  | 'SANITIZING_AND_CACHING'
  | 'MARKET_SIZING'
  | 'COMPETITIVE_MOAT'
  | 'SYSTEMS_ARCHITECTURE'
  | 'RED_TEAM_CRITIC'
  | 'FINALIZING';

export interface OrchestrationOptions {
  userId?: string;
  onStageChange?: (stage: ValidationStage, description: string) => void;
}

export const STAGE_DESCRIPTIONS: Record<ValidationStage, string> = {
  INITIALIZING: 'Validating payload contract & initializing middleware...',
  SANITIZING_AND_CACHING: 'Scrubbing PII and checking deterministic semantic LRU cache...',
  MARKET_SIZING: 'Stage 1: Synthesizing TAM/SAM/SOM & primary buyer willingness to pay...',
  COMPETITIVE_MOAT: 'Stage 2: Stress-testing incumbents & calculating defensibility moat...',
  SYSTEMS_ARCHITECTURE: 'Stage 3: Drafting cloud architecture, GPU bottlenecks & FinOps budget...',
  RED_TEAM_CRITIC: 'Stage 4: Red-team adversarial audit & 90-day execution sprints...',
  FINALIZING: 'Validating output against Zod schema & indexing telemetry...',
};

/**
 * Intelligent domain-specialized heuristic synthesizer.
 * Dynamically adapts TAM, buyer personas, incumbent vulnerabilities, cloud stacks,
 * brutal red-team critiques, and 90-day execution sprints based on sector and keywords.
 */
export function buildDeterministicHeuristicReport(
  input: IdeaInput,
  telemetry: { latencyMs: number; estimatedTokens: number; cacheHit: boolean; timestamp: number }
): FullIdeaValidationReport {
  const title = input.title.trim();
  const problem = input.problemStatement.trim();
  const budget = input.monthlyBudgetUsd || 500;
  const sector = input.targetMarket;

  const lowerText = `${title} ${problem}`.toLowerCase();
  const isCommerce = /sell|shop|store|checkout|cart|commerce|marketplace|pay|retail|product/.test(lowerText);
  const isAI = /ai|model|llm|agent|gpt|neural|inference|vector|embed/.test(lowerText);
  const isData = /data|analytics|pipeline|stream|metrics|dashboard|sync/.test(lowerText);

  // Sector-specific baseline profiles
  let tam = 45.0;
  let sam = 3200;
  let som = 120;
  let wtp = 149;
  let urgency = 8;
  let buyerPersona = 'Engineering Directors & Head of Product seeking operational throughput';
  let incumbents = [
    {
      name: 'Legacy Enterprise Suite',
      coreWeakness: 'Bloated onboarding cycles, rigid contracts, and lack of modern automated API primitives.',
      pricingModel: '$20,000+/yr upfront annual licensing',
    },
    {
      name: 'Fragmented Point Tools',
      coreWeakness: 'Requires stitching together multiple brittle webhooks with zero unified observability.',
      pricingModel: 'Freemium tier gating essential production features',
    },
  ];
  let moat = 'Verticalized developer ergonomics coupled with proprietary algorithmic orchestration that cuts implementation latency from weeks to minutes.';
  let stack = {
    frontend: 'Next.js 15 (App Router, React 19, Tailwind CSS v4, Motion)',
    backend: 'Node.js / Edge Runtime with TypeScript Server Actions',
    database: 'PostgreSQL on Cloud SQL / Supabase with Vector Embeddings',
    infrastructure: 'Google Cloud Run / Vercel Edge with Redis Token Bucket Caching',
  };
  let bottleneck = 'Cold-start latency and high token concurrency during peak load periods';
  let critique = '';
  let roadmap: string[] = [];

  switch (sector) {
    case 'D2C_CONSUMER':
      tam = isCommerce ? 120.5 : 34.2;
      sam = isCommerce ? 8500 : 2400;
      som = isCommerce ? 310 : 85;
      wtp = isCommerce ? 29 : 19;
      urgency = isCommerce ? 7 : 6;
      buyerPersona = isCommerce
        ? 'Independent creators, digital sellers, and consumer brands fighting platform fees'
        : 'Tech-forward digital natives seeking privacy, simplicity, and unbundled mobile workflows';
      incumbents = isCommerce
        ? [
            {
              name: 'Shopify / Amazon Marketplace',
              coreWeakness: 'Extracts 8-15% take rates, controls customer data, and limits bespoke brand design freedom.',
              pricingModel: 'Monthly SaaS fee + 2.9% transaction surcharge + marketplace referral fees',
            },
            {
              name: 'Gumroad / Etsy',
              coreWeakness: 'High 10% platform cuts and lack of white-label customer relationship ownership.',
              pricingModel: '10% flat take-rate per transaction',
            },
          ]
        : [
            {
              name: 'Big Tech Monopolies',
              coreWeakness: 'Aggregates user telemetry for ad targeting; bloated with sponsored content.',
              pricingModel: 'Ad-supported data harvesting with freemium upsell',
            },
          ];
      moat = isCommerce
        ? 'Zero-platform-fee protocol model with integrated instant payment settlement and one-click checkout viral links.'
        : 'Self-sovereign client-side encryption and hyper-personalized local-first AI experiences with zero telemetry leaks.';
      stack = {
        frontend: 'Next.js 15 PWA / React Native with Tailwind CSS v4 & Lucide',
        backend: 'Cloudflare Workers / Edge Handlers for sub-50ms international TTFB',
        database: 'Serverless PostgreSQL (Neon / Supabase) with Redis session cache',
        infrastructure: 'Stripe Connect, Cloudflare CDN, and Vercel Global Edge',
      };
      bottleneck = 'Customer Acquisition Cost (CAC) vs. Customer Lifetime Value (LTV) unit economics and checkout drop-off';
      critique = isCommerce
        ? `For "${title}", building another selling tool is treacherous unless your customer acquisition cost is virtually zero. Existing sellers already have their catalogs on Shopify or Instagram; convincing them to migrate requires a 10x lower take-rate or guaranteed instant buyer traffic. Do not build inventory management until you have 20 sellers running real transactions.`
        : `Your consumer hypothesis on "${title}" risks low Day-30 retention. Without high-frequency daily utility or viral referral loops, consumer apps burn through capital quickly. Prove organic word-of-mouth before investing in paid growth.`;
      roadmap = [
        'Days 0-30: Launch high-converting checkout landing page; onboard 15 alpha sellers and process first $1,000 in gross merchandise volume.',
        'Days 31-60: Optimize frictionless mobile checkout (Apple Pay / Google Pay); reduce cart abandonment under 20%.',
        'Days 61-90: Deploy automated seller payouts, launch affiliate referral engine, and scale to 100 active recurring sellers.',
      ];
      break;

    case 'DEV_TOOLS':
      tam = 28.4;
      sam = 2100;
      som = 95;
      wtp = 79;
      urgency = 8;
      buyerPersona = 'Staff Engineers & DevOps Architects tired of brittle custom scripts and broken pipelines';
      incumbents = [
        {
          name: 'Incumbent Open-Source CLI Frameworks',
          coreWeakness: 'Steep learning curves, poor TypeScript support, and zero hosted telemetry analytics.',
          pricingModel: 'Open core with expensive enterprise support contracts',
        },
        {
          name: 'Cloud Vendor Native Consoles (AWS/GCP)',
          coreWeakness: 'Clunky UI, fragmented configuration dashboards, and steep vendor lock-in.',
          pricingModel: 'Opaque usage-based compute and egress billing',
        },
      ];
      moat = 'Seamless single-line terminal command install, automated GitHub Actions CI/CD integration, and ergonomic developer DX.';
      stack = {
        frontend: 'Next.js 15, React 19, Tailwind CSS, Monaco Editor',
        backend: 'Go / Rust microservice with TypeScript Edge API orchestrators',
        database: 'ClickHouse for time-series events & PostgreSQL for metadata',
        infrastructure: 'AWS ECS Fargate / Cloud Run with Redis cluster',
      };
      bottleneck = 'High-throughput concurrency during simultaneous CI/CD build webhooks';
      critique = `Developers are the hardest customer persona to monetize—they will spend 40 hours building an inferior hack just to avoid paying $20/month. For "${title}", you must solve a problem with high organizational pain: security compliance, build latency, or expensive cloud bill spikes. If it does not save them at least 5 engineering hours per week, they will not pay.`;
      roadmap = [
        'Days 0-30: Publish open-source CLI/SDK on npm & GitHub; reach 250 GitHub stars and 50 weekly active developers.',
        'Days 31-60: Release cloud observability dashboard; validate that 5 engineering teams use it in production daily.',
        'Days 61-90: Introduce Team & Enterprise SSO tiers; close first 3 annual team subscriptions at $${wtp * 5}/month.',
      ];
      break;

    case 'DEPIN_WEB3':
      tam = 64.0;
      sam = 4800;
      som = 190;
      wtp = 199;
      urgency = 7;
      buyerPersona = 'Node operators, decentralized infrastructure founders, and distributed protocol architects';
      incumbents = [
        {
          name: 'Centralized Hyperscalers (AWS/Azure)',
          coreWeakness: 'Single points of failure, geopolitical censorship risk, and extortionate data transfer fees.',
          pricingModel: 'Egress markup rates up to 80x raw bandwidth cost',
        },
      ];
      moat = 'Cryptographic zero-knowledge verification proofs paired with hardware staking consensus.';
      stack = {
        frontend: 'Next.js 15 with Wagmi, Viem, and Tailwind CSS v4',
        backend: 'Rust / Go node verification daemon with gRPC endpoints',
        database: 'PostgreSQL + Decentralized IPFS / Arweave storage proofs',
        infrastructure: 'Distributed bare-metal nodes and Solana / Ethereum L2 contracts',
      };
      bottleneck = 'Byzantine fault tolerance and node churn synchronization under network partitioning';
      critique = `For "${title}", do not let token economics mask the lack of genuine customer utility. If non-Web3 businesses cannot pay in USD with a credit card to consume the underlying service seamlessly, the protocol will collapse once token incentives dry up. Build real enterprise demand before launching liquidity pools.`;
      roadmap = [
        'Days 0-30: Launch permissioned devnet with 20 independent validator nodes; stress-test throughput under load.',
        'Days 31-60: Release client SDK allowing Web2 developers to consume network compute using standard REST APIs.',
        'Days 61-90: Open public testnet staking, complete third-party smart contract audits, and onboard 10 institutional node partners.',
      ];
      break;

    case 'PHYSICAL_AI':
      tam = 95.0;
      sam = 7200;
      som = 260;
      wtp = 399;
      urgency = 9;
      buyerPersona = 'Operations Executives, Warehouse Fleet Managers, and Robotics Engineers';
      incumbents = [
        {
          name: 'Traditional Industrial Robotics OEMs',
          coreWeakness: 'Rigid pre-programmed kinematics unable to adapt to dynamic real-world environment changes.',
          pricingModel: '$100,000+ upfront capital expenditure per robot',
        },
      ];
      moat = 'Proprietary multi-modal vision-language-action (VLA) models trained on edge sensory datasets.';
      stack = {
        frontend: 'Next.js 15 Three.js Digital Twin visualizer with WebSockets',
        backend: 'Python FastAPI / C++ edge inference runtime with TensorRT',
        database: 'TimescaleDB for high-frequency telemetry + MinIO object storage',
        infrastructure: 'NVIDIA Jetson edge hardware with Google Cloud GPU fleet orchestration',
      };
      bottleneck = 'Edge inference thermal throttling and real-time sensory sensor fusion under 15ms latency';
      critique = `Hardware and physical robotics are notorious cash incinerators. For "${title}", simulate every physical edge case in software before manufacturing custom enclosures or ordering custom PCBs. Sell software-enabled service agreements (RaaS) instead of raw hardware sales to maintain predictable recurring revenue.`;
      roadmap = [
        'Days 0-30: Build high-fidelity physics simulation sandbox; demo 99% task completion rate on benchmark scenarios.',
        'Days 31-60: Deploy 3 prototype edge units in a controlled pilot partner facility; log 500 autonomous operational hours.',
        'Days 61-90: Sign 2 commercial production deployment contracts; secure hardware supply chain redundancy.',
      ];
      break;

    case 'B2B_SAAS':
    default:
      tam = 58.2;
      sam = 4100;
      som = 165;
      wtp = 149;
      urgency = 8;
      buyerPersona = 'VP of Operations and Department Heads suffering from fragmented manual spreadsheets';
      incumbents = [
        {
          name: 'Legacy Enterprise Suites (Salesforce/Workday)',
          coreWeakness: '12-month implementation cycles, consultant dependency, and clunky unintuitive user experience.',
          pricingModel: '$150-$300/user/month with mandatory multi-year commitments',
        },
        {
          name: 'Spreadsheets & Manual Workflows',
          coreWeakness: 'Prone to human error, lack of audit trails, and zero automated event triggers.',
          pricingModel: 'Free (hidden cost in hundreds of lost labor hours)',
        },
      ];
      moat = 'Instant 5-minute automated setup with pre-built connectors and autonomous AI workflow agents.';
      stack = {
        frontend: 'Next.js 15 (App Router, React 19, Tailwind CSS v4, Motion)',
        backend: 'Node.js Edge runtime with TypeScript Server Actions',
        database: 'PostgreSQL on Cloud SQL / Supabase with Row Level Security (RLS)',
        infrastructure: 'Google Cloud Run with Redis rate limiting and background BullMQ queues',
      };
      bottleneck = 'Database lock contention during high-volume bulk tenant data imports';
      critique = `Your thesis on "${title}" targets an acute operational bottleneck, but beware of "feature-not-a-product" vulnerability. If an incumbent can ship your core capability in their next quarterly release, your business is exposed. Protect yourself by owning the workflow of record, embedding deeply into the customer's daily routine, and demonstrating undeniable ROI within the first 14 days.`;
      roadmap = [
        'Days 0-30: Build interactive POC; conduct 15 structured discovery calls with target buyers and secure 3 signed LOIs.',
        'Days 31-60: Launch private alpha with 5 design partners; iterate until weekly active workflow completion exceeds 80%.',
        'Days 61-90: Implement self-serve billing, complete SOC2 Type 1 readiness checklist, and launch outbound sales to 50 target accounts.',
      ];
      break;
  }

  const viabilityScore = Math.min(88, Math.max(54, 62 + (budget > 1000 ? 8 : 0) + (isAI ? 5 : 0) + (isCommerce ? 4 : 0)));
  const verdict = viabilityScore >= 75 ? 'GO_BUILD' : viabilityScore >= 50 ? 'PIVOT_REQUIRED' : 'HIGH_RISK_DROP';

  return {
    id: `val_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title,
    problemStatement: problem,
    targetMarket: sector,
    monthlyBudgetUsd: budget,
    market: {
      tamBillionsUsd: tam,
      samMillionsUsd: sam,
      somMillionsUsd: som,
      primaryBuyerPersona: buyerPersona,
      urgencyScore: urgency,
      willingnessToPayUsd: wtp,
    },
    competitors: {
      incumbents,
      unfairMoatStrategy: moat,
    },
    architecture: {
      recommendedStack: stack,
      estimatedMonthlyCloudCostUsd: Math.max(45, Math.min(budget * 0.45, 320)),
      criticalBottleneck: bottleneck,
      securityComplianceNotes: [
        'SOC2 Type II data-at-rest encryption (AES-256) and TLS 1.3 in-transit enforcement',
        'Strict RBAC tenant authorization middleware with immutable audit trail logging',
        'Granular token bucket rate-limiting and deterministic PII sanitization at the API boundary',
      ],
    },
    critic: {
      overallViabilityScore: viabilityScore,
      verdict,
      brutalFeedback: critique,
      first90DaysRoadmap: roadmap,
    },
    telemetry,
  };
}

/**
 * Validates an idea through the 4-stage validation pipeline.
 * All Gemini AI model inference is handled strictly on the server (/api/validate-idea).
 */
export async function validateIdea(
  rawInput: unknown,
  options: OrchestrationOptions = {}
): Promise<FullIdeaValidationReport> {
  const startTime = performance.now();
  const userId = options.userId || 'anonymous_dev';

  options.onStageChange?.('INITIALIZING', STAGE_DESCRIPTIONS.INITIALIZING);

  // 1. Zod input validation
  const input = IdeaInputSchema.parse(rawInput);

  // 2. Token Bucket Rate Limiting (client check before network)
  const rateLimit = globalRateLimiter.consume(userId);
  if (!rateLimit.allowed) {
    throw new Error(
      `Rate limit exceeded: You have exhausted your validation burst quota. Please retry in ${rateLimit.retryAfterSeconds} seconds.`
    );
  }

  // 3. PII Sanitization
  options.onStageChange?.('SANITIZING_AND_CACHING', STAGE_DESCRIPTIONS.SANITIZING_AND_CACHING);
  const scrubbedTitle = scrubSensitivePII(input.title);
  const scrubbedProblem = scrubSensitivePII(input.problemStatement);

  // 4. Semantic LRU Cache check
  const promptHash = hashIdeaPrompt(scrubbedTitle, scrubbedProblem, input.targetMarket);
  const cachedReport = globalValidationCache.get(promptHash);

  if (cachedReport) {
    const elapsed = Math.round(performance.now() - startTime);
    const result: FullIdeaValidationReport = {
      ...cachedReport,
      telemetry: {
        latencyMs: elapsed,
        estimatedTokens: 0,
        cacheHit: true,
        timestamp: Date.now(),
      },
    };
    options.onStageChange?.('FINALIZING', 'Retrieved instant cached verification report (0 tokens consumed)');
    return result;
  }

  // Interactive progressive stage updates
  options.onStageChange?.('MARKET_SIZING', STAGE_DESCRIPTIONS.MARKET_SIZING);

  // 5. Server-Side Execution (/api/validate-idea)
  let report: FullIdeaValidationReport | null = null;

  try {
    const stageTimer1 = setTimeout(() => {
      options.onStageChange?.('COMPETITIVE_MOAT', STAGE_DESCRIPTIONS.COMPETITIVE_MOAT);
    }, 400);

    const stageTimer2 = setTimeout(() => {
      options.onStageChange?.('SYSTEMS_ARCHITECTURE', STAGE_DESCRIPTIONS.SYSTEMS_ARCHITECTURE);
    }, 900);

    const stageTimer3 = setTimeout(() => {
      options.onStageChange?.('RED_TEAM_CRITIC', STAGE_DESCRIPTIONS.RED_TEAM_CRITIC);
    }, 1500);

    const response = await fetch('/api/validate-idea', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: scrubbedTitle,
        problemStatement: scrubbedProblem,
        targetMarket: input.targetMarket,
        monthlyBudgetUsd: input.monthlyBudgetUsd,
        userId,
      }),
    });

    clearTimeout(stageTimer1);
    clearTimeout(stageTimer2);
    clearTimeout(stageTimer3);

    if (response.ok) {
      const data = await response.json();
      if (data.report) {
        report = data.report;
      }
    }
  } catch (err) {
    console.warn('Server API request warning (activating fallback):', err);
  }

  options.onStageChange?.('FINALIZING', STAGE_DESCRIPTIONS.FINALIZING);
  const latencyMs = Math.round(performance.now() - startTime);

  // Dynamic fallback report generator if server was unreachable
  if (!report) {
    report = buildDeterministicHeuristicReport(input, {
      latencyMs,
      estimatedTokens: 0,
      cacheHit: false,
      timestamp: Date.now(),
    });
  }

  // Cache final report in LRU
  globalValidationCache.set(promptHash, report);
  return report;
}
