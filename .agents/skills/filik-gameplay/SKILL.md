---
name: filik-gameplay
description: "Modify Filik gameplay rules, level progress, rewards, economy, or persistence while preserving campaign, daily, endless, and fallback behavior."
---
# Filik Gameplay

Use this skill for changes to src/main.js, src/core.js, src/storage.js, src/economy.js, src/commerce.js, or related gameplay UI when behavior—not only styling—is changing.

## Required invariants

- Preserve separation between campaign, daily, and endless modes.
- Keep normalizeWord as the single normalization rule, including Ё→Е.
- Completion must be idempotent; replays must not duplicate rewards, purchases, receipts, or progress.
- Persist through SaveStore; new persisted fields require sanitization, migration, and defaults.
- Reward and receipt changes must remain safe against duplicate callbacks and unavailable cloud storage.
- Preserve local fallback when YaGames is unavailable.

## Workflow

1. Trace the state transition and authoritative function before editing.
2. Keep pure rules in core/economy; keep DOM and routing in main/screens.
3. Prefer a small patch over a broad template rewrite.
4. Run focused checks; run filik-content when catalogs or IDs are affected and filik-qa when a player-visible flow changes.
5. Report changed state fields, reward paths, and any SDK-only behavior that was not testable locally.
