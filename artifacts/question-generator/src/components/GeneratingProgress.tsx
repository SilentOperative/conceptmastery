import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

const STAGES = [
  { label: "Analyzing your question", detail: "Understanding the concept and topic area", duration: 2200 },
  { label: "Identifying related patterns", detail: "Finding similar problem types in JEE/NEET", duration: 2800 },
  { label: "Crafting practice questions", detail: "Creating unique variations with different values", duration: 3500 },
  { label: "Writing step-by-step solutions", detail: "Generating detailed explanations for each question", duration: 4000 },
  { label: "Formatting math notation", detail: "Rendering formulas and equations with LaTeX", duration: 99999 },
];

interface GeneratingProgressProps {
  isVisible: boolean;
  questionCount: number;
}

export function GeneratingProgress({ isVisible, questionCount }: GeneratingProgressProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [stageProgress, setStageProgress] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setCurrentStage(0);
      setStageProgress(0);
      return;
    }

    let stage = 0;
    let elapsed = 0;
    const interval = 80;

    const tick = setInterval(() => {
      elapsed += interval;
      const stageDuration = STAGES[stage]?.duration ?? 99999;
      const pct = Math.min((elapsed / stageDuration) * 100, 99);
      setStageProgress(pct);

      if (elapsed >= stageDuration && stage < STAGES.length - 1) {
        stage += 1;
        elapsed = 0;
        setCurrentStage(stage);
        setStageProgress(0);
      }
    }, interval);

    return () => clearInterval(tick);
  }, [isVisible]);

  if (!isVisible) return null;

  const overallPct = Math.round(
    ((currentStage / STAGES.length) * 100) + (stageProgress / STAGES.length)
  );

  return (
    <div className="w-full rounded-xl border bg-card shadow-sm p-6 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Generating {questionCount} practice questions...
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            This usually takes 10–20 seconds
          </p>
        </div>
        <span className="text-2xl font-bold tabular-nums text-primary">{overallPct}%</span>
      </div>

      <div className="relative h-2 w-full bg-secondary rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-300 ease-out"
          style={{ width: `${overallPct}%` }}
        />
        <div
          className="absolute left-0 top-0 h-full rounded-full opacity-40"
          style={{
            width: `${overallPct}%`,
            background: "linear-gradient(90deg, transparent 0%, white 50%, transparent 100%)",
            animation: "shimmer 1.5s infinite",
          }}
        />
      </div>

      <div className="space-y-2">
        {STAGES.map((stage, i) => {
          const isDone = i < currentStage;
          const isActive = i === currentStage;
          return (
            <div
              key={i}
              className={`flex items-start gap-3 transition-all duration-300 ${
                isDone ? "opacity-50" : isActive ? "opacity-100" : "opacity-25"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : isActive ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-border" />
                )}
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                  {stage.label}
                </p>
                {isActive && (
                  <p className="text-xs text-muted-foreground mt-0.5 animate-in fade-in duration-300">
                    {stage.detail}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
