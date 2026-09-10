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
- Уже проверено: синтаксис JS-модулей, контентный валидатор, production build, performance budgets, локальный fallback smoke-flow на desktop и mobile, persistence после reload.
- Текущие ограничения: полноценные SDK-only сценарии и visual audit в Yandex Games ещё не подтверждены; main.js и meta-screens.js остаются крупными UI/state-модулями.

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

## P0 checkpoint — 2026-09-10

- Добавлен npm/Vite pipeline: dev, production build и preview с копированием runtime-каталогов и assets в dist.
- Добавлены 32 unit-теста для core, config, economy, storage, commerce, platform, progression и asset manifest.
- Добавлены 5 Playwright smoke-тестов; они собирают dist и проверяют production preview, fallback navigation, persistence после reload и защиту от повторной награды при replay.
- Добавлен GitHub Actions quality workflow: npm ci, syntax, content, unit, build, Chromium и browser smoke.
- Локальная аналитика не обращается к внешнему Metrika без явного query-флага analytics; production behavior сохранён.
- Local verification: npm run check:all проходит.

## P1 architecture checkpoint — 2026-09-10

- Добавлен docs/ARCHITECTURE.md с ownership boundaries для domain, platform, presentation, content/assets.
- Зафиксированы state contract, safe change seams, runtime sequence и required test layers.
- Следующий кодовый P1-шаг: покрыть platform/cloud pause flows и расширить validator на runtime asset references до начала крупных extraction-изменений.

## P1 platform safety checkpoint — 2026-09-10

- Добавлены platform unit-тесты для GameplayAPI pause aggregation, cloud-empty fallback, leaderboard score bounds и rewarded callback.
- Timeout helpers в platform.js теперь очищают timers после resolve/reject; unit suite не удерживает процесс искусственными 3.5-секундными таймерами.
- Повторный full gate обязателен после следующего изменения в state, platform или route flow.

- Content validator расширен: теперь он также сканирует literal asset references в index.html, JS и CSS и проверяет их существование.

- Runtime asset-reference validation проверена на текущем полном наборе ассетов; следующий content-шаг — manifest keys и визуальный audit, не механическая проверка существования файлов.

## P0 performance-budget checkpoint — 2026-09-10

- Добавлен budget checker для production dist: required outputs, initial JS/CSS/HTML, total dist и largest отдельного asset.
- Текущий baseline: initial 260 KB, total 25,204 KB, largest asset 247 KB; лимиты зафиксированы в scripts/check-budgets.mjs.

## P0 release-preflight checkpoint — 2026-09-10

- Добавлен локальный release preflight: сверка package/build версии и content counts, обязательные dist outputs, production config normalization, product/leaderboard IDs и базовый secret scan.
- AGENTS.md синхронизирован с фактическим npm/Vite/Playwright/CI-процессом.
- Local verification: npm run check:all проходит после добавления preflight.
- Browser regression: повторное прохождение завершённого уровня не меняет coins и completed в SaveStore.

## P1 progression checkpoint — 2026-09-10

- Completion state transitions вынесены из main.js в src/progression.js без переноса SDK, analytics, DOM и companion side effects.
- Campaign, daily и endless reward paths теперь имеют отдельные unit-тесты на first completion, повторный вызов, chapter bonus, daily cap и milestone idempotence.
- Main.js остаётся orchestrator, а SaveStore.state остаётся единственным источником persistent state.

## P1 asset manifest checkpoint — 2026-09-10

- Введён src/asset-manifest.js для UI/shop, backgrounds, chapter/artifact, captain и companion path categories.
- Runtime consumers используют manifest resolvers; chapter и artifact catalogs остаются authoritative источниками данных без дублирования.
- Content validator импортирует manifest и проверяет canonical files, count contracts и companion poses; missing asset paths блокируют gate.
- Local verification: npm run test:content, npm run test:unit и npm run test:e2e проходят после миграции.

## P1 UI/accessibility checkpoint — 2026-09-10

- Игровое поле получает явную group-семантику, а игровой tip и pause shield — доступные status/live-контракты.
- Модальные окна теперь задают labelled/description relationships, переводят фокус внутрь, удерживают Tab в пределах диалога и восстанавливают предыдущий фокус после закрытия.
- Добавлены 3 Playwright accessibility regression-теста: mobile overflow, modal focus/semantics и ввод русской раскладки физическими keyboard-кодами.
- Browser visual audit выполнен на fallback-режиме; screenshot evidence сохраняется только во временных test-results и не попадает в релиз.
- Local verification: npx playwright test tests/e2e/accessibility.spec.mjs проходит полностью.
## P1 Yandex integration resilience checkpoint — 2026-09-10

- Ad boundary теперь различает неоткрывшуюся рекламную сессию и реально открытую: ошибка до открытия не ставит interstitial cooldown, а открытая сессия сохраняет защиту от повторного показа.
- Cloud setData failure остаётся retryable через dirty queue; локальный fallback не блокируется.
- Pending coin receipt можно повторно settle-ить после временного consume failure без повторной выдачи монет.
- Добавлены 5 unit-тестов для ad error/timeout, cloud retry и idempotent purchase paths.
- Real SDK, cloud, ads, payments и leaderboard всё ещё требуют ручной проверки в draft/staging кабинете Яндекс Игр перед публикацией.
- Local verification: npm run test:unit проходит полностью.
## P1 loading/performance checkpoint — 2026-09-10

- Удалены конкурирующие HTML background preloads и static CSS fallback, которые дублировали первый фон и создавали hashed/literal расхождение.
- Runtime сохраняет один responsive background request через canonical assets/UI paths; CSS custom property использует stylesheet-relative ../assets base.
- Vite build-plugin копирует только assets/UI, canonical favicon перепривязывается к UI-файлу, лишние hashed favicon и дублирующие root fonts не попадают в release archive.
- Добавлен Playwright performance regression: computed background не равен none, нет /assets/assets paths или failed requests, mobile не получает horizontal overflow.
- Новый baseline: initial 260 KB, total dist 25,204 KB, desktop/mobile boot без duplicate camp background requests.
- Local verification: npm run build, npm run test:budget, npm run test:release и performance E2E проходят.

## P1 responsive QA checkpoint — 2026-09-10

- Browser audit основных fallback-маршрутов на mobile 390×844 и desktop 1280×900 не выявил console/resource errors и горизонтального clipping у страниц, модальных окон, магазина, карты, дневника и спутников.
- Исправлен подтверждённый mobile overflow в журнале целей: category tabs теперь переносятся в пределах модального окна, а не уходят за viewport скрытой горизонтальной полосой.
- Добавлен Playwright regression на ширину и границы category tabs в mobile goals modal.
- Добавлены flow regression-тесты для запуска daily route и корректного двухступенчатого Escape в weekly → leaderboard nested modal.
- Modal stack теперь сохраняет trigger descriptor и родительский focus anchor: Escape восстанавливает focus на leaderboard, затем на исходную weekly CTA.
- Для коротких mobile viewport home теперь вертикально прокручивается: weekly CTA и подпись не теряются за нижней границей экрана.
- Добавлен browser asset-loading regression: после прокрутки lazy-контента все изображения map/album/pets загружаются на mobile и desktop без broken requests.

## P1 account refresh checkpoint — 2026-09-10

- При re-auth/account selection refreshPlayer и SDK close-событие очищают account-bound player/payments caches и сбрасывают cloudReady до подтверждения новой сессии.
- Ошибка получения нового cloud player теперь остаётся fail-closed, чтобы старое cloud/payment состояние не использовалось для другого аккаунта; локальный fallback сохраняется.
- Добавлены reliability tests для успешного cache reset и неуспешного account refresh.


## P1 commerce reliability checkpoint — 2026-09-10

- CommerceService теперь сериализует purchase и restore: параллельные операции возвращают явный busy-результат и не открывают второй платежный поток.
- UI сообщает игроку, что другая операция покупки ещё выполняется; существующий receipt ledger и порядок cloud save → consume сохранены.
- Добавлен unit regression на взаимную блокировку buy/restore; полный набор вырос до 41 теста.


## P1 account-bound cloud checkpoint — 2026-09-10

- SaveStore хранит отдельный локальный account marker; Yandex player identity читается через getUniqueID().
- Первый SDK-вход сохраняет локальный fallback в пустой cloud-профиль, но смена аккаунта заменяет состояние только новым cloud payload или fresh state, без monotonic merge старого профиля.
- При пустом или аварийном cloud-ответе после смены аккаунта старое состояние из localStorage изолируется; добавлены regression-тесты для remote, empty и failed account-switch сценариев.
- Local verification: 44 unit-теста проходят; реальный account-switch, cloud, payments и ads всё ещё требуют draft/staging проверки Яндекс Игр.


## P0 release artifact checkpoint — 2026-09-10

- Добавлен cross-platform scripts/package-release.mjs без новых зависимостей: он собирает ZIP только из dist, проверяет обязательные outputs и отклоняет symlink/неподдерживаемые записи.
- Добавлена npm-команда release:package: build → budget → release-preflight → package.
- GitHub Actions теперь выполняет packaging после browser smoke и загружает ZIP как workflow artifact; локальный ZIP остаётся в игнорируемой artifacts/.
- Local verification: release:package создал 244-файловый ZIP Filik Expedition v5.3.4 размером 24,283,486 bytes; обязательные index, catalogs, config и app icon подтверждены.

## P1 gameplay content gate checkpoint — 2026-09-10

- Добавлен scripts/check-gameplay-content.mjs и подключён в npm run test:content как второй слой после структурного content validator.
- Gate проверяет все ID кампании и endless, границы и конфликты grid-клеток, canonical target/bonus words и их classification, согласованность difficulty metrics, перестановку endless-шаблонов и диапазон daily routes.
- Local verification: 304 campaign, 2000 endless, 44,428 occupied cells, 13,293 target words, 28,662 bonus words и 2,000 unique endless templates проходят без ошибок.

## P1 persistence migration checkpoint — 2026-09-10

- Исправлена миграция legacy-настроек: isMusicMuted теперь обрабатывается независимо от общего isMuted и SFX mute.
- Добавлен regression-тест для сохранения включённой музыки при отключённом звуке интерфейса.
- Local verification: 6 storage-тестов и syntax gate проходят успешно.

## P1 data loading resilience checkpoint — 2026-09-10

- Добавлен единый src/data-loader.js для JSON-каталогов: timeout, повтор transient-ошибок и отказ без повторов для постоянного HTTP failure.
- Campaign, endless и live-config используют общий loader; зависший fetch больше не блокирует boot бесконечно.
- Добавлены unit-тесты на retry, permanent HTTP failure и timeout.
