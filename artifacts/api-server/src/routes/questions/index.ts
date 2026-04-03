import { Router } from "express";
import { generateText } from "../../lib/groq.js";
import { GenerateQuestionsBody } from "@workspace/api-zod";

const router = Router();

router.post("/questions/generate", async (req, res) => {
  try {
    const parsed = GenerateQuestionsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    const { questionText, subject = "General", difficulty = "Medium", count = 5 } = parsed.data;

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

CRITICAL - JSON Escaping Rules (read carefully):
- You are writing JSON. ALL backslashes in string values MUST be doubled.
- Write \\frac not \frac, \\text not \text, \\times not \times, \\sqrt not \sqrt
- Every single LaTeX backslash must appear as \\\\ in the JSON output (two backslashes)

CRITICAL - Math & Symbol Formatting Rules:
- You MUST use LaTeX notation for ALL mathematical expressions using KaTeX syntax
- Wrap inline math in single dollar signs: $expression$
- Wrap display/block math in double dollar signs: $$expression$$
- Examples of correct LaTeX formatting (note double backslashes for JSON):
  - Exponents: $10^{-2}$
  - Fractions: $\\\\frac{1}{2}$
  - Multiplication: $3 \\\\times 10^{-2}$
  - Square root: $\\\\sqrt{3}$
  - Greek letters: $\\\\theta$, $\\\\pi$, $\\\\alpha$, $\\\\omega$, $\\\\lambda$, $\\\\mu$
  - Subscripts/superscripts: $a_{n}$, $v_{0}$, $10^{-9}$
  - Units: $9.8 \\\\, \\\\text{m/s}^2$, $\\\\text{pF}$, $\\\\text{nC}$, $\\\\text{V}$
  - Trigonometry: $\\\\sin(30^{\\\\circ})$, $\\\\cos(\\\\theta)$
  - Scientific notation: $1.8 \\\\times 10^{-2} \\\\, \\\\text{C}$
  - Vectors: $\\\\vec{F}$, $\\\\vec{v}$
  - Chemistry: use \\\\text{} for element symbols and compounds: $\\\\text{H}_2\\\\text{O}$, $\\\\text{CO}_2$
  - Equilibrium/reaction arrows: $\\\\rightleftharpoons$, $\\\\rightarrow$
  - Unit notation: ALWAYS wrap units in \\\\text{}: $\\\\text{N·m}$, $\\\\text{kg·m/s}$
  - Degree symbol: $30^{\\\\circ}$ NOT 30°
  - CRITICAL: Always add spaces around operators: $3 \\\\times 10^{-2}$ not $3\\\\times10^{-2}$
- ALL numbers with units, fractions, exponents, and math symbols MUST be in LaTeX
- Options text must also use LaTeX for math

Respond ONLY with this JSON structure (no markdown, no code blocks):
{
  "topic": "specific topic name",
  "subject": "Physics|Chemistry|Mathematics|Biology|General",
  "difficulty": "Easy|Medium|Hard|JEE Advanced",
  "questions": [
    {
      "id": "q1",
      "text": "question text with $LaTeX$ math",
      "options": ["A) $LaTeX$ option1", "B) $LaTeX$ option2", "C) $LaTeX$ option3", "D) $LaTeX$ option4"],
      "answer": "A) $LaTeX$ correct answer",
      "solution": "Step 1: Use formula $F = ma$. Step 2: Substitute: $F = 2 \\times 5 = 10$ N. Final Answer: $10 \\, \\text{N}$",
      "difficulty": "Easy|Medium|Hard|JEE Advanced"
    }
  ]
}`;

    const rawContent = await generateText(prompt, 4096);

    let parsed_result;
    try {
      const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      // Fix unescaped LaTeX backslashes. The AI often writes single backslashes in JSON
      // string values which is invalid. Some LaTeX sequences (\t, \f, \n, \r, \b) coincide
      // with valid JSON escape chars, so we handle those first with lookahead.
      const fixedJson = cleaned
        // \t followed by a letter = LaTeX command (e.g. \text, \times, \theta), not JSON tab
        .replace(/\\t(?=[a-zA-Z])/g, "\\\\t")
        // \f followed by a letter = LaTeX command (e.g. \frac, \forall), not JSON form-feed
        .replace(/\\f(?=[a-zA-Z])/g, "\\\\f")
        // \n followed by a letter = LaTeX command (e.g. \nabla, \nu), not JSON newline
        .replace(/\\n(?=[a-zA-Z])/g, "\\\\n")
        // \r followed by a letter = LaTeX command (e.g. \rho, \rightarrow), not JSON CR
        .replace(/\\r(?=[a-zA-Z])/g, "\\\\r")
        // \b followed by a letter = LaTeX command (e.g. \beta, \bigcap), not JSON backspace
        .replace(/\\b(?=[a-zA-Z])/g, "\\\\b")
        // Fix all remaining unescaped backslashes (before non-JSON-escape chars like \, \{ etc.)
        .replace(/\\([^"\\\/bfnrtu0-9])/g, "\\\\$1");
      parsed_result = JSON.parse(fixedJson);
    } catch {
      req.log.error({ rawContent }, "Failed to parse AI response as JSON");
      res.status(500).json({ error: "Failed to parse AI response" });
      return;
    }

    res.json(parsed_result);
  } catch (err: unknown) {
    req.log.error({ err }, "Error generating questions");
    const isQuota = (err as { status?: number })?.status === 429;
    if (isQuota) {
      res.status(429).json({
        error: "Groq API rate limit reached. Please wait a moment and try again.",
      });
    } else {
      res.status(500).json({ error: "Failed to generate questions" });
    }
  }
});

export default router;
