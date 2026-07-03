# Handoff Notes - Localtunnel Reverse Proxy Transition

The codebase has been configured for a single-port localtunnel reverse proxy to avoid 503 collisions and CORS blocks.

## Current Setup:
1. **Frontend config**: `VITE_API_URL` is set to relative `/api/v1` in `frontend/.env`.
2. **Backend CORS config**: whitelists CORS for `https://researchmindai.loca.lt`, and dynamically whitelists all origins in development mode inside `backend/app/main.py`.
3. **Proxy server**: `proxy.js` is added to run on port `9000` to route API to `8000` and frontend to `5173`.
4. **Vite config**: `allowedHosts: true` has been configured in `frontend/vite.config.ts`.
5. **Git state**: Git is initialized, configured with a local dummy email, and successfully pushed to the user's Github repository.

## Outstanding Problem to Solve:
* When loaded via `http://localhost:9000` (the proxy), the frontend is rendering a blank screen.
* **Likely Cause**: Vite's index.html uses absolute imports `/src/main.tsx` or `/node_modules/...`. When proxied by `proxy.js`, if the `Host` header or request mapping is off, Vite might fail to serve assets properly.
* **Next Steps**:
  1. Inspect the browser console log when loading `http://localhost:9000`.
  2. Overwrite `req.headers.host = 'localhost:5173'` inside `proxy.js` to ensure Vite receives the correct host header.
  3. Ensure Vite's Hot Module Replacement (HMR) WebSocket connections are properly forwarded or bypassed.
