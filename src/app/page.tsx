import IdeaValidatorDashboard from '@/components/IdeaValidatorDashboard';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50/70 text-slate-900 antialiased selection:bg-amber-500/25 selection:text-amber-950 relative overflow-x-hidden">
      {/* Ambient background brand glows */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute top-1/4 -right-32 w-96 h-96 rounded-full bg-orange-400/10 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-amber-300/10 blur-3xl" />
      </div>

      <div className="relative z-10">
        <IdeaValidatorDashboard />
      </div>
    </main>
  );
}
