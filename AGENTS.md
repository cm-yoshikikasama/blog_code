# Repository Guidelines

## Project Structure & Module Organization
- Examples live under numbered folders like `29_gpt_4_vision_preview_with_streamlit` and `56_aurora_mysql_to_s3`. Each is self‑contained.
- Root contains shared tooling: `pyproject.toml` (Ruff), `requirements.txt` (common Python deps), `package.json` (TypeScript/Jest/CDK), `.github/`, and `.devcontainer/`.
- When adding a new example, follow `NN_slug` naming (e.g., `59_new_topic_example`) and include a short `README.md` inside the example.

## Build, Test, and Development Commands
- Python example
  - Setup: `python -m venv .venv && source .venv/bin/activate && pip install -r ../../requirements.txt` (add project‑specific deps in a local `requirements.txt` if needed).
  - Run: `python main.py` (or the entry file used in that example).
  - Lint: `ruff check .` (config in `pyproject.toml`).
- TypeScript/CDK example
  - Setup: `npm install`
  - Synthesize: `npx cdk synth`
  - Test: `npx jest`
- Go example
  - Build: `go build ./...`

## Coding Style & Naming Conventions
- Python: 4‑space indent, line length 88, import sorting via Ruff (`E`, `F`, `I`). Filenames use `snake_case.py`. Prefer type hints.
- TypeScript: 2‑space indent, `camelCase` for functions/vars, `PascalCase` for types/classes. Place shared utils under a `src/` folder when applicable.
- Example folder names: `NN_slug` using underscores, matching existing patterns.

## Testing Guidelines
- Python: place tests under `tests/` or next to modules; name `test_*.py`. Run with `pytest`.
- TypeScript: name `*.spec.ts`; run with `npx jest`.
- Aim to cover core logic and edge cases in small, focused tests.

## Commit & Pull Request Guidelines
- Commits: keep messages concise; conventional prefixes like `feat:`, `fix:`, `chore:` are welcome (mixed styles exist in history).
- Pull Requests: include a clear description, paths touched (e.g., `42_create_minutes_app/`), run/verify steps, and screenshots for UI examples (e.g., Streamlit).
- Link related blog posts or issues where relevant.

## Security & Configuration Tips
- Never commit secrets. Use `.env` (already git‑ignored) or local AWS profiles. Avoid committing `cdk.context.json`, `cdk.out/`, `.aws-sam/`, or cloud credentials.
- Keep IAM and cloud resources least‑privileged; clean up provisioned resources after demos.
