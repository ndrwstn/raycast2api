# Raycast2API

Convert Raycast AI API to OpenAI-compatible API. Built with HonoJS, supports Raycast V2 authentication, deployable to Cloudflare Workers.

## About This Project

This project is based on [szcharlesji/raycast-relay](https://github.com/szcharlesji/raycast-relay), which has been archived and is no longer maintained. The original project does not support the new Raycast V2 authentication system that is now required. This version utilizes HonoJS and provides support for Raycast V2 authentication.

## Deployment

### Cloudflare Workers Deployment

#### One-click deployment

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/xxxbrian/raycast2api)

#### Manual deployment

1. Clone repository:
```bash
git clone https://github.com/xxxbrian/raycast2api
cd raycast2api
```

2. Install dependencies:
```bash
bun install
```

3. Configure environment variables:
```bash
wrangler secret put RAYCAST_BEARER_TOKEN
wrangler secret put RAYCAST_DEVICE_ID
wrangler secret put RAYCAST_SIGNATURE_SECRET

# Optional
wrangler secret put API_KEY
wrangler secret put ADVANCED
wrangler secret put INCLUDE_DEPRECATED
```

4. Deploy:
```bash
bun run deploy
```

### Local Development

```bash
bun run dev        # Cloudflare Workers dev mode
bun run dev:local  # Local dev mode
```

## Configuration

| Environment Variable | Required | Description | Default |
|---------------------|----------|-------------|---------|
| `RAYCAST_BEARER_TOKEN` | Yes | Raycast API Token | None |
| `RAYCAST_DEVICE_ID` | Yes | Raycast Device ID | None |
| `RAYCAST_SIGNATURE_SECRET` | No | V2 Signature Secret | Has default |
| `API_KEY` | No | Client authentication key | None (public access) |
| `ADVANCED` | No | Include advanced models | `true` |
| `INCLUDE_DEPRECATED` | No | Include deprecated models | `false` |

## Getting Raycast Credentials

Use proxy tools (like Proxyman, Charles) to capture Raycast app network requests:

1. Set up proxy and trust certificate
2. Add `backend.raycast.com` to SSL proxy list
3. Send AI request in Raycast
4. Extract from request headers:
   - `Authorization: Bearer <token>` → `RAYCAST_BEARER_TOKEN`
   - `X-Raycast-DeviceId` → `RAYCAST_DEVICE_ID`

## API Endpoints

Deployed API URL: `https://your-worker.your-account.workers.dev/`

### Available Endpoints

- `GET /v1/models` - Get model list
- `POST /v1/chat/completions` - Chat completion (OpenAI compatible)
- `GET /health` - Health check

## V2 Authentication

Implements Raycast V2 signature authentication:
- ROT13+ROT5 encoding
- HMAC-SHA256 signing
- Timestamp validation
- Device ID binding

## Project Structure

```
src/
├── index.ts           # Main entry
├── config.ts          # Configuration
├── types.ts           # Type definitions
├── utils.ts           # Utils and auth
└── handlers/
    ├── chat.ts        # Chat handler
    └── models.ts      # Models handler
```

## License

GPL-3.0
