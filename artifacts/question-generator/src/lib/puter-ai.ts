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

interface VerifiedQuestion {
  id: string;
  verified_answers: string[];
  confidence: "high" | "medium" | "low";
  note?: string;
}

interface VerifyResult {
  questions: VerifiedQuestion[];
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

  // Use gpt-4o for JEE Advanced — significantly more accurate for complex math
  const solveModel = isJeeAdvanced ? "gpt-4o" : "gpt-4o-mini";
  const optionsModel = "gpt-4o-mini";

  // ── PASS 1: Generate questions and SOLVE them fully ────────────────────────
  const multiAnswerNote = isJeeAdvanced
    ? `JEE Advanced question types:
- Type 1 (Single correct): exactly 1 correct option. Set multipleCorrect: false.
- Type 2 (Multiple correct): 2 or more options are correct. Set multipleCorrect: true.
Mix both types across the ${count} questions. For multiple-correct, list ALL correct answer values.`
    : `Single-correct only: "answers" array has exactly 1 element. multipleCorrect: false.`;

  const solveDepth = isJeeAdvanced
    ? `SOLVING REQUIREMENTS (JEE Advanced — be extremely careful):
- Write out EVERY arithmetic and algebraic step explicitly. Do NOT skip steps.
- Show intermediate numerical values at each stage (e.g. "= 3 × 4 = 12").
- After reaching your answer, VERIFY it by substituting back or checking with an alternate method.
- Only then write the final answer into the "answers" array.`
    : `Solve each question step by step and state the final answer clearly.`;

  const pass1Prompt = `You are a highly accurate JEE/NEET mathematics and science expert.

SOURCE QUESTION (topic/style reference only — use DIFFERENT numbers):
"${questionText}"

Subject: ${subject} | Difficulty: ${difficulty}

${multiAnswerNote}

${solveDepth}

Create ${count} NEW practice questions on the same concept with different values. For each:
1. Write the question text clearly with proper math notation
2. Solve it completely step by step (show every calculation)
3. State the exact final answer value(s)

CRITICAL JSON RULES:
- Output ONLY valid JSON — no markdown fences, no prose
- Double ALL backslashes inside strings: \\\\frac \\\\sqrt \\\\times \\\\theta \\\\pi
- Wrap all math in dollar signs: $expression$
- Use \\n between steps in the solution string

JSON format:
{
  "topic": "specific topic",
  "subject": "Physics|Chemistry|Mathematics|Biology|General",
  "difficulty": "Easy|Medium|Hard|JEE Advanced",
  "questions": [
    {
      "id": "q1",
      "text": "Question with $math$",
      "solution": "Step 1: ...\\nStep 2: ...\\nVerification: ...\\nAnswer: ...",
      "answers": ["exact value"],
      "multipleCorrect": false,
      "difficulty": "JEE Advanced"
    }
  ]
}`;

  const r1 = await window.puter.ai.chat(pass1Prompt, { model: solveModel });
  const step1 = parseJson<Step1Result>(getPuterContent(r1));

  if (!step1.questions || step1.questions.length === 0) {
    throw new Error("AI did not return any questions in pass 1.");
  }

  // ── PASS 2 (JEE Advanced only): Independent verification ──────────────────
  // A separate model instance re-solves each question cold to catch errors.
  let verifiedAnswers: Map<string, string[]> | null = null;

  if (isJeeAdvanced) {
    const verifyList = step1.questions
      .map((q) => `ID: ${q.id}\nQuestion: ${q.text}\nPrevious answer(s): ${q.answers.join(", ")}`)
      .join("\n\n---\n\n");

    const verifyPrompt = `You are an independent math checker for JEE Advanced problems.

For each question below:
1. Solve it yourself completely from scratch — ignore the "Previous answer" shown.
2. Compare your answer with the "Previous answer".
3. Report which answer is correct.

Be extremely careful with arithmetic. Show your working internally and only report the final verified answer.

QUESTIONS:
${verifyList}

Output ONLY valid JSON:
{
  "questions": [
    {
      "id": "q1",
      "verified_answers": ["correct value"],
      "confidence": "high|medium|low"
    }
  ]
}`;

    try {
      const rv = await window.puter.ai.chat(verifyPrompt, { model: "gpt-4o" });
      const verify = parseJson<VerifyResult>(getPuterContent(rv));
      if (verify.questions?.length > 0) {
        verifiedAnswers = new Map();
        for (const vq of verify.questions) {
          if (vq.verified_answers?.length > 0) {
            verifiedAnswers.set(vq.id, vq.verified_answers);
          }
        }
      }
    } catch {
      // Verification failed — continue with pass 1 answers
    }
  }

  // Apply verified answers where confidence warrants it
  const resolvedQuestions = step1.questions.map((q) => {
    if (verifiedAnswers) {
      const vAnswers = verifiedAnswers.get(q.id);
      if (vAnswers && vAnswers.length > 0) {
        return { ...q, answers: vAnswers };
      }
    }
    return q;
  });

  // ── PASS 3: Build multiple-choice options ──────────────────────────────────
  const questionsList = resolvedQuestions.map((q) => {
    const answersStr = q.answers.map((a, i) => `Correct answer ${i + 1}: ${a}`).join("\n");
    const type = q.multipleCorrect
      ? "MULTIPLE-CORRECT (2+ options correct)"
      : "SINGLE-CORRECT (exactly 1 option correct)";
    return `ID: ${q.id}\nType: ${type}\nQuestion: ${q.text}\n${answersStr}`;
  }).join("\n\n---\n\n");

  const pass3Prompt = `You are building multiple-choice options for JEE/NEET questions.

Rules:
- SINGLE-CORRECT: place the correct value at a random position (A/B/C/D), fill other 3 with plausible wrong values
- MULTIPLE-CORRECT: place ALL correct values at distinct random positions, fill remaining with plausible wrong values
- Wrong options must look realistic (common mistakes: sign error, factor of 2, wrong formula, reciprocal, etc.)
- "answerLetters" lists EVERY letter that is correct

QUESTIONS:
${questionsList}

Output ONLY valid JSON — no markdown, no extra text:
{
  "questions": [
    {
      "id": "q1",
      "options": ["A) value", "B) value", "C) value", "D) value"],
      "answerLetters": ["B"]
    }
  ]
}`;

  const r3 = await window.puter.ai.chat(pass3Prompt, { model: optionsModel });
  const step2 = parseJson<Step2Result>(getPuterContent(r3));

  // ── COMBINE: merge solutions + options ─────────────────────────────────────
  const optionsMap = new Map<string, Step2Question>();
  for (const q of step2.questions ?? []) {
    optionsMap.set(q.id, q);
  }

  const combined: GeneratedQuestion[] = resolvedQuestions.map((sq) => {
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
      return {
        id: sq.id,
        text: sq.text,
        options,
        answer,
        answers: correctOptions,
        solution: sq.solution,
        difficulty: sq.difficulty,
        multipleCorrect,
      };
    }

    // Fallback: correct answers as first options
    const labels = ["A", "B", "C", "D"];
    const fallbackOptions: string[] = [];
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
