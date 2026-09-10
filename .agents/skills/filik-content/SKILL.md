---
name: filik-content
description: "Edit Filik level catalogs, chapters, word content, and UI assets with deterministic JSON and asset validation."
---
# Filik Content

Use this skill for levels.json, endless-levels.json, live-config.json, build.json, src/content.js, chapter metadata, and UI assets.

## Content contracts

- Treat catalogs as data contracts: campaign IDs are contiguous from 1, and endless IDs are contiguous from 1.
- Keep build.json counts synchronized with the catalogs.
- Campaign chapters contain eight levels; preserve chapter and story alignment.
- Keep chapter images, wide AI images, artifact images, and companion poses aligned with metadata.
- Asset paths are case-sensitive in deployment; verify every referenced file exists.
- Do not casually change product IDs, economy constants, or release configuration during a content edit.
- Avoid mass reformatting generated or hand-maintained JSON.

## Validation

From the repository root, run:

node .agents/skills/filik-content/scripts/validate-content.mjs

The validator is dependency-free and checks catalog shape, spellable words, IDs, build counts, chapter assets, artifacts, companion poses, and literal runtime asset references. Report both the command and its result.
