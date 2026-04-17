#!/bin/bash
# Stop mlx-audio TTS server
PID_FILE="/tmp/kokoro-tts.pid"

if [ -f "$PID_FILE" ]; then
    kill "$(cat "$PID_FILE")" 2>/dev/null
    rm -f "$PID_FILE"
fi
