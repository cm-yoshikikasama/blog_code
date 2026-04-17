#!/bin/bash
# Start mlx-audio TTS server if not already running
PID_FILE="/tmp/kokoro-tts.pid"
UV="$(which uv)"
KOKORO_DIR="$HOME/.claude/hooks/kokoro-tts"
LOG="$KOKORO_DIR/logs/server.log"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    exit 0
fi

"$UV" run --directory "$KOKORO_DIR" python -m mlx_audio.server --host localhost --port 8000 >> "$LOG" 2>&1 &
echo $! > "$PID_FILE"
