---
name: aws-aidlc-inception
description: "Run the repo-local AWS AI-DLC Inception workflow defined in `.claude/commands/aws-aidlc-inception.md`. Use when starting or resuming AI-DLC planning for this repository: workspace detection, brownfield reverse engineering, requirements analysis, user stories, workflow planning, application design, or units generation."
---

# AWS AI-DLC Inception

## Canonical Source

- Read `.claude/commands/aws-aidlc-inception.md` first and treat it as the canonical workflow definition for this repository.
- Use the repo-local `.aidlc-workflows/` checkout referenced by that command.
- Ignore older global `aidlc-*` skills, `.takt`-based paths, and file-based question formatting rules when they conflict with the repo-local command.

## Codex Adaptation

- Treat the user's request text as the command's `$ARGUMENTS` value.
- Ask what to build after Workspace Detection if `$ARGUMENTS` is empty.
- When the canonical command says `AskUserQuestion`, use the best interactive mechanism available in the current Codex mode:
  - In Plan mode, prefer `request_user_input`.
  - In Default mode, ask concise plain-text questions in chat.
- Wait for explicit user approval at every stage where the canonical command requires approval.
- Keep the conversation in Japanese.
- Write artifacts only under `aidlc-docs/inception/` and keep `aidlc-docs/audit.md` append-only.

## Execution Notes

- Read each stage rule immediately before executing that stage.
- Skip `common/question-format-guide.md`; the canonical command explicitly disables that file-based format.
- Re-open `.claude/commands/aws-aidlc-inception.md` instead of relying on memory if any workflow detail becomes unclear.
