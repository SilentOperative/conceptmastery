export interface GeneratedQuestion {
  id?: string;
  text: string;
  options?: string[];
  answer: string;
  solution: string;
  difficulty: string;
}

export type Subject = "Physics" | "Chemistry" | "Mathematics" | "Biology" | "General";
export type Difficulty = "Easy" | "Medium" | "Hard" | "JEE Advanced";

export interface GenerateQuestionsResult {
  topic: string;
  subject: string;
  difficulty: string;
  questions: GeneratedQuestion[];
}
