import { useState } from "react";
import { GeneratedQuestion } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MathText } from "@/components/MathText";
import { ChevronDown, ChevronUp, Copy, CheckCircle2, Eye, EyeOff, Lightbulb, Volume2 } from "lucide-react";

interface QuestionCardProps {
  question: GeneratedQuestion;
  index: number;
}

export function QuestionCard({ question, index }: QuestionCardProps) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const difficultyColors: Record<string, string> = {
    "Easy": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
    "Medium": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
    "Hard": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
    "JEE Advanced": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  };

  const handleCopy = () => {
    let text = `Q${index + 1}. ${question.text}\n\n`;
    if (question.options && question.options.length > 0) {
      text += question.options.join("\n") + "\n\n";
    }
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = async () => {
    try {
      setIsPlaying(true);
      const res = await fetch('/api/questions/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: question.text })
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => setIsPlaying(false);
        audio.play();
      } else {
        setIsPlaying(false);
      }
    } catch {
      setIsPlaying(false);
    }
  };

  const isCorrectOption = (opt: string) => {
    if (!showAnswer) return false;
    const optLetter = opt.match(/^([A-D])\)/)?.[1];
    const ansLetter = question.answer.match(/^([A-D])\)/)?.[1];
    return optLetter && ansLetter && optLetter === ansLetter;
  };

  return (
    <Card className="w-full mb-6 print:break-inside-avoid print:shadow-none print:border-gray-200" data-testid={`card-question-${index}`}>
      <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
        <div className="flex gap-3 flex-1 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0 mt-0.5">
            {index + 1}
          </div>
          <CardTitle className="text-base leading-relaxed font-medium">
            <MathText text={question.text} />
          </CardTitle>
        </div>
        <Badge variant="outline" className={`shrink-0 text-xs ${difficultyColors[question.difficulty] ?? ""}`} data-testid={`badge-difficulty-${index}`}>
          {question.difficulty}
        </Badge>
      </CardHeader>

      <CardContent className="pb-4">
        {question.options && question.options.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 ml-11">
            {question.options.map((opt, i) => {
              const correct = isCorrectOption(opt);
              return (
                <div
                  key={i}
                  className={`p-3 rounded-md border text-sm transition-colors min-w-0 overflow-hidden break-words ${
                    correct
                      ? "bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700"
                      : "bg-secondary/30 border-border"
                  }`}
                >
                  <span className="font-semibold mr-2 text-muted-foreground">
                    {String.fromCharCode(65 + i)})
                  </span>
                  <MathText text={opt.replace(/^[A-D]\)\s*/i, '')} />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col items-start gap-3 pt-4 border-t bg-secondary/10 print:hidden">
        <div className="flex flex-wrap items-center w-full gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAnswer(!showAnswer)}
            data-testid={`button-reveal-answer-${index}`}
            className={showAnswer ? "bg-primary/10 text-primary border-primary/20" : ""}
          >
            {showAnswer ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showAnswer ? "Hide Answer" : "Reveal Answer"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSolution(!showSolution)}
            data-testid={`button-reveal-solution-${index}`}
            className={showSolution ? "bg-primary/10 text-primary border-primary/20" : ""}
          >
            <Lightbulb className="w-4 h-4 mr-2" />
            {showSolution ? "Hide Solution" : "Show Solution"}
          </Button>

          <div className="flex-1" />

          <Button variant="ghost" size="sm" onClick={handleSpeak} disabled={isPlaying} data-testid={`button-speak-${index}`}>
            <Volume2 className={`w-4 h-4 mr-2 ${isPlaying ? "animate-pulse text-primary" : ""}`} />
            {isPlaying ? "Playing..." : "Read Aloud"}
          </Button>

          <Button variant="ghost" size="sm" onClick={handleCopy} data-testid={`button-copy-${index}`}>
            {copied ? <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>

        {showAnswer && (
          <div className="w-full p-4 rounded-md bg-primary/5 border border-primary/10 text-sm animate-in fade-in slide-in-from-top-2" data-testid={`text-answer-${index}`}>
            <span className="font-semibold text-primary mr-2">Correct Answer:</span>
            <MathText text={question.answer} />
          </div>
        )}

        {showSolution && (
          <div className="w-full p-4 rounded-md bg-secondary/50 border text-sm animate-in fade-in slide-in-from-top-2 leading-relaxed" data-testid={`text-solution-${index}`}>
            <span className="font-semibold mb-3 block">Step-by-step Solution:</span>
            <MathText text={question.solution} block className="solution-math space-y-1" />
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
