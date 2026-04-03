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
  return cleaned
    .replace(/\\t(?=[a-zA-Z])/g, "\\\\t")
    .replace(/\\f(?=[a-zA-Z])/g, "\\\\f")
    .replace(/\\n(?=[a-zA-Z])/g, "\\\\n")
    .replace(/\\r(?=[a-zA-Z])/g, "\\\\r")
    .replace(/\\b(?=[a-zA-Z])/g, "\\\\b")
    .replace(/\\([^"\\\/bfnrtu0-9])/g, "\\\\$1");
}

export async function generateQuestions(
  questionText: string,
  subject: string,
  difficulty: string,
  count: number
): Promise<GenerateQuestionsResult> {
  const prompt = `You are an expert educator for competitive exams like JEE and NEET.
Your task is to analyze a given question and generate similar practice questions.
Always respond with valid JSON only, no markdown code blocks.

Analyze this question and generate ${count} similar practice questions:

"${questionText}"

Instructions:
- Detect the topic, subject, and difficulty level
- Generate ${count} questions similar in concept but with different numbers/values/scenarios
- Each question should be multiple choice with 4 options (A, B, C, D)
- Provide the correct answer and a brief step-by-step solution for each
- Subject hint: ${subject}, Difficulty hint: ${difficulty}

CRITICAL - JSON Escaping Rules:
- You are writing JSON. ALL backslashes in string values MUST be doubled.
- Write \\\\frac not \\frac, \\\\text not \\text, \\\\times not \\times, \\\\sqrt not \\sqrt
- Every single LaTeX backslash must appear as \\\\ in the JSON output

CRITICAL - Math & Symbol Formatting:
- Use LaTeX notation for ALL mathematical expressions using KaTeX syntax
- Wrap inline math in single dollar signs: $expression$
- Examples: $10^{-2}$, $\\\\frac{1}{2}$, $3 \\\\times 10^{-2}$, $\\\\sqrt{3}$, $\\\\theta$, $\\\\pi$
- Units: $9.8 \\\\, \\\\text{m/s}^2$, $\\\\text{pF}$, $\\\\text{nC}$

Respond ONLY with this JSON structure:
{
  "topic": "specific topic name",
  "subject": "Physics|Chemistry|Mathematics|Biology|General",
  "difficulty": "Easy|Medium|Hard|JEE Advanced",
  "questions": [
    {
      "id": "q1",
      "text": "question text with $LaTeX$ math",
      "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
      "answer": "A) correct answer",
      "solution": "Step-by-step solution",
      "difficulty": "Easy|Medium|Hard|JEE Advanced"
    }
  ]
}`;

  const response = await window.puter.ai.chat(prompt, { model: "gpt-4o-mini" });
  const rawContent = getPuterContent(response);

  const fixedJson = fixJsonBackslashes(rawContent);
  const parsed = JSON.parse(fixedJson) as GenerateQuestionsResult;
  return parsed;
}
