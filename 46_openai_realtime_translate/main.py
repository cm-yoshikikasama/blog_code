from __future__ import annotations

import asyncio
import base64
import os
from typing import Any, cast

import sounddevice as sd
from dotenv import load_dotenv

# .envファイルの読み込み
load_dotenv()

from openai import AsyncOpenAI  # noqa: E402

# OpenAI APIキーの取得
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


async def handle_audio_input(conn, stream, read_size):
    while True:
        if stream.read_available < read_size:
            await asyncio.sleep(0.01)
            continue

        data, _ = stream.read(read_size)
        audio_data = base64.b64encode(cast(Any, data)).decode("utf-8")
        await conn.input_audio_buffer.append(audio=audio_data)


async def handle_transcription(conn):
    assistant_message = None
    user_message = None

    async for event in conn:
        # print(f"Debug: Event type: {event.type}")  # デバッグ用

        if event.type == "input_audio_buffer.speech_started":
            # ユーザーの発話開始時に新しいメッセージを初期化
            user_message = dict(role="user", content=None)
            assistant_message = None

        elif event.type == "response.audio_transcript.delta":
            # アシスタントの応答を蓄積するのみ
            if not assistant_message:
                assistant_message = dict(role="assistant", content="")
            if hasattr(event, "delta") and event.delta:
                assistant_message["content"] += event.delta

        elif event.type == "conversation.item.input_audio_transcription.completed":
            # ユーザーの発話完了時に蓄積したメッセージを出力
            if not user_message:
                user_message = dict(role="user", content="")
            if user_message["content"] is None:
                user_message["content"] = event.transcript
            else:
                user_message["content"] += event.transcript
            # ユーザーの発話を出力
            print(f"User: {user_message['content']}", end="")
            # 蓄積していたアシスタントの応答を出力
            if assistant_message and assistant_message["content"]:
                print(f"Assistant: {assistant_message['content']}")

        # elif event.type == "response.audio_transcript.done":
        #     # アシスタントの応答完了時に改行
        #     pass


async def transcribe_audio():
    client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    # audio_player = AudioPlayerAsync()

    async with client.beta.realtime.connect(
        model="gpt-4o-realtime-preview",
    ) as conn:
        print("接続確立: 音声入力を開始します")
        # セッション設定を更新
        await conn.session.update(
            session={
                "modalities": ["text", "audio"],
                "instructions": (
                    "あなたは優秀な通訳者です。"
                    "ユーザーの発言をすべてそのまま英語に翻訳してください"
                ),
                "input_audio_transcription": {"model": "whisper-1"},
                "turn_detection": {
                    "type": "server_vad",
                    "threshold": 0.5,
                    "prefix_padding_ms": 300,
                    "silence_duration_ms": 500,
                    "create_response": True,
                },
            }
        )

        print(sd.query_devices())
        SAMPLE_RATE = 24000
        CHANNELS = 1
        read_size = int(SAMPLE_RATE * 0.02)
        stream = sd.InputStream(
            channels=CHANNELS,
            samplerate=SAMPLE_RATE,
            dtype="int16",
        )

        stream.start()
        print("録音中... Ctrl+Cで終了")

        try:
            # 音声入力とトランスクリプション処理を並行して実行
            await asyncio.gather(
                handle_audio_input(conn, stream, read_size), handle_transcription(conn)
            )
        except KeyboardInterrupt:
            print("\n録音を終了します")
        finally:
            stream.stop()
            stream.close()


if __name__ == "__main__":
    asyncio.run(transcribe_audio())
