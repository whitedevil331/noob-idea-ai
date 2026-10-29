'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut,
} from 'firebase/auth';
import {
  FullIdeaValidationReport,
  IdeaInput,
  TargetMarket,
  Verdict,
} from '@/lib/schemas/validationSchema';
import {
  validateIdea,
  ValidationStage,
} from '@/lib/engine/validationOrchestrator';
import {
  saveValidationReport,
  loadValidationReports,
  deleteValidationReport,
  downloadAdrFile,
} from '@/lib/firebase/validationStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sparkles,
  Zap,
  Activity,
  Layers,
  Download,
  Trash2,
  LogIn,
  LogOut,
  Key,
  Database,
  Server,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  Search,
  Code2,
  Flame,
  ShieldCheck,
  ShieldAlert,
  Cpu,
} from 'lucide-react';

interface PresetTemplate {
  name: string;
  tag: string;
  input: IdeaInput;
}

const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    name: 'VectorMesh Edge Embeddings',
    tag: 'DEV_TOOLS',
    input: {
      title: 'VectorMesh Edge Embedding Engine',
      problemStatement:
        'Developers deploying local AI agents struggle with 200ms+ inference cold-starts and high memory footprints when running multi-modal embeddings across distributed client edge devices.',
      targetMarket: 'DEV_TOOLS',
      monthlyBudgetUsd: 850,
    },
  },
  {
    name: 'Autonomous Drone DePIN',
    tag: 'PHYSICAL_AI',
    input: {
      title: 'AeroGrid Autonomous Drone Delivery Network',
      problemStatement:
        'Last-mile logistics in suburban corridors suffers from 45-minute delivery delays and high vehicular carbon emissions without localized automated rooftop recharge and package handoff nodes.',
      targetMarket: 'PHYSICAL_AI',
      monthlyBudgetUsd: 2500,
    },
  },
  {
    name: 'Cloud FinOps Autopilot',
    tag: 'B2B_SAAS',
    input: {
      title: 'KubeSqueeze Autonomous Cloud FinOps Agent',
      problemStatement:
        'Mid-market engineering teams routinely overpay 35-40% on Kubernetes cluster node pools and multi-cloud data egress fees because existing static monitoring alerts fail to actively right-size workloads at runtime.',
      targetMarket: 'B2B_SAAS',
      monthlyBudgetUsd: 1200,
    },
  },
  {
    name: 'Encrypted Health Ledger',
    tag: 'D2C_CONSUMER',
    input: {
      title: 'PulseZero Local-First Health Telemetry Vault',
      problemStatement:
        'Consumers have their wearable biometric telemetry monetized by proprietary health platforms without end-to-end homomorphic encryption or self-sovereign cryptographic consent controls.',
      targetMarket: 'D2C_CONSUMER',
      monthlyBudgetUsd: 400,
    },
  },
];

export default function IdeaValidatorDashboard() {
  const { auth, firestore, user } = useFirebase();

  // Form State
  const [title, setTitle] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [targetMarket, setTargetMarket] = useState<TargetMarket>('B2B_SAAS');
  const [monthlyBudgetUsd, setMonthlyBudgetUsd] = useState<number>(650);

  // Execution & Progress State
  const [isValidating, setIsValidating] = useState(false);
  const [currentStage, setCurrentStage] = useState<ValidationStage>('INITIALIZING');
  const [stageDescription, setStageDescription] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reports & History State
  const [activeReport, setActiveReport] = useState<FullIdeaValidationReport | null>(null);
  const [savedReports, setSavedReports] = useState<FullIdeaValidationReport[]>([]);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [searchFilter, setSearchFilter] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    loadValidationReports(user?.uid, firestore).then((reports) => {
      setSavedReports(reports);
      setActiveReport((prev) => prev || (reports.length > 0 ? reports[0] : null));
    });
  }, [user?.uid, firestore]);

  const handleApplyPreset = (preset: PresetTemplate) => {
    setTitle(preset.input.title);
    setProblemStatement(preset.input.problemStatement);
    setTargetMarket(preset.input.targetMarket);
    setMonthlyBudgetUsd(preset.input.monthlyBudgetUsd);
    setErrorMessage(null);
  };

  const handleRunValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsValidating(true);
    setCurrentStage('INITIALIZING');
    setStageDescription('Initializing multi-agent pipeline and token bucket checks...');

    try {
      const input: IdeaInput = {
        title,
        problemStatement,
        targetMarket,
        monthlyBudgetUsd,
      };

      const report = await validateIdea(
        input,
        user?.uid || 'guest-session',
        (stage, description) => {
          setCurrentStage(stage);
          setStageDescription(description);
        }
      );

      setActiveReport(report);

      // Save report via Firebase with local fallback
      await saveValidationReport(report, user?.uid, firestore);

      // Refresh list
      const updated = await loadValidationReports(user?.uid, firestore);
      setSavedReports(updated);
    } catch (err: any) {
      console.error('Validation failure:', err);
      setErrorMessage(err.message || 'Validation failed. Please check inputs and retry.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleDeleteReport = async (e: React.MouseEvent, reportId: string) => {
    e.stopPropagation();
    try {
      await deleteValidationReport(reportId, user?.uid, firestore);
      const updated = await loadValidationReports(user?.uid, firestore);
      setSavedReports(updated);
      if (activeReport?.id === reportId) {
        setActiveReport(updated.length > 0 ? updated[0] : null);
      }
    } catch (err) {
      console.error('Failed to delete report:', err);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Google sign in failed:', err);
      setAuthError(err.message || 'Google Sign-in failed. Please retry.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    if (!auth) return;
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      console.error('Anonymous sign-in failed:', err);
      setAuthError(err.message || 'Guest login failed.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const filteredReports = savedReports.filter((r) =>
    r.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
    r.targetMarket.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const getVerdictBadge = (verdict?: Verdict) => {
    switch (verdict) {
      case 'GO_BUILD':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            GO_BUILD (APPROVED)
          </span>
        );
      case 'PIVOT_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            PIVOT_REQUIRED (CONDITIONAL)
          </span>
        );
      case 'HIGH_RISK_DROP':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-300">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            HIGH_RISK_DROP (REJECTED)
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-sans">
      {/* Studio Header Bar */}
      <header className="border-b border-slate-200/80 bg-white/85 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-amber-500/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-lg text-slate-900">
                Noob Idea <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-600 font-extrabold">AI</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                Studio v2.4
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Turn Simple Sparks into Giants · Deterministic 4-Stage Multi-Agent Studio
            </p>
          </div>
        </div>

        {/* Auth status & actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-800">
                  {user.displayName || (user.isAnonymous ? 'Guest Architect' : user.email?.split('@')[0])}
                </p>
                <p className="text-[11px] text-slate-500 truncate max-w-[150px]">
                  {user.email || 'Anonymous Session'}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-colors flex items-center gap-1.5"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Google Sign-In</span>
              </button>
              <button
                onClick={handleAnonymousSignIn}
                disabled={isSigningIn}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-colors hidden sm:flex items-center gap-1.5"
                title="Instant Anonymous Key"
              >
                <Key className="w-3.5 h-3.5 text-slate-500" />
                <span>Magic Key</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Studio Workspace Grid */}
      <div className="flex-1 max-w-[1680px] w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT PANEL: Venture Specification & Workspace History (Cols 1-5) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Preset Quick Load Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Quick-Load Architecture Presets
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_TEMPLATES.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handleApplyPreset(preset)}
                  className="p-2.5 text-left rounded-xl bg-slate-50/80 hover:bg-amber-50/60 border border-slate-200/80 hover:border-amber-300 transition-all text-xs group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
                      {preset.tag}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-amber-700 transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <div className="font-semibold text-slate-800 group-hover:text-amber-950 truncate mt-1.5">
                    {preset.name}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Venture Specification Form */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Venture Hypothesis Specification
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Zod Contract v1.2</span>
            </div>

            <form onSubmit={handleRunValidation} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Venture Title / Product Codename <span className="text-amber-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VectorMesh Edge Embedding Engine"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm text-slate-900 placeholder:text-slate-400 transition-all"
                />
              </div>

              {/* Target Market Sector & Monthly Budget */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Target Sector <span className="text-amber-600">*</span>
                  </label>
                  <select
                    value={targetMarket}
                    onChange={(e) => setTargetMarket(e.target.value as TargetMarket)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-xs font-mono text-slate-800 transition-all"
                  >
                    <option value="B2B_SAAS">B2B_SAAS</option>
                    <option value="DEV_TOOLS">DEV_TOOLS</option>
                    <option value="PHYSICAL_AI">PHYSICAL_AI</option>
                    <option value="DEPIN_WEB3">DEPIN_WEB3</option>
                    <option value="D2C_CONSUMER">D2C_CONSUMER</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Monthly Infra Run-rate ($USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">$</span>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={monthlyBudgetUsd}
                      onChange={(e) => setMonthlyBudgetUsd(Number(e.target.value))}
                      className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-xs font-mono text-slate-800 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Problem Statement & Architecture */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-700">
                    Problem & Technical Thesis <span className="text-amber-600">*</span>
                  </label>
                  <span className={`text-[10px] font-mono ${problemStatement.length >= 20 ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>
                    {problemStatement.length}/20 min chars
                  </span>
                </div>
                <textarea
                  required
                  rows={4}
                  placeholder="Detail the critical operational inefficiency, technical bottleneck, or proprietary wedge (minimum 20 characters)..."
                  value={problemStatement}
                  onChange={(e) => setProblemStatement(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm text-slate-900 placeholder:text-slate-400 transition-all resize-none"
                />
              </div>

              {/* Error Callout */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>{errorMessage}</div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isValidating || title.trim().length < 3 || problemStatement.trim().length < 20}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-md shadow-amber-500/25 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isValidating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Executing 4-Stage Multi-Agent Engine...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-slate-950" />
                    <span>Run 4-Stage Multi-Agent Validation</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Saved Workspace Runs */}
          <div className="flex-1 p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Workspace Validations ({savedReports.length})
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Firestore + Local</span>
            </div>

            {/* Filter Search */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filter by venture or sector..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* List */}
            <div className="space-y-2 overflow-y-auto max-h-[360px] pr-1">
              {filteredReports.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No saved validation records found. Run a validation or apply a preset template.
                </div>
              ) : (
                filteredReports.map((report) => {
                  const isSelected = activeReport?.id === report.id;
                  const dateStr = new Date(report.telemetry?.timestamp || Date.now()).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <div
                      key={report.id}
                      onClick={() => setActiveReport(report)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between group ${
                        isSelected
                          ? 'bg-amber-50/80 border-amber-400/90 shadow-xs'
                          : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200/80'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                            {report.targetMarket}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {dateStr}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-amber-900 transition-colors">
                          {report.title}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg border ${
                            report.critic.overallViabilityScore >= 75
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : report.critic.overallViabilityScore >= 45
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}
                        >
                          {report.critic.overallViabilityScore}/100
                        </span>

                        <button
                          onClick={(e) => handleDeleteReport(e, report.id)}
                          className="p-1 rounded hover:bg-white text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete validation record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Live Stage Pipeline & Interactive Report Studio (Cols 6-12) */}
        <div className="lg:col-span-7 flex flex-col gap-6">

          {/* Live Progress Stage Card (When Validating) */}
          {isValidating && (
            <div className="p-6 rounded-2xl bg-white border-2 border-amber-400 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-2">
                  <Activity className="w-4 h-4 animate-spin text-amber-600" /> Live Pipeline Execution
                </span>
                <span className="text-xs font-mono text-slate-600 font-semibold">
                  Stage: {currentStage}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3 border border-slate-200">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                  style={{
                    width:
                      currentStage === 'INITIALIZING'
                        ? '15%'
                        : currentStage === 'SANITIZING_AND_CACHING'
                        ? '30%'
                        : currentStage === 'MARKET_SIZING'
                        ? '50%'
                        : currentStage === 'COMPETITIVE_MOAT'
                        ? '70%'
                        : currentStage === 'SYSTEMS_ARCHITECTURE'
                        ? '85%'
                        : '100%',
                  }}
                />
              </div>

              <p className="text-xs text-slate-700 font-medium">
                {stageDescription || 'Processing validation payload...'}
              </p>
            </div>
          )}

          {/* Active Validation Report Display */}
          {activeReport ? (
            <div className="flex-1 flex flex-col gap-5">
              
              {/* Studio Telemetry & Verdict Banner */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                        {activeReport.targetMarket}
                      </span>
                      {getVerdictBadge(activeReport.critic.verdict)}
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                      {activeReport.title}
                    </h1>
                  </div>

                  {/* Viability Score Dial & ADR Export */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-3xl font-mono font-black text-slate-900 tracking-tight">
                        {activeReport.critic.overallViabilityScore}
                        <span className="text-sm text-slate-400 font-normal">/100</span>
                      </div>
                      <div className="text-[10px] font-mono uppercase text-slate-500">
                        Viability Index
                      </div>
                    </div>

                    <button
                      onClick={() => downloadAdrFile(activeReport)}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-semibold shadow-xs transition-all flex items-center gap-2 active:scale-95"
                      title="Download Architecture Decision Record (.md)"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      <span>Export ADR (.md)</span>
                    </button>
                  </div>
                </div>

                {/* Telemetry Row - Clean unboxed text with bullets */}
                <div className="mt-3.5 flex items-center gap-4 flex-wrap text-xs font-mono text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Latency: {activeReport.telemetry?.latencyMs || 0}ms</span>
                  </div>
                  <span className="text-slate-300">·</span>
                  <div className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-sky-600" />
                    <span>Tokens: {activeReport.telemetry?.estimatedTokens || 0}</span>
                  </div>
                  <span className="text-slate-300">·</span>
                  <div className="flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-purple-600" />
                    <span>
                      {activeReport.telemetry?.cacheHit
                        ? 'Cache: HIT (<5ms)'
                        : (activeReport.telemetry?.estimatedTokens ?? 0) > 0
                        ? 'Pipeline: LIVE GEMINI AI'
                        : 'Pipeline: HEURISTIC AUDIT'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4 Interactive Studio Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
                <TabsList className="grid grid-cols-4 bg-slate-100/90 border border-slate-200/90 p-1 rounded-xl h-11">
                  <TabsTrigger
                    value="overview"
                    className="font-semibold text-xs data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs rounded-lg transition-all"
                  >
                    OVERVIEW
                  </TabsTrigger>
                  <TabsTrigger
                    value="architecture"
                    className="font-semibold text-xs data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs rounded-lg transition-all"
                  >
                    ARCHITECTURE
                  </TabsTrigger>
                  <TabsTrigger
                    value="competitors"
                    className="font-semibold text-xs data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs rounded-lg transition-all"
                  >
                    COMPETITORS
                  </TabsTrigger>
                  <TabsTrigger
                    value="compare"
                    className="font-semibold text-xs data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs rounded-lg transition-all"
                  >
                    COMPARE ({savedReports.length})
                  </TabsTrigger>
                </TabsList>

                {/* TAB 1: OVERVIEW */}
                <TabsContent value="overview" className="space-y-5 mt-4">
                  {/* Market Metrics Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                      <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">
                        Total Addressable Market (TAM)
                      </span>
                      <div className="text-3xl font-mono font-bold text-slate-900 tabular-nums">
                        ${activeReport.market.tamBillionsUsd}B
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 mt-1 block">
                        SAM: ${activeReport.market.samMillionsUsd}M · SOM: ${activeReport.market.somMillionsUsd}M
                      </span>
                    </div>

                    <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                      <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">
                        Pain Urgency Score
                      </span>
                      <div className="text-3xl font-mono font-bold text-amber-600 tabular-nums">
                        {activeReport.market.urgencyScore}
                        <span className="text-xs text-slate-400 font-normal"> / 10</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 truncate block mt-1">
                        Buyer: {activeReport.market.primaryBuyerPersona}
                      </span>
                    </div>

                    <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                      <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">
                        Estimated WTP (Mo.)
                      </span>
                      <div className="text-3xl font-mono font-bold text-emerald-700 tabular-nums">
                        ${activeReport.market.willingnessToPayUsd}
                        <span className="text-xs text-slate-400 font-normal"> / mo</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 mt-1 block">
                        Unit Economic Viability Index
                      </span>
                    </div>
                  </div>

                  {/* Brutal Red-Team Critique Box */}
                  <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-rose-50/70 border border-amber-200/90 shadow-xs relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-2.5 text-amber-900 font-mono text-xs font-bold uppercase tracking-wider">
                      <Flame className="w-4 h-4 text-orange-500" /> Brutal Red-Team Viability Audit
                    </div>
                    <blockquote className="text-sm sm:text-base text-slate-800 leading-relaxed font-sans italic border-l-2 border-amber-500 pl-4 py-1">
                      &quot;{activeReport.critic.brutalFeedback}&quot;
                    </blockquote>
                  </div>

                  {/* 90-Day Execution Sprints */}
                  <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 mb-3.5 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-amber-600" /> Tactical First 90 Days Execution Roadmap
                    </h3>
                    <div className="space-y-3">
                      {activeReport.critic.first90DaysRoadmap.map((step, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-start gap-3.5 hover:bg-slate-100/60 transition-colors"
                        >
                          <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300/80 shrink-0">
                            PHASE {idx + 1}
                          </span>
                          <p className="text-xs text-slate-700 leading-relaxed font-sans">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 2: ARCHITECTURE */}
                <TabsContent value="architecture" className="space-y-5 mt-4">
                  {/* Recommended Stack Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                      <span className="text-[10px] font-mono uppercase text-slate-500 flex items-center gap-1.5 mb-1.5">
                        <Code2 className="w-3.5 h-3.5 text-sky-600" /> Frontend Layer
                      </span>
                      <p className="text-xs font-mono text-slate-800 font-medium">
                        {activeReport.architecture.recommendedStack.frontend}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                      <span className="text-[10px] font-mono uppercase text-slate-500 flex items-center gap-1.5 mb-1.5">
                        <Server className="w-3.5 h-3.5 text-emerald-600" /> Backend / Edge Runtime
                      </span>
                      <p className="text-xs font-mono text-slate-800 font-medium">
                        {activeReport.architecture.recommendedStack.backend}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                      <span className="text-[10px] font-mono uppercase text-slate-500 flex items-center gap-1.5 mb-1.5">
                        <Database className="w-3.5 h-3.5 text-purple-600" /> Database & Vector Store
                      </span>
                      <p className="text-xs font-mono text-slate-800 font-medium">
                        {activeReport.architecture.recommendedStack.database}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                      <span className="text-[10px] font-mono uppercase text-slate-500 flex items-center gap-1.5 mb-1.5">
                        <Cpu className="w-3.5 h-3.5 text-amber-600" /> Cloud / GPU Infrastructure
                      </span>
                      <p className="text-xs font-mono text-slate-800 font-medium">
                        {activeReport.architecture.recommendedStack.infrastructure}
                      </p>
                    </div>
                  </div>

                  {/* Monthly Cloud & GPU FinOps vs Target Budget */}
                  <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold uppercase text-slate-800 flex items-center gap-2 mb-1">
                        <DollarSign className="w-4 h-4 text-emerald-600" /> Cloud & GPU FinOps Run-rate
                      </span>
                      <p className="text-xs text-slate-500">
                        Estimated production infrastructure cost matching the venture&apos;s initial scale.
                      </p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-mono text-slate-500">Target Budget</div>
                        <div className="text-sm font-mono font-semibold text-slate-800">
                          ${activeReport.monthlyBudgetUsd}/mo
                        </div>
                      </div>
                      <div className="text-right pl-4 border-l border-slate-200">
                        <div className="text-xs font-mono text-amber-700 font-bold">Estimated Cost</div>
                        <div className="text-2xl font-mono font-black text-amber-700">
                          ${activeReport.architecture.estimatedMonthlyCloudCostUsd}
                          <span className="text-xs text-slate-400 font-normal">/mo</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Critical Bottleneck Alert */}
                  <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-950">
                    <div className="flex items-center gap-2 mb-2 text-amber-800 font-mono text-xs font-bold uppercase tracking-wider">
                      <AlertTriangle className="w-4 h-4 text-amber-600" /> Primary System Bottleneck
                    </div>
                    <p className="text-xs font-mono text-slate-800 leading-relaxed">
                      {activeReport.architecture.criticalBottleneck}
                    </p>
                  </div>

                  {/* Security & Compliance Notes */}
                  <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 mb-3 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" /> Security & Compliance Guardrails
                    </h3>
                    <ul className="space-y-2">
                      {activeReport.architecture.securityComplianceNotes.map((note, i) => (
                        <li key={i} className="text-xs font-mono text-slate-700 flex items-start gap-2">
                          <span className="text-emerald-600 font-bold">✓</span>
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </TabsContent>

                {/* TAB 3: COMPETITORS */}
                <TabsContent value="competitors" className="space-y-5 mt-4">
                  <div className="space-y-3">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                      Incumbent Vulnerability Breakdown
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {activeReport.competitors.incumbents.map((inc, i) => (
                        <div key={i} className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-900">{inc.name}</span>
                            <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                              {inc.pricingModel}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-mono text-rose-600 uppercase font-bold block mb-0.5">
                              Core Weakness & Architectural Flaw:
                            </span>
                            <p className="text-xs text-slate-700 font-sans leading-relaxed">
                              {inc.coreWeakness}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Unfair Moat Strategy */}
                  <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 shadow-xs text-emerald-950">
                    <div className="flex items-center gap-2 mb-2 text-emerald-800 font-mono text-xs font-bold uppercase tracking-wider">
                      <Zap className="w-4 h-4 text-emerald-600" /> Unfair Defensibility Moat Strategy
                    </div>
                    <p className="text-xs text-slate-800 leading-relaxed font-sans">
                      {activeReport.competitors.unfairMoatStrategy}
                    </p>
                  </div>
                </TabsContent>

                {/* TAB 4: COMPARE MATRIX */}
                <TabsContent value="compare" className="mt-4">
                  <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Side-by-Side Validation Comparison Matrix ({savedReports.length} Runs)
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Compare Viability, WTP & Cloud FinOps
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/80 font-mono text-[11px] text-slate-600">
                            <th className="p-3">Venture Codename</th>
                            <th className="p-3">Sector</th>
                            <th className="p-3">Viability</th>
                            <th className="p-3">Verdict</th>
                            <th className="p-3">WTP (Mo.)</th>
                            <th className="p-3">Infra Cost</th>
                            <th className="p-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          {savedReports.map((r) => (
                            <tr
                              key={r.id}
                              className={`hover:bg-amber-50/30 transition-colors ${
                                activeReport.id === r.id ? 'bg-amber-50/50' : ''
                              }`}
                            >
                              <td className="p-3 font-semibold text-slate-800 max-w-[180px] truncate">
                                {r.title}
                              </td>
                              <td className="p-3 font-mono text-slate-600 text-[11px]">
                                {r.targetMarket}
                              </td>
                              <td className="p-3 font-mono font-bold text-amber-700">
                                {r.critic.overallViabilityScore}/100
                              </td>
                              <td className="p-3 font-mono text-[11px]">
                                {r.critic.verdict}
                              </td>
                              <td className="p-3 font-mono text-slate-700">
                                ${r.market.willingnessToPayUsd}
                              </td>
                              <td className="p-3 font-mono text-slate-700">
                                ~${r.architecture.estimatedMonthlyCloudCostUsd}
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => setActiveReport(r)}
                                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-[10px] transition-colors"
                                >
                                  Inspect
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            /* Empty State */
            <div className="flex-1 p-10 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 shadow-xs">
                <Sparkles className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                No Venture Hypothesis Active
              </h3>
              <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed font-sans">
                Enter your venture details on the left or select a quick-load architecture template to execute the 4-Stage Multi-Agent validation engine.
              </p>
              <button
                onClick={() => handleApplyPreset(PRESET_TEMPLATES[0])}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs transition-all flex items-center gap-2 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                <span>Load Sample Architecture Template</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Auth Error Banner if any */}
      {authError && (
        <div className="fixed bottom-4 right-4 z-50 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono shadow-2xl flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          <span>{authError}</span>
          <button onClick={() => setAuthError(null)} className="text-rose-500 hover:text-rose-800 ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Studio Footer */}
      <footer className="border-t border-slate-200/80 bg-white/90 py-4 px-6 text-slate-500 font-mono text-xs flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Noob Idea AI Engine: Active (Node 20, Next.js 15, Gemini 2.5 Flash, Firebase Auth)</span>
        </div>
        <div>
          <span>Export Architecture Decision Records (ADR-001) for YC, Angel & Engineering Reviews</span>
        </div>
      </footer>
    </div>
  );
}
