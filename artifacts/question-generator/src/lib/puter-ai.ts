import type { GenerateQuestionsResult } from "../types";

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

function validateAndFixQuestions(result: GenerateQuestionsResult): GenerateQuestionsResult {
  const fixed = result.questions.map((q) => {
    if (!q.options || q.options.length === 0) return q;

    const answerLetter = q.answer.match(/^([A-D])\)/)?.[1];
    if (!answerLetter) return q;

    const answerIndex = answerLetter.charCodeAt(0) - 65;
    const matchingOption = q.options[answerIndex];

    if (!matchingOption) return q;

    const answerValue = q.answer.replace(/^[A-D]\)\s*/, "").trim().toLowerCase();
    const optionValue = matchingOption.replace(/^[A-D]\)\s*/, "").trim().toLowerCase();

    if (answerValue === optionValue) return q;

    const foundIndex = q.options.findIndex((opt) => {
      const optVal = opt.replace(/^[A-D]\)\s*/, "").trim().toLowerCase();
      return optVal === answerValue;
    });

    if (foundIndex !== -1) {
      const correctLetter = String.fromCharCode(65 + foundIndex);
      return { ...q, answer: `${correctLetter}) ${q.answer.replace(/^[A-D]\)\s*/, "").trim()}` };
    }

    const labels = ["A", "B", "C", "D"];
    const newOptions = [...q.options];
    const replaceIdx = answerIndex < newOptions.length ? answerIndex : 0;
    newOptions[replaceIdx] = `${labels[replaceIdx]}) ${q.answer.replace(/^[A-D]\)\s*/, "").trim()}`;
    return { ...q, options: newOptions, answer: `${labels[replaceIdx]}) ${q.answer.replace(/^[A-D]\)\s*/, "").trim()}` };
  });

  return { ...result, questions: fixed };
}

export async function generateQuestions(
  questionText: string,
  subject: string,
  difficulty: string,
  count: number
): Promise<GenerateQuestionsResult> {
  const prompt = `You are an expert educator for competitive exams like JEE and NEET.
Your task is to generate ${count} new practice questions similar to the given question.
Always respond with valid JSON only — no markdown, no explanation, no code blocks.

SOURCE QUESTION:
"${questionText}"

Subject hint: ${subject} | Difficulty hint: ${difficulty}

===== GENERATION RULES =====

STEP 1 — For each new question you create:
  a) Choose different numbers, values, or a slightly different scenario from the source question
  b) FULLY SOLVE the question yourself first — compute the exact numerical answer
  c) Only after confirming the answer, create the 4 options

STEP 2 — Build the 4 options:
  - One option MUST be the exact correct answer you computed in step 1
  - The other 3 options MUST be plausible but WRONG (common calculation mistakes, off-by-one, wrong formula result)
  - Place the correct answer randomly in position A, B, C, or D
  - The "answer" field MUST exactly match the option text of the correct option (same letter, same value)

STEP 3 — Write the solution:
  - Show working step by step that leads to the correct answer

⚠ ABSOLUTE RULE: The correct answer MUST appear verbatim in the options array. Never list an answer that is not one of A/B/C/D.

===== FORMATTING RULES =====

JSON Escaping: ALL backslashes MUST be doubled in JSON strings.
  - Write \\\\frac not \\frac, \\\\sqrt not \\sqrt, \\\\times not \\times

Math: Use LaTeX wrapped in single dollar signs for inline math.
  - Examples: $10^{-2}$, $\\\\frac{a}{b}$, $\\\\sqrt{3}$, $\\\\theta$, $\\\\pi$

===== OUTPUT FORMAT =====

Respond ONLY with this exact JSON structure:
{
  "topic": "specific topic name",
  "subject": "Physics|Chemistry|Mathematics|Biology|General",
  "difficulty": "Easy|Medium|Hard|JEE Advanced",
  "questions": [
    {
      "id": "q1",
      "text": "Full question text with $math$",
      "options": ["A) value1", "B) value2", "C) value3", "D) value4"],
      "answer": "C) value3",
      "solution": "Step 1: ... Step 2: ... Final answer: value3",
      "difficulty": "Easy|Medium|Hard|JEE Advanced"
    }
  ]
}

The "answer" field must match EXACTLY one entry in the "options" array (same letter, same text).`;

  const response = await window.puter.ai.chat(prompt, { model: "gpt-4o-mini" });
  const rawContent = getPuterContent(response);

  const fixedJson = fixJsonBackslashes(rawContent);
  const parsed = JSON.parse(fixedJson) as GenerateQuestionsResult;
  return validateAndFixQuestions(parsed);
}
