import { Router } from "express";
import { textToSpeech } from "@workspace/integrations-openai-ai-server/audio";

const router = Router();

router.post("/questions/speak", async (req, res) => {
  try {
    const { text } = req.body as { text?: string };
    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "text is required" });
      return;
    }

    const audioBuffer = await textToSpeech(text.slice(0, 4096), "alloy", "mp3");
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", audioBuffer.length);
    res.end(audioBuffer);
  } catch (err) {
    req.log.error({ err }, "Error generating speech");
    res.status(500).json({ error: "Failed to generate speech" });
  }
});

export default router;
