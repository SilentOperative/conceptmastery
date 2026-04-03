import { Router } from "express";
import { generateWithImage } from "../../lib/groq.js";

const router = Router();

router.post("/questions/extract-image", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = req.body;

    if (!imageBase64) {
      res.status(400).json({ error: "imageBase64 is required" });
      return;
    }

    const prompt = `You are an expert at reading academic exam questions from images — including printed textbook problems, handwritten notes (even on dark backgrounds or in colored ink), and diagrams.

Your job is ONLY to transcribe what is LITERALLY VISIBLE in the image. Do NOT generate, invent, or infer anything that is not clearly shown.

Extract and transcribe:
- The full question statement exactly as written
- Answer options (A, B, C, D) ONLY if they are visibly printed or written in the image — if they are NOT visible, do NOT include them or make them up
- Mathematical formulas, equations, or quantities exactly as shown
- Any given data, conditions, or constraints visible in the image
- Key terms from any diagrams visible

STRICT RULES:
- Never generate answer options or solutions that are not in the image
- Never add explanations, answers, or extra commentary
- Never guess or hallucinate content — only transcribe what you can clearly see
- If the image only shows a question with no options, output ONLY the question text

If the image contains handwriting, interpret it carefully — common subjects are Physics, Chemistry, and Mathematics for JEE/NEET exams.

Return ONLY the extracted text exactly as it appears. No commentary, no added content, no answers.`;

    const text = await generateWithImage(prompt, imageBase64, mimeType, 1000);
    res.json({ text });
  } catch (error: unknown) {
    console.error("Image extraction error:", error);
    const err = error as { status?: number; message?: string };
    if (err?.status === 429) {
      res.status(429).json({
        error: "Groq API rate limit reached. Please wait a moment and try again.",
      });
    } else if (err?.status === 401) {
      res.status(401).json({
        error: "Your Groq API key is invalid. Please check it at https://console.groq.com and update GROQ_API_KEY in Replit Secrets.",
      });
    } else {
      res.status(500).json({ error: "Failed to extract text from image" });
    }
  }
});

export default router;
