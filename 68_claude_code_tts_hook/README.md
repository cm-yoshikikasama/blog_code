# Claude Code TTS Hook (Kokoro + mlx-audio)

Text-to-speech hook for Claude Code that reads responses aloud using on-device inference on Apple Silicon.

## Overview

When Claude Code finishes a response, this Stop hook converts the text to speech locally using [Kokoro TTS](https://huggingface.co/mlx-community/Kokoro-82M-bf16) via [mlx-audio](https://github.com/ml-explore/mlx-audio). No external API calls are made during inference.

## Requirements

- macOS (Apple Silicon / M1+)
- Claude Code
- Python 3.12+
- [uv](https://docs.astral.sh/uv/)

## Setup

1. Copy hook files to `~/.claude/hooks/`:

```bash
cp -r hooks/* ~/.claude/hooks/
```

2. Install dependencies:

```bash
cd ~/.claude/hooks/kokoro-tts
uv sync
```

3. Merge `settings-example.json` into `~/.claude/settings.json` under the `hooks` field.

## Usage

Enable TTS for a session by passing the environment variable at launch:

```bash
CLAUDE_VOICE=1 claude
```

Without the flag, the hook is silently skipped.

## How It Works

1. The Stop hook fires when Claude Code completes a response
2. `say-response.py` reads `last_assistant_message` from the hook's stdin JSON
3. Markdown syntax (code blocks, tables, URLs, etc.) is stripped
4. English words are converted to katakana for better Japanese pronunciation
5. Kokoro TTS generates audio via MLX (GPU-accelerated)
6. macOS `afplay` plays the WAV file, which is automatically cleaned up after playback

## File Structure

```text
hooks/
├── kokoro-tts/
│   ├── pyproject.toml    # uv project (TTS dependencies)
│   └── uv.lock           # Pinned dependency versions
└── say-response.py       # TTS main script
settings-example.json     # Hook configuration example
```

## Configuration

Constants at the top of `say-response.py`:

| Constant | Default | Description |
|---|---|---|
| `MODEL_ID` | `mlx-community/Kokoro-82M-bf16` | HuggingFace model ID |
| `VOICE` | `jm_kumo` | Japanese male voice |
| `SPEED` | `1.1` | Playback speed |
| `LANG` | `j` | Language code (Japanese) |
| `MAX_TEXT_LENGTH` | `600` | Max characters to synthesize |

The `CUSTOM` dictionary maps technical terms (AWS, CDK, API, etc.) to katakana readings. Add entries as needed.

## Notes

- The first run downloads the model (~355 MB) from HuggingFace. Subsequent runs use the local cache.
- RTF (Real-Time Factor) is approximately 0.13 on Apple Silicon.
- `misaki[ja]` is pinned to 0.7.4 due to unidic compatibility issues in 0.8+.
