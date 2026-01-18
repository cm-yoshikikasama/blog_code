---
paths: "**/*.py"
---

# Python Lambda

## Development

- Place Python code under `resources/` (Lambda, Glue, etc.)
- Manage dependencies with `requirements.txt`
- CDK constructs handle packaging automatically (PythonFunction, GlueJob, etc.)

## Guidelines

- Always use type hints (`def func(arg: str) -> dict:`)
- Initialize AWS clients at global scope (Lambda/container warm start optimization)
- Never store sensitive information in plain text in environment variables. Use Secrets Manager or Parameter Store instead
- For code reuse, first consider solving within existing code. Lambda Layers and library creation are last resorts
