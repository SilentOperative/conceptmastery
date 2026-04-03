const BASE_URL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? "https://api.openai.com/v1";
const API_KEY = process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "";

const TEXT_MODEL = "gpt-4o";
const VISION_MODEL = "gpt-4o";

interface TextContent {
  type: "text";
  text: string;
}

interface ImageContent {
  type: "image_url";
  image_url: { url: string };
}

type ContentPart = TextContent | ImageContent;

interface Message {
  role: "user" | "system";
  content: string | ContentPart[];
}

async function callOpenAI(messages: Message[], maxTokens = 4096): Promise<string> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
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
    throw new Error(`OpenAI API error ${res.status}: ${body}`);
  }

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

export async function generateText(prompt: string, maxTokens = 4096): Promise<string> {
  return callOpenAI([{ role: "user", content: prompt }], maxTokens);
}

export async function generateWithImage(
  prompt: string,
  imageBase64: string,
  mimeType: string,
  maxTokens = 1000
): Promise<string> {
  return callOpenAI(
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
