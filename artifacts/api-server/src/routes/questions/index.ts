import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
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

    const systemPrompt = `You are an expert educator for competitive exams like JEE and NEET. 
Your task is to analyze a given question and generate similar practice questions.
Always respond with valid JSON only, no markdown code blocks.`;

    const userPrompt = `Analyze this question and generate ${count} similar practice questions:

"${questionText}"

Instructions:
- Detect the topic, subject, and difficulty level
- Generate ${count} questions similar in concept but with different numbers/values/scenarios
- Each question should be multiple choice with 4 options (A, B, C, D)
- Provide the correct answer and a brief step-by-step solution for each
- Subject hint: ${subject}, Difficulty hint: ${difficulty}

Respond ONLY with this JSON structure (no markdown, no code blocks):
{
  "topic": "specific topic name",
  "subject": "Physics|Chemistry|Mathematics|Biology|General",
  "difficulty": "Easy|Medium|Hard|JEE Advanced",
  "questions": [
    {
      "id": "q1",
      "text": "question text here",
      "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
      "answer": "A) correct option text",
      "solution": "Step 1: ... Step 2: ... Final Answer: ...",
      "difficulty": "Easy|Medium|Hard|JEE Advanced"
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 8192,
    });

    const rawContent = completion.choices[0]?.message?.content ?? "";

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
