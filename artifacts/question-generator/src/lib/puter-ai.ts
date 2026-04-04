import type { GenerateQuestionsResult, GeneratedQuestion } from "../types";

declare global {
  interface Window {
    puter: {
      ai: {
        chat: (
          prompt: string | Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }>,
          options?: { model?: string; stream?: boolean }
        ) => Promise<{ message?: { content?: string } } | string>;
      };
    };
  }
}

function getPuterContent(response: { message?: { content?: string } } | string): string {
  if (typeof response === "string") return response;
  return response?.message?.content ?? "";
}

const OCR_PROMPT = `You are an expert at reading academic exam questions from images — including printed textbook problems, handwritten notes, and diagrams.

Your job is ONLY to transcribe what is LITERALLY VISIBLE in the image. Do NOT generate, invent, or infer anything not clearly shown.

Extract and transcribe:
- The full question statement exactly as written
- Answer options (A, B, C, D) ONLY if they are visibly printed or written in the image — if NOT visible, do NOT include them or make them up
- Mathematical formulas, equations, and quantities exactly as shown
- Any given data, conditions, or constraints visible in the image
- Key terms from any diagrams visible

STRICT RULES:
- Never generate answer options or solutions that are not in the image
- Never add explanations, answers, or extra commentary
- Never guess or hallucinate content — only transcribe what you can clearly see
- If the image only shows a question with no options, output ONLY the question text

If the image contains handwriting, interpret it carefully — common subjects are Physics, Chemistry, and Mathematics for JEE/NEET exams.

Return ONLY the extracted text exactly as it appears. No commentary, no added content, no answers.`;

export async function extractTextFromImage(imageBase64: string, mimeType: string): Promise<string> {
  const response = await window.puter.ai.chat(
    [
      {
        role: "user",
        content: [
          { type: "text", text: OCR_PROMPT },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
        ],
      },
    ],
    { model: "gpt-4o-mini" }
  );
  return getPuterContent(response).trim();
}

function fixJsonBackslashes(raw: string): string {
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  let result = "";
  let inString = false;
  let i = 0;

  while (i < cleaned.length) {
    const ch = cleaned[i];
    if (!inString) {
      result += ch;
      if (ch === '"') inString = true;
      i++;
    } else {
      if (ch === "\\") {
        const next = cleaned[i + 1];
        if (next === '"' || next === "\\" || next === "/" ||
            next === "b" || next === "f" || next === "n" ||
            next === "r" || next === "t") {
          result += ch + next;
          i += 2;
        } else if (next === "u") {
          const hex = cleaned.substring(i + 2, i + 6);
          if (/^[0-9a-fA-F]{4}$/.test(hex)) {
            result += ch + next + hex;
            i += 6;
          } else {
            result += "\\\\" + next;
            i += 2;
          }
        } else if (next === undefined || next === "\n" || next === "\r") {
          result += "\\\\";
          i++;
        } else {
          result += "\\\\" + next;
          i += 2;
        }
      } else if (ch === '"') {
        result += ch;
        inString = false;
        i++;
      } else {
        result += ch;
        i++;
      }
    }
  }
  return result;
}

function parseJson<T>(raw: string): T {
  return JSON.parse(fixJsonBackslashes(raw)) as T;
}

interface SolvedQuestion {
  id: string;
  text: string;
  solution: string;
  answers: string[];
  multipleCorrect: boolean;
  difficulty: string;
}

interface Step1Result {
  topic: string;
  subject: string;
  difficulty: string;
  questions: SolvedQuestion[];
}

interface Step2Question {
  id: string;
  options: string[];
  answerLetters: string[];
}

interface Step2Result {
  questions: Step2Question[];
}

export async function generateQuestions(
  questionText: string,
  subject: string,
  difficulty: string,
  count: number
): Promise<GenerateQuestionsResult> {
  const isJeeAdvanced = difficulty === "JEE Advanced";

  // ── PASS 1: Generate questions and SOLVE them (no options yet) ─────────────
  const multiAnswerNote = isJeeAdvanced
    ? `IMPORTANT — JEE Advanced has two question types:
- Type 1 (Single correct): exactly 1 correct option
- Type 2 (Multiple correct): 2 or more correct options (mark multipleCorrect: true)
Mix both types: roughly half single-correct, half multiple-correct.
For multiple-correct questions, list ALL correct answer values in the "answers" array.`
    : `All questions are single-correct: the "answers" array has exactly 1 element.`;

  const pass1Prompt = `You are an expert JEE/NEET educator and mathematician.

SOURCE QUESTION (for style/topic reference only — do NOT reuse its numbers):
"${questionText}"

Subject: ${subject} | Difficulty: ${difficulty}

${multiAnswerNote}

TASK: Create ${count} NEW practice questions on the same concept but with DIFFERENT numbers/values.
For EACH question you MUST:
1. Write the question clearly
2. Work through the complete solution step-by-step showing all calculations
3. State ALL correct answer values (just the values, no A/B/C/D letters yet)

CRITICAL JSON RULES:
- Respond ONLY with valid JSON — no markdown, no extra text
- Double ALL backslashes: \\\\frac  \\\\sqrt  \\\\times  \\\\theta
- Wrap math in dollar signs: $expression$

JSON format:
{
  "topic": "topic name",
  "subject": "Physics|Chemistry|Mathematics|Biology|General",
  "difficulty": "Easy|Medium|Hard|JEE Advanced",
  "questions": [
    {
      "id": "q1",
      "text": "Question text with $math$",
      "solution": "Step 1: ...\nStep 2: ...\nTherefore answer(s) = ...",
      "answers": ["correct value 1", "correct value 2"],
      "multipleCorrect": false,
      "difficulty": "Easy|Medium|Hard|JEE Advanced"
    }
  ]
}`;

  const r1 = await window.puter.ai.chat(pass1Prompt, { model: "gpt-4o-mini" });
  const step1 = parseJson<Step1Result>(getPuterContent(r1));

  if (!step1.questions || step1.questions.length === 0) {
    throw new Error("AI did not return any questions in pass 1.");
  }

  // ── PASS 2: Generate options (correct + distractors) ──────────────────────
  const questionsList = step1.questions.map((q) => {
    const answersStr = q.answers.map((a, i) => `Correct answer ${i + 1}: ${a}`).join("\n");
    const type = q.multipleCorrect
      ? "MULTIPLE-CORRECT (2+ options will be correct)"
      : "SINGLE-CORRECT (exactly 1 option will be correct)";
    return `ID: ${q.id}\nType: ${type}\nQuestion: ${q.text}\n${answersStr}`;
  }).join("\n\n---\n\n");

  const pass2Prompt = `You are creating multiple-choice options for JEE/NEET questions.

For each question you are given the TYPE and the CORRECT ANSWER VALUE(S).
Your job:
- For SINGLE-CORRECT: place the 1 correct value at a random position (A/B/C/D), fill the other 3 with plausible wrong values
- For MULTIPLE-CORRECT: place ALL correct values at different random positions, fill remaining positions with plausible wrong values

QUESTIONS:
${questionsList}

CRITICAL JSON RULES:
- Respond ONLY with valid JSON — no markdown, no extra text
- Double ALL backslashes: \\\\frac  \\\\sqrt  \\\\times
- Wrap math in dollar signs: $expression$
- "answerLetters" must list ALL letters that are correct (e.g. ["A","C"] for multiple-correct)

JSON format:
{
  "questions": [
    {
      "id": "q1",
      "options": ["A) value", "B) value", "C) value", "D) value"],
      "answerLetters": ["B"]
    }
  ]
}`;

  const r2 = await window.puter.ai.chat(pass2Prompt, { model: "gpt-4o-mini" });
  const step2 = parseJson<Step2Result>(getPuterContent(r2));

  // ── COMBINE: merge solutions from pass 1 with options from pass 2 ──────────
  const optionsMap = new Map<string, Step2Question>();
  for (const q of step2.questions ?? []) {
    optionsMap.set(q.id, q);
  }

  const combined: GeneratedQuestion[] = step1.questions.map((sq) => {
    const opts = optionsMap.get(sq.id);
    const multipleCorrect = sq.multipleCorrect ?? false;

    if (opts && opts.options?.length === 4 && opts.answerLetters?.length > 0) {
      const options = opts.options;
      const letters = opts.answerLetters.map((l) => l.toUpperCase());

      const correctOptions = letters
        .map((letter) => {
          const idx = letter.charCodeAt(0) - 65;
          return options[idx] ?? null;
        })
        .filter(Boolean) as string[];

      const answer = letters.sort().join(", ");
      const answers = correctOptions;

      return {
        id: sq.id,
        text: sq.text,
        options,
        answer,
        answers,
        solution: sq.solution,
        difficulty: sq.difficulty,
        multipleCorrect,
      };
    }

    // Fallback if pass 2 failed
    const fallbackOptions: string[] = [];
    const labels = ["A", "B", "C", "D"];
    sq.answers.forEach((val, i) => {
      if (i < 4) fallbackOptions.push(`${labels[i]}) ${val}`);
    });
    while (fallbackOptions.length < 4) {
      fallbackOptions.push(`${labels[fallbackOptions.length]}) —`);
    }
    const fallbackLetters = sq.answers.map((_, i) => labels[i]).slice(0, 4);
    return {
      id: sq.id,
      text: sq.text,
      options: fallbackOptions,
      answer: fallbackLetters.join(", "),
      answers: fallbackOptions.slice(0, sq.answers.length),
      solution: sq.solution,
      difficulty: sq.difficulty,
      multipleCorrect,
    };
  });

  return {
    topic: step1.topic,
    subject: step1.subject,
    difficulty: step1.difficulty,
    questions: combined,
  };
}
