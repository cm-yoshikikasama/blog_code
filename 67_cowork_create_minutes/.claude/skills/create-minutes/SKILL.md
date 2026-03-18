---
name: create-minutes
description: Generate structured meeting minutes from Google Calendar events with Gemini transcripts and write to 05_Meetings/. Use when creating meeting minutes from meeting transcripts.
allowed-tools: Bash(mkdir *), Bash(date *), Bash(TZ=*), Read, Write, Glob, Agent, ToolSearch, mcp__*__gcal_list_events, mcp__*__google_drive_fetch
---

詳細な手順は INSTRUCTIONS.md を参照。テンプレートは references/ 配下を参照。
