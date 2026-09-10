---
name: filik-qa
description: "Run focused browser smoke and regression checks for Filik gameplay, screens, responsive layouts, and local fallback behavior."
---
# Filik QA

Use this skill for player-visible behavior, input, navigation, layout, persistence, or release-readiness changes.

## Test selection

- Run the smallest relevant flow; do not replay the entire game for a copy or isolated CSS change.
- Gameplay changes: boot without Yandex SDK, select letters, submit correct and incorrect answers, complete a level, inspect rewards, reload, and return to camp.
- Screen changes: verify the affected screen plus open/close navigation and Escape where applicable.
- Layout changes: check desktop and the mobile breakpoint at 700px; capture a screenshot when checking clipping, overlap, or obstruction.
- Release-sensitive areas: daily/weekly, endless, shop, settings, map, journal, companions, and goals.
- Check console errors and missing resources. SDK-unavailable messages are expected in local fallback mode.

## Reporting

For each issue, report severity, symptom, reproduction, expected behavior, affected module, and whether it is SDK-only. Reuse an existing browser session, batch DOM observations, and do not repeat screenshots or flows when inputs have not changed. Use the available browser-game playtest workflow when it is installed.
