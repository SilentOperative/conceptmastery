import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GenerateQuestionsBody } from "@workspace/api-zod";

const router = Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

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

CRITICAL - Math Formatting Rules:
- You MUST use LaTeX notation for ALL mathematical expressions using KaTeX syntax
- Wrap inline math in single dollar signs: $expression$
- Wrap display/block math in double dollar signs: $$expression$$
- Examples of correct LaTeX formatting:
  - Exponents: $10^{-2}$ NOT "10^-2"
  - Fractions: $\\frac{1}{2}$ NOT "1/2"
  - Multiplication: $3 \\times 10^{-2}$ NOT "3 x 10^-2"
  - Square root: $\\sqrt{3}$ NOT "sqrt(3)"
  - Greek letters: $\\theta$, $\\pi$, $\\alpha$, $\\omega$
  - Subscripts: $a_{n}$, $v_{0}$
  - Units with numbers: $9.8 \\, \\text{m/s}^2$
  - Trigonometry: $\\sin(30°)$, $\\cos(\\theta)$
  - Scientific notation: $1.8 \\times 10^{-2} \\, \\text{C·m}$
  - Unit notation: ALWAYS wrap units in \\text{}: $\\text{C·m}$, $\\text{N·m}$, $\\text{kg·m/s}$
  - CRITICAL: Always add spaces around operators: $3 \\times 10^{-2}$ not $3\\times10^{-2}$
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

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const rawContent = result.response.text();

    let parsed_result;
    try {
      const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed_result = JSON.parse(cleaned);
    } catch {
      req.log.error({ rawContent }, "Failed to parse AI response as JSON");
      res.status(500).json({ error: "Failed to parse AI response" });
      return;
    }

    res.json(parsed_result);
  } catch (err) {
    req.log.error({ err }, "Error generating questions");
    res.status(500).json({ error: "Failed to generate questions" });
  }
});

export default router;
