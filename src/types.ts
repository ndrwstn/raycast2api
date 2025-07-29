export interface Env extends Record<string, unknown> {
  RAYCAST_BEARER_TOKEN: string;
  RAYCAST_DEVICE_ID: string;
  RAYCAST_SIGNATURE_SECRET: string;
  API_KEY?: string;
  ADVANCED?: string;
  INCLUDE_DEPRECATED?: string;
}

export interface ModelInfo {
  provider: string;
  model: string;
}

export interface OpenAIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface RaycastMessage {
  author: "user" | "assistant";
  content: {
    text: string;
  };
}

export interface OpenAIChatRequest {
  messages: OpenAIMessage[];
  model?: string;
  temperature?: number;
  stream?: boolean;
  [key: string]: any;
}

export interface RaycastChatRequest {
  model: string;
  provider: string;
  messages: RaycastMessage[];
  system_instruction: string;
  temperature: number;
  additional_system_instructions: string;
  debug: boolean;
  locale: string;
  source: string;
  thread_id: string;
  tools: Array<{
    name: string;
    type: string;
  }>;
}

export interface OpenAIChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
      refusal: string | null;
      annotations: string[];
    };
    logprobs: string | null;
    finish_reason: string | null;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    prompt_tokens_details: {
      cached_tokens: number;
      audio_tokens: number;
    };
    completion_tokens_details: {
      reasoning_tokens: number;
      audio_tokens: number;
      accepted_prediction_tokens: number;
      rejected_prediction_tokens: number;
    };
  };
  service_tier: string;
  system_fingerprint: string | null;
}

export interface RaycastSSEData {
  text?: string;
  finish_reason?: string | null;
}

export interface RaycastRawModelData {
  id: string;
  model: string;
  name: string;
  provider: string;
  requires_better_ai: boolean;
  availability: string;
  [key: string]: any;
}

export interface RaycastModelsApiResponse {
  models: RaycastRawModelData[];
  default_models: Record<string, string>;
}

export interface ErrorResponse {
  error: {
    message: string;
    type: string;
    code?: string | null;
  };
}

export interface MessageConversionResult {
  raycastMessages: RaycastMessage[];
  systemInstruction: string;
}