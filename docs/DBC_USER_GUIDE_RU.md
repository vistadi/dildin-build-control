# Dildin Build Control: инструкция по настройке и использованию

Этот документ описывает практический порядок работы с DBC v0.2 Harness Core Foundation.

DBC сейчас лучше воспринимать как local-first control tower:

```text
Task -> Contract -> Approval -> WorkSlice -> HarnessRun -> Loop evidence -> EvidencePack -> Accept / Rework / Reject
```

## 0. Моя короткая инструкция

Если нужно просто начать пользоваться DBC без чтения всего документа, делайте так.

### Самый простой сценарий

Каждый раз, когда хочешь дать системе задачу:

```text
Tasks -> Save task -> Start safe run -> Loops -> Advance -> Evidence Pack -> Reports
```

Расшифровка:

1. Открой `Tasks`.
2. В `Task Composer` напиши задачу обычным текстом.
3. Нажми `Save task`.
4. На карточке задачи нажми `Start safe run`.
5. Приложение само создаст contract, slice и HarnessRun.
6. Открой `Loops`.
7. В блоке `Harness Runs` нажимай `Advance`, пока не появится статус:

```text
evidence_ready
```

8. Нажми `Evidence Pack`.
9. Открой `Reports`.
10. Посмотри итоговый отчет и реши: принять, переделать или отклонить.

Если коротко совсем:

```text
Создал задачу -> Start safe run -> Advance до evidence_ready -> Evidence Pack -> Reports
```

### Что не трогать в обычной работе

Обычно не нужно нажимать:

```text
Create Contract
Freeze Spec
Approve Contract
Create Slice
Approve Slice
Start Harness
Start legacy loop
```

Эти кнопки спрятаны в `Advanced controls`. Используй их только если хочешь вручную пройти внутренние шаги.

### Как понять, что все нормально

Нормальные статусы:

```text
running
slice_running
self_checked
reviewed
security_reviewed
evidence_ready
accepted
ready_for_human_approval
```

`ready_for_human_approval` - это не ошибка. Это значит, что real provider запуск специально ждет твоего подтверждения.

Плохие статусы:

```text
blocked
failed
rejected
```

Если увидел `blocked` или `failed`, открой `Loops`, посмотри последний output и затем `Reports`.

### Один раз настроить проект

1. Запустите приложение:

```bash
pnpm tauri dev
```

2. Откройте `Projects` и добавьте путь к рабочему проекту.
3. Откройте `Settings`.
4. Для `Codex CLI` укажите exact path из:

```bash
which codex
```

5. Для `Claude Code` укажите exact path из:

```bash
which claude
```

6. Для Codex оставьте:

```text
Args template: exec --skip-git-repo-check --sandbox workspace-write --cd "{{cwd}}"
Prompt mode: stdin
Run mode: mock
```

7. Для Claude оставьте:

```text
Args template: -p
Prompt mode: stdin
Run mode: mock
```

8. Нажмите `Test CLI` и `Check contract` у каждого CLI provider.
9. Нажмите `Sync .dbc config`.

На этом настройка CLI закончена.

### Каждый раз перед работой

1. Откройте `Settings`.
2. Нажмите `Load .dbc config`.
3. Проверьте, что Codex и Claude не красные.
4. Оставьте `Run mode: mock`, если не хотите тратить реальные provider calls.
5. Откройте `Tasks`.

### Как запустить безопасную проверку

Сначала всегда делайте controlled smoke:

1. Откройте `Tasks`.
2. Нажмите `Controlled smoke`.
3. Откройте `Loops`.
4. Проверьте, что loop завершился без blocker.
5. Откройте `Reports`.
6. Убедитесь, что есть evidence/report.

То же самое из терминала:

```bash
pnpm controlled-smoke
pnpm launch-doctor
pnpm system-audit
```

Нормально, если статус:

```text
ready_for_human_approval
```

Это значит, что система специально ждет человека перед real provider запуском.

### Как сделать задачу через Harness

В `Tasks`:

1. Создайте задачу в `Task Composer`.
2. Нажмите `Save task`.
3. На карточке задачи нажмите `Start safe run`.

DBC сам сделает внутренние шаги:

```text
Create Contract -> Freeze Spec -> Approve Contract -> Create Slice -> Approve Slice -> Start Harness
```

Для пользователя это одно явное действие approval/start.

Потом в `Loops`:

1. В блоке `Harness Runs` нажимайте `Advance`.
2. Дождитесь статуса `evidence_ready`.
3. Нажмите `Evidence Pack`.

Потом в `Reports`:

1. Проверьте EvidencePack manifest.
2. Проверьте acceptance report.
3. Решите: `Accept`, `Rework` или `Reject`.

Если нужен ручной контроль каждого шага, откройте на карточке задачи `Advanced controls`.

### Когда включать real provider

Не включайте `Run mode: real`, пока не прошли:

```bash
pnpm controlled-smoke
pnpm provider-contracts
pnpm approval-queue
pnpm launch-doctor
pnpm system-audit
```

Real provider запуск должен быть только после human approval.

Если цель такая:

```text
Codex пишет код, Claude проверяет
```

то логика такая:

```text
Developer / Team Lead -> Codex CLI
Reviewer / QA / Security -> Claude Code
DevOps -> Local Terminal
```

Но сначала держите всех в `mock`. Переключайте в `real` только маленькую задачу и только после approval.

### Где смотреть результат

Основные экраны:

- `Tasks` - создать задачу, contract и slice;
- `Loops` - смотреть HarnessRun и legacy loop evidence;
- `Approvals` - смотреть human gates;
- `Reports` - смотреть EvidencePack и final report;
- `Settings` - настраивать Codex, Claude, local terminal и policy.

Основные файлы:

```text
.dbc/contracts/        frozen specs
.dbc/slices/           work slices
.dbc/harness-runs/     HarnessRun manifests and events
.dbc/packs/            EvidencePack manifests
.dbc/reports/          acceptance reports
.dbc/approval-gates/   Harness gates
.dbc/approval-queue/   unified approval queue
```

### Если что-то не работает

1. CLI не найден: вставьте exact path из `which codex` или `which claude`.
2. `stdin is not a terminal`: CLI запущен в неправильном режиме. Для Codex нужен `exec ...`, для Claude нужен `-p`.
3. `Start Harness` неактивен: не пройдены `Approve Contract` или `Approve Slice`.
4. `Evidence Pack` неактивен: HarnessRun еще не дошел до `evidence_ready`.
5. `launch-doctor` показывает warnings: это не blocker. Смотрите, чтобы было `blockers: 0`.

## 1. Что нужно установить

Минимально:

- Node.js / pnpm;
- Rust / Cargo для Tauri backend;
- Codex CLI, если хотите использовать Codex как исполнителя;
- Claude Code CLI, если хотите использовать Claude как reviewer / QA / security;
- Git в проекте, если хотите получать diff/scope evidence.

Проверка базовой сборки:

```bash
pnpm install
pnpm build
cargo test --manifest-path src-tauri/Cargo.toml
```

Запуск web shell:

```bash
pnpm dev
```

Tauri desktop:

```bash
pnpm tauri dev
```

## 2. Главное правило безопасности

DBC не должен автоматизировать consumer web UI.

Разрешенные поверхности:

- официальный Codex CLI;
- официальный Claude Code CLI;
- local terminal runner;
- Tauri filesystem / SQLite;
- официальные API в будущих адаптерах.

Real provider execution не должен запускаться без human approval. Пока вы настраиваете систему, держите providers в `mock`.

## 3. Первый запуск приложения

1. Откройте DBC.
2. Перейдите в `Projects`.
3. Добавьте путь к рабочему проекту.
4. Перейдите в `Settings`.
5. Нажмите `Load .dbc config`, если в проекте уже есть `.dbc/providers.yaml`.
6. Если конфигурации нет, настройте providers вручную и нажмите `Sync .dbc config`.

После этого DBC будет хранить настройки проекта в:

```text
.dbc/providers.yaml
.dbc/policy.yaml
```

## 4. Настройка Codex CLI

В `Settings` найдите provider `Codex CLI`.

Рекомендуемые значения:

```text
Type: cli
Command: exact path to codex, for example /opt/homebrew/bin/codex
Args template: exec --skip-git-repo-check --sandbox workspace-write --cd "{{cwd}}"
Prompt mode: stdin
Run mode: mock for setup, real only after approval
```

Что нажать:

1. `Discover` или укажите exact path вручную.
2. `Test CLI`.
3. `Check contract`.
4. `Sync .dbc config`.

Если команда `codex` работает в обычном терминале, но DBC ее не видит, укажите exact path:

```bash
which codex
```

И вставьте результат в поле `Command`.

## 5. Настройка Claude Code CLI

В `Settings` найдите provider `Claude Code`.

Рекомендуемые значения:

```text
Type: cli
Command: exact path to claude, for example /opt/homebrew/bin/claude
Args template: -p
Prompt mode: stdin
Run mode: mock for setup, real only after approval
```

Проверка:

```bash
which claude
claude --help
```

В DBC:

1. `Discover` или exact path вручную.
2. `Test CLI`.
3. `Check contract`.
4. `Sync .dbc config`.

## 6. Как назначать роли

Откройте `AI Team`.

Рекомендуемая схема:

```text
Team Lead       -> Codex CLI or mock
Developer       -> Codex CLI or mock
Product Owner   -> Codex CLI or mock
Architect       -> Claude Code or mock
Reviewer        -> Claude Code or mock
QA              -> Claude Code / local terminal / mock
Security        -> Claude Code or mock
DevOps          -> local terminal
```

Для первого запуска держите всех в `mock`, кроме `Local Terminal`, если хотите проверить `pnpm build`.

## 7. Безопасный первый тест

Самый безопасный путь:

1. Откройте `Tasks`.
2. Нажмите `Controlled smoke`.
3. Перейдите в `Loops`.
4. Дождитесь завершения loop.
5. Откройте `Reports` и проверьте evidence.

Controlled smoke:

- не вызывает Codex / Claude models;
- использует deterministic mock steps;
- может выполнить локальный build через local runner;
- пишет evidence в `.dbc`.

Проверка из терминала:

```bash
pnpm controlled-smoke
pnpm launch-doctor
pnpm system-audit
```

## 8. Как пользоваться Harness v0.2

Harness flow запускается из `Tasks`.

### Шаг 1. Создать task

В `Task Composer` заполните:

- title;
- free-form TZ / brief;
- acceptance criteria;
- constraints;
- allowed paths;
- denied paths;
- stop conditions;
- budget.

Нажмите:

```text
Save task
```

### Шаг 2. Создать TaskContract

На карточке задачи нажмите:

```text
Create Contract
```

DBC создаст:

```text
SQLite: task_contracts
.dbc/contracts/<contract-id>.json
```

### Шаг 3. Freeze Spec

Нажмите:

```text
Freeze Spec
```

После freeze контракт нельзя менять напрямую. Если спецификация изменилась, создавайте новую версию contract.

### Шаг 4. Approve Contract

Нажмите:

```text
Approve Contract
```

Это human approval для spec gate.

### Шаг 5. Create Slice

Нажмите:

```text
Create Slice
```

DBC создаст:

```text
SQLite: work_slices
.dbc/slices/<slice-id>.json
```

WorkSlice - это ограниченная исполнимая часть задачи.

### Шаг 6. Approve Slice

Нажмите:

```text
Approve Slice
```

### Шаг 7. Start Harness

Нажмите:

```text
Start Harness
```

DBC создаст HarnessRun и запустит старый loop engine через compatibility wrapper.

DBC сохранит:

```text
SQLite: harness_runs
.dbc/harness-runs/<run-id>/manifest.json
.dbc/harness-runs/<run-id>/events.jsonl
```

В `Loops` вы увидите:

- HarnessRun status;
- current stage;
- linked contract;
- linked work slice;
- compatibility loop id;
- EvidencePack status.

### Шаг 8. Advance Harness

В `Loops` нажимайте:

```text
Advance
```

HarnessRun будет двигаться по стадиям:

```text
planned -> slice_running -> self_checked -> reviewed -> security_reviewed -> evidence_ready
```

### Шаг 9. Generate Evidence Pack

Когда run дошел до `evidence_ready`, нажмите:

```text
Evidence Pack
```

DBC создаст:

```text
SQLite: evidence_packs
.dbc/packs/<pack-id>/manifest.json
.dbc/reports/<pack-id>-acceptance.md
```

### Шаг 10. Accept / Rework / Reject

Финальное решение сохраняется в SQLite и durable artifact:

```text
.dbc/packs/<pack-id>/manifest.json
.dbc/reports/<pack-id>-acceptance.md
```

## 9. Approval Queue

Откройте `Approvals`.

Там есть два слоя:

1. Legacy approval queue для real provider / command / git / operator gates.
2. Harness Approval Gates:
   - Spec approval;
   - Plan approval;
   - WorkSlice approval;
   - Real provider approval;
   - Command approval;
   - Evidence acceptance.

Терминальная проверка:

```bash
pnpm approval-queue
```

Ожидаемый безопасный статус перед real provider запуском:

```text
pending_approval
```

Это значит, что система ждет человека, а не запускает real providers сама.

## 10. Reports и Evidence

Откройте `Reports`.

Там смотрите:

- final acceptance report;
- EvidencePack manifest path;
- EvidencePack report path;
- final decision;
- backend loop artifacts.

Основные `.dbc` директории:

```text
.dbc/contracts/        TaskContract JSON
.dbc/slices/           WorkSlice JSON
.dbc/harness-runs/     HarnessRun manifest + events
.dbc/packs/            EvidencePack manifests
.dbc/reports/          acceptance reports
.dbc/loops/            legacy loop manifests
.dbc/evidence/         step evidence
.dbc/security/         security reports
.dbc/approval-gates/   Harness approval gates
.dbc/approval-queue/   unified approval queue
```

## 11. Перед real provider запуском

Не запускайте real providers сразу.

Сначала:

```bash
pnpm controlled-smoke
pnpm provider-contracts
pnpm real-readiness
pnpm operator-checklist
pnpm approval-queue
pnpm launch-doctor
pnpm system-audit
```

Потом:

1. Откройте `.dbc/operator/latest.md`.
2. Проверьте task, budget, stop conditions, rollback.
3. Подтвердите approval в приложении или через terminal command.
4. Только после этого переключайте нужные providers в `real`.

## 12. Что означает статус `ready_for_human_approval`

Это нормальный статус.

Он означает:

- система собрана;
- blockers нет;
- evidence/reporting работают;
- real provider workflow специально заблокирован до решения человека.

Это не ошибка.

## 13. Частые проблемы

### CLI installed, but DBC says not found

Укажите exact path:

```bash
which codex
which claude
```

Вставьте путь в provider `Command`.

### `stdin is not a terminal`

CLI запущен как interactive TUI вместо non-interactive режима.

Для Codex используйте:

```text
exec --skip-git-repo-check --sandbox workspace-write --cd "{{cwd}}"
```

Для Claude используйте:

```text
-p
```

### Harness Start disabled

Проверьте порядок:

```text
Create Contract -> Freeze Spec -> Approve Contract -> Create Slice -> Approve Slice -> Start Harness
```

### Evidence Pack disabled

HarnessRun еще не дошел до:

```text
evidence_ready
```

Нажимайте `Advance`, пока compatibility loop не завершится.

### launch-doctor показывает warnings

Warnings не всегда blocker.

Главное:

```text
blockers: 0
```

Если status `ready_for_human_approval`, значит система специально ждет approval.

## 14. Рекомендуемый ежедневный workflow

```text
1. Import/Open project
2. Load .dbc config
3. Check Settings provider health
4. Create Task
5. Create Contract
6. Freeze Spec
7. Approve Contract
8. Create WorkSlice
9. Approve WorkSlice
10. Start Harness
11. Advance Harness
12. Generate EvidencePack
13. Accept / Rework / Reject
14. Review Reports
15. Only then decide whether real provider run is needed
```

Для разработки самой DBC:

```bash
pnpm build
cargo test --manifest-path src-tauri/Cargo.toml
pnpm launch-doctor
pnpm system-audit
```
