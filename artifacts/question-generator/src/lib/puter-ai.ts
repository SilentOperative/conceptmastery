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
        if (
          next === '"' || next === "\\" || next === "/" ||
          next === "b" || next === "f" || next === "n" ||
          next === "r" || next === "t"
        ) {
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
  answer: string;
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
  answerLetter: string;
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

  // ── PASS 1: Generate questions and SOLVE them ──────────────────────────────
  // No options yet — model focuses entirely on getting the math right.
  const pass1Prompt = `You are an expert JEE/NEET educator and mathematician.

SOURCE QUESTION (for style/topic reference only — do NOT reuse its numbers):
"${questionText}"

Subject: ${subject} | Difficulty: ${difficulty}

TASK: Create ${count} NEW practice questions on the same concept but with DIFFERENT numbers/values.
For EACH question you MUST:
1. Write the question clearly
2. Work through the solution step-by-step showing all calculations
3. State the final exact answer (a number, expression, or short value)

CRITICAL JSON RULES:
- Respond ONLY with valid JSON — no markdown, no extra text
- Double ALL backslashes in strings: \\\\frac  \\\\sqrt  \\\\times  \\\\theta
- Wrap math in dollar signs: $expression$

JSON format:
{
  "topic": "topic name",
  "subject": "Physics|Chemistry|Mathematics|Biology|General",
  "difficulty": "Easy|Medium|Hard|JEE Advanced",
  "questions": [
    {
      "id": "q1",
      "text": "Question text with $math$ notation",
      "solution": "Step 1: ... Step 2: ... Therefore answer = X",
      "answer": "exact final answer value only (e.g. 233, 52, $\\\\frac{3}{4}$)",
      "difficulty": "Easy|Medium|Hard|JEE Advanced"
    }
  ]
}`;

  const r1 = await window.puter.ai.chat(pass1Prompt, { model: "gpt-4o-mini" });
  const step1 = parseJson<Step1Result>(getPuterContent(r1));

  if (!step1.questions || step1.questions.length === 0) {
    throw new Error("AI did not return any questions in pass 1.");
  }

  // ── PASS 2: Generate 3 wrong distractors for each solved question ──────────
  // The correct answer is already known — model only needs to invent plausible wrong ones.
  const questionsList = step1.questions
    .map((q) => `ID: ${q.id}\nQuestion: ${q.text}\nCORRECT ANSWER: ${q.answer}`)
    .join("\n\n");

  const pass2Prompt = `You are creating multiple-choice distractors for JEE/NEET questions.

For each question below, you know the CORRECT ANSWER. Your job is to create 3 WRONG options that look plausible (typical calculation mistakes, sign errors, off-by-one, wrong formula, etc.).

Then arrange ALL 4 options (3 wrong + 1 correct) in a random order across positions A, B, C, D.

QUESTIONS:
${questionsList}

CRITICAL JSON RULES:
- Respond ONLY with valid JSON — no markdown, no extra text
- Double ALL backslashes: \\\\frac  \\\\sqrt  \\\\times
- Wrap math in dollar signs: $expression$
- "answerLetter" must be exactly which letter (A/B/C/D) holds the correct answer

JSON format:
{
  "questions": [
    {
      "id": "q1",
      "options": ["A) value", "B) value", "C) value", "D) value"],
      "answerLetter": "B"
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

    let options: string[] = [];
    let answer = sq.answer;

    if (opts && opts.options && opts.options.length === 4 && opts.answerLetter) {
      options = opts.options;
      const letter = opts.answerLetter.toUpperCase();
      const idx = letter.charCodeAt(0) - 65;
      const optionValue = options[idx]?.replace(/^[A-D]\)\s*/, "").trim() ?? sq.answer;
      answer = `${letter}) ${optionValue}`;
    } else {
      // Fallback: put correct answer as option A if pass 2 failed
      options = [
        `A) ${sq.answer}`,
        "B) Cannot be determined",
        "C) None of these",
        "D) Insufficient data",
      ];
      answer = `A) ${sq.answer}`;
    }

    return {
      id: sq.id,
      text: sq.text,
      options,
      answer,
      solution: sq.solution,
      difficulty: sq.difficulty,
    };
  });

  return {
    topic: step1.topic,
    subject: step1.subject,
    difficulty: step1.difficulty,
    questions: combined,
  };
}
