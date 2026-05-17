#!/bin/bash
cd /home/z/my-project

# Start WebSocket service with auto-restart
bash -c 'cd /home/z/my-project/mini-services/ws-service && while true; do echo "[$(date)] Starting WS service..."; bun index.ts 2>&1; echo "[$(date)] WS service exited, restarting in 3s..."; sleep 3; done' > /tmp/ws-service.log 2>&1 &
echo "WebSocket service started on port 3003"

# Start AI service with auto-restart
bash -c 'cd /home/z/my-project/mini-services/ai-service && export DATABASE_URL=file:/home/z/my-project/db/custom.db && while true; do echo "[$(date)] Starting AI service..."; bun index.ts 2>&1; echo "[$(date)] AI service exited, restarting in 3s..."; sleep 3; done' > /tmp/ai-service.log 2>&1 &
echo "AI service started on port 3005"

# Start Next.js dev server
exec npx next dev -p 3000
