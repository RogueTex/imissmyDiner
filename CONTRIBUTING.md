# Contributing to I Miss My Diner

Thanks for helping improve the diner.

## Quick Start

1. Create a branch using the `codex/` prefix.
2. Keep the change scoped to one concern (audio, UX, tests, docs).
3. Run local validation before opening a PR.
4. Open a PR to `main` with clear test notes.

## Branch and PR Rules

- Branch naming: `codex/<short-purpose>`
- Keep PRs focused and reasonably small.
- Rebase/merge latest `main` before requesting final review.
- Use clear PR titles and include:
  - Summary
  - Files/areas changed
  - Validation commands and results
  - Risks or follow-ups

## Audio Contribution Rules

- Only include permissive or otherwise redistribution-safe audio.
- Every new third-party audio file must be added to:
  - `assets/audio/ATTRIBUTION.md`
- Attribution entry must include:
  - Channel mapping
  - Source URL
  - License
  - Edit notes (trim/loop/fade/etc.)

## Definition of Done

- All 8 channels can load and loop.
- Per-channel sliders and master volume update output in real time.
- Presets apply expected mixes.
- OPEN/CLOSED control toggles playback reliably.
- Settings persist via `localStorage`.
- App is usable on mobile and desktop.
- No critical console errors in normal use.

## Handoff Format

When handing off work, include:

1. Context
2. Decisions
3. Changes
4. Validation
5. Open risks
6. Next actions (top 3)
