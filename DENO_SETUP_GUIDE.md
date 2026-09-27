# Deno Workspace Setup Guide

Since .vscode folder is restricted, please create `.vscode/settings.json` manually with the following content:

```json
{
  "deno.enable": true,
  "deno.unstable": true,
  "deno.enablePaths": ["supabase/functions"]
}
```

## What's Fixed:
✅ delivery-bot/index.ts - Explicit `req: Request` type, proper error handling
✅ accountant-bot/index.ts - Explicit `req: Request` type, proper error handling
