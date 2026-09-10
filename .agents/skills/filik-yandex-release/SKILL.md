---
name: filik-yandex-release
description: "Change or verify Filik Yandex Games integrations and prepare safe GitHub releases without breaking local fallback mode."
---
# Filik Yandex Release

Use this skill for src/platform.js, src/analytics.js, src/commerce.js, src/config.js, live-config.json, Yandex SDK behavior, release checks, and CI.

## Integration rules

- Preserve fallback when YaGames is absent or initialization fails.
- Treat the cloud-save key expedition_rebus_v5 and its migration path as contracts.
- Ads, purchases, receipts, cloud storage, and leaderboards are asynchronous and failure-prone; never grant a reward twice.
- Treat product IDs, leaderboard IDs, the Metrika counter, feature flags, and ad cooldowns as contracts.
- Never commit credentials, tokens, payment data, or private SDK responses.

## Release preflight

1. Run the content validator when content, assets, IDs, or build metadata changed.
2. Run focused fallback browser QA for the affected flow.
3. Test real SDK-only behavior only in the appropriate draft/staging environment.
4. Check build.json, the diff, untracked assets, and the final archive/deploy inputs.
5. Push or publish only when the user explicitly requests that external action.
