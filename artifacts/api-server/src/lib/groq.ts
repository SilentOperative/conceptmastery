const GROQ_API_KEY = process.env.GROQ_API_KEY ?? "";
const BASE_URL = "https://api.groq.com/openai/v1/chat/completions";

const TEXT_MODEL = "llama-3.3-70b-versatile";
const VISION_MODEL = "llama-3.2-11b-vision-preview";

interface Message {
  role: "user" | "system";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

async function callGroq(messages: Message[], maxTokens = 4096): Promise<string> {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: messages.some(m => Array.isArray(m.content)) ? VISION_MODEL : TEXT_MODEL,
      messages,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) {
      throw Object.assign(new Error("quota"), { status: 429, body });
    }
    if (res.status === 401) {
      throw Object.assign(new Error("key_invalid"), { status: 401, body });
    }
    throw new Error(`Groq API error ${res.status}: ${body}`);
  }

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

export async function generateText(prompt: string, maxTokens = 4096): Promise<string> {
  return callGroq([{ role: "user", content: prompt }], maxTokens);
}

export async function generateWithImage(
  prompt: string,
  imageBase64: string,
  mimeType: string,
  maxTokens = 1000
): Promise<string> {
  return callGroq(
    [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${imageBase64}` },
          },
        ],
      },
    ],
    maxTokens
  );
}
