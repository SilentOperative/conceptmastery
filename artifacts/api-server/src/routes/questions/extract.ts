import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

router.post("/questions/extract-image", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = req.body;

    if (!imageBase64) {
      res.status(400).json({ error: "imageBase64 is required" });
      return;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are an expert at reading academic exam questions from images — including printed textbook problems, handwritten notes (even on dark backgrounds or in colored ink), and diagrams. 

Extract the complete question text from this image. Your extraction must include:
- The full question statement
- All answer options (A, B, C, D) if present
- Any mathematical formulas, equations, or quantities with proper notation
- Any given data, conditions, or constraints
- Key terms from any diagrams visible

If the image contains handwriting, interpret it carefully — common subjects are Physics, Chemistry, and Mathematics for JEE/NEET exams.

Return ONLY the extracted question text in plain language. Do not add commentary, titles, or explanations.`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const text = response.choices[0]?.message?.content ?? "";
    res.json({ text });
  } catch (error: unknown) {
    console.error("Image extraction error:", error);
    res.status(500).json({ error: "Failed to extract text from image" });
  }
});

export default router;
