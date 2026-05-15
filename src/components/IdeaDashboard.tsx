'use client';

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useAuth, useCollection, OperationType, handleFirestoreError } from '@/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, signInAnonymously } from 'firebase/auth';
import { collection, query, orderBy, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, LogIn, LogOut, Lightbulb, Trash2, Rocket, Key, Sparkles, Brain, Target, Zap, ChevronRight, AlertCircle, Heart, ThumbsDown, Swords, Map } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

interface Assessment {
  novelty: number;
  feasibility: number;
  impact: number;
  summary: string;
  nextSteps: string[];
  marketResponse: {
    love: string;
    hate: string;
  };
  competitors: { name: string; strategy: string }[];
  roadmap: { phase: string; tasks: string[] }[];
}

export default function IdeaDashboard() {
  const user = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAssessing, setIsAssessing] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [magicKeyLoading, setMagicKeyLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const ideasQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'users', user.uid, 'ideas'),
      orderBy('createdAt', 'desc')
    );
  }, [user, firestore]);

  const { data: ideas, loading: ideasLoading } = useCollection(ideasQuery);

  const handleSignIn = async () => {
    if (!auth) return;
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      // Force select account to help with some iframe issues
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      setShowAuthDialog(false);
      
      // If we have a pending assessment, try to save it now
      if (assessment && title && description) {
        // We'll let the user click save again once logged in to be safe
      }
    } catch (error: any) {
      console.error("Sign in failed:", error);
      setAuthError(error.message || "Failed to sign in. Please try again.");
    }
  };

  const handleMagicKeySignIn = async () => {
    if (!auth) return;
    setAuthError(null);
    try {
      setMagicKeyLoading(true);
      await signInAnonymously(auth);
      setShowAuthDialog(false);
    } catch (error: any) {
      console.error("Magic Key sign in failed:", error);
      setAuthError(error.message || "Magic Key login failed.");
    } finally {
      setMagicKeyLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  const assessIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsAssessing(true);
    setAssessment(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Assess this business/project idea:
Title: ${title}
Description: ${description}

Provide a JSON response with:
- novelty: number (1-10)
- feasibility: number (1-10)
- impact: number (1-10)
- summary: short paragraph assessment
- nextSteps: array of 3 strings
- marketResponse: object with 'love' (why people will love it) and 'hate' (why people might hate it) strings
- competitors: array of objects with 'name' and 'strategy' (how they operate) strings
- roadmap: array of objects with 'phase' (e.g. Month 1) and 'tasks' (array of strings)`,
        config: {
          responseMimeType: "application/json"
        }
      });

      const result = JSON.parse(response.text || '{}');
      setAssessment(result);
    } catch (error) {
      console.error("AI Assessment failed:", error);
    } finally {
      setIsAssessing(false);
    }
  };

  const saveIdea = async () => {
    if (!firestore || !user || !title.trim() || !description.trim()) {
      if (!user) setShowAuthDialog(true);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Use Firestore to generate ID to avoid crypto.randomUUID issues in some iframe contexts
      const ideasCollectionRef = collection(firestore, 'users', user.uid, 'ideas');
      const ideaRef = doc(ideasCollectionRef);
      const ideaId = ideaRef.id;
      
      const newIdea = {
        id: ideaId,
        userId: user.uid,
        title,
        description,
        assessment: assessment,
        createdAt: Date.now(),
      };

      await setDoc(ideaRef, newIdea);
      setTitle('');
      setDescription('');
      setAssessment(null);
    } catch (error: any) {
      console.error(error);
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/ideas`, auth);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteIdea = async (ideaId: string) => {
    if (!user || !firestore) return;
    const ideaRef = doc(firestore, 'users', user.uid, 'ideas', ideaId);
    try {
      await deleteDoc(ideaRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, ideaRef.path, auth);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 space-y-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-5xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary to-orange-600">Noob Idea AI</h2>
          <p className="text-muted-foreground font-medium text-lg mt-1">
            {user ? `Welcome back, ${user.displayName?.split(' ')[0] || 'Builder'}` : 'Turn Simple Sparks into Giants.'}
          </p>
        </div>
        <div className="flex gap-3">
          {user ? (
            <div className="flex items-center gap-3 bg-muted/50 p-1 pl-4 rounded-full border">
               <span className="text-xs font-bold text-muted-foreground">{user.email}</span>
               <Button variant="ghost" onClick={handleSignOut} size="sm" className="rounded-full h-8 text-xs font-bold">
                <LogOut className="w-3 h-3 mr-2" />
                Sign Out
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setShowAuthDialog(true)} className="rounded-full font-bold">
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-5 space-y-8">
          <Card className="glass relative overflow-hidden border-2 border-primary/20">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl font-black italic uppercase italic">
                <Sparkles className="w-6 h-6 text-primary" />
                Forge Your Spark
              </CardTitle>
              <CardDescription className="text-base">Enter your raw idea. Let our AI assess the potential.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={assessIdea} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground ml-1">Title your vision</label>
                  <Input 
                    placeholder="e.g. Uber for Cats" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    maxLength={200}
                    className="bg-background/80 text-lg py-6 focus-visible:ring-primary h-14"
                  />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground ml-1">The Core Idea</label>
                  <Textarea 
                    placeholder="Describe how it changes the world..." 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[180px] bg-background/80 text-base resize-none focus-visible:ring-primary"
                    required
                    maxLength={5000}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-14 text-lg font-black uppercase tracking-tight group" 
                  disabled={isAssessing}
                >
                  {isAssessing ? (
                    <><Loader2 className="w-5 h-5 mr-3 animate-spin" /> Assessing Potential...</>
                  ) : (
                    <><Zap className="w-5 h-5 mr-2 group-hover:scale-125 transition-transform" /> Ignite Spark</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black tracking-tight flex items-center gap-2 uppercase">
                Workspace {ideas && <Badge variant="secondary" className="ml-2 font-black border-none">{ideas.length}</Badge>}
              </h3>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {!user ? (
                <div className="py-12 px-6 flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed border-muted rounded-3xl bg-muted/20">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6">
                    <Rocket className="w-8 h-8 text-primary" />
                  </div>
                  <h4 className="text-xl font-black mb-2 text-foreground uppercase tracking-tight italic">Saved Ideas Hidden</h4>
                  <p className="font-medium max-w-sm mb-6 text-sm">Sign in with Google or a Magic Key to see your past sparks and keep your workspace organized.</p>
                  <Button onClick={() => setShowAuthDialog(true)} className="font-bold rounded-full h-12 px-8 uppercase tracking-widest text-xs">
                    Sign In to Access
                  </Button>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {ideasLoading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                      <Card key={i} className="animate-pulse bg-muted min-h-[140px] rounded-2xl" />
                    ))
                  ) : ideas && ideas.length > 0 ? (
                    ideas.map((idea) => (
                      <motion.div
                        key={idea.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                      >
                        <Card 
                          className="group relative overflow-hidden border-none shadow-sm hover:shadow-md transition-all duration-300 bg-white p-6 rounded-2xl cursor-pointer"
                          onClick={() => {
                            setTitle(idea.title);
                            setDescription(idea.description);
                            setAssessment(idea.assessment || null);
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <h4 className="text-lg font-bold group-hover:text-primary transition-colors">{idea.title}</h4>
                              <p className="text-xs text-muted-foreground line-clamp-2 max-w-md">{idea.description}</p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-full"
                              onClick={() => handleDeleteIdea(idea.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          {idea.assessment && (
                            <div className="flex gap-2 mt-4">
                              <Badge variant="outline" className="text-[9px] font-bold py-0 h-5">N: {idea.assessment.novelty}</Badge>
                              <Badge variant="outline" className="text-[9px] font-bold py-0 h-5">F: {idea.assessment.feasibility}</Badge>
                              <Badge variant="outline" className="text-[9px] font-bold py-0 h-5">I: {idea.assessment.impact}</Badge>
                            </div>
                          )}
                        </Card>
                      </motion.div>
                    ))
                  ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed border-muted rounded-3xl">
                      <div className="w-14 h-14 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                        <Lightbulb className="w-7 h-7" />
                      </div>
                      <p className="font-bold uppercase text-xs tracking-widest">No ideas in orbit</p>
                    </div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {!assessment && !isAssessing ? (
              <motion.div 
                key="empty-state"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-12 bg-muted/10 rounded-3xl border-2 border-dashed border-muted"
              >
                <div className="relative mb-8">
                   <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                   <div className="relative w-24 h-24 bg-white shadow-2xl rounded-3xl flex items-center justify-center">
                    <Brain className="w-12 h-12 text-primary" />
                   </div>
                </div>
                <h3 className="text-3xl font-black tracking-tight mb-4 uppercase">Waiting for Impact</h3>
                <p className="text-muted-foreground max-w-sm font-medium">
                  Forge your idea in the workshop. Our AI will analyze market novelty, feasibility, and eventual impact.
                </p>
              </motion.div>
            ) : isAssessing ? (
              <motion.div
                key="assessing-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full min-h-[500px] flex flex-col items-center justify-center p-12 bg-muted/5 rounded-3xl"
              >
                <div className="space-y-8 w-full max-w-md">
                   <div className="flex justify-center">
                     <div className="relative">
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                          className="w-32 h-32 border-4 border-primary/20 border-t-primary rounded-full"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Sparkles className="w-12 h-12 text-primary animate-pulse" />
                        </div>
                     </div>
                   </div>
                   <div className="space-y-4">
                     <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                       <motion.div 
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        className="h-full w-1/2 bg-primary"
                       />
                     </div>
                     <p className="text-center font-black uppercase text-xs tracking-[0.2em] text-muted-foreground">Synthesizing Potential Markets</p>
                   </div>
                </div>
              </motion.div>
            ) : assessment && (
              <motion.div
                key="result-state"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-3 gap-6">
                  <MetricCard label="Novelty" value={assessment.novelty} icon={<Sparkles className="w-4 h-4" />} color="bg-blue-500" />
                  <MetricCard label="Feasibility" value={assessment.feasibility} icon={<Target className="w-4 h-4" />} color="bg-green-500" />
                  <MetricCard label="Impact" value={assessment.impact} icon={<Zap className="w-4 h-4" />} color="bg-orange-500" />
                </div>

                <Card className="rounded-3xl shadow-xl border-none p-8 bg-white">
                  <div className="space-y-8">
                    <Tabs defaultValue="overview" className="w-full">
                      <TabsList className="grid w-full grid-cols-4 bg-muted/50 rounded-2xl h-14 p-1">
                        <TabsTrigger value="overview" className="rounded-xl text-xs font-bold uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-sm">Overview</TabsTrigger>
                        <TabsTrigger value="market" className="rounded-xl text-xs font-bold uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-sm">Market</TabsTrigger>
                        <TabsTrigger value="competitors" className="rounded-xl text-xs font-bold uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-sm">Rivals</TabsTrigger>
                        <TabsTrigger value="roadmap" className="rounded-xl text-xs font-bold uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-sm">Roadmap</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="overview" className="space-y-8 mt-6">
                        <div className="space-y-3">
                          <h3 className="text-[10px] uppercase tracking-widest font-black text-primary">AI Assessment</h3>
                          <p className="text-xl font-medium leading-relaxed italic">&quot;{assessment.summary}&quot;</p>
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-[10px] uppercase tracking-widest font-black text-primary">Strategic Next Steps</h3>
                          <div className="space-y-3">
                            {assessment.nextSteps?.map((step, i) => (
                              <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-muted/30 border border-muted-foreground/5">
                                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] text-white font-black shrink-0 mt-1">
                                  {i+1}
                                </div>
                                <p className="font-bold text-sm">{step}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="market" className="space-y-6 mt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <Card className="bg-red-50/50 border-red-100 p-6 rounded-2xl shadow-sm">
                              <div className="flex items-center gap-3 mb-4 text-red-500">
                                 <Heart className="w-6 h-6 fill-red-500 text-red-500" />
                                 <h3 className="font-black uppercase tracking-tight">Why They&apos;ll Love It</h3>
                              </div>
                              <p className="text-sm font-medium leading-relaxed">{assessment.marketResponse?.love || "No data provided"}</p>
                           </Card>
                           <Card className="bg-slate-50/50 border-slate-200 p-6 rounded-2xl shadow-sm">
                              <div className="flex items-center gap-3 mb-4 text-slate-500">
                                 <ThumbsDown className="w-6 h-6" />
                                 <h3 className="font-black uppercase tracking-tight">Why They&apos;ll Hate It</h3>
                              </div>
                              <p className="text-sm font-medium leading-relaxed">{assessment.marketResponse?.hate || "No data provided"}</p>
                           </Card>
                        </div>
                      </TabsContent>

                      <TabsContent value="competitors" className="space-y-6 mt-6">
                         <div className="flex items-center gap-3 mb-6 text-primary">
                             <Swords className="w-6 h-6" />
                             <h3 className="font-black uppercase tracking-tight text-xl">The Arena</h3>
                         </div>
                         <div className="grid grid-cols-1 gap-4">
                           {assessment.competitors?.map((comp, i) => (
                             <div key={i} className="p-5 rounded-2xl bg-muted/20 border border-muted/50 flex flex-col gap-2">
                                <h4 className="font-black text-lg">{comp.name}</h4>
                                <p className="text-sm font-medium text-muted-foreground">{comp.strategy}</p>
                             </div>
                           ))}
                         </div>
                      </TabsContent>

                      <TabsContent value="roadmap" className="space-y-6 mt-6">
                         <div className="flex items-center gap-3 mb-6 text-primary">
                             <Map className="w-6 h-6" />
                             <h3 className="font-black uppercase tracking-tight text-xl">Path to Victory</h3>
                         </div>
                         <div className="space-y-6 pl-4 border-l-2 border-primary/20">
                            {assessment.roadmap?.map((phase, i) => (
                              <div key={i} className="relative pl-6">
                                 <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-primary border-4 border-white shadow-sm" />
                                 <h4 className="font-black text-base uppercase tracking-tight mb-3 text-primary">{phase.phase}</h4>
                                 <ul className="space-y-2">
                                    {phase.tasks?.map((task, j) => (
                                       <li key={j} className="text-sm font-medium flex items-start gap-2">
                                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 mt-1.5 shrink-0" />
                                          {task}
                                       </li>
                                    ))}
                                 </ul>
                              </div>
                            ))}
                         </div>
                      </TabsContent>
                    </Tabs>

                    <div className="pt-6 border-t border-muted/50 flex flex-col md:flex-row gap-4">
                      <Button 
                        size="lg" 
                        className="flex-1 rounded-2xl h-16 text-lg font-black uppercase italic italic"
                        onClick={saveIdea}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5 mr-3" /> Save to Workspace</>}
                      </Button>
                      {!user && (
                        <div className="flex items-center justify-center px-4">
                           <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest max-w-[120px] text-center">Login Required to Save Ideas</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md rounded-[32px] p-8 border-none overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-orange-500" />
          <DialogHeader className="pt-4">
            <DialogTitle className="text-3xl font-black uppercase tracking-tight italic">Secure Your Sparks</DialogTitle>
            <DialogDescription className="text-base font-medium">
              Save your assessments and track your progress as a builder.
            </DialogDescription>
          </DialogHeader>

          {authError && (
            <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-2xl flex items-center gap-3 border border-destructive/20">
               <AlertCircle className="w-5 h-5 shrink-0" />
               <p className="text-xs font-bold leading-snug">{authError}</p>
            </div>
          )}

          <div className="flex flex-col gap-4 py-8">
            <Button onClick={handleSignIn} size="lg" className="w-full h-16 rounded-2xl font-black uppercase tracking-tight text-lg shadow-lg shadow-primary/20">
              <LogIn className="w-6 h-6 mr-3" />
              Sign in with Google
            </Button>
            
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase font-black tracking-[0.3em]">
                <span className="bg-background px-4 text-muted-foreground italic">
                  Alternative
                </span>
              </div>
            </div>

            <Button 
              variant="outline" 
              onClick={handleMagicKeySignIn} 
              size="lg" 
              className="w-full h-16 rounded-2xl font-black uppercase tracking-tight text-sm border-2 hover:border-primary transition-all"
              disabled={magicKeyLoading}
            >
              {magicKeyLoading ? <Loader2 className="w-5 h-5 mr-3 animate-spin" /> : <Key className="w-5 h-5 mr-3" />}
              Use Magic Key (Anonymous)
            </Button>
          </div>
          
          <p className="text-[10px] text-center text-muted-foreground font-medium px-4">
            By continuing, you agree to build things that matter and never settle for mediocrity. Your data is yours.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({ label, value, icon, color }: { label: string, value: number, icon: React.ReactNode, color: string }) {
  return (
    <Card className="rounded-3xl border-none shadow-md overflow-hidden bg-white">
      <div className="p-4 flex flex-col items-center gap-3">
        <div className={`p-2 rounded-xl ${color} bg-opacity-10 text-primary`}>
          {icon}
        </div>
        <div className="text-center">
          <p className="text-[9px] uppercase tracking-widest font-black text-muted-foreground mb-1">{label}</p>
          <div className="flex items-baseline justify-center gap-1">
             <span className="text-3xl font-black italic">{value}</span>
             <span className="text-[10px] font-bold text-muted-foreground">/10</span>
          </div>
        </div>
        <div className="w-full h-1 bg-muted rounded-full mt-1">
           <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${value * 10}%` }}
            className={`h-full ${color} rounded-full`}
           />
        </div>
      </div>
    </Card>
  );
}

