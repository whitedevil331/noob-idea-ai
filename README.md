# Noob Idea AI — Venture & Cloud Systems Validation Engine

[![Architecture: Multi-Agent](https://img.shields.io/badge/Architecture-4--Stage%20Multi--Agent-emerald)](https://github.com)
[![Validation: Zod Strict](https://img.shields.io/badge/Contracts-Zod%20Strict-blue)](https://zod.dev)
[![Cache: LRU Semantic](https://img.shields.io/badge/Cache-Deterministic%20LRU-purple)](https://github.com)
[![Security: Token Bucket](https://img.shields.io/badge/Security-Token%20Bucket%20Rate--Limiter-amber)](https://github.com)
[![Tests: Vitest](https://img.shields.io/badge/Tests-Vitest%2013%20Passed-brightgreen)](https://vitest.dev)

An enterprise-grade, deterministic venture and cloud systems architecture validation engine. It takes an early-stage startup hypothesis or technical specification and executes a **4-stage multi-agent red-team pipeline** that produces quantitative market sizing, incumbent vulnerability analysis, production cloud stack recommendations with GPU FinOps estimations, and a tactical 90-day execution roadmap—exportable directly as an **Architecture Decision Record (ADR-001)**.

---

## 1. System Architecture Diagram

```mermaid
flowchart TD
    Client["Client Studio UI (Next.js 15 + React 19)"]
    Auth["Firebase Auth (Google OAuth / Magic Key)"]
    RateLimiter["TokenBucketRateLimiter (Per-user burst quota)"]
    PIIScrubber["PII Redaction Engine (Email & Phone Scrubbing)"]
    LRU["Deterministic LRU Cache (FNV-1a Prompt Hashing)"]
    Orchestrator["Hybrid 4-Stage Multi-Agent Orchestrator"]
    ServerRoute["/api/validate-idea (Edge Server Runtime)"]
    GeminiModel["Gemini 2.5 Flash (Structured JSON Mode)"]
    ZodValidator["Zod Schema Contract Validator"]
    FirestoreStore["Firestore (users/{uid}/validations/{id})"]
    LocalFallback["LocalStorage Resilient Fallback"]
    ADRExport["ADR-001 (.md) Markdown Generator"]

    Client -->|User Trigger| Auth
    Auth --> RateLimiter
    RateLimiter -->|Pass (Tokens Available)| PIIScrubber
    RateLimiter -->|Quota Exceeded| Client

    PIIScrubber --> LRU
    LRU -->|Cache Hit (<5ms)| Client
    LRU -->|Cache Miss| Orchestrator

    Orchestrator -->|Attempt 1: Server Route| ServerRoute
    ServerRoute -->|GoogleGenAI SDK| GeminiModel
    Orchestrator -.->|Attempt 2: Client SDK Fallback| GeminiModel
    Orchestrator -.->|Attempt 3: Heuristic Fallback| ZodValidator

    GeminiModel --> ZodValidator
    ZodValidator -->|Validated Report| LRU
    ZodValidator --> FirestoreStore
    ZodValidator --> LocalFallback
    ZodValidator --> Client
    Client --> ADRExport
```

---

## 2. The 4-Stage Multi-Agent Pipeline

1. **Stage 1: Market Sizing Agent**
   - Synthesizes Total Addressable Market (TAM in $B), Serviceable Addressable Market (SAM in $M), and Serviceable Obtainable Market (SOM in $M).
   - Identifies the exact primary buyer profile, pain vector, and urgency score (1–10).
   - Computes realistic monthly Willingness-to-Pay (WTP) per unit/account.

2. **Stage 2: Competitive Moat Agent**
   - Benchmarks 2–3 dominant incumbents or legacy enterprise alternatives.
   - Diagnoses core structural weaknesses and incumbent monetization models.
   - Engineers an asymmetric, defensible unfair moat strategy (e.g., workflow lock-in, open-source distribution wedge).

3. **Stage 3: Systems Architecture & Cloud FinOps Agent**
   - Designs a production-ready stack (Frontend, Backend, Database, Cloud/GPU Infrastructure).
   - Estimates realistic monthly cloud run-rate matching initial launch workloads.
   - Exposes the single most critical engineering or scalability bottleneck.
   - Enforces SOC2, AES-256 encryption, RBAC, and data compliance guardrails.

4. **Stage 4: Red-Team Critic Agent**
   - Assigns a composite Viability Index (0–100).
   - Issues a hard verdict: `GO_BUILD` (>=75), `PIVOT_REQUIRED` (45–74), or `HIGH_RISK_DROP` (<45).
   - Delivers an unfiltered red-team critique exposing fatal assumptions and vanity metrics.
   - Outlines a tactical 3-phase First 90 Days Execution Roadmap (Days 0-30, 31-60, 61-90).

---

## 3. Engineering Trade-offs & Design Decisions

### A. Deterministic Zod Data Contracts
- **Trade-off**: Slightly higher prompt engineering constraints vs. guaranteed application reliability.
- **Decision**: Strict Zod schemas (`src/lib/schemas/validationSchema.ts`) validate all inputs and LLM outputs at the API and client boundary. Malformed JSON or hallucinated fields are caught and recovered before UI rendering.

### B. Algorithmic Token Bucket Rate Limiting
- **Trade-off**: In-memory state per node vs. distributed Redis overhead.
- **Decision**: Implemented `TokenBucketRateLimiter` (`src/lib/security/rateLimiter.ts`) supporting continuous mathematical refill (`elapsedSeconds * refillRatePerSecond`), isolating burst capacity per user to prevent API abuse without adding heavy Redis dependencies for single-instance or edge setups.

### C. Normalized LRU Prompt-Hash Semantic Caching
- **Trade-off**: Memory footprint vs. zero-cost duplicate queries.
- **Decision**: Normalized FNV-1a prompt hashing (`hashIdeaPrompt`) indexes identical hypotheses regardless of spacing or casing. Cache hits return in `<5ms` with 0 token consumption.

### D. Hybrid Resilient AI Orchestrator
- **Trade-off**: Client-side fallback vs. strict server-only execution.
- **Decision**: Attempts server-side `/api/validate-idea` route first. If server environment variables or network routes are unreachable, seamlessly transitions to client-side GoogleGenAI SDK with configured keys, and ultimately provides a deterministic heuristic baseline. **Button clicks never fail or throw unhandled exceptions.**

### E. Dual Firestore + LocalStorage Persistence
- **Trade-off**: Eventual consistency vs. offline user experience.
- **Decision**: Automatically dual-writes completed reports to `users/{uid}/validations/{id}` in Firestore and browser `localStorage`. Offline builders or users without full Firestore permissions retain 100% of their workspace runs.

---

## 4. CLI Commands & Verification

### Development Server
```bash
npm run dev
# Starts Next.js 15 dev server on http://localhost:3000
```

### Automated Vitest Suite
```bash
npx vitest run
# Executes 13 unit tests covering Token Bucket math, LRU eviction, PII scrubbing, and Zod contracts
```

### Production Build
```bash
npm run build
# Compiles Next.js production bundle with strict TypeScript verification
```

---

## 5. Artifacts & Decision Records
Every completed validation run includes a one-click **"Export ADR (.md)"** button generating an industry-standard Architecture Decision Record (`ADR-001.md`) formatted for Y Combinator applications, angel investor audits, and internal engineering reviews.

## GitHub Remote & Deployment
- To push to GitHub: `git remote add origin https://github.com/<username>/<repo>.git` followed by `git push -u origin main`.
