"""Read Claude responses aloud via Kokoro TTS daemon (mlx-audio server)."""

import concurrent.futures
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.request

SERVER_URL = "http://localhost:8000/v1/audio/speech"
MODEL_ID = "mlx-community/Kokoro-82M-bf16"
VOICE = "af_heart"
SPEED = 1.2
LANG = "a"
MAX_TEXT_LENGTH = 3000

# --- 1. Claude応答テキスト取得 ---
data = json.load(sys.stdin)
text = data.get("last_assistant_message", "")
if not text:
    sys.exit(0)


# --- 2. マークダウン除去 ---
def clean(text):
    lines = text.split("\n")
    cleaned = []
    in_code = False
    for line in lines:
        s = line.strip()
        if s.startswith("```"):
            in_code = not in_code
            continue
        if in_code:
            continue
        if s.startswith("$ ") or s.startswith("> "):
            continue
        if line.startswith("    ") and s:
            continue
        if "|" in s:
            continue
        if s.startswith("---") or s.startswith(":--"):
            continue
        s = re.sub(r"^[-*+]\s+", "", s)
        s = re.sub(r"^\d+\.\s+", "", s)
        if s:
            cleaned.append(s)
    text = " ".join(cleaned)
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"\*([^*]+)\*", r"\1", text)
    for ch in ["#", "`", ">"]:
        text = text.replace(ch, "")
    text = re.sub(r"[（(]([^）)]*)[）)]", r"\1", text)
    text = re.sub(r"【[^】]*】", "", text)
    text = re.sub(r"\[[^\]]*\]", "", text)
    text = re.sub(r"https?://\S+", "", text)
    text = " ".join(text.split()).strip()
    if len(text) > MAX_TEXT_LENGTH:
        return text[:MAX_TEXT_LENGTH] + "... truncated"
    return text


text = clean(text)
if not text:
    sys.exit(0)

# --- 2b. Strip CJK characters, skip if nothing left (Kokoro English model only) ---
text = re.sub(r"[\u3000-\u9fff\uff00-\uff9f]+", " ", text)
text = " ".join(text.split()).strip()
if not text:
    sys.exit(0)


# --- 3. Sentence-level TTS pipeline (play each sentence as it's ready) ---
sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
if not sentences:
    sys.exit(0)


def tts_request(sentence):
    payload = json.dumps(
        {
            "model": MODEL_ID,
            "input": sentence,
            "voice": VOICE,
            "speed": SPEED,
            "lang_code": LANG,
            "response_format": "wav",
        }
    ).encode()
    req = urllib.request.Request(
        SERVER_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            f.write(resp.read())
            return f.name


wav_files = []
try:
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(tts_request, s) for s in sentences]
        player = None
        for future in futures:
            wav_path = future.result()
            wav_files.append(wav_path)
            if player:
                player.wait()
            player = subprocess.Popen(["afplay", wav_path])
        if player:
            player.wait()
finally:
    for path in wav_files:
        try:
            os.unlink(path)
        except OSError:
            pass
