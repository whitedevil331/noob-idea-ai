import { Firestore, doc, setDoc, getDocs, deleteDoc, collection, query, orderBy } from 'firebase/firestore';
import { FullIdeaValidationReport } from '../schemas/validationSchema';

const LOCAL_STORAGE_KEY = 'noob_idea_validations_history';

/**
 * Reads local storage validation history safely.
 */
function getLocalReports(): FullIdeaValidationReport[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to parse local storage validation reports:', err);
    return [];
  }
}

/**
 * Writes local storage validation history safely.
 */
function setLocalReports(reports: FullIdeaValidationReport[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reports));
  } catch (err) {
    console.warn('Failed to write to local storage:', err);
  }
}

/**
 * Saves a validated report to Firestore under users/{userId}/validations/{report.id}
 * with guaranteed automatic fallback to localStorage.
 */
export async function saveValidationReport(
  report: FullIdeaValidationReport,
  userId?: string | null,
  firestore?: Firestore | null
): Promise<{ savedToFirestore: boolean; savedToLocal: boolean }> {
  let savedToLocal = false;
  let savedToFirestore = false;

  // 1. Always save to LocalStorage first for instant persistence
  try {
    const existing = getLocalReports();
    const filtered = existing.filter((item) => item.id !== report.id);
    setLocalReports([report, ...filtered]);
    savedToLocal = true;
  } catch (err) {
    console.warn('LocalStorage save failed:', err);
  }

  // 2. Persist to Firestore if authenticated and instance is ready
  if (firestore && userId && report.id) {
    try {
      const docRef = doc(firestore, 'users', userId, 'validations', report.id);
      await setDoc(docRef, {
        ...report,
        updatedAt: Date.now(),
      });
      savedToFirestore = true;
    } catch (firestoreErr) {
      console.warn('Firestore persistence error (continuing with local cache):', firestoreErr);
    }
  }

  return { savedToFirestore, savedToLocal };
}

/**
 * Loads all validation reports, merging Firestore records with localStorage.
 */
export async function loadValidationReports(
  userId?: string | null,
  firestore?: Firestore | null
): Promise<FullIdeaValidationReport[]> {
  const localList = getLocalReports();
  const reportMap = new Map<string, FullIdeaValidationReport>();

  // Add local items
  localList.forEach((r) => {
    if (r && r.id) reportMap.set(r.id, r);
  });

  // Attempt Firestore load
  if (firestore && userId) {
    try {
      const collRef = collection(firestore, 'users', userId, 'validations');
      const q = query(collRef, orderBy('telemetry.timestamp', 'desc'));
      const snapshot = await getDocs(q);

      snapshot.forEach((d) => {
        const data = d.data() as FullIdeaValidationReport;
        if (data && data.id) {
          reportMap.set(data.id, data);
        }
      });
    } catch (err) {
      console.warn('Could not query Firestore, defaulting to local persistence:', err);
    }
  }

  // Convert map to sorted array (newest first)
  const merged = Array.from(reportMap.values());
  merged.sort((a, b) => (b.telemetry?.timestamp || 0) - (a.telemetry?.timestamp || 0));
  return merged;
}

/**
 * Deletes a validation report by ID from both Firestore and LocalStorage.
 */
export async function deleteValidationReport(
  validationId: string,
  userId?: string | null,
  firestore?: Firestore | null
): Promise<void> {
  // 1. Delete from local storage
  const current = getLocalReports();
  const updated = current.filter((r) => r.id !== validationId);
  setLocalReports(updated);

  // 2. Delete from Firestore if present
  if (firestore && userId) {
    try {
      const docRef = doc(firestore, 'users', userId, 'validations', validationId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Failed to delete from Firestore:', err);
    }
  }
}

/**
 * Generates a formatted Architecture Decision Record (ADR) in Markdown.
 */
export function generateAdrMarkdown(report: FullIdeaValidationReport): string {
  const dateStr = new Date(report.telemetry?.timestamp || Date.now()).toISOString().split('T')[0];
  const verdictStatus =
    report.critic.verdict === 'GO_BUILD'
      ? 'ACCEPTED (Proceed to Build)'
      : report.critic.verdict === 'PIVOT_REQUIRED'
      ? 'PROPOSED (Conditional Pivot Required)'
      : 'REJECTED (High Risk Drop)';

  return `# ADR-001: Venture Hypothesis & Architecture Validation
## ${report.title}

- **Status**: ${verdictStatus}
- **Date**: ${dateStr}
- **Sector**: ${report.targetMarket}
- **Viability Index**: ${report.critic.overallViabilityScore}/100
- **Infra Target Run-rate**: $${report.monthlyBudgetUsd} USD / month

---

## 1. Problem Statement & Venture Thesis
${report.problemStatement}

---

## 2. Market Sizing & Buyer Persona
- **Total Addressable Market (TAM)**: $${report.market.tamBillionsUsd}B USD
- **Serviceable Addressable Market (SAM)**: $${report.market.samMillionsUsd}M USD
- **Serviceable Obtainable Market (SOM)**: $${report.market.somMillionsUsd}M USD
- **Primary Buyer Persona**: ${report.market.primaryBuyerPersona}
- **Pain Urgency Score**: ${report.market.urgencyScore} / 10
- **Estimated Willingness to Pay**: $${report.market.willingnessToPayUsd} USD / user / month

---

## 3. Competitive Landscape & Unfair Defensibility Moat
### Incumbents Analysis:
${report.competitors.incumbents
  .map(
    (inc, i) => `#### ${i + 1}. ${inc.name}
- **Core Weakness**: ${inc.coreWeakness}
- **Incumbent Pricing**: ${inc.pricingModel}
`
  )
  .join('\n')}

### Unfair Moat Strategy:
> ${report.competitors.unfairMoatStrategy}

---

## 4. Systems Architecture & Cloud FinOps
- **Frontend Stack**: ${report.architecture.recommendedStack.frontend}
- **Backend Stack**: ${report.architecture.recommendedStack.backend}
- **Database Layer**: ${report.architecture.recommendedStack.database}
- **Infrastructure / Cloud Runtime**: ${report.architecture.recommendedStack.infrastructure}
- **Estimated Cloud FinOps Cost**: ~$${report.architecture.estimatedMonthlyCloudCostUsd} USD / month
- **Critical Scalability Bottleneck**:
  - *${report.architecture.criticalBottleneck}*

### Security & Compliance Guardrails:
${report.architecture.securityComplianceNotes.map((note) => `- ${note}`).join('\n')}

---

## 5. Red-Team Critic Audit & Verdict
**Verdict**: \`${report.critic.verdict}\` (${report.critic.overallViabilityScore}/100)

### Unfiltered Red-Team Feedback:
> "${report.critic.brutalFeedback}"

### Tactical First 90 Days Execution Roadmap:
${report.critic.first90DaysRoadmap.map((step, idx) => `${idx + 1}. ${step}`).join('\n')}

---

## 6. Execution Telemetry
- **Engine Latency**: ${report.telemetry?.latencyMs || 0}ms
- **Token Consumption**: ${report.telemetry?.estimatedTokens || 0} tokens
- **Semantic Cache Hit**: ${report.telemetry?.cacheHit ? 'YES (0 tokens consumed)' : 'NO'}
- **Validation ID**: \`${report.id || 'N/A'}\`

*Generated by Noob Idea AI - Principal Venture & Systems Architecture Engine*
`;
}

/**
 * Triggers a client-side download of the ADR Markdown file.
 */
export function downloadAdrFile(report: FullIdeaValidationReport): void {
  if (typeof window === 'undefined') return;
  const content = generateAdrMarkdown(report);
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeTitle = report.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  link.href = url;
  link.download = `ADR-${safeTitle}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
