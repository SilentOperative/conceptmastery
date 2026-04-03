import { Router } from "express";
import { generateWithImage } from "../../lib/gemini.js";

const router = Router();

router.post("/questions/extract-image", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = req.body;

    if (!imageBase64) {
      res.status(400).json({ error: "imageBase64 is required" });
      return;
    }

    const prompt = `You are an expert at reading academic exam questions from images — including printed textbook problems, handwritten notes (even on dark backgrounds or in colored ink), and diagrams. 

Extract the complete question text from this image. Your extraction must include:
- The full question statement
- All answer options (A, B, C, D) if present
- Any mathematical formulas, equations, or quantities with proper notation
- Any given data, conditions, or constraints
- Key terms from any diagrams visible

If the image contains handwriting, interpret it carefully — common subjects are Physics, Chemistry, and Mathematics for JEE/NEET exams.

Return ONLY the extracted question text in plain language. Do not add commentary, titles, or explanations.`;

    const text = await generateWithImage(prompt, imageBase64, mimeType, 1000);
    res.json({ text });
  } catch (error: unknown) {
    console.error("Image extraction error:", error);
    const isQuota = (error as { status?: number })?.status === 429;
    if (isQuota) {
      res.status(429).json({
        error: "Gemini API quota exceeded. Please wait a moment and try again, or check your API key at https://aistudio.google.com/app/apikey",
      });
    } else {
      res.status(500).json({ error: "Failed to extract text from image" });
    }
  }
});

export default router;
