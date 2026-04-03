import { useState, useRef, useEffect } from "react";
import { UploadArea } from "@/components/UploadArea";
import { QuestionCard } from "@/components/QuestionCard";
import { HistorySidebar } from "@/components/HistorySidebar";
import { useHistory, HistorySession } from "@/hooks/use-history";
import { useGenerateQuestions, GenerateQuestionsBodySubject, GenerateQuestionsBodyDifficulty } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Download, Copy, Sparkles, AlertCircle, BookOpen } from "lucide-react";
import { GeneratingProgress } from "@/components/GeneratingProgress";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  const { toast } = useToast();
  const { history, saveSession, clearHistory, deleteSession } = useHistory();
  
  const [extractedText, setExtractedText] = useState("");
  const [subject, setSubject] = useState<GenerateQuestionsBodySubject>("Physics");
  const [difficulty, setDifficulty] = useState<GenerateQuestionsBodyDifficulty>("Medium");
  const [count, setCount] = useState([5]);
  
  const [currentSession, setCurrentSession] = useState<HistorySession | null>(null);
  
  const generateQuestions = useGenerateQuestions();
  const contentRef = useRef<HTMLDivElement>(null);

  const handleTextExtracted = (text: string) => {
    setExtractedText(text);
    setCurrentSession(null); // Clear current viewing session when new text comes in
  };

  const handleGenerate = () => {
    if (!extractedText.trim()) {
      toast({
        title: "Missing text",
        description: "Please extract or enter text from a question first.",
        variant: "destructive"
      });
      return;
    }

    generateQuestions.mutate({
      data: {
        questionText: extractedText,
        subject,
        difficulty,
        count: count[0]
      }
    }, {
      onSuccess: (data) => {
        saveSession({
          originalText: extractedText,
          topic: data.topic || "Unknown Topic",
          subject: data.subject || subject,
          difficulty: data.difficulty || difficulty,
          questions: data.questions
        });
        toast({
          title: "Questions generated!",
          description: `Successfully created ${data.questions.length} similar questions for practice.`,
        });
        
        // After saving, history hook updates. The newest session is at index 0.
        // We let the history list render, but we need the latest session to be selected.
        // We'll just wait for the next render or use the response data directly.
        setCurrentSession({
          id: "temp-current",
          date: new Date().toISOString(),
          originalText: extractedText,
          topic: data.topic || "Unknown Topic",
          subject: data.subject || subject,
          difficulty: data.difficulty || difficulty,
          questions: data.questions
        });
        
        setTimeout(() => {
          contentRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      },
      onError: (err: unknown) => {
        const errMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        toast({
          title: "Failed to generate questions",
          description: errMsg || "There was an error connecting to the AI service. Please try again.",
          variant: "destructive"
        });
      }
    });
  };

  const handleCopyAll = () => {
    if (!currentSession || currentSession.questions.length === 0) return;
    
    const text = currentSession.questions.map((q, i) => {
      let qt = `Q${i + 1}. ${q.text}\n`;
      if (q.options && q.options.length) {
        qt += q.options.join("\n") + "\n";
      }
      return qt;
    }).join("\n\n");
    
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <HistorySidebar 
        history={history} 
        onSelectSession={setCurrentSession}
        onClearHistory={clearHistory}
        onDeleteSession={deleteSession}
        currentSessionId={currentSession?.id}
      />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-16 border-b bg-card flex items-center justify-between px-6 shrink-0 z-10 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground leading-tight tracking-tight">Concept Mastery</h1>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Question Generator</p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 print:p-0 print:overflow-visible">
          <div className="max-w-5xl mx-auto space-y-8">
            
            <section className="print:hidden">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold tracking-tight mb-2">Input Source Question</h2>
                <p className="text-muted-foreground text-sm">Upload an image of a question or type it manually to generate similar practice problems.</p>
              </div>
              <UploadArea 
                onTextExtracted={handleTextExtracted} 
                isLoading={generateQuestions.isPending} 
              />
            </section>

            {extractedText && (
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 print:hidden">
                <Card className="lg:col-span-2 border-primary/20 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Extracted Text</CardTitle>
                    <CardDescription>Edit if OCR missed anything</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea 
                      value={extractedText}
                      onChange={(e) => setExtractedText(e.target.value)}
                      className="min-h-[160px] font-medium leading-relaxed resize-y"
                      data-testid="textarea-extracted"
                    />
                  </CardContent>
                </Card>

                <Card className="border-border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center">
                      <Sparkles className="w-4 h-4 mr-2 text-primary" />
                      Generator Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Select value={subject} onValueChange={(v) => setSubject(v as GenerateQuestionsBodySubject)}>
                        <SelectTrigger id="subject" data-testid="select-subject">
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(GenerateQuestionsBodySubject).map(sub => (
                            <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="difficulty">Target Difficulty</Label>
                      <Select value={difficulty} onValueChange={(v) => setDifficulty(v as GenerateQuestionsBodyDifficulty)}>
                        <SelectTrigger id="difficulty" data-testid="select-difficulty">
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(GenerateQuestionsBodyDifficulty).map(diff => (
                            <SelectItem key={diff} value={diff}>{diff}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label>Question Count</Label>
                        <span className="text-sm font-semibold w-6 text-center bg-secondary rounded-md py-0.5">{count[0]}</span>
                      </div>
                      <Slider 
                        value={count} 
                        onValueChange={setCount} 
                        min={3} 
                        max={10} 
                        step={1}
                        data-testid="slider-count"
                      />
                    </div>

                    <Button 
                      className="w-full font-semibold shadow-sm" 
                      onClick={handleGenerate}
                      disabled={generateQuestions.isPending || !extractedText.trim()}
                      data-testid="button-generate"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      {generateQuestions.isPending ? "Generating..." : "Generate Practice Set"}
                    </Button>
                  </CardContent>
                </Card>
              </section>
            )}

            <GeneratingProgress
              isVisible={generateQuestions.isPending}
              questionCount={count[0]}
            />

            {generateQuestions.isError && (
              <Alert variant="destructive" className="print:hidden">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Generation Failed</AlertTitle>
                <AlertDescription>
                  There was an error connecting to the AI service. Please try again.
                </AlertDescription>
              </Alert>
            )}

            {currentSession && currentSession.questions && currentSession.questions.length > 0 && (
              <section ref={contentRef} className="pt-8 border-t print:pt-0 print:border-none animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4 print:hidden">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Practice Set: {currentSession.topic}</h2>
                    <p className="text-muted-foreground mt-1 flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-secondary rounded text-xs font-medium">{currentSession.subject}</span>
                      <span className="px-2 py-0.5 bg-secondary rounded text-xs font-medium">{currentSession.difficulty}</span>
                      <span className="text-sm">• {currentSession.questions.length} questions</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleCopyAll} data-testid="button-copy-all">
                      <Copy className="w-4 h-4 mr-2" />
                      Copy All
                    </Button>
                    <Button variant="outline" onClick={handlePrint} data-testid="button-print">
                      <Download className="w-4 h-4 mr-2" />
                      Save PDF
                    </Button>
                  </div>
                </div>

                {/* Print Header */}
                <div className="hidden print:block mb-8 text-center border-b pb-4">
                  <h1 className="text-2xl font-bold mb-2">Practice Set: {currentSession.topic}</h1>
                  <p className="text-gray-600">
                    {currentSession.subject} • {currentSession.difficulty} • Generated on {new Date().toLocaleDateString()}
                  </p>
                </div>

                <div className="space-y-6">
                  {currentSession.questions.map((q, i) => (
                    <QuestionCard key={q.id || i} question={q} index={i} />
                  ))}
                </div>
              </section>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
