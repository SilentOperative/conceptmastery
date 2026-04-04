import { useState } from "react";
import { GeneratedQuestion } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MathText } from "@/components/MathText";
import { Copy, CheckCircle2, Eye, EyeOff, Lightbulb, ListChecks } from "lucide-react";

interface QuestionCardProps {
  question: GeneratedQuestion;
  index: number;
}

export function QuestionCard({ question, index }: QuestionCardProps) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [copied, setCopied] = useState(false);

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
    if (question.multipleCorrect) {
      text += `[One or more options may be correct]\n`;
    }
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isCorrectOption = (opt: string): boolean => {
    if (!showAnswer) return false;

    if (question.answers && question.answers.length > 0) {
      const optLetter = opt.match(/^([A-D])\)/)?.[1];
      if (!optLetter) return false;
      return question.answers.some((ans) => {
        const ansLetter = ans.match(/^([A-D])\)/)?.[1];
        return ansLetter === optLetter;
      });
    }

    const optLetter = opt.match(/^([A-D])\)/)?.[1];
    const correctLetters = question.answer.split(",").map((a) => a.trim().match(/^([A-D])/)?.[1]).filter(Boolean);
    return !!optLetter && correctLetters.includes(optLetter);
  };

  const correctCount = question.answers?.length ?? 1;

  return (
    <Card className="w-full mb-4 md:mb-6 print:break-inside-avoid print:shadow-none print:border-gray-200" data-testid={`card-question-${index}`}>
      <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3">
        <div className="flex gap-3 flex-1 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0 mt-0.5">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base leading-relaxed font-medium">
              <MathText text={question.text} />
            </CardTitle>
            {question.multipleCorrect && (
              <div className="flex items-center gap-1.5 mt-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border border-violet-200 dark:border-violet-800">
                  <ListChecks className="w-3 h-3" />
                  One or more options correct
                </span>
              </div>
            )}
          </div>
        </div>
        <Badge variant="outline" className={`shrink-0 text-xs ${difficultyColors[question.difficulty] ?? ""}`} data-testid={`badge-difficulty-${index}`}>
          {question.difficulty}
        </Badge>
      </CardHeader>

      <CardContent className="pb-4">
        {question.options && question.options.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 mt-2 ml-0 sm:ml-11">
            {question.options.map((opt, i) => {
              const correct = isCorrectOption(opt);
              return (
                <div
                  key={i}
                  className={`p-3 rounded-md border text-sm transition-colors min-w-0 overflow-hidden break-words ${
                    correct
                      ? "bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700 ring-1 ring-green-300 dark:ring-green-700"
                      : "bg-secondary/30 border-border"
                  }`}
                >
                  <span className={`font-semibold mr-2 ${correct ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}`}>
                    {String.fromCharCode(65 + i)})
                  </span>
                  <MathText text={opt.replace(/^[A-D]\)\s*/i, "")} />
                  {correct && showAnswer && (
                    <CheckCircle2 className="inline-block ml-1.5 w-3.5 h-3.5 text-green-600 dark:text-green-400 align-text-bottom" />
                  )}
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

          <Button variant="ghost" size="sm" onClick={handleCopy} data-testid={`button-copy-${index}`}>
            {copied ? <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>

        {showAnswer && (
          <div className="w-full p-4 rounded-md bg-primary/5 border border-primary/10 text-sm animate-in fade-in slide-in-from-top-2" data-testid={`text-answer-${index}`}>
            <span className="font-semibold text-primary mr-2">
              {question.multipleCorrect ? `Correct Answers (${correctCount}):` : "Correct Answer:"}
            </span>
            {question.answers && question.answers.length > 0 ? (
              <span className="font-medium">
                {question.answers.map((a) => a.match(/^([A-D])/)?.[1] ?? a).join(", ")}
                {" — "}
                {question.answers.map((a) => <MathText key={a} text={a.replace(/^[A-D]\)\s*/, "")} />)}
              </span>
            ) : (
              <MathText text={question.answer} />
            )}
          </div>
        )}

        {showSolution && (
          <div className="w-full p-4 rounded-md bg-secondary/50 border text-sm animate-in fade-in slide-in-from-top-2" data-testid={`text-solution-${index}`}>
            <span className="font-semibold mb-3 block">Step-by-step Solution:</span>
            <MathText text={question.solution} block className="solution-math leading-relaxed [&_br]:block [&_br]:mb-2" />
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
