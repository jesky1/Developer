#!/bin/bash
cd /home/z/my-project

# Start WebSocket service with auto-restart
nohup bash -c 'cd /home/z/my-project/mini-services/ws-service && while true; do echo "[$(date)] Starting WS service..."; bun index.ts 2>&1; echo "[$(date)] WS service exited, restarting in 3s..."; sleep 3; done' > /tmp/ws-service.log 2>&1 &
echo "WebSocket service started on port 3003"

# Start Next.js dev server
export PORT=3000
nohup npx next dev -p 3000 > /home/z/my-project/dev.log 2>&1 &
echo $! > /home/z/my-project/server.pid
echo "Server started with PID $(cat /home/z/my-project/server.pid)"
