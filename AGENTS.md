# AGENTS.md — «Слова: Забытая Экспедиция»

## Назначение проекта

Это автономная браузерная игра на русском языке для публикации в Яндекс Играх. Игровой жанр — словесный кроссворд/экспедиция: игрок собирает слова из набора букв, открывает клетки, получает награды и продвигается по карте.

Текущая версия: `5.3.4`.

## Стек и запуск

- Чистый HTML/CSS/JavaScript ES modules; TypeScript, React, Phaser и Three.js не используются.
- Сборщик и менеджер зависимостей отсутствуют. Не добавлять `npm install` или новый build pipeline без отдельного решения.
- Игра должна запускаться через HTTP(S)-сервер, а не через `file://`: при старте загружаются JSON через `fetch()`.
- Для локальной проверки можно использовать любой статический сервер из корня проекта, например `python -m http.server 8000` или аналогичный сервер для Node.
- Точка входа: `index.html` → `src/main.js`.

## Структура

- `index.html` — HTML-контейнер, метаданные, загрузка стилей/модуля, счётчик Метрики.
- `src/main.js` — главный orchestrator: загрузка данных, маршрутизация экранов, игровой цикл, обработчики событий, сохранение и интеграции.
- `src/core.js` — нормализация слов, построение клеток, проверка слова, прогресс уровня, звёзды, daily/endless-утилиты.
- `src/storage.js` — локальное состояние, санитизация, миграции и merge сохранений.
- `src/platform.js` — адаптер SDK Яндекс Игр: cloud save, реклама, платежи, полноэкранный режим, gameplay API, лидерборды.
- `src/config.js` — дефолтная конфигурация, нормализация и remote flags.
- `src/economy.js`, `src/commerce.js` — экономика, магазин, рекламные награды, покупки и receipt ledger.
- `src/meta-screens.js`, `src/victory-screen.js` — мета-экраны и экран завершения уровня.
- `src/content.js`, `src/companions.js`, `src/captains.js`, `src/companion-dialogue.js`, `src/endless-meta.js` — главы, спутники, капитаны и бесконечный режим.
- `src/style.css` — вся визуальная система и responsive-правила.
- `levels.json` — 304 уровня кампании; `endless-levels.json` — 2000 уровней бесконечной экспедиции.
- `live-config.json` — локальные значения remote-конфигурации: экономика, реклама, leaderboard и product IDs.
- `build.json` — версия и контрольные количества контента.
- `assets/UI` — изображения интерфейса, глав, артефактов, спутников, капитанов, магазина и шрифты.

## Авторитетные данные и инварианты

- Кампания содержит ровно 304 уровня; главы группируют уровни по 8, всего 38 глав.
- Бесконечный каталог должен содержать не менее 2000 уровней.
- `build.json` должен оставаться согласованным с фактическими каталогами.
- Идентификаторы уровней кампании начинаются с 1; endless-уровни имеют собственный каталог и отдельную логику индексации.
- Пути к ассетам чувствительны к регистру и должны соответствовать реальным файлам. При добавлении главы нужно синхронно обновить контент, изображения, визуальные параметры и артефакт.
- Русские слова проходят через `normalizeWord()`; `Ё` нормализуется в `Е`. Не менять это правило локально в отдельных экранах.
- Состояние хранится локально под ключом `expedition_rebus_v5` и резервной копией `expedition_rebus_v5_backup`. Облачный слой Яндекс Игр использует тот же payload под ключом `SAVE_KEY`.
- Схема сохранения и receipt ledger требуют обратной совместимости. Изменения полей должны проходить через `sanitizeState()`/миграции.

## Интеграции и окружения

- Без `window.YaGames` игра работает в fallback-режиме: локальный прогресс, UI и основной игровой цикл доступны, cloud/реклама/платежи/лидерборды недоступны.
- В публикации используются SDK Яндекс Игр, Cloud Save, Gameplay API, реклама, платежи и leaderboard `expeditionEndless`.
- Аналитика отправляется в Яндекс Метрику, счётчик `111688508`; в событиях присутствует версия сборки и session id.
- Product IDs и remote flags находятся в `live-config.json` и дублируются в `src/config.js`. При изменении нужно проверить обе точки и конфигурацию в кабинете Яндекс Игр.
- Не добавлять ключи, токены, секреты или реальные платёжные данные в репозиторий.

## Правила изменений

1. Перед правкой определить слой ответственности: игровая логика — `core.js`/`main.js`, состояние — `storage.js`, SDK — `platform.js`, экономика — `economy.js`/`commerce.js`, визуал — `style.css`/ассеты.
2. Делать небольшие локальные изменения и сохранять существующее поведение fallback-режима.
3. Не менять product IDs, формат cloud save, receipt ledger, счётчик аналитики и leaderboard без явной проверки совместимости.
4. Не редактировать большие JSON-каталоги вручную без валидации структуры и контрольных количеств.
5. Не встраивать HTML от пользовательских или удалённых источников без экранирования: UI сейчас формируется шаблонными строками.
6. Все новые UI-элементы должны сохранять клавиатурное управление, `aria`-описания, работу Escape для модальных окон и responsive-режимы.
7. Сохранять поддержку `prefers-reduced-motion`, safe-area и мобильной ширины до 700px.

## Минимальная проверка после изменений

Запускать статический сервер и проверить в браузере:

1. boot без SDK и отсутствие fatal error;
2. стартовый уровень: выбор букв, отправка корректного/некорректного слова, подсказка;
3. завершение уровня, награды, продолжение и возврат в лагерь;
4. сохранение после reload и корректный следующий уровень;
5. карта, дневник, спутники, цели, магазин, настройки и daily/weekly/endless-переходы;
6. desktop и mobile viewport, включая экран игры и модальные окна;
7. консоль браузера на ошибки и отсутствующие ассеты.

Автоматических тестов, линтера и CI пока нет — это известное ограничение проекта, а не причина пропускать ручную smoke-проверку.

## Git workflow

- Работать из корня проекта; не коммитить временный сервер, логи, локальные настройки IDE и зависимости.
- В коммите держать связанные изменения вместе: код + данные + ассеты + `build.json`.
- Перед commit проверить `git diff`, список новых бинарных ассетов и согласованность JSON.
- Для GitHub сначала создать/выбрать удалённый репозиторий и определить URL `origin`; затем выполнить push с настроенной авторизацией. Не хранить credentials в файлах проекта.

## Известный статус на момент создания документа

- Исходная папка была распакованным проектом; Git-репозитория и remote в ней не было.
- Локальный smoke-тест пройден: boot, первый уровень, получение награды, карта, настройки, магазин и mobile viewport открываются без ошибок консоли.
- Для полноценной проверки SDK, cloud save, рекламы, платежей и leaderboard нужен staging/production-контур Яндекс Игр.
- Для подключения GitHub требуется URL целевого репозитория и доступ к нему; локальная подготовка Git не заменяет эту внешнюю авторизацию.


## Skill routing and context efficiency

- Project-scoped skills are in .agents/skills/ and should be loaded only for the matching task.
- filik-gameplay covers gameplay rules, progress, rewards, persistence, and economy.
- filik-content covers level catalogs, chapters, assets, and content validation.
- filik-qa covers browser smoke/regression and responsive checks.
- filik-yandex-release covers Yandex Games SDK, cloud/ads/payments/leaderboards, and release preflight.
- Use one main agent for normal tasks. Delegate only large independent subtasks with explicit file ownership; do not start review/fix/re-review chains without a new signal.
- Batch independent read-only checks. Do not reread unchanged large JSON or repeat successful tests without changed inputs.
- Do not add a skill or plugin when an existing one covers the task; new rules should reduce repeated decisions rather than duplicate this document.

## Quality gate

- Install with npm ci.
- Run npm run check for syntax, content, unit tests, and production build.
- Run npm run test:e2e for a fresh production-preview browser smoke on desktop and mobile.
- Run npm run check:all before a release candidate.
- Local analytics is disabled by default; add ?analytics=1 only when explicitly testing the external Metrika integration.
