# Zepp Official List Project Notes

## Scope

- Type: ZeppOS page-level list library with a bundled example app
- Status: maintained library
- Target devices: round 480px and square 390px example profiles
- Entry files: `zolist.js`, `example/utils/zolist.js`

## Current Behavior

- Main workflow: build native-style list rows with touch, physical-key focus, and crown scrolling.
- Crown scrolling rebuilds focus on the item nearest the screen center after input settles.
- A changed center item triggers one 20ms strong vibration by default; `crownVibrate: false` disables it.

## Build And Verification

- Package check: `npm pack --dry-run`
- Example build: run `zeus build` in `example/`
- True-device note: vibration intensity and crown feel still require device verification.

## Local Decisions

- Decision: trigger haptic feedback once per settled crown-driven focus change, not on every raw crown event.
- Reason: this maps feedback to the visible item switch and avoids vibration spam or touch-scroll feedback.
- Date: 2026-07-18
- Decision: configure `VIBRATOR_SCENE_SHORT_STRONG` with `setMode()` before calling parameterless `start()`.
- Reason: a Balance user running a directly compiled example reported no vibration with `start({ mode })`; use the exact official example sequence to remove a firmware-call-path variable.
- Date: 2026-07-18

## Dependencies And Reuse

- Shared code: keep `zolist.js` and `example/utils/zolist.js` identical.
- Reusable ZeppOS docs consumed: official `Vibrator` API (`VIBRATOR_SCENE_SHORT_STRONG`, API_LEVEL 2.0).
- Knowledge conclusion type: official API plus project-specific UX decision.

## Open Issues

- Re-test the 20ms strong pulse on the reporting Balance device after installing the rebuilt example.
