const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const MODEL = "gemini-2.0-flash-lite";

interface TextPart { text: string }
interface InlineDataPart { inlineData: { mimeType: string; data: string } }
type Part = TextPart | InlineDataPart;

async function callGemini(parts: Part[], maxTokens = 4096): Promise<string> {
  const url = `${BASE_URL}/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) {
      throw Object.assign(new Error("quota"), { status: 429, body });
    }
    if (res.status === 400 && body.includes("API key expired")) {
      throw Object.assign(new Error("key_expired"), { status: 400, body });
    }
    if (res.status === 400 && body.includes("API_KEY_INVALID")) {
      throw Object.assign(new Error("key_invalid"), { status: 400, body });
    }
    throw new Error(`Gemini API error ${res.status}: ${body}`);
  }

  const data = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export async function generateText(prompt: string, maxTokens = 4096): Promise<string> {
  return callGemini([{ text: prompt }], maxTokens);
}

export async function generateWithImage(
  prompt: string,
  imageBase64: string,
  mimeType: string,
  maxTokens = 1000
): Promise<string> {
  return callGemini(
    [
      { text: prompt },
      { inlineData: { mimeType, data: imageBase64 } },
    ],
    maxTokens
  );
}
