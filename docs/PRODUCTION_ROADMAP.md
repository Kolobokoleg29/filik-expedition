# Filik Expedition — Production Roadmap

Статус: baseline-аудит начат 2026-09-10.

## Цель

Довести «Слова: Забытая Экспедиция» до production-уровня студийной браузерной игры: стабильный игровой цикл, понятная архитектура, проверяемый контент, качественный UI/UX, быстрый запуск, надёжные сохранения и SDK-интеграции, воспроизводимый QA и безопасный релиз.

## Зафиксированный baseline

- Runtime: plain JavaScript ES modules + DOM/CSS; вход — index.html → src/main.js.
- Контент: 304 кампанийных уровня, 2000 endless-уровней, 38 глав, 12 спутников, 38 артефактов.
- Assets: 237 файлов — 156 PNG, 77 WebP, 4 WOFF2; крупные wide-backgrounds требуют performance-аудита.
- SDK: Yandex Games с локальным fallback, cloud save, ads, payments, leaderboards и analytics.
- Git: ветка main, GitHub remote подключён; изменения проходят маленькими проверяемыми коммитами.
- Уже проверено: синтаксис JS-модулей, контентный валидатор, локальный fallback smoke-flow на desktop и mobile.
- Ограничения: пока нет package.json, build pipeline, unit/browser test runner и CI; main.js и meta-screens.js остаются крупными UI/state-модулями.

## Порядок работ

### P0 — Release safety и измеримый фундамент

- Добавить минимальный npm/Vite pipeline без смены runtime-модели: dev, production build и preview с корректным base path для Yandex.
- Подключить unit-тесты для чистых правил из core, economy, storage, config и commerce.
- Подключить браузерный smoke-набор для fallback: boot, первый уровень, correct/incorrect, completion, reward, reload, navigation.
- Зафиксировать budgets: размер initial payload, время до интерактивности, missing assets, console errors, mobile viewport.
- Добавить CI: syntax, content validator, unit tests, build и smoke при доступном браузере.

Критерий выхода: checkout собирается одной командой, проверки воспроизводимы локально и в GitHub, блокирующие ошибки не маскируются.

### P1 — Архитектура и игровые гарантии

- Описать state contract и разделить simulation/state, DOM rendering, platform adapter и analytics.
- Вынести из main.js переходы состояния, input actions и completion flow малыми этапами; не переписывать всё сразу.
- Закрепить инварианты: campaign/daily/endless не смешиваются, normalizeWord едина, completion и rewards idempotent, SaveStore санитизирует новые поля.
- Проверить migration/merge/cloud conflict, progress-entries, повторные callbacks и offline/timeout поведение.
- Добавить regression cases для экономики, подсказок, daily/weekly, companions и endless cycle.

Критерий выхода: основные state transitions тестируются без DOM, повторные операции безопасны, структура модулей понятна новому разработчику.

### P1 — Контент и asset pipeline

- Расширить валидатор: уникальные IDs, chapter mapping, grid crossings, все runtime asset references, shape и build metadata.
- Ввести manifest keys для UI, background, companion, artifact и audio там, где это безопасно.
- Определить canonical source и правила именования, размеров и форматов; не менять существующие IDs без migration.
- Провести визуальный аудит всех 38 глав, companion poses, icons и reward states.
- Сжать и при необходимости перекодировать тяжёлые изображения с контролем качества; добавить lazy loading/prefetch по маршруту.
- Недостающие ассеты создавать только под утверждённую потребность и сразу подключать к validator/QA.

Критерий выхода: контент проходит автоматическую проверку, ссылки не ломаются, ассеты соответствуют ролям и performance budget.

### P1 — UI/UX, responsive и accessibility

- Составить карту экранов: home, map, game, victory, daily, weekly, endless, shop, settings, journal, companions, profile, leaderboard.
- Устранить clipping, overlap и неясные CTA на mobile 390×844 и desktop; сохранить читаемость игрового поля.
- Проверить keyboard navigation, focus return, Escape, aria-label, live regions, disabled/loading/error states и reduced motion.
- Унифицировать tokens для цвета, spacing, typography, buttons, modal и feedback states.
- Добавить понятные loading/offline/SDK-unavailable/purchase-pending состояния.

Критерий выхода: каждый экран имеет happy path и failure path, доступен с клавиатуры и не ломается на целевых размерах.

### P2 — Production polish и performance

- Профилировать запуск, render/update hotspots, DOM churn и memory на мобильном браузере.
- Снизить стоимость повторных innerHTML-рендеров там, где это влияет на ввод или переходы.
- Стандартизировать audio unlock, mute/music settings, SFX feedback и graceful fallback без звука.
- Добавить аккуратные переходы, motion budget и feedback для word states, hints, rewards и companion reactions.
- Подготовить performance report до/после с реальными измерениями.

### P1/P2 — Yandex Games и монетизация

- Проверить в draft/staging LoadingAPI, GameplayAPI, player/cloud, ads, payments/catalog/consume, leaderboards и account selection.
- Сохранить fallback без YaGames и корректно обрабатывать timeout, error и offline.
- Проверить, что purchase receipt выдаёт награду ровно один раз, ledger переживает reload, consume выполняется после сохранения.
- Проверить cooldown рекламы, pause/resume, rewarded result, close/error/offline и отсутствие двойной награды.
- Сверить live-config IDs, analytics events, privacy/credentials и release settings.

### P0 — Финальный QA и релиз

- Прогнать smoke и regression на Chromium desktop и mobile viewport.
- Проверить fresh profile, existing save, migrated save, cleared storage, offline, slow SDK, ad failure и purchase cancel/pending.
- Проверить все mode/screen routes и отсутствие console/resource errors.
- Сформировать release artifact, проверить diff, untracked files, build metadata, archive contents и rollback commit.
- После релиза провести короткий telemetry review и завести следующий цикл улучшений.

## Правило принятия решений

Сначала сохраняем текущий plain JS + DOM runtime и усиливаем его тестами и границами. Миграция на Phaser или TypeScript допустима только после отдельного решения с измеримой причиной; полная миграция во время стабилизации создаёт слишком большой риск и не является самоцелью.

## Рабочий цикл Goal

Каждый этап должен иметь короткий scope, список изменяемых файлов, проверку до/после, отдельный коммит и обновление этого roadmap. Не запускать широкую параллельную работу без независимых границ файлов.