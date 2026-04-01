---
name: aws-aidlc-construction
description: "Run the repo-local AWS AI-DLC Construction workflow defined in `.claude/commands/aws-aidlc-construction.md`. Use when implementing from inception artifacts in this repository: per-unit functional design, NFR requirements, NFR design, infrastructure design, code generation, or build-and-test."
---

# AWS AI-DLC Construction

## Canonical Source

- Read `.claude/commands/aws-aidlc-construction.md` first and treat it as the canonical workflow definition for this repository.
- Use the repo-local `.aidlc-workflows/` checkout referenced by that command.
- Ignore older global `aidlc-*` skills, `.takt`-based paths, and file-based question formatting rules when they conflict with the repo-local command.

## Codex Adaptation

- Treat the user's request text as the command's `$ARGUMENTS` value.
- Confirm that `aidlc-docs/inception/` exists before starting. If it does not, stop and redirect the user to `aws-aidlc-inception`.
- When the canonical command says `AskUserQuestion`, use the best interactive mechanism available in the current Codex mode:
  - In Plan mode, prefer `request_user_input`.
  - In Default mode, ask concise plain-text questions in chat.
- Wait for explicit user approval at every stage where the canonical command requires approval.
- Keep the conversation in Japanese.
- Write design artifacts only under `aidlc-docs/construction/` and keep application code in the workspace root.

## Execution Notes

- Load all enabled extension rules before beginning the phase and include extension compliance in stage summaries when the canonical command requires it.
- Split Code Generation into planning and generation exactly as the canonical command describes.
- Skip `common/question-format-guide.md`; the canonical command explicitly disables that file-based format.
- Re-open `.claude/commands/aws-aidlc-construction.md` instead of relying on memory if any workflow detail becomes unclear.
