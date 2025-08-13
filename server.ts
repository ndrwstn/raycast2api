import app from "./src/index";

// use Bun.server for production build
Bun.serve({
  fetch: app.fetch,
  port: Bun.env.PORT || 3000
});

console.log(`Raycast2API Server is running on port ${Bun.env.PORT || 3000}`);
