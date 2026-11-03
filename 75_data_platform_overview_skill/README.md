# data-platform-overview

A Claude Code skill that reads a filled-in data platform requirements sheet (HTML) and builds a single HTML overview of the data platform: a screen mockup with dummy data, an architecture diagram, the table layers, the reasons for each choice, an example schedule, and the next decisions to make.

## Architecture

```text
75_data_platform_overview_skill/
├── .mcp.json                              # AWS Knowledge MCP and dbt MCP (docs search only)
└── .claude/skills/data-platform-overview/
    ├── SKILL.md                           # Skill entry point
    ├── references/
    │   ├── answer-mapping-guide.md        # How each answer is used, ingest method selection
    │   ├── architecture-sources-guide.md  # Where and how to verify the architecture against official docs
    │   └── overview-style.md              # How to write each section of the overview HTML
    └── templates/
        ├── requirements-sheet.html        # Requirements sheet filled in a browser
        └── overview-page.html             # Frame and CSS of the overview HTML
```

## How It Works

1. Open `.claude/skills/data-platform-overview/templates/requirements-sheet.html` in a browser, fill it in, and click 「回答を保存」. The answers are embedded as JSON and the HTML is downloaded
2. `/data-platform-overview {path to the filled-in HTML}` reads the answers JSON
3. Claude Code decides the tables and the architecture from the answers, checks the constraints against official docs dated on the run day, and writes `全体像_{project name}_{date}.html` next to the sheet
   - Ingest methods are chosen from the answers first, then the product is chosen in a fixed order: the DWH's own feature, a managed service of the same cloud, then a small scheduled script
   - Blanks, 「不明」 and conflicting answers are not guessed; they go to the 「次にやること」 section

## Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview)
- [draw.io Desktop](https://www.drawio.com/) (`brew install --cask drawio`) for exporting the diagram to PNG
- [uv](https://docs.astral.sh/uv/) (`brew install uv`) for starting the dbt MCP server with `uvx`
- The official drawio skill from [jgraph/drawio-mcp](https://github.com/jgraph/drawio-mcp)

## Setup

1. Install the official drawio skill in Claude Code:

   ```text
   /plugin marketplace add jgraph/drawio-mcp
   /plugin install drawio@drawio
   ```

2. Start Claude Code in this directory and approve the MCP servers in `.mcp.json`:

   ```bash
   cd 75_data_platform_overview_skill
   claude
   ```

3. Run the skill:

   ```text
   /data-platform-overview <path to the filled-in sheet>
   ```

## Key Design Decisions

- `allowed-tools` pre-approves only fetching official docs by domain, the `drawio -x` export and headless Chrome; `disallowed-tools: AskUserQuestion` keeps blanks going to 「次にやること」 instead of asking back
- The sheet is a standalone HTML file, so answers can be exchanged without a server
- Product names are not fixed in the skill, because services are added and renamed; each run checks release notes and docs from the run date
- Vendor logos are not used in diagrams; only the AWS and Google Cloud icons bundled with draw.io, plus generic line icons
- The overview contains no real numbers, partner names, personal names, or cost amounts

## License

MIT
