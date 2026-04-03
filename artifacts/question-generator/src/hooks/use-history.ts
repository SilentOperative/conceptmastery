import { useState, useEffect } from "react";
import { GeneratedQuestion } from "@workspace/api-client-react/src/generated/api.schemas";

export interface HistorySession {
  id: string;
  date: string;
  originalText: string;
  topic: string;
  subject: string;
  difficulty: string;
  questions: GeneratedQuestion[];
}

const HISTORY_KEY = "question_generator_history";

export function useHistory() {
  const [history, setHistory] = useState<HistorySession[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to parse history", e);
    }
  }, []);

  const saveSession = (session: Omit<HistorySession, "id" | "date">) => {
    const newSession: HistorySession = {
      ...session,
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
    };
    
    setHistory((prev) => {
      const newHistory = [newSession, ...prev];
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  const deleteSession = (id: string) => {
    setHistory((prev) => {
      const newHistory = prev.filter((s) => s.id !== id);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      return newHistory;
    });
  };

  return { history, saveSession, clearHistory, deleteSession };
}
