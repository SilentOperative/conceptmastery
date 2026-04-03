import { Router } from "express";

const router = Router();

router.post("/questions/speak", async (req, res) => {
  try {
    const { text } = req.body as { text?: string };
    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "text is required" });
      return;
    }

    const cleanText = text
      .replace(/\$\$[^$]+\$\$/g, "")
      .replace(/\$[^$]+\$/g, "")
      .replace(/\\[a-zA-Z]+\{[^}]*\}/g, "")
      .replace(/[\\{}$]/g, "")
      .trim();

    res.status(503).json({ error: "Text-to-speech is not available without a paid API" });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate speech" });
  }
});

export default router;
