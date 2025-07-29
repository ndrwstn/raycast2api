import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { env } from 'hono/adapter';
import type { Context } from 'hono';
import type { Env } from './types';
import { createErrorResponse, validateApiKey } from './utils';
import { handleChatCompletions } from './handlers/chat';
import { handleModels } from './handlers/models';

const app = new Hono<{ Bindings: Env }>();

app.use(cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

app.use(async (c: Context, next) => {
  const envVars = env<Env>(c);

  if (!envVars.RAYCAST_BEARER_TOKEN) {
    console.error("FATAL: RAYCAST_BEARER_TOKEN is not configured.");
    return createErrorResponse(
      "Server configuration error: Missing Raycast credentials",
      500,
      "server_error"
    );
  }

  if (!validateApiKey(c.req.header("Authorization") || null, envVars)) {
    console.log(`[${new Date().toISOString()}] Failed API Key validation for ${c.req.method} ${c.req.url}`);
    return createErrorResponse(
      "Invalid API key provided.",
      401,
      "authentication_error"
    );
  }

  console.log(`[${new Date().toISOString()}] ${c.req.method} ${c.req.path}`);
  await next();
});

app.post('/v1/chat/completions', async (c) => {
  return handleChatCompletions(c);
});

app.get('/v1/models', async (c) => {
  return handleModels(c);
});

app.get('/health', (c) => {
  return c.json({ status: "ok" });
});

app.all('*', () => {
  return createErrorResponse("Not Found", 404, "invalid_request_error");
});

export default app;
