import { useState, useRef } from "react";
import { UploadArea } from "@/components/UploadArea";
import { QuestionCard } from "@/components/QuestionCard";
import { HistorySidebar } from "@/components/HistorySidebar";
import { useHistory, HistorySession } from "@/hooks/use-history";
import { Subject, Difficulty, GeneratedQuestion } from "@/types";
import { generateQuestions } from "@/lib/puter-ai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Download, Copy, Sparkles, AlertCircle, BookOpen, Menu, History } from "lucide-react";
import { GeneratingProgress } from "@/components/GeneratingProgress";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/ThemeToggle";

const SUBJECTS: Subject[] = ["Physics", "Chemistry", "Mathematics", "Biology", "General"];
const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard", "JEE Advanced"];

export default function Home() {
  const { toast } = useToast();
  const { history, saveSession, clearHistory, deleteSession } = useHistory();

  const [extractedText, setExtractedText] = useState("");
  const [subject, setSubject] = useState<Subject>("Physics");
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [count, setCount] = useState([5]);

  const [isPending, setIsPending] = useState(false);
  const [isError, setIsError] = useState(false);
  const [currentSession, setCurrentSession] = useState<HistorySession | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);

  const handleTextExtracted = (text: string) => {
    setExtractedText(text);
    setCurrentSession(null);
  };

  const handleGenerate = async () => {
    if (!extractedText.trim()) {
      toast({
        title: "Missing text",
        description: "Please extract or enter text from a question first.",
        variant: "destructive",
      });
      return;
    }

    setIsPending(true);
    setIsError(false);

    try {
      const data = await generateQuestions(extractedText, subject, difficulty, count[0]);

      saveSession({
        originalText: extractedText,
        topic: data.topic || "Unknown Topic",
        subject: data.subject || subject,
        difficulty: data.difficulty || difficulty,
        questions: data.questions,
      });

      toast({
        title: "Questions generated!",
        description: `Successfully created ${data.questions.length} similar questions for practice.`,
      });

      setCurrentSession({
        id: "temp-current",
        date: new Date().toISOString(),
        originalText: extractedText,
        topic: data.topic || "Unknown Topic",
        subject: data.subject || subject,
        difficulty: data.difficulty || difficulty,
        questions: data.questions,
      });

      setTimeout(() => {
        contentRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err: unknown) {
      setIsError(true);
      const msg = err instanceof Error ? err.message : undefined;
      toast({
        title: "Failed to generate questions",
        description: msg || "There was an error connecting to the AI service. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };

  const handleCopyAll = () => {
    if (!currentSession || currentSession.questions.length === 0) return;

    const text = currentSession.questions
      .map((q: GeneratedQuestion, i: number) => {
        let qt = `Q${i + 1}. ${q.text}\n`;
        if (q.options && q.options.length) {
          qt += q.options.join("\n") + "\n";
        }
        return qt;
      })
      .join("\n\n");

    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background print:block print:h-auto print:overflow-visible">
      <HistorySidebar
        history={history}
        onSelectSession={setCurrentSession}
        onClearHistory={clearHistory}
        onDeleteSession={deleteSession}
        currentSessionId={currentSession?.id}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 print:block print:h-auto print:overflow-visible">
        <header className="h-14 md:h-16 border-b bg-card flex items-center justify-between px-4 md:px-6 shrink-0 z-10 print:hidden">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open history"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm shrink-0">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground leading-tight tracking-tight text-sm md:text-base">Concept Mastery</h1>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest hidden sm:block">Question Generator</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8 relative"
              onClick={() => setSidebarOpen(true)}
              aria-label="View history"
            >
              <History className="w-4 h-4" />
              {history.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
              )}
            </Button>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 lg:p-10 print:p-0 print:overflow-visible">
          <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">

            <section className="print:hidden">
              <div className="mb-4 md:mb-6">
                <h2 className="text-xl md:text-2xl font-semibold tracking-tight mb-1 md:mb-2">Input Source Question</h2>
                <p className="text-muted-foreground text-sm">Upload an image of a question or type it manually to generate similar practice problems.</p>
              </div>
              <UploadArea onTextExtracted={handleTextExtracted} isLoading={isPending} />
            </section>

            {extractedText && (
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 print:hidden">
                <Card className="lg:col-span-2 border-primary/20 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base md:text-lg">Extracted Text</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={extractedText}
                      onChange={(e) => setExtractedText(e.target.value)}
                      className="min-h-[120px] md:min-h-[160px] font-medium leading-relaxed resize-y"
                      data-testid="textarea-extracted"
                    />
                  </CardContent>
                </Card>

                <Card className="border-border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base md:text-lg flex items-center">
                      <Sparkles className="w-4 h-4 mr-2 text-primary" />
                      Generator Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Select value={subject} onValueChange={(v) => setSubject(v as Subject)}>
                          <SelectTrigger id="subject" data-testid="select-subject">
                            <SelectValue placeholder="Select subject" />
                          </SelectTrigger>
                          <SelectContent>
                            {SUBJECTS.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="difficulty">Difficulty</Label>
                        <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
                          <SelectTrigger id="difficulty" data-testid="select-difficulty">
                            <SelectValue placeholder="Select difficulty" />
                          </SelectTrigger>
                          <SelectContent>
                            {DIFFICULTIES.map((d) => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
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
                      disabled={isPending || !extractedText.trim()}
                      data-testid="button-generate"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      {isPending ? "Generating..." : "Generate Practice Set"}
                    </Button>
                  </CardContent>
                </Card>
              </section>
            )}

            <GeneratingProgress isVisible={isPending} questionCount={count[0]} />

            {isError && (
              <Alert variant="destructive" className="print:hidden">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Generation Failed</AlertTitle>
                <AlertDescription>
                  There was an error connecting to the AI service. Please try again.
                </AlertDescription>
              </Alert>
            )}

            {currentSession && currentSession.questions && currentSession.questions.length > 0 && (
              <section ref={contentRef} className="pt-6 md:pt-8 border-t print:pt-0 print:border-none animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 md:mb-8 gap-3 md:gap-4 print:hidden">
                  <div className="min-w-0">
                    <h2 className="text-xl md:text-2xl font-bold tracking-tight truncate">Practice Set: {currentSession.topic}</h2>
                    <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 bg-secondary rounded text-xs font-medium">{currentSession.subject}</span>
                      <span className="px-2 py-0.5 bg-secondary rounded text-xs font-medium">{currentSession.difficulty}</span>
                      <span className="text-sm">• {currentSession.questions.length} questions</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={handleCopyAll} data-testid="button-copy-all">
                      <Copy className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Copy All</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={handlePrint} data-testid="button-print">
                      <Download className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Save PDF</span>
                    </Button>
                  </div>
                </div>

                <div className="hidden print:block mb-8 text-center border-b pb-4">
                  <h1 className="text-2xl font-bold mb-2">Practice Set: {currentSession.topic}</h1>
                  <p className="text-gray-600">
                    {currentSession.subject} • {currentSession.difficulty} • Generated on {new Date().toLocaleDateString()}
                  </p>
                </div>

                <div className="space-y-4 md:space-y-6">
                  {currentSession.questions.map((q: GeneratedQuestion, i: number) => (
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
