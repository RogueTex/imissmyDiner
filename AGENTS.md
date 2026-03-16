# AGENTS.md

## Mission
Ship and maintain **I Miss My Diner** as a static SPA nostalgia soundscape mixer with production-quality UX and reliable ambient audio behavior.

## Worktree Ownership

### `codex/release-bootstrap` (`../imissmyDiner-wt-release`)
- Own baseline app shipping tasks.
- Commit initial app files and docs (`README.md`, `AGENTS.md`).
- Open and merge the release PR into `main` first.

### `codex/audio-real-loops` (`../imissmyDiner-wt-audio`)
- Own real audio asset integration and playback engine migration.
- Add `assets/audio/` loops + `assets/audio/ATTRIBUTION.md`.
- Preserve channel controls, presets, master volume, and persistence behavior.

### `codex/qa-acceptance` (`../imissmyDiner-wt-qa`)
- Own acceptance verification and narrowly-scoped fixes.
- Validate mobile/desktop UI, control states, keyboard interaction, and no-console-error behavior.
- Keep PR focused to QA findings only.

## Branch & PR Policy
- Use only `codex/*` branches.
- PR/merge order is strict: `release -> audio -> qa`.
- Keep each PR scoped to one worktree mission.
- Rebase/merge latest `main` before final QA validation.

## Audio Asset Rules
- Audio files must be permissive/royalty-free and safe for repository distribution.
- Every committed third-party audio file must be listed in `assets/audio/ATTRIBUTION.md`.
- Attribution entry requirements:
  - Channel mapping
  - Source URL
  - License type
  - Notes (trim/loop edits if applied)

## Definition Of Done
- All 8 channels load and loop without crashing app initialization.
- Per-channel sliders, master volume, and presets update audible output correctly.
- OPEN/CLOSED toggle reliably controls playback state.
- Settings persist across reload via `localStorage`.
- Layout is usable on mobile and desktop.
- No critical console errors during normal interaction.

## Ready-To-Use Worktree Prompts

### Prompt: Release Worktree
On branch `codex/release-bootstrap`, prepare the first production-ready baseline for `imissmyDiner`: commit current `index.html`, `styles.css`, `app.js`, add `README.md`, add repo-root `AGENTS.md` using the collaboration contract, open PR, merge, and confirm `main` is pushed to `origin`.

### Prompt: Audio Worktree
On branch `codex/audio-real-loops`, replace synthesized channel generation with real loop files in `assets/audio/`, wire each channel to gain-controlled looping playback in `app.js`, preserve presets/master/localStorage behavior, add `assets/audio/ATTRIBUTION.md`, and open PR.

### Prompt: QA Worktree
On branch `codex/qa-acceptance`, validate merged app behavior across desktop/mobile, verify audio channel control integrity and persistence, fix only acceptance issues, and open a small QA PR with test notes.

## Handoff Template
Use this exact structure in every handoff note:

1. **Context**
- Branch/worktree
- What is complete
- Current repo state

2. **Decisions**
- Audio format/encoding choices
- Gain/volume behavior choices
- UX or accessibility decisions

3. **Changes**
- Files touched and why

4. **Validation**
- Commands run
- Manual checks performed
- Results and regressions checked

5. **Open Risks**
- Known issues
- Follow-up recommendations

6. **Next Actions**
- Next 3 concrete steps for receiving agent

## Canonical Handoff Example

### Context
- Branch/worktree: `codex/audio-real-loops` (`../imissmyDiner-wt-audio`)
- Completed: Added real loop files + integrated file-backed playback
- Repo state: PR open against `main`, awaiting review

### Decisions
- Standardized to `.mp3` loops for broad browser support
- Kept existing 0-100 UI scale and mapped to gain values 0.0-1.0
- Added graceful fallback: muted channel when source load fails

### Changes
- `assets/audio/*`: 8 loop files
- `assets/audio/ATTRIBUTION.md`: source/license mapping
- `app.js`: migrated from synthesized buffer generation to media/buffer source loader

### Validation
- `python3 -m http.server 4173`
- Manual test: play/pause, per-channel sliders, presets, master volume
- Checked console for initialization/load errors

### Open Risks
- Loop seam quality depends on source track edit quality
- Mobile autoplay policy still requires user interaction before audio starts

### Next Actions
1. Re-test on Safari + Chrome mobile viewport
2. Capture short QA notes for PR description
3. Merge after QA sign-off
