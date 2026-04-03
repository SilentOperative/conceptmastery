import { format } from "date-fns";
import { HistorySession } from "@/hooks/use-history";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trash2, History, ChevronRight, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface HistorySidebarProps {
  history: HistorySession[];
  onSelectSession: (session: HistorySession) => void;
  onClearHistory: () => void;
  onDeleteSession: (id: string) => void;
  currentSessionId?: string | null;
  isOpen?: boolean;
  onClose?: () => void;
}

export function HistorySidebar({
  history,
  onSelectSession,
  onClearHistory,
  onDeleteSession,
  currentSessionId,
  isOpen,
  onClose,
}: HistorySidebarProps) {
  const isEmpty = history.length === 0;

  const handleSelect = (session: HistorySession) => {
    onSelectSession(session);
    onClose?.();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-card border-r w-full">
      <div className="p-4 border-b flex items-center justify-between shrink-0">
        <h2 className="font-semibold flex items-center text-sm">
          <History className="w-4 h-4 mr-2" />
          Session History
        </h2>
        <div className="flex items-center gap-1">
          {!isEmpty && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClearHistory}
              title="Clear history"
              data-testid="button-clear-history"
              className="h-8 w-8"
            >
              <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 md:hidden"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center flex-1 p-6 text-center text-muted-foreground">
          <History className="w-10 h-10 mb-3 opacity-20" />
          <p className="text-sm font-medium">No history yet</p>
          <p className="text-xs mt-1 opacity-70">Saved sessions will appear here</p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {history.map((session) => (
              <div
                key={session.id}
                className={`p-3 rounded-lg border transition-colors cursor-pointer group ${
                  currentSessionId === session.id
                    ? "bg-primary/5 border-primary/30"
                    : "bg-background hover:bg-secondary/50 border-transparent hover:border-border"
                }`}
                onClick={() => handleSelect(session)}
                data-testid={`history-item-${session.id}`}
              >
                <div className="flex items-start justify-between mb-1 gap-2">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                    {session.subject}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {format(new Date(session.date), "MMM d, h:mm a")}
                  </span>
                </div>
                <h3 className="font-medium text-sm line-clamp-1 mb-1 text-foreground/90">
                  {session.topic || "Unknown Topic"}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {session.originalText}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {session.questions.length} questions
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    data-testid={`button-delete-session-${session.id}`}
                  >
                    <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar — always visible on md+ */}
      <div className="hidden md:flex flex-col h-full w-72 lg:w-80 shrink-0 print:hidden">
        {sidebarContent}
      </div>

      {/* Mobile drawer overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden print:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[85vw] shadow-xl animate-in slide-in-from-left duration-300">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
