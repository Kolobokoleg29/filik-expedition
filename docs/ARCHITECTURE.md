# Filik Expedition — Architecture Contract

Статус: baseline contract, 2026-09-10.

## Current runtime

The game is a static browser application built from native JavaScript ES modules and DOM/CSS. The production build uses Vite for bundling and preview, while runtime data and the asset tree keep stable deployment paths.

Entry flow:

index.html → src/main.js → boot
boot → levels.json + live-config.json + YandexPlatform.init()
main.js → screen/game flows → SaveStore + platform adapter

A migration to Phaser or TypeScript is not part of stabilization. It is allowed only after a measured problem and a separate decision.

## Ownership boundaries

### Domain and simulation

These modules must stay as deterministic as possible and must not depend on DOM:

- core.js: word normalization, spelling, grid cells, progress validation, dates, daily routes, endless pool, difficulty.
- economy.js: shop, goals, gifts, weekly state, reward rules.
- config.js: defaults, normalization, remote flag conversion.
- endless-meta.js: endless ranks and milestones.
- captains.js and companions.js: unlock rules, companion effects, identity metadata.
- storage.js: serializable save state, sanitization, migration, merge and local persistence.

Domain functions receive explicit inputs and return values or mutate one explicitly owned state object. They must be unit-testable in Node.

### Platform adapters

These modules own asynchronous external systems:

- platform.js: Yandex SDK lifecycle, cloud save, ads, payments bridge, leaderboards, pause/resume and server time.
- commerce.js: catalog, purchase validation, receipt ledger, consume and recovery.
- analytics.js: Metrika transport and local/test suppression.

Platform failures are expected. Every SDK-dependent operation needs a bounded timeout or safe fallback and must not become the source of truth for local gameplay state.

### Presentation and interaction

These modules own DOM and player-facing behavior:

- main.js: app orchestration, current screen, input actions and gameplay rendering.
- meta-screens.js: camp, map, diary, companions, profile, shop and modal surfaces.
- victory-screen.js: completion result presentation.
- icons.js and ui-format.js: presentation helpers.
- audio.js: browser audio lifecycle and feedback.
- i18n.js: language selection and document language.

DOM is a projection of state. Do not store authoritative progress in DOM nodes, CSS classes, renderer objects or modal HTML.

### Content and assets

- content.js: chapter and companion metadata.
- levels.json and endless-levels.json: level catalogs.
- chapter-images.js, chapter-visuals.js, artifact-images.js, backgrounds.js: stable mappings from content IDs to visual assets.
- assets/: canonical shipped visual and font files.

Catalog IDs, product IDs, leaderboard IDs, save keys and asset filenames are contracts. Changes require validator coverage and, when persistent or external, migration/compatibility reasoning.

## State contract

SaveStore.state is the only persistent gameplay state. New fields must have:

1. a default in freshState;
2. sanitization in sanitizeState;
3. merge behavior in mergeStates;
4. migration behavior if an older save can contain an equivalent field;
5. a focused unit test;
6. a documented reason and bounded size.

Runtime UI state belongs in the non-persistent ui object in main.js. Platform request state belongs in the adapter. Never serialize DOM, Promises, SDK instances, timers or error objects.

## Safe change seams

Use this order for gameplay changes:

1. Add or update a pure rule in core/economy/config.
2. Add a unit test for normal, boundary and repeated-call behavior.
3. Connect the rule from main/meta-screens.
4. Add or update the smallest browser smoke flow.
5. Run content validation when IDs/catalogs/assets are involved.
6. Record the changed state and reward path in the commit description or roadmap checkpoint.

For main.js extraction, preserve one behavior at a time: input actions, level completion, hints, daily/endless routing, then screen rendering. Do not split files solely by line count; split around ownership and testability.

## Runtime sequence

Normal campaign:

input action → classifyWord → update ui.progress → persist through SaveStore → render projection → completion transition → idempotent reward calculation → victory projection.

External purchase:

SDK purchase → product/token validation → receipt ledger + reward state → local/cloud persistence → consume → recovery-safe final status.

Cloud sync:

local SaveStore → bounded SDK getData → sanitize/merge → local persistence → queued bounded flush. A missing or failed SDK must leave local fallback playable.

## Required test layers

- Node unit tests cover domain, save state, config and receipt invariants.
- Content validator covers catalog shape, IDs and referenced canonical assets.
- Browser smoke covers boot, gameplay, route surfaces, responsive layout and fallback.
- Staging tests cover real Yandex SDK behavior that cannot be proven locally.
- Performance checks measure startup, initial payload, asset load and interaction responsiveness.

The current implementation intentionally has no canvas renderer. Keep text-heavy HUD, menus, settings and accessibility-sensitive controls in DOM.