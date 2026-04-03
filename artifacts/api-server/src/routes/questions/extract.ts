import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

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

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: imageBase64,
        },
      },
    ]);

    const text = result.response.text();
    res.json({ text });
  } catch (error: unknown) {
    console.error("Image extraction error:", error);
    res.status(500).json({ error: "Failed to extract text from image" });
  }
});

export default router;
