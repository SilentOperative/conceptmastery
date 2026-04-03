import { format } from "date-fns";
import { HistorySession } from "@/hooks/use-history";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trash2, History, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface HistorySidebarProps {
  history: HistorySession[];
  onSelectSession: (session: HistorySession) => void;
  onClearHistory: () => void;
  onDeleteSession: (id: string) => void;
  currentSessionId?: string | null;
}

export function HistorySidebar({ history, onSelectSession, onClearHistory, onDeleteSession, currentSessionId }: HistorySidebarProps) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center text-muted-foreground">
        <History className="w-12 h-12 mb-4 opacity-20" />
        <p className="text-sm font-medium">No history yet</p>
        <p className="text-xs mt-1 opacity-70">Saved sessions will appear here</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card border-r w-full md:w-80 shrink-0">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold flex items-center">
          <History className="w-4 h-4 mr-2" />
          Session History
        </h2>
        <Button variant="ghost" size="icon" onClick={onClearHistory} title="Clear history" data-testid="button-clear-history">
          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
        </Button>
      </div>
      
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
              onClick={() => onSelectSession(session)}
              data-testid={`history-item-${session.id}`}
            >
              <div className="flex items-start justify-between mb-1">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {session.subject}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
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
                <span className="text-[10px] font-medium text-muted-foreground flex items-center">
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
    </div>
  );
}
