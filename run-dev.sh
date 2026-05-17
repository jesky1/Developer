#!/bin/bash
cd /home/z/my-project

# Start WS service
cd /home/z/my-project/mini-services/ws-service
bun index.ts &
WS_PID=$!
echo "WS PID: $WS_PID"

# Start Next.js
cd /home/z/my-project
exec npx next dev -p 3000
