"""Claude応答を音声で読み上げる (Kokoro TTS + mlx-audio)"""

import json
import os
import re
import subprocess
import sys
import tempfile
import threading
import warnings

import alkana
import soundfile as sf
from mlx_audio.tts.utils import load_model

warnings.filterwarnings("ignore")

MODEL_ID = "mlx-community/Kokoro-82M-bf16"
VOICE = "jm_kumo"
SPEED = 1.2
LANG = "j"
MAX_TEXT_LENGTH = 600

CUSTOM = {
    "AWS": "エーダブリューエス",
    "CDK": "シーディーケー",
    "API": "エーピーアイ",
    "CLI": "シーエルアイ",
    "SQL": "エスキューエル",
    "SSH": "エスエスエイチ",
    "TTS": "ティーティーエス",
    "MLX": "エムエルエックス",
    "RTF": "アールティーエフ",
    "IAM": "アイエーエム",
    "VPC": "ブイピーシー",
    "ETL": "イーティーエル",
    "CI": "シーアイ",
    "CD": "シーディー",
    "PR": "ピーアール",
    "AI": "エーアイ",
    "dbt": "ディービーティー",
    "git": "ギット",
    "npm": "エヌピーエム",
    "DataOps": "データオプス",
    "DevOps": "デブオプス",
    "MLOps": "エムエルオプス",
    "genAI": "ジェンエーアイ",
    "GenAI": "ジェンエーアイ",
    "Terraform": "テラフォーム",
    "Snowflake": "スノーフレーク",
    "DuckDB": "ダックディービー",
    "GitHub": "ギットハブ",
    "Lambda": "ラムダ",
    "Glue": "グルー",
    "Athena": "アテナ",
    "Redshift": "レッドシフト",
    "S3": "エススリー",
    "EC2": "イーシーツー",
    "CloudFormation": "クラウドフォーメーション",
    "CFn": "シーエフエヌ",
    "TypeScript": "タイプスクリプト",
    "JavaScript": "ジャバスクリプト",
    "FastAPI": "ファストエーピーアイ",
    "vLLM": "ブイエルエルエム",
    "TF": "ティーエフ",
    "BS": "ビーエス",
}
_CUSTOM_SORTED = sorted(CUSTOM.items(), key=lambda x: -len(x[0]))

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
    text = re.sub(r"（[^）]*）", "", text)
    text = re.sub(r"\([^)]*\)", "", text)
    text = re.sub(r"【[^】]*】", "", text)
    text = re.sub(r"\[[^\]]*\]", "", text)
    text = re.sub(r"https?://\S+", "", text)
    text = " ".join(text.split()).strip()
    return text[:MAX_TEXT_LENGTH]


text = clean(text)
if not text:
    sys.exit(0)


# --- 3. 英語→カタカナ変換 ---
def en_to_kana(text):
    for k, v in _CUSTOM_SORTED:
        text = text.replace(k, v)

    def replace_word(m):
        word = m.group(0)
        kana = alkana.get_kana(word.lower())
        return kana if kana else word

    return re.sub(r"[A-Za-z]{2,}", replace_word, text)


text = en_to_kana(text)


# --- 4. 音声生成 ---
def play_and_cleanup(path):
    subprocess.run(["afplay", path])
    os.unlink(path)


model = load_model(MODEL_ID)
result = next(model.generate(text=text, voice=VOICE, speed=SPEED, lang_code=LANG), None)
if result is None:
    sys.exit(0)

with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
    sf.write(f.name, result.audio, result.sample_rate)
    threading.Thread(target=play_and_cleanup, args=(f.name,), daemon=False).start()
