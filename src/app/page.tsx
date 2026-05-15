import IdeaDashboard from "@/components/IdeaDashboard";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary/20 overflow-x-hidden">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/20 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-yellow-200/20 rounded-full blur-[120px]" />
        <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] bg-blue-100/10 rounded-full blur-[100px]" />
      </div>
      
      <div className="relative z-10 px-4 md:px-0">
        <IdeaDashboard />
      </div>

      <footer className="relative z-10 py-12 text-center border-t border-border/50 mt-20 bg-white/30 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg shadow-sm" />
            <span className="font-bold text-xl tracking-tight">Noob Idea AI</span>
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            © {new Date().getFullYear()} Noob Idea AI. Built for the bold and the curious.
          </p>
          <div className="flex gap-6 text-sm font-bold text-muted-foreground uppercase tracking-widest">
            <a href="#" className="hover:text-primary transition-colors">Twitter</a>
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
