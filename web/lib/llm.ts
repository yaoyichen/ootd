/**
 * LLM Provider 抽象层
 *
 * 通过 LLM_PROVIDER 环境变量切换后端：
 *   "dashscope"     → DashScope（生产环境）
 *   "openai-compat" → 免费 OpenAI 兼容 API（开发环境，默认值）
 */

type Role = "system" | "user" | "assistant";

export type MessageContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    >;

export interface ChatMessage {
  role: Role;
  content: MessageContent;
}

export interface ChatCompletionOptions {
  model: "text" | "vision";
  messages: ChatMessage[];
  temperature?: number;
}

export interface ChatResponse {
  content: string;
}

interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  textModel: string;
  visionModel: string;
}

function getProvider(): "dashscope" | "openai-compat" {
  const v = process.env.LLM_PROVIDER ?? "openai-compat";
  if (v === "dashscope" || v === "openai-compat") return v;
  throw new Error(`Unknown LLM_PROVIDER: ${v}`);
}

function getConfig(): ProviderConfig {
  const provider = getProvider();

  if (provider === "dashscope") {
    const apiKey = process.env.DASHSCOPE_API_KEY ?? "";
    if (!apiKey) throw new Error("DASHSCOPE_API_KEY not configured");
    return {
      baseUrl:
        "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      apiKey,
      textModel: "qwen-max",
      visionModel: "qwen-vl-max",
    };
  }

  // openai-compat
  const baseUrl = process.env.OPENAI_COMPAT_BASE_URL ?? "";
  const apiKey = process.env.OPENAI_COMPAT_API_KEY ?? "";
  if (!baseUrl) throw new Error("OPENAI_COMPAT_BASE_URL not configured");
  if (!apiKey) throw new Error("OPENAI_COMPAT_API_KEY not configured");

  return {
    baseUrl: `${baseUrl.replace(/\/+$/, "")}/chat/completions`,
    apiKey,
    textModel: process.env.OPENAI_COMPAT_MODEL ?? "gpt-4o",
    visionModel: process.env.OPENAI_COMPAT_VISION_MODEL ?? "gpt-4o",
  };
}

export async function chatCompletion(
  options: ChatCompletionOptions
): Promise<ChatResponse> {
  const config = getConfig();
  const model =
    options.model === "vision" ? config.visionModel : config.textModel;

  const res = await fetch(config.baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      apikey: config.apiKey,
    },
    body: JSON.stringify({
      model,
      messages: options.messages,
      ...(options.temperature !== undefined && {
        temperature: options.temperature,
      }),
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error(`[LLM ${getProvider()}] error:`, data);
    throw new Error(data.error?.message || "LLM 请求失败");
  }

  const content: string = data.choices?.[0]?.message?.content ?? "";
  return { content };
}
