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

// Deterministically build options from correct answers + distractors.
// The AI never touches placement — code does it randomly but verifiably.
function buildOptions(correctValues: string[], distractors: string[]): {
  options: string[];
  answerLetters: string[];
  correctOptionStrings: string[];
} {
  const LABELS = ["A", "B", "C", "D"];
  const needed = Math.min(correctValues.length, 4);
  const wrongNeeded = 4 - needed;
  const wrongs = distractors.slice(0, wrongNeeded);

  // Combine correct + wrong values
  const pool: Array<{ value: string; correct: boolean }> = [
    ...correctValues.slice(0, needed).map((v) => ({ value: v, correct: true })),
    ...wrongs.map((v) => ({ value: v, correct: false })),
  ];

  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const options = pool.map((item, i) => `${LABELS[i]}) ${item.value}`);
  const answerLetters = pool
    .map((item, i) => (item.correct ? LABELS[i] : null))
    .filter(Boolean) as string[];
  const correctOptionStrings = pool
    .map((item, i) => (item.correct ? `${LABELS[i]}) ${item.value}` : null))
    .filter(Boolean) as string[];

  return { options, answerLetters, correctOptionStrings };
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
}
interface VerifyResult {
  questions: VerifiedQuestion[];
}

interface DistractorQuestion {
  id: string;
  distractors: string[];
}
interface DistractorResult {
  questions: DistractorQuestion[];
}

export async function generateQuestions(
  questionText: string,
  subject: string,
  difficulty: string,
  count: number
): Promise<GenerateQuestionsResult> {
  const isJeeAdvanced = difficulty === "JEE Advanced";
  const solveModel = isJeeAdvanced ? "gpt-4o" : "gpt-4o-mini";

  // ── PASS 1: Generate questions and solve them ──────────────────────────────
  const multiAnswerNote = isJeeAdvanced
    ? `JEE Advanced has two types:
- Single correct (multipleCorrect: false): exactly 1 correct answer
- Multiple correct (multipleCorrect: true): 2+ correct answers
Mix both types. For multiple-correct, list ALL correct values in "answers".`
    : `Single-correct only. "answers" has exactly 1 element. multipleCorrect: false.`;

  const solveNote = isJeeAdvanced
    ? `You are solving JEE Advanced level problems. Be extremely careful:
- Write EVERY arithmetic step explicitly with intermediate values
- Do NOT skip any calculation steps
- After getting an answer, verify it by an alternate method or substitution
- Choose numbers that give clean integer or simple fraction answers`
    : `Solve step by step. Choose numbers that give clean integer answers.`;

  const pass1Prompt = `You are an expert JEE/NEET mathematics and science teacher.

SOURCE QUESTION (topic reference only — use DIFFERENT numbers):
"${questionText}"

Subject: ${subject} | Difficulty: ${difficulty}

${multiAnswerNote}

${solveNote}

Create ${count} NEW practice questions on the same concept with different values.
For each question:
1. Write the question clearly with math notation
2. Solve it completely showing ALL steps
3. State the exact final answer value(s) — just the numerical values, no A/B/C/D

CRITICAL JSON RULES:
- Output ONLY valid JSON — no markdown, no prose
- Double ALL backslashes: \\\\frac \\\\sqrt \\\\times \\\\theta \\\\pi
- Wrap math in dollar signs: $expression$

{
  "topic": "topic name",
  "subject": "Physics|Chemistry|Mathematics|Biology|General",
  "difficulty": "Easy|Medium|Hard|JEE Advanced",
  "questions": [
    {
      "id": "q1",
      "text": "Question with $math$",
      "solution": "Step 1: ...\\nStep 2: ...\\nAnswer: ...",
      "answers": ["value"],
      "multipleCorrect": false,
      "difficulty": "Easy|Medium|Hard|JEE Advanced"
    }
  ]
}`;

  const r1 = await window.puter.ai.chat(pass1Prompt, { model: solveModel });
  const step1 = parseJson<Step1Result>(getPuterContent(r1));

  if (!step1.questions?.length) {
    throw new Error("AI did not return any questions.");
  }

  // ── PASS 2 (JEE Advanced): Independent verification ───────────────────────
  let resolvedQuestions = step1.questions;

  if (isJeeAdvanced) {
    const verifyList = step1.questions
      .map((q) => `ID: ${q.id}\nQuestion: ${q.text}`)
      .join("\n\n---\n\n");

    const verifyPrompt = `You are an independent math expert checking JEE Advanced problems.

For each question below, solve it completely from scratch on your own.
Show your working. State the final answer value(s).

${verifyList}

Output ONLY valid JSON:
{
  "questions": [
    {
      "id": "q1",
      "verified_answers": ["value"]
    }
  ]
}`;

    try {
      const rv = await window.puter.ai.chat(verifyPrompt, { model: "gpt-4o" });
      const verify = parseJson<VerifyResult>(getPuterContent(rv));
      const vMap = new Map(verify.questions?.map((q) => [q.id, q.verified_answers]) ?? []);

      resolvedQuestions = step1.questions.map((q) => {
        const va = vMap.get(q.id);
        if (va?.length) {
          // Both passes agreed → high confidence; use verified answer
          const pass1Norm = q.answers.map((a) => a.trim().toLowerCase()).join(",");
          const pass2Norm = va.map((a) => a.trim().toLowerCase()).join(",");
          // If they agree use pass2 (verified), otherwise keep pass1 with both noted in solution
          if (pass1Norm === pass2Norm) {
            return { ...q, answers: va };
          } else {
            // Disagreement: trust the verifier (gpt-4o second opinion)
            return {
              ...q,
              answers: va,
              solution: q.solution + `\n\n[Verified answer: ${va.join(", ")}]`,
            };
          }
        }
        return q;
      });
    } catch {
      // Verification failed — continue with pass 1 answers
    }
  }

  // ── PASS 3: Generate ONLY wrong distractors ────────────────────────────────
  // The AI's ONLY job here is inventing 3 plausible wrong values.
  // Placement of the correct answer is done by our code — never the AI.
  const distractorList = resolvedQuestions.map((q) => {
    const correctStr = q.answers.join(", ");
    const wrongCount = 4 - Math.min(q.answers.length, 4);
    return `ID: ${q.id}\nQuestion: ${q.text}\nCorrect answer(s): ${correctStr}\nGenerate exactly ${wrongCount} WRONG values that look plausible (e.g. common mistakes, off-by-factor, wrong sign, etc.)`;
  }).join("\n\n---\n\n");

  const pass3Prompt = `You are generating WRONG distractor options for JEE/NEET multiple-choice questions.

For each question you are told the CORRECT answer. Your only job is to invent plausible WRONG values.
Wrong values should look realistic — like answers a student might get from a common mistake.
Do NOT include the correct answer in your distractors.

${distractorList}

Output ONLY valid JSON — no markdown:
{
  "questions": [
    {
      "id": "q1",
      "distractors": ["wrong1", "wrong2", "wrong3"]
    }
  ]
}`;

  const r3 = await window.puter.ai.chat(pass3Prompt, { model: "gpt-4o-mini" });
  const step3 = parseJson<DistractorResult>(getPuterContent(r3));
  const distractorMap = new Map(step3.questions?.map((q) => [q.id, q.distractors]) ?? []);

  // ── COMBINE: code builds options — AI never touches placement ─────────────
  const combined: GeneratedQuestion[] = resolvedQuestions.map((sq) => {
    const distractors = distractorMap.get(sq.id) ?? ["Cannot be determined", "None of these", "Insufficient data"];
    const { options, answerLetters, correctOptionStrings } = buildOptions(sq.answers, distractors);
    const multipleCorrect = sq.multipleCorrect ?? false;

    return {
      id: sq.id,
      text: sq.text,
      options,
      answer: answerLetters.sort().join(", "),
      answers: correctOptionStrings,
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
