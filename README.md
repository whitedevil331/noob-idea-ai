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
graph TD
    Client["Client Studio UI (Next.js 15 + React 19)"]
    Auth["Firebase Auth (Google OAuth / Magic Key)"]
    RateLimiter["TokenBucket RateLimiter"]
    PIIScrubber["PII Redaction Engine"]
    LRU["Deterministic LRU Cache"]
    Orchestrator["Hybrid 4-Stage Multi-Agent Orchestrator"]
    ServerRoute["/api/validate-idea Route"]
    GeminiModel["Gemini 2.5 Flash"]
    ZodValidator["Zod Schema Contract Validator"]
    FirestoreStore["Firestore Document Store"]
    LocalFallback["LocalStorage Fallback"]
    ADRExport["ADR-001 Markdown Exporter"]

    Client --> Auth
    Auth --> RateLimiter
    RateLimiter -- "Tokens Available" --> PIIScrubber
    RateLimiter -- "Quota Exceeded" --> Client

    PIIScrubber --> LRU
    LRU -- "Cache Hit (under 5ms)" --> Client
    LRU -- "Cache Miss" --> Orchestrator

    Orchestrator --> ServerRoute
    ServerRoute --> GeminiModel
    Orchestrator -.-> GeminiModel
    Orchestrator -.-> ZodValidator

    GeminiModel --> ZodValidator
    ZodValidator -- "Validated Report" --> LRU
    ZodValidator --> FirestoreStore
    ZodValidator --> LocalFallback
    ZodValidator --> Client
    Client --> ADRExport
```

```text
+---------------------------------------------------------------------------------------+
|                                    CLIENT STUDIO UI                                   |
|                          (Next.js 15, React 19, Tailwind CSS)                         |
+-------------------------------------------+-------------------------------------------+
                                            |
                                            v
+---------------------------------------------------------------------------------------+
|                                   SECURITY MIDDLEWARE                                 |
|  [Firebase Auth]  -->  [TokenBucketRateLimiter]  -->  [PII Redactor]  --> [LRU Cache] |
+-------------------------------------------+-------------------------------------------+
                                            | (Cache Miss)
                                            v
+---------------------------------------------------------------------------------------+
|                            4-STAGE MULTI-AGENT ORCHESTRATOR                           |
|  Stage 1: Market Sizing        | Stage 2: Competitive Moat & Incumbents               |
|  Stage 3: Systems Architecture | Stage 4: Red-Team Critic & 90-Day Execution Sprints  |
+-------------------------------------------+-------------------------------------------+
                                            |
                                            v
+---------------------------------------------------------------------------------------+
|                         LLM ENGINE & DETERMINISTIC CONTRACTS                          |
|      [/api/validate-idea Proxy]  <-->  [Gemini 2.5 Flash]  -->  [Zod Validation]      |
+-------------------------------------------+-------------------------------------------+
                                            |
                                            v
+---------------------------------------------------------------------------------------+
|                                   PERSISTENCE LAYER                                   |
|   [Firestore: users/{uid}/validations]  <-->  [LocalStorage Resilient Fallback Cache] |
|   [Architecture Decision Record (ADR-001) Markdown Download Engine]                   |
+---------------------------------------------------------------------------------------+
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


