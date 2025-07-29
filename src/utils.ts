import { v4 as uuidv4 } from "uuid";
import type {
  Env,
  ModelInfo,
  RaycastModelsApiResponse,
  RaycastRawModelData,
  OpenAIMessage,
  MessageConversionResult,
  RaycastSSEData,
  ErrorResponse
} from "./types";
import { RAYCAST_MODELS_URL, USER_AGENT, DEFAULT_PROVIDER, DEFAULT_INTERNAL_MODEL } from "./config";

async function calculateSignatureV2(timestamp: string, deviceId: string, bodyStr: string, signatureSecret?: string) {
  if (!signatureSecret) {
    console.warn("No signature secret provided. Using default.");
    signatureSecret = "6bc455473576ce2cd6f70426caff867aabbe3f7291c1a79681af5e8ce0ca1408"
  }

  // ROT13+ROT5 encoding function as closure
  function rot13rot5Encode(str: string) {
      return str.split("").map(char => {
          const charCode = char.charCodeAt(0);
          // Uppercase letters A-Z (65-90): ROT13
          if (charCode >= 65 && charCode <= 90) {
              return String.fromCharCode((charCode - 65 + 13) % 26 + 65);
          }
          // Lowercase letters a-z (97-122): ROT13
          else if (charCode >= 97 && charCode <= 122) {
              return String.fromCharCode((charCode - 97 + 13) % 26 + 97);
          }
          // Numbers 0-9 (48-57): ROT5
          else if (charCode >= 48 && charCode <= 57) {
              return String.fromCharCode((charCode - 48 + 5) % 10 + 48);
          }
          // Other characters remain unchanged
          else {
              return char;
          }
      }).join("");
  }

  // Encode the body string and create SHA-256 hash
  const bodyBytes = new TextEncoder().encode(bodyStr);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bodyBytes);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");

  // Create the message to sign by joining timestamp, deviceId, and hash
  // Apply ROT13+ROT5 encoding to each component
  const message = [timestamp, deviceId, hashHex]
      .map(rot13rot5Encode)
      .join(".");

  // Set up HMAC signing
  const encoder = new TextEncoder();
  const secretKey = encoder.encode(signatureSecret);
  const messageBytes = encoder.encode(message);

  // Import the secret key for HMAC
  const cryptoKey = await crypto.subtle.importKey(
      "raw",
      secretKey,
      {
          name: "HMAC",
          hash: "SHA-256"
      },
      false,
      ["sign"]
  );

  // Sign the message
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageBytes);

  // Convert signature to hex string
  return Array.from(new Uint8Array(signature))
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");
}

export async function getRaycastHeaders(env: Env, bodyString: string | null = null): Promise<Record<string, string>> {
  const timestamp = new Date().toISOString();
  const deviceId = env.RAYCAST_DEVICE_ID;
  const headers: Record<string, string> = {
    "Host": "backend.raycast.com",
    "Accept": "application/json",
    "User-Agent": USER_AGENT,
    "Authorization": `Bearer ${env.RAYCAST_BEARER_TOKEN}`,
    "Accept-Language": "en-US,en;q=0.9",
    "Content-Type": "application/json",
    "Connection": "close",
    "X-Raycast-Timestamp": timestamp,
    "X-Raycast-DeviceId": deviceId,
  };

  if (bodyString) {
    headers["X-Raycast-Signature-v2"] = await calculateSignatureV2(timestamp, deviceId, bodyString, env.RAYCAST_SIGNATURE_SECRET);
  }
  return headers;
}

export function validateApiKey(authHeader: string | null, env: Env): boolean {
  if (!env.API_KEY) return true;
  const providedKey = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : null;
  return providedKey === env.API_KEY;
}

export async function fetchModels(env: Env): Promise<Map<string, ModelInfo>> {
  try {
    const response = await fetch(RAYCAST_MODELS_URL, {
      method: "GET",
      headers: await getRaycastHeaders(env),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Raycast API error (${response.status}): ${errorText}`);
      throw new Error(`Raycast API error: ${response.status}`);
    }

    const parsedResponse = await response.json() as RaycastModelsApiResponse;
    if (!parsedResponse?.models) {
      console.error("Invalid Raycast models API response structure:", parsedResponse);
      throw new Error("Invalid response structure from Raycast API");
    }

    const models = new Map<string, ModelInfo>();
    const showAdvanced = env.ADVANCED?.toLowerCase() !== "false";
    const includeDeprecated = env.INCLUDE_DEPRECATED?.toLowerCase() !== "false";

    console.log(`Filtering flags: showAdvanced=${showAdvanced}, includeDeprecated=${includeDeprecated}`);

    for (const modelData of parsedResponse.models as RaycastRawModelData[]) {
      const isPremium = modelData.requires_better_ai;
      const isDeprecated = modelData.availability === "deprecated";

      if ((showAdvanced || !isPremium) && (includeDeprecated || !isDeprecated)) {
        models.set(modelData.id, {
          provider: modelData.provider,
          model: modelData.model,
        });
      } else {
        console.log(`Filtering out model: ${modelData.id} (Premium: ${isPremium}, Deprecated: ${isDeprecated})`);
      }
    }

    console.log(`Fetched and filtered ${models.size} models.`);
    if (models.size === 0) console.warn("Warning: No models available after filtering.");
    return models;
  } catch (error) {
    console.error("Error fetching or processing models:", error);
    return new Map();
  }
}

export function getProviderInfo(modelId: string, models: Map<string, ModelInfo>): ModelInfo {
  const info = models.get(modelId);
  if (info) return info;

  console.warn(`Model ID "${modelId}" not found. Falling back to defaults.`);
  return { provider: DEFAULT_PROVIDER, model: DEFAULT_INTERNAL_MODEL };
}

export function convertMessages(openaiMessages: OpenAIMessage[]): MessageConversionResult {
  let systemInstruction = "markdown";
  const raycastMessages = [];

  for (const [index, msg] of openaiMessages.entries()) {
    if (msg.role === "system" && index === 0) {
      systemInstruction = msg.content;
    } else if (msg.role === "user" || msg.role === "assistant") {
      raycastMessages.push({
        author: msg.role,
        content: { text: msg.content },
      });
    }
  }

  return { raycastMessages, systemInstruction };
}

export function parseSSEResponse(responseText: string): string {
  let fullText = "";
  for (const line of responseText.split("\n")) {
    if (line.startsWith("data:")) {
      try {
        const jsonData: RaycastSSEData = JSON.parse(line.substring(5).trim());
        if (jsonData.text) fullText += jsonData.text;
      } catch (e) {
        console.error("Failed to parse SSE data line:", line, "Error:", e);
      }
    }
  }
  return fullText;
}

export function createErrorResponse(
  message: string,
  status: number = 500,
  type: string = "relay_error"
): Response {
  const errorResponse: ErrorResponse = {
    error: {
      message,
      type,
      code: null,
    },
  };

  return new Response(JSON.stringify(errorResponse), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export function generateUUID(): string {
  return uuidv4();
}