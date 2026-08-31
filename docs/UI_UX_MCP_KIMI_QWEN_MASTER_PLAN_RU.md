# DBC: master plan развития UI/UX, MCP, Kimi и Qwen

Версия плана: 1.0
Дата: 2026-08-12
Статус: функциональные slices Phase 0–6 реализованы и локально проверены; внешние
native-provider, remote OAuth MCP и Apple signing/notarization проверки остаются
операционными acceptance gates
Горизонт: alpha → beta → 1.0

## 1. Краткое решение

DBC должен развиваться не как ещё один чат с моделью, а как локальная система
управления проверяемой AI-разработкой. Пользователь описывает ограниченную задачу,
выбирает или принимает рекомендованную AI-команду, разрешает только необходимые
инструменты, наблюдает понятный прогресс и принимает результат по EvidencePack.

Целевая структура продукта строится вокруг четырёх основных экранов:

1. **Run** — описать изменение, проверить область работ, запустить и наблюдать.
2. **Approvals** — принять только те решения, которые действительно блокируют запуск.
3. **Evidence** — понять, можно ли принять результат и почему.
4. **Settings** — подключить проекты, AI-провайдеры, MCP-инструменты и политики.

Codex, Claude, Kimi и Qwen должны быть равноправными провайдерами. MCP должен быть
отдельным слоем инструментов, а не свойством одной модели. DBC должен владеть
политикой, областью доступа, подтверждениями и доказательствами; модель не должна
самостоятельно расширять свои права.

## 2. Что уже есть и что необходимо изменить

### 2.1 Сильная текущая основа

- Tauri 2, React 18 и TypeScript обеспечивают локальный desktop UX.
- Rust-бэкенд хранит состояние и переносимые `.dbc`-артефакты.
- Уже есть Provider, AgentRole, TaskContract, WorkSlice, HarnessRun и EvidencePack.
- Роли отделены от провайдеров, предусмотрены fallback-провайдеры.
- Есть mock, local runner, Codex CLI, Claude Code CLI и generic CLI.
- Run уже сокращён до трёх этапов: Describe, Run checks, Decide.
- Опасные действия проходят через scope, command policy, budget и approvals.

### 2.2 Главные ограничения текущей модели

- `ProviderStrategy` является закрытым union со сценариями, жёстко названными через
  Codex/Claude. Добавление каждой модели создаёт комбинаторный рост вариантов.
- Provider описывает CLI, но не содержит полноценного vendor/model/auth/capability
  контракта для API, MCP и динамической маршрутизации.
- MCP-серверы, их инструменты, ресурсы, prompts, OAuth и trust policy не представлены
  как объекты DBC.
- Провайдеры и инструменты смешаны в технических Settings, а пользователю нужен ответ
  на более простой вопрос: «Кто будет выполнять задачу и к чему он получит доступ?»
- Нет единого health/readiness контракта для CLI, API, модели и MCP-сервера.
- Нет неизменяемого снимка provider/MCP-конфигурации внутри конкретного HarnessRun.
- Нет UX для fallback, деградации, rate limit, потери авторизации и частично доступных
  MCP-серверов.

## 3. Продуктовая цель

### 3.1 Обещание пользователю

> Подключите любую подходящую AI-систему, выдайте ей минимально необходимые права и
> получите проверяемый результат с прозрачным журналом решений.

### 3.2 Основные пользовательские результаты

- Первый безопасный mock-run завершается не более чем за 5 минут.
- Первый реальный provider-run настраивается не более чем за 10 минут.
- Пользователь всегда понимает текущий этап, блокер и следующее действие.
- Ни один MCP tool call не происходит без действующей политики и привязки к run.
- Любой accepted EvidencePack объясняет, какая модель и какие инструменты участвовали.
- Замена Codex на Kimi или Qwen не меняет смысл TaskContract и acceptance criteria.

### 3.3 Не-цели

- Не превращать DBC в универсальную IDE.
- Не дублировать полноценные терминальные интерфейсы Kimi Code или Qwen Code.
- Не хранить API keys, OAuth tokens или cookies в `.dbc` и Git.
- Не обещать одинаковое поведение моделей при разных возможностях.
- Не включать auto-approve/yolo как скрытый default.
- Не выполнять push, deploy, reset, clean или публикацию без отдельного разрешения.

## 4. Принципы UI/UX

### 4.1 Один экран — один вопрос

- Run: «Что делаем и что происходит сейчас?»
- Approvals: «Какое моё решение необходимо сейчас?»
- Evidence: «Можно ли принять результат?»
- Settings: «Что подключено и безопасно ли это использовать?»

### 4.2 Progressive disclosure

Основной путь показывает только обязательное. Model parameters, CLI arguments, MCP
headers, timeouts, parsers и raw artifacts открываются по запросу в Advanced.

### 4.3 Человеческий язык раньше технического

- `auth_required` → «Нужно войти».
- `discovery_timeout` → «Сервер инструментов не ответил».
- `provider_fallback` → «Основная модель недоступна, выбран резервный исполнитель».
- `approval_required` → «Нужно ваше разрешение».

Технический код сохраняется в details и EvidencePack.

### 4.4 Состояние важнее декоративности

Каждый интерактивный объект имеет состояния: empty, loading, ready, warning, blocked,
failed, success, disabled и stale. Цвет не является единственным носителем смысла.

### 4.5 Безопасность видна до запуска

Перед Start пользователь видит краткий Run Contract:

- исполнитель и fallback;
- разрешённые пути;
- команды;
- MCP-серверы и классы инструментов;
- budget/time/tool-call limits;
- действия, требующие подтверждения.

### 4.6 Нельзя скрывать деградацию

Если Qwen запущен без одного MCP-сервера или Kimi переключён на fallback, Run остаётся
работоспособным только при явном отображении degraded state и записи причины в evidence.

## 5. Пользователи и режимы

### 5.1 Основные роли пользователей

| Роль | Главная потребность | Основной режим |
| --- | --- | --- |
| Разработчик | Быстро выполнить ограниченную задачу | Guided Run |
| Техлид | Контролировать scope, routing и качество | Run + Evidence |
| Reviewer/Security | Проверить результат и риски | Evidence + Approvals |
| Администратор | Настроить providers, MCP и политики | Settings/Advanced |
| Evaluator | Понять ценность без credentials | Safe preview |

### 5.2 Режимы продукта

1. **Safe preview** — полностью детерминированный, без файлов и провайдеров.
2. **Local mock** — создаёт локальные evidence-артефакты, но не вызывает AI.
3. **Controlled real** — вызывает CLI/API только после preflight и approval.
4. **Team policy** — использует управляемые presets, секреты и MCP allowlists.

## 6. Полная информационная архитектура

### 6.1 Основная навигация

```text
Run
Approvals [badge только для текущего run]
Evidence
Settings
Advanced
```

Основную навигацию не расширять отдельными пунктами Kimi, Qwen или MCP. Это соединения,
а не пользовательские результаты.

### 6.2 Run

```text
Run
├── Describe
│   ├── Task title
│   ├── Request / TZ
│   ├── Acceptance criteria (optional disclosure)
│   └── Allowed / blocked scope (optional disclosure)
├── Configure
│   ├── Recommended team
│   ├── Provider preset
│   ├── Tool access summary
│   └── Budget and safety summary
├── Run checks
│   ├── Current step
│   ├── Agent/provider/model
│   ├── MCP activity
│   ├── Artifacts
│   └── Pause / stop
└── Decide
    ├── Evidence readiness
    ├── Risks
    └── Open Evidence
```

Configure не должен становиться четвёртым обязательным этапом. Для обычного запуска он
представлен одной строкой «Recommended team · Safe tools», а детали открываются в sheet.

### 6.3 Approvals

```text
Approvals
├── Needed now
│   ├── Scope expansion
│   ├── Command
│   ├── MCP write/external action
│   ├── Provider fallback with changed risk
│   └── Real provider start
├── Upcoming
└── Decision history (collapsed)
```

Карточка решения должна показывать:

- что хочет сделать система;
- кто инициатор: role + provider + model;
- через какой MCP server/tool или command;
- какие данные уйдут наружу;
- какие файлы/объекты изменятся;
- риск и reversible/irreversible;
- Allow once, Allow for this run, Reject, Edit scope.

### 6.4 Evidence

```text
Evidence
├── Decision summary
├── Acceptance checklist
├── Change summary
├── AI participation
├── Tool and MCP activity
├── Tests/review/security
├── Cost and duration
├── Risks and deviations
├── Final decision
└── Raw artifacts (collapsed)
```

### 6.5 Settings

```text
Settings
├── Quick Setup
├── Project Contract
├── AI & Models
│   ├── Providers
│   ├── Models
│   ├── Presets
│   └── Routing
├── Tools & MCP
│   ├── Servers
│   ├── Discovered capabilities
│   ├── Tool policies
│   └── OAuth / credentials status
├── Safety
│   ├── Scope defaults
│   ├── Command policy
│   ├── Data egress
│   └── Approval defaults
├── Privacy & Data
└── Advanced diagnostics
```

На первом уровне Settings показывать только Quick Setup, Project Contract и две большие
карточки «AI & Models» и «Tools & MCP». Все детальные вкладки открывать внутри них.

### 6.6 Advanced

Сохранить Projects, Workspace, Tasks, Preflight, AI Team и Loop Console. Добавить:

- Connection diagnostics;
- MCP Inspector;
- Provider contract fixtures;
- Routing simulator;
- Evidence schema viewer.

## 7. Главные пользовательские сценарии

### 7.1 Первый запуск без AI

1. Приветственный экран объясняет результат: «Получите EvidencePack до merge».
2. Пользователь выбирает проект или запускает безопасную демонстрацию.
3. DBC автоматически предлагает mock preset.
4. Пользователь проходит Describe → Run checks → Decide.
5. После EvidencePack предлагается подключить реального исполнителя.

Не запрашивать credentials до первой демонстрации ценности.

### 7.2 Подключение Kimi Code CLI

1. Settings → AI & Models → Add provider → Kimi Code.
2. DBC ищет `kimi`, показывает путь и версию.
3. Если требуется login, UI показывает «Открыть вход в терминале»; DBC не перехватывает
   пароль или OAuth token.
4. Выполняется version contract test.
5. Выполняется read-only minimal prompt test в временной директории.
6. Пользователь выбирает роли: Builder, Reviewer, Security или fallback.
7. DBC сохраняет только не-секретную конфигурацию и secret/auth reference.

Рекомендуемый стартовый профиль: Kimi как Reviewer или Planner. Write mode включать
только после отдельного controlled micro-run.

### 7.3 Подключение Qwen Code CLI

1. Settings → AI & Models → Add provider → Qwen Code.
2. DBC ищет `qwen`, проверяет версию и headless mode.
3. UI предлагает встроенный auth flow Qwen Code в терминале или API key reference.
4. Minimal prompt test выполняется без `--yolo`.
5. Проверяются JSON/stream-JSON output, exit codes, timeout и cancellation.
6. Пользователь выбирает роли и fallback.

Рекомендуемый стартовый профиль: Qwen как Builder с approval-mode, ограниченным scope,
wall-time и tool-call budget.

### 7.4 Добавление MCP-сервера

1. Settings → Tools & MCP → Add server.
2. Выбор: Remote HTTP, Local stdio, Import config; SSE показывать как Legacy.
3. Пользователь вводит URL или command без raw secret.
4. Для remote HTTP выполняется OAuth/auth setup при необходимости.
5. DBC подключается, выполняет initialize и capability discovery.
6. UI показывает найденные Tools, Resources и Prompts.
7. Пользователь выбирает trust template и include/exclude tools.
8. DBC выполняет безопасный health test.
9. Сервер становится Available, но не получает доступ к run до выбора policy/preset.

### 7.5 Запуск с несколькими AI

1. DBC выбирает routing preset по типу задачи и доступности.
2. Run Contract показывает: Kimi planning → Qwen build → Claude/Codex review, либо другую
   комбинацию, выбранную пользователем.
3. Каждый шаг имеет собственные provider/model/tool permissions.
4. Fallback применяется только в рамках заранее согласованного risk envelope.
5. Изменение класса риска создаёт approval, а не тихий fallback.

### 7.6 Потеря MCP-соединения

- Если инструмент необязательный: step становится degraded и может продолжиться.
- Если инструмент входит в acceptance criteria: step блокируется.
- Retry использует ограниченный backoff и не создаёт повторный side effect без
  idempotency key или подтверждения.
- Evidence фиксирует server, tool, request id, retries и итог.

## 8. Новая модель AI-провайдеров

### 8.1 Отказ от жёсткого ProviderStrategy union

Не добавлять строки вида `kimi_build_qwen_review`. Вместо этого ввести динамический
`RoutingPolicy`:

```ts
interface RoutingPolicy {
  id: string;
  name: string;
  roleRoutes: Array<{
    roleId: string;
    primaryProviderId: string;
    modelId?: string;
    fallbackProviderIds: string[];
    requiredCapabilities: string[];
    executionMode: AgentExecutionMode;
    toolPolicyId?: string;
  }>;
  fallbackRisk: "same_only" | "allow_lower" | "approval_required";
}
```

Старые стратегии мигрируются в presets без потери совместимости.

### 8.2 Расширенный Provider

```ts
interface ProviderV2 {
  id: string;
  vendor: "openai" | "anthropic" | "moonshot" | "alibaba" | "local" | "custom";
  displayName: string;
  adapter: "cli" | "openai_compatible_api" | "native_api" | "local" | "mock";
  command?: string;
  invocationProfileId?: string;
  endpoint?: string;
  authRef?: string;
  models: ModelProfile[];
  capabilities: ProviderCapabilities;
  health: ConnectionHealth;
  enabled: boolean;
}
```

### 8.3 Capability-driven routing

Маршрутизация должна выбирать по возможностям, а не по бренду:

- structured output;
- streaming output;
- tool calling;
- MCP pass-through;
- image input;
- long context;
- code edit;
- review-only;
- session resume;
- usage/cost reporting;
- cancellation;
- headless execution.

### 8.4 Versioned invocation profiles

CLI flags меняются. Контракт запуска должен быть versioned и тестируемым:

```text
kimi-code/headless-stream-json/v1
qwen-code/headless-stream-json/v1
codex/exec-workspace-write/v1
claude/print-stdin/v1
```

Профиль определяет command, args, stdin protocol, output parser, exit-code map, timeout,
cancellation, redaction и известные ограничения.

## 9. Поддержка Kimi

### 9.1 Этап K1 — CLI adapter

- Auto-discovery `kimi`.
- `--version` contract.
- Non-interactive print mode через stdin.
- Text и stream-JSON parser.
- Exit codes: success, permanent failure и retryable failure.
- Cancellation и timeout.
- Session/auth health без чтения токенов.
- Provider fixture с read-only, review и controlled write сценариями.

Официальная документация Kimi подтверждает print mode, stdin, stream-JSON, отдельные
exit codes и `--mcp-config-file`:
https://moonshotai.github.io/kimi-cli/en/customization/print-mode.html
https://moonshotai.github.io/kimi-cli/en/reference/kimi-command.html

### 9.2 Критическое ограничение Kimi

Print mode автоматически включает AFK/auto-approval для внутренних tool calls. Поэтому:

- не считать внутренние подтверждения Kimi эквивалентом DBC Approval;
- не передавать unrestricted MCP config;
- запускать write-задачи только в изолированном worktree и утверждённом scope;
- использовать DBC MCP Policy Proxy для фильтрации и журналирования tools;
- начинать rollout с read-only Reviewer/Planner;
- маркировать provider state как unsafe configuration, если обнаружен прямой
  unrestricted MCP или чрезмерные filesystem/shell права.

### 9.3 Этап K2 — MCP-aware profile

- Генерировать временный per-run MCP config.
- Передавать только DBC proxy endpoints или разрешённые stdio wrappers.
- Удалять временный config после run.
- Не записывать headers/tokens в evidence; сохранять только authRef и checksum policy.

Официальный Kimi Code CLI поддерживает управление MCP, stdio, Streamable HTTP, OAuth и
ad-hoc config: https://github.com/MoonshotAI/kimi-cli

### 9.4 Этап K3 — API adapter

- Добавлять только после contract tests актуального Moonshot API.
- Не предполагать полную OpenAI-совместимость без fixtures.
- Отдельно тестировать tool schema, thinking blocks, streaming, usage и errors.
- Model catalog получать через versioned metadata/curated registry, а не hardcode в UI.

## 10. Поддержка Qwen

### 10.1 Этап Q1 — Qwen Code CLI adapter

- Auto-discovery `qwen`.
- Headless input через stdin или `--prompt` только в contract fixture.
- `text`, `json`, `stream-json` output.
- `--model` как model profile, а не свободная строка в основном UX.
- Поддержка wall-time, turn и tool-call budgets при совместимой версии.
- Session resume — только отдельной opt-in policy; run по умолчанию stateless.
- Никогда не добавлять `--yolo` в preset по умолчанию.

Официальная документация Qwen Code подтверждает headless mode, structured output,
budget flags и режимы approval:
https://qwenlm.github.io/qwen-code-docs/en/users/features/headless/

### 10.2 Этап Q2 — Qwen MCP profile

Qwen Code поддерживает stdio, Streamable HTTP, legacy SSE, OAuth, include/exclude tools,
global allow/deny lists и discovery timeouts. DBC должен:

- предпочитать Streamable HTTP для remote servers;
- импортировать SSE только с отметкой Legacy;
- создавать project-scoped временную конфигурацию;
- использовать includeTools/excludeTools из DBC ToolPolicy;
- включать encrypted token storage option при доступности;
- показывать progressive discovery в Run без ложного статуса Ready.

Источник: https://qwenlm.github.io/qwen-code-docs/en/users/features/mcp/

### 10.3 Этап Q3 — Alibaba Model Studio API

- Реализовать OpenAI-compatible API adapter как отдельный transport.
- Region/workspace/base URL показывать в Advanced setup.
- Разделять standard API key и coding-plan credentials; не использовать ключ coding
  plan для неподдерживаемой автоматизации.
- Model catalog и pricing обновлять отдельно от релиза приложения.
- Сохранять только secretRef в OS keychain.

Официальные источники:
https://help.aliyun.com/en/model-studio/first-api-call-to-qwen
https://help.aliyun.com/en/model-studio/qwen-code
https://help.aliyun.com/en/model-studio/coding-plan-faq

## 11. MCP как самостоятельный слой DBC

### 11.1 Архитектурная роль

MCP не является моделью. Это протокол между host/client и servers, предоставляющими
Tools, Resources и Prompts. Стандартная архитектура и transports описаны в официальной
спецификации:
https://modelcontextprotocol.io/docs/learn/architecture

DBC должен поддержать два режима:

1. **DBC-native MCP host** — предпочтителен для API/local model adapters. DBC сам
   подключается к servers, применяет policy и выполняет tool calls.
2. **CLI-managed MCP compatibility** — Kimi/Qwen остаются host, но получают временный
   config только с DBC Policy Proxy/wrappers.

### 11.2 Почему нужен MCP Policy Proxy

CLI-провайдеры имеют разные trust и approval semantics. Единый proxy даёт:

- один allow/deny engine;
- одинаковое scope enforcement;
- redaction до отправки и после ответа;
- подтверждения на уровне DBC;
- idempotency и retry policy;
- единый audit/evidence формат;
- возможность немедленно отключить server/tool;
- защиту от несовместимых tool schemas.

### 11.3 Модель данных MCP

```ts
interface McpServerConnection {
  id: string;
  name: string;
  scope: "user" | "project";
  transport: "stdio" | "streamable_http" | "sse_legacy";
  command?: string;
  args?: string[];
  url?: string;
  authRef?: string;
  trustLevel: "untrusted" | "read_only" | "scoped_write" | "external_actions";
  health: ConnectionHealth;
  discoveredCapabilities: McpCapabilitySnapshot;
  policyId: string;
}

interface McpToolPolicy {
  id: string;
  serverId: string;
  includeTools: string[];
  excludeTools: string[];
  defaultDecision: "deny" | "approval_required" | "allow";
  pathScopes: string[];
  networkScopes: string[];
  dataClasses: string[];
  maxCallsPerRun: number;
  timeoutSeconds: number;
  sideEffectClass: "read" | "workspace_write" | "external_write" | "admin";
}
```

### 11.4 MCP Connection Health

```text
not_configured
needs_auth
connecting
discovering
ready
degraded
incompatible
blocked_by_policy
offline
```

Health test включает:

- transport connection;
- initialize/version negotiation;
- tools/list, resources/list, prompts/list;
- schema validation;
- auth expiry;
- latency;
- policy compatibility;
- optional read-only smoke tool.

### 11.5 Trust templates

| Template | Разрешения | Default approvals |
| --- | --- | --- |
| Context only | resources/read, read-only tools | allow within run |
| Workspace read | repo/search/read | allow scoped |
| Workspace write | edit/create in allowed paths | approval or task policy |
| External actions | issue/comment/email/deploy | always approval |
| Admin | permissions/secrets/destructive actions | deny by default |

### 11.6 OAuth и секреты

- Remote HTTP следует MCP authorization/OAuth 2.1 flow.
- stdio получает secrets через environment references, не через protocol auth.
- Tokens хранить в macOS Keychain/OS credential store.
- `.dbc` содержит только `secretRef`, provider/server id, scope и checksum policy.
- Экспорт конфигурации по умолчанию удаляет headers и env values.
- UI никогда не показывает token после сохранения.

Официальная MCP authorization guidance:
https://modelcontextprotocol.io/docs/tutorials/security/authorization

## 12. AI Team и routing UX

### 12.1 Упрощённый уровень

В Run пользователь видит preset:

```text
Recommended team
Build: Qwen Code · Review: Kimi Code · Tools: 2 safe connections
[Change]
```

### 12.2 Расширенный Team Builder

```text
Role           Primary         Fallback        Access          Budget
Planner        Kimi            Qwen             Read only       2 min
Builder        Qwen            Codex            Scoped write    15 min
Reviewer       Claude          Kimi             Diff only       5 min
Security       Codex           Qwen             Read only       5 min
```

Функции:

- drag/reorder не нужен; использовать строки и selects;
- capability mismatch показывать до сохранения;
- fallback simulation;
- compare outputs для одного read-only запроса;
- presets: Safe mock, Balanced, Local only, Kimi + Qwen, Custom;
- model selection находится внутри provider, не на уровне роли без контекста.

### 12.3 Auto routing

Auto может учитывать:

- capability fit;
- health;
- data residency;
- project policy;
- cost ceiling;
- context size;
- latency;
- previous verified outcomes;
- role preference.

Auto не должен учитывать маркетинговый «best model» без измеримых project fixtures.

## 13. Детальный UX экранов

### 13.1 Run header

- Project + branch.
- Runtime: Safe preview / Local / Controlled real.
- Provider/team pill.
- Connection health indicator без множества мелких badges.
- Primary action: Start / Continue / Open approval / Open evidence.

### 13.2 Run timeline

Каждый step показывает:

- пользовательское название;
- role и provider/model;
- running duration;
- tools count;
- короткий результат;
- статус evidence;
- Expand: input summary, tool calls, output, retry/fallback, artifacts.

### 13.3 Connection Center

Карточка provider:

- Kimi/Qwen/Codex/Claude name;
- CLI/API badge;
- Connected / Login needed / Not found / Update recommended;
- active models;
- assigned roles;
- latest contract test;
- Test, Configure, Disable.

Карточка MCP server:

- name + Local/Remote;
- health and latency;
- Tools/Resources/Prompts counts;
- trust level;
- used by presets;
- auth expiry warning;
- Inspect, Test, Disable.

### 13.4 Add Provider wizard

1. Choose provider: Codex, Claude, Kimi, Qwen, Local, Custom.
2. Choose connection: CLI or API where supported.
3. Detect/Login.
4. Contract test.
5. Capabilities and models.
6. Roles and permissions.
7. Review and save.

Показывать максимум одно ключевое решение на шаг.

### 13.5 Add MCP wizard

1. Source: catalog/import/manual.
2. Transport.
3. Connection/auth.
4. Discovered capabilities.
5. Trust and tool filtering.
6. Test.
7. Assign to preset/project.

### 13.6 Error recovery

Каждая ошибка содержит:

- что не работает;
- влияет ли это на текущий run;
- безопасно ли продолжать;
- одно recommended action;
- technical details в disclosure;
- Copy diagnostics с redaction.

## 14. Design system

### 14.1 Семантические tokens

Добавить/нормализовать:

- `surface/base`, `surface/raised`, `surface/inset`;
- `text/primary`, `text/secondary`, `text/muted`;
- `status/info`, `status/success`, `status/warning`, `status/danger`;
- `risk/low`, `risk/medium`, `risk/high`, `risk/critical`;
- `focus/ring`;
- spacing 4/8/12/16/24/32;
- radius 6/10/14;
- motion 120/180/240 ms with reduced-motion alternative.

### 14.2 Компоненты

- PageHeader;
- PrimaryActionBar;
- StatusSummary;
- StepTimeline;
- ProviderBadge;
- ConnectionHealth;
- ToolAccessSummary;
- ApprovalCard;
- EvidenceChecklist;
- EmptyState;
- ErrorRecovery;
- DetailsDisclosure;
- InspectorTable;
- FilterBar;
- Command/JSON viewer;
- SecretReferenceField.

### 14.3 Контент-стандарт

- Заголовок описывает результат, не сущность.
- Status начинается с существительного/глагола: «Готово к запуску».
- Ошибка не обвиняет пользователя.
- Кнопка называет действие: «Разрешить один раз», не «Да».
- В primary UX не использовать HarnessRun/MCP transport/JSON-RPC без пояснения.

## 15. Производительность UI и runtime

### 15.1 Frontend

- Разделить монолитный `App.tsx` по feature modules и routes/views.
- Вынести state selectors, чтобы один provider health event не перерисовывал весь app.
- Виртуализировать длинные audit/tool-call/loop списки.
- Lazy-load Advanced, raw report viewer и inspectors.
- Debounce config validation и filesystem discovery.
- Не хранить большие raw outputs в React state; использовать summaries + on-demand load.
- Кэшировать icons и статические model metadata.
- Добавить bundle budgets и route chunk reports.

### 15.2 Backend

- Provider и MCP health checks выполнять параллельно с лимитом concurrency.
- Отделить discovery timeout от tool-call timeout.
- Использовать event stream с runId/sequence number вместо полного refresh overview.
- Писать evidence append-only; UI читает summary index.
- Ограничивать stdout/stderr и MCP payload sizes до помещения в memory.
- Ввести cancellation tokens для provider, MCP и local command execution.
- Не блокировать app startup на недоступном remote MCP.

### 15.3 Целевые budgets

| Метрика | Цель |
| --- | --- |
| App shell до интерактивности | < 1.5 с на поддерживаемом Mac |
| Переход между primary views | < 100 мс perceived |
| Provider status from cache | < 200 мс |
| Background provider check | < 5 с или progressive |
| Remote MCP discovery default | 5 с, затем degraded |
| Local stdio discovery default | 30 с, без блокировки UI |
| Approval action feedback | < 150 мс локально |
| Большой evidence report open | < 500 мс summary-first |

## 16. Accessibility и localization

- WCAG 2.2 AA как критерий beta.
- Полная keyboard navigation и visible focus.
- Esc закрывает modal/sheet, но не отменяет run без подтверждения.
- Screen reader live regions только для значимых смен статуса.
- Status не передаётся только цветом.
- Контраст текста/controls проверяется автоматически.
- Target size минимум 44×44 для основных действий.
- `prefers-reduced-motion` отключает декоративное движение.
- RU и EN через message catalog; не хранить пользовательские строки в компонентах.
- Длинные русские/немецкие строки тестировать псевдолокализацией.
- Technical ids не переводить, human labels переводить.

## 17. Privacy, security и data egress UX

### 17.1 Data egress preview

Перед первым реальным вызовом показывать:

- provider/vendor и region, если известен;
- список включённых файлов или summary;
- secret scan result;
- MCP external services;
- retention/privacy link;
- Allow once / Cancel.

### 17.2 Классификация данных

```text
public
project_internal
confidential
secret
personal_data
regulated
```

Project policy связывает data class с допустимыми providers, regions и MCP servers.

### 17.3 Prompt injection и untrusted content

- MCP resources/tool output считать untrusted input.
- Не позволять tool output менять DBC policy.
- Отделять system/task contract от retrieved content.
- В Evidence фиксировать источник внешнего контента.
- Для tools с side effects требовать structured intent и approval preview.

## 18. EvidencePack v2

Добавить разделы:

```text
executionIdentity
  providerId, vendor, adapter, modelId, version
routing
  role, primary, fallback, fallbackReason
mcp
  servers, capabilitySnapshotChecksum, toolsCalled, resourcesRead
policy
  scope, toolPolicy, dataEgress, approvals
runtime
  startedAt, duration, retries, cancellation, degradedStates
usage
  tokens, toolCalls, estimated/exact cost
artifacts
  checksums and redacted references
```

Для каждого MCP call хранить:

- runId/stepId;
- server/tool;
- policy decision;
- arguments summary или redacted checksum;
- side-effect class;
- approval id;
- duration/status/retry count;
- result artifact reference.

Не хранить raw credentials, authorization headers и секретные payloads.

## 19. Testing strategy

### 19.1 Provider contract fixtures

Для Codex, Claude, Kimi и Qwen:

- executable missing;
- supported/unsupported version;
- auth required;
- minimal success;
- structured output parse;
- malformed output;
- retryable/permanent exit code;
- timeout/cancel;
- oversized output;
- rate limit;
- model unavailable;
- fallback and evidence identity.

### 19.2 MCP fixtures

- stdio and Streamable HTTP;
- legacy SSE import warning;
- initialize version mismatch;
- tools/resources/prompts discovery;
- schema conflict and invalid schema;
- OAuth required/expired/refresh failed;
- slow discovery;
- tool timeout;
- duplicate tool names;
- include/exclude filtering;
- denied side effect;
- approval once/run;
- idempotent retry;
- server disconnect mid-call;
- secret redaction.

### 19.3 UX regression

- first-run empty state;
- provider missing/login needed/ready/degraded;
- zero/one/many MCP servers;
- current-run isolation;
- fallback disclosure;
- pending approval badge count;
- evidence before/after final decision;
- 760/1024/1440 widths;
- keyboard-only;
- reduced motion;
- RU/EN/pseudo-localization.

### 19.4 Security tests

- command injection in CLI args/config;
- prompt in process list;
- malicious MCP tool name/schema/output;
- path traversal through tool arguments;
- symlink escape;
- secret in logs/evidence/support bundle;
- OAuth callback spoofing;
- untrusted config import;
- unrestricted Kimi print-mode tool execution;
- Qwen `--yolo` detection and unsafe preset rejection.

## 20. Метрики качества

### 20.1 Activation

- time to first EvidencePack;
- completion rate Safe preview;
- provider connect success rate;
- time to first controlled real run;
- MCP connection setup success rate.

### 20.2 Trust

- доля runs с полным provider/tool identity;
- число скрытых/необъяснённых fallbacks — целевое значение 0;
- approvals rejected/edited;
- scope/tool policy violations blocked;
- evidence completeness rate.

### 20.3 Reliability

- provider contract failure rate по adapter/version;
- MCP discovery/tool success rate;
- retry success rate;
- degraded runs;
- crash-free sessions;
- median/p95 step duration.

### 20.4 Privacy

По умолчанию метрики локальные. Отправка telemetry — только opt-in, агрегированная и без
prompts, paths, tool arguments, model outputs, identifiers или secrets.

## 21. Приоритетный roadmap

### Phase 0 — Foundation and UX contract (P0)

Цель: убрать архитектурные блокеры до добавления новых кнопок.

Статус на 2026-08-12: реализован. Готовы backward-compatible RoutingPolicy migration,
versioned adapter registry, Kimi/Qwen safety fixtures, immutable execution identity,
SQLite migration, ConnectionHealth/ModelProfile metadata и EvidencePack v2. Полная
декомпозиция большого `App.tsx` перенесена в архитектурный hardening backlog: она не
блокирует текущие контракты, но нужна до существенного расширения экранов.

- Зафиксировать IA и screen states.
- Разбить `App.tsx` на feature modules.
- Ввести ConnectionHealth, ModelProfile, RoutingPolicy и capability model.
- Мигрировать старые ProviderStrategy в presets.
- Создать provider contract test harness.
- Добавить run-scoped immutable execution snapshot.
- Подготовить EvidencePack v2 schema с backward compatibility.

Exit criteria:

- существующие Codex/Claude/mock сценарии работают через новую модель;
- migration fixtures проходят;
- UI не показывает Kimi/Qwen до готовности adapter contract.

### Phase 1 — Kimi and Qwen CLI support (P0)

Статус на 2026-08-12: adapter и routing slice реализован. Добавлены официальные
headless-шаблоны, discovery/version/auth/capability health, recovery UX, Add Provider
templates, frontend/Rust JSONL parsers, Kimi/Qwen fixtures и runtime safety gates.
Kimi real execution заблокирован для встроенных print/AFK tools; Qwen допускает только
plan + safe-mode + zero built-in tool calls. Реализованы fallback journal, balanced
preset и routing simulator. Native installed-version fixtures остаются внешней
проверкой, потому что CLI не установлены на этой машине.

- Kimi discovery, version, auth state, print/stream parser, exit mapping.
- Qwen discovery, version, auth state, headless parser, budgets.
- Add Provider wizard templates.
- Kimi + Qwen balanced preset.
- Health/recovery states.
- Read-only micro-runs, затем controlled write.
- Provider identity в EvidencePack.

Exit criteria:

- read-only и controlled-write fixtures проходят на поддерживаемых versions;
- no-yolo/unsafe Kimi configuration guards работают;
- fallback всегда видим и записан.

### Phase 2 — MCP Connection Center (P0/P1)

Статус на 2026-08-12: реализован local/contract slice. Есть portable storage,
валидация, stdio initialize/tools-list discovery с protocol fallback, Streamable HTTP
и legacy SSE contract import, keychain-only secretRef, trust policies и Connection
Center. Live remote HTTP/OAuth discovery требует отдельного одобренного сервера.

- McpServerConnection/ToolPolicy storage.
- stdio + Streamable HTTP; SSE legacy import.
- capability discovery и schema validation.
- OAuth/secretRef integration.
- Add MCP wizard и Connection Center.
- Trust templates, include/exclude, health.
- Run Contract tool access summary.

Exit criteria:

- ни один tool не вызывается без policy;
- недоступный MCP не блокирует app startup;
- secrets отсутствуют в `.dbc`, logs и Git.

### Phase 3 — MCP Policy Proxy and approvals (P0)

Статус на 2026-08-12: реализован. Stdio JSON-RPC proxy перехватывает `tools/call`,
применяет intent/path/network/argument/retry/idempotency policy, читает только
run-scoped approval ledger и пишет redacted JSONL evidence. Malicious fixtures и
end-to-end proxy smoke проходят.

- DBC proxy/wrappers для CLI-managed MCP.
- tool intent classification.
- approval once/run.
- path/network/data policies.
- idempotency/retry.
- MCP call evidence.

Exit criteria:

- одинаковая approval semantics для Kimi/Qwen;
- malicious fixture suite блокируется;
- EvidencePack объясняет каждый side-effect tool call.

### Phase 4 — Routing and AI Team UX (P1)

Статус на 2026-08-12: реализован. Доступны dynamic role routes, primary/fallback graph,
balanced Kimi/Qwen preset, Team Builder, Routing Simulator, ограничения cost/latency/
residency/egress, risk-gated fallback и сравнение read-only outputs.

- Dynamic role routing and fallback graph.
- Presets, Team Builder, routing simulator.
- Capability mismatch warnings.
- Cost/latency/data residency constraints.
- Compare read-only outputs.

Exit criteria:

- provider можно заменить без изменения TaskContract;
- unsafe fallback требует approval;
- primary Run остаётся простым.

### Phase 5 — API adapters and model catalog (P1)

Статус на 2026-08-12: реализован contract slice. Добавлены disabled Qwen/Kimi
OpenAI-compatible profiles, HTTPS/region/egress validation, macOS Keychain metadata
probe без чтения secret, source-backed curated catalog, import/persistence и usage/
structured-report normalization. Paid live requests намеренно не выполнялись.

- Qwen OpenAI-compatible API adapter.
- Moonshot/Kimi API после подтверждённых contract fixtures.
- OS keychain secret references.
- Refreshable curated model catalog.
- Usage/cost normalization.

Exit criteria:

- API и CLI дают единый StepStructuredReport;
- region/egress видимы до запуска;
- model deprecation не требует UI release.

### Phase 6 — Polish, accessibility and beta (P1/P2)

Статус на 2026-08-12: локальный product-hardening slice реализован. EvidencePack v2
проверяет обязательные artifacts и identity; добавлены core RU/EN navigation,
skip-link, keyboard focus, reduced motion, CSP, local-only telemetry opt-in, UI/native
contract smokes, performance budget и desktop/mobile visual QA. Signed/notarized
universal build остаётся внешним release gate до появления Apple credentials; полная
построчная локализация и формальный независимый WCAG audit остаются beta-hardening.

- WCAG 2.2 AA.
- RU/EN localization.
- performance budgets.
- native end-to-end tests.
- signed/notarized builds.
- onboarding analytics decision.
- docs, demo, recovery playbooks.

## 22. Реализационные epics

### Epic A — Frontend architecture

- `features/run`, `features/approvals`, `features/evidence`, `features/connections`.
- shared design tokens/components.
- typed selectors and event-driven updates.
- route/view lazy loading.

### Epic B — Provider SDK

- adapter registry;
- version negotiation;
- invocation profiles;
- parsers and error normalization;
- fixtures;
- health and cancellation.

### Epic C — MCP core

- connection manager;
- capability registry;
- policy engine;
- proxy;
- auth references;
- evidence recorder.

### Epic D — Connection Center UX

- Quick Setup summary;
- provider/MCP cards;
- setup wizards;
- diagnostics/recovery;
- import/export with redaction.

### Epic E — Routing

- policy schema;
- role assignment;
- fallback rules;
- simulator;
- immutable run snapshot.

### Epic F — Evidence v2

- schema/migration;
- provider identity;
- MCP activity;
- cost/duration;
- rendering/export;
- verification CLI.

## 23. Зависимости и риски

| Риск | Последствие | Мера |
| --- | --- | --- |
| CLI flags меняются | adapters ломаются | versioned profiles + fixtures |
| Kimi print auto-approves | неконтролируемые side effects | proxy, sandbox, read-only rollout |
| Qwen yolo misuse | host-level writes | detect/reject unsafe args |
| MCP schema несовместима | provider 400/crash | sanitize/validate/proxy |
| OAuth tokens в файлах | утечка | OS keychain + secretRef |
| Слишком много Settings | плохой onboarding | Connection Center + disclosures |
| Dynamic routing непрозрачен | потеря доверия | pre-run contract + fallback evidence |
| Remote MCP медленный | медленный startup | progressive discovery |
| Model catalog устаревает | неправильный выбор | refreshable metadata |
| Несравнимые costs | неверная аналитика | exact/estimated/unknown confidence |

## 24. Definition of Done для новой интеграции

Новый provider считается поддержанным, только если:

- есть официальный источник и supported version range;
- auto-discovery и ручной путь;
- auth state без чтения secrets;
- minimal contract test;
- structured output parser;
- timeout/cancel/error map;
- capability declaration;
- read-only и write policy fixtures;
- current-run identity в EvidencePack;
- recovery UX;
- docs и migration notes;
- CI fixtures без реальных credentials;
- один вручную проверенный controlled micro-run.

Новый MCP transport/server path считается поддержанным, только если:

- initialize/capability negotiation проверены;
- auth и secret handling безопасны;
- tools/resources/prompts видны в Inspector;
- include/exclude и default deny работают;
- side effects проходят approvals;
- tool calls записываются в evidence;
- timeout/cancel/retry протестированы;
- отключённый сервер не оставляет активных процессов или токенов.

## 25. Рекомендуемый первый implementation slice

Первый slice должен быть небольшим и обратимо совместимым:

1. Ввести `RoutingPolicy` и миграцию четырёх старых стратегий в presets.
2. Создать provider adapter registry без изменения текущего Run UX.
3. Добавить invocation fixtures Kimi/Qwen, но держать adapters feature-flagged.
4. Добавить ConnectionHealth и карточки Kimi/Qwen в Advanced diagnostics.
5. Выполнить только read-only contract tests.
6. Расширить EvidencePack provider identity.
7. После green CI включить Add Provider wizard для Kimi/Qwen.

Этот порядок предотвращает появление красивого, но небезопасного UI раньше, чем DBC
научится действительно доказывать, кто и с какими правами выполнил работу.
