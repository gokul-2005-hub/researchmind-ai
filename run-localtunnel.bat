@echo off
echo Starting ResearchMind AI reverse proxy and localtunnel...
echo.
echo IMPORTANT: Make sure your local frontend (port 5173) and backend (port 8000) development servers are running!
echo.
echo 1. Starting Reverse Proxy on port 9000...
start cmd /k "node proxy.js"
echo.
echo 2. Opening Localtunnel on port 9000...
echo (If the subdomain is busy, localtunnel will fall back to a random one, which still works!)
npx localtunnel --port 9000 --subdomain researchmindai
echo.
pause
