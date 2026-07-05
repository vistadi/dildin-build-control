# DBC CLI/Provider Manager Technical Specification

Version: 1.0  
Product: Dildin Build Control  
Scope: MVP -> v1.0 implementation of configurable CLI/API providers, role mapping, command execution, review loops, security policy, and presets.

## 1. Purpose

DBC must allow the user to configure which AI tool performs each role in the development loop.

Example target setup:

```text
Developer Agent -> Codex CLI
Reviewer Agent  -> Claude Code CLI
QA Agent        -> local test/build commands + Claude Code analysis
Security Agent  -> Claude Code read-only
Team Lead       -> Codex or Claude Code
```

The product must not be hardcoded to one AI provider. It must support multiple local CLI tools, cloud API adapters, mock adapters, and later plugin adapters.

## 2. Product Principle

DBC is an orchestration layer, not a chat client.

Each provider is assigned to a formal agent role with:

- allowed actions
- filesystem permissions
- command permissions
- context limits
- model/provider settings
- budget limits
- review/approval policy
- output contract

The agent that writes code should not be the only agent that accepts the result. DBC must support separation of duties:

```text
Code writer != final reviewer
Code writer != security approver
AI result != acceptance without build/test evidence
```

## 3. MVP User Goal

A user can open Settings -> Providers, add Codex CLI and Claude Code CLI, test both, then open AI Team and assign:

```text
Team Lead: Codex CLI
Architect: Claude Code CLI
Developer: Codex CLI
QA: Local Runner + Claude Code CLI
Reviewer: Claude Code CLI
Security: Claude Code CLI
Product Owner: Codex CLI
```

Then the user can start a loop:

```text
plan -> code -> build -> test -> review -> security -> acceptance
```

DBC must call the configured CLI for each step, collect outputs, run local commands, request approvals when needed, and generate a final evidence-backed report.

## 4. Supported Adapter Types

### 4.1 Mock Adapter

Required for MVP.

Purpose:

- demo flows
- tests
- onboarding
- offline development

Capabilities:

- returns deterministic plan/review/report output
- simulates token/cost events
- never changes files unless a test fixture asks it to

### 4.2 Generic CLI Adapter

Required for MVP.

Purpose:

- run any local AI CLI through a configurable command
- support Codex CLI, Claude Code CLI, Gemini CLI, Aider, Continue CLI, local scripts

The adapter must support:

- command path
- arguments template
- working directory
- stdin prompt mode
- file prompt mode
- environment variables
- timeout
- output parsing
- exit code handling
- redaction

### 4.3 Built-In Codex CLI Profile

Required for MVP or early v1.

Purpose:

- first-class preset for coding and implementation roles

Default role fit:

- Developer
- Team Lead
- Product Owner
- Test Generator

Default mode:

```text
write-enabled inside workspace
no git push
no deploy
no secret changes without approval
```

### 4.4 Built-In Claude Code CLI Profile

Required for MVP or early v1.

Purpose:

- first-class preset for review, architecture, QA analysis, and security

Default role fit:

- Architect
- Reviewer
- QA
- Security

Default mode:

```text
read-only by default
review diff
analyze logs
write report artifacts
request changes instead of editing unless explicitly enabled
```

### 4.5 Cloud API Adapter

v1.0.

Purpose:

- provider APIs where no local CLI is used

Examples:

- OpenAI API
- Anthropic API
- Gemini API
- OpenRouter

Must use secure credential storage.

### 4.6 Local Model Adapter

v1.0.

Examples:

- Ollama
- llama.cpp server
- LM Studio

Main use:

- local-only projects
- low-cost summaries
- simple QA or classification tasks

## 5. Core Concepts

## 5.1 Provider

A provider is a source of AI execution.

Fields:

```ts
type ProviderType = "mock" | "cli" | "api" | "local_model";

interface Provider {
  id: string;
  name: string;
  type: ProviderType;
  enabled: boolean;
  health: "unknown" | "ok" | "warning" | "failed";
  capabilities: ProviderCapability[];
  costProfileId?: string;
  config: ProviderConfig;
  createdAt: string;
  updatedAt: string;
}
```

Capabilities:

```ts
type ProviderCapability =
  | "plan"
  | "write_code"
  | "review_diff"
  | "analyze_logs"
  | "security_review"
  | "generate_tests"
  | "run_tools"
  | "structured_output"
  | "streaming"
  | "local_only";
```

## 5.2 CLI Profile

A CLI profile is a configured command invocation.

```ts
interface CliProfile {
  id: string;
  providerId: string;
  label: string;
  command: string;
  argsTemplate: string[];
  promptMode: "stdin" | "arg" | "file";
  promptArgName?: string;
  workingDirectoryMode: "project_root" | "repo_root" | "custom";
  customWorkingDirectory?: string;
  env: Record<string, string>;
  timeoutSeconds: number;
  maxOutputBytes: number;
  outputParser: "plain_text" | "json" | "markdown_sections";
  redactionProfileId: string;
}
```

Example:

```yaml
providers:
  - id: codex_cli
    name: Codex CLI
    type: cli
    enabled: true
    config:
      command: codex
      promptMode: stdin
      timeoutSeconds: 900

  - id: claude_code
    name: Claude Code
    type: cli
    enabled: true
    config:
      command: claude
      promptMode: stdin
      timeoutSeconds: 900
```

## 5.3 Agent Role

An agent role is not the same thing as a provider.

One provider can power many roles. One role can have fallback providers.

```ts
interface AgentRoleConfig {
  id: string;
  role: AgentRoleName;
  enabled: boolean;
  primaryProviderId: string;
  fallbackProviderIds: string[];
  mode: AgentExecutionMode;
  permissions: AgentPermission[];
  contextPolicyId: string;
  budgetPolicyId: string;
  promptTemplateId: string;
  outputContractId: string;
}
```

Roles:

```text
Team Lead
Architect
Developer
QA
Reviewer
Security
DevOps
Product Owner
```

Execution modes:

```ts
type AgentExecutionMode =
  | "read_only"
  | "write_workspace"
  | "write_tests_only"
  | "review_only"
  | "command_runner"
  | "approval_required";
```

## 6. Recommended Default Preset

Name:

```text
Codex Builder + Claude Reviewer
```

Purpose:

Use Codex CLI for implementation and Claude Code CLI for independent review/security.

Mapping:

```yaml
roleMapping:
  team_lead:
    provider: codex_cli
    mode: read_only

  architect:
    provider: claude_code
    mode: review_only

  developer:
    provider: codex_cli
    mode: write_workspace

  qa:
    provider: claude_code
    mode: review_only
    localCommands:
      - pnpm build
      - pnpm test

  reviewer:
    provider: claude_code
    mode: review_only

  security:
    provider: claude_code
    mode: read_only

  devops:
    provider: local_terminal
    mode: approval_required

  product_owner:
    provider: codex_cli
    mode: read_only
```

Behavior:

```text
Codex writes code.
Local terminal runs real build/test commands.
Claude reviews diff and logs.
Claude security checks sensitive changes.
DBC generates final report only if evidence exists.
User approves git push, deploy, migrations, secret edits, and destructive commands.
```

## 7. UI Requirements

## 7.1 Settings -> Providers

Must allow:

- add provider
- edit provider
- disable provider
- delete provider
- test provider
- view health status
- view command path
- view detected version
- choose adapter type
- configure timeout
- configure output parser
- configure redaction profile

Provider card must show:

```text
Name
Type
Health
Command/API endpoint
Version
Capabilities
Assigned roles
Last test result
```

## 7.2 Add CLI Provider Wizard

Steps:

1. Select tool type:
   - Codex CLI
   - Claude Code
   - Generic CLI
   - Ollama/local
   - API provider
2. Locate command:
   - auto-detect from PATH
   - manual path input
3. Test command:
   - run version command
   - run minimal prompt
4. Select capabilities:
   - write code
   - review diff
   - analyze logs
   - security review
5. Set execution policy:
   - read-only
   - write workspace
   - approval required
6. Save provider.

## 7.3 AI Team Board

Must allow:

- assign provider per role
- set fallback provider
- edit role prompt
- edit role permissions
- enable/disable role
- duplicate role
- import role preset
- compare role output

Each role card must show:

```text
Role
Provider
Model/profile
Mode
Permissions
Budget
Context policy
Last run status
```

## 7.4 Loop Template Editor

Must allow configuring which roles participate in which loop.

Example:

```yaml
feature_loop:
  steps:
    - id: plan
      role: team_lead
    - id: architecture_review
      role: architect
      optional: true
    - id: implementation
      role: developer
    - id: build
      role: local_terminal
    - id: tests
      role: qa
    - id: review
      role: reviewer
    - id: security
      role: security
    - id: acceptance
      role: product_owner
```

## 8. CLI Execution Requirements

## 8.1 Invocation Model

DBC must never directly concatenate unsafe shell strings.

Use structured process execution:

```ts
spawn(command, args, {
  cwd,
  env,
  timeout,
  stdio
})
```

Never:

```ts
exec(`${command} ${userInput}`)
```

## 8.2 Prompt Delivery

Supported modes:

### stdin

DBC writes prompt to process stdin.

Best for:

- Codex CLI
- Claude Code CLI
- generic tools

### arg

DBC passes prompt as command argument.

Only allowed when prompt size is small and command profile marks it safe.

### file

DBC writes prompt to a temporary file and passes file path.

Best for:

- large context
- reproducible debug runs
- providers that accept `--prompt-file`

## 8.3 Working Directory

Default:

```text
project root
```

Rules:

- CLI cannot run outside configured project root unless provider policy allows it.
- Output artifacts must be written under `.dbc/artifacts`.
- Temporary prompts must be written under `.dbc/tmp`.
- Logs must be written under `.dbc/logs`.

## 8.4 Environment Variables

Provider config may define env variables.

Secrets must never be stored in plain project config.

Allowed:

```yaml
env:
  CODEX_HOME: "$USER_HOME/.codex"
  ANTHROPIC_BASE_URL: "https://api.anthropic.com"
```

Secret reference:

```yaml
env:
  ANTHROPIC_API_KEY: "secret://providers/claude/api_key"
```

## 8.5 Output Handling

DBC must capture:

- stdout
- stderr
- exit code
- duration
- process status
- redacted log
- artifact references

Output states:

```text
success
failed_exit_code
timeout
cancelled
blocked_by_policy
approval_required
parser_failed
```

## 9. Command Policy Requirements

## 9.1 Classification

Every command must be classified before execution:

```ts
type CommandDecision = "allow" | "approval_required" | "deny";
```

Allow examples:

```text
pnpm build
pnpm test
npm run lint
cargo test
python -m pytest
git status
git diff
```

Approval required examples:

```text
git push
git reset --hard
git clean
database migration execution
deploy
docker compose up with ports
ssh
scp
editing .env
changing production config
```

Deny examples:

```text
rm -rf /
format disk commands
credential exfiltration patterns
commands outside workspace root
curl piping into shell without approval
sudo destructive commands
```

## 9.2 Policy Override

Only the human user can approve sensitive actions.

An AI agent cannot override:

- command denylist
- protected file policy
- budget stop
- local-only project restriction
- approval requirement

## 10. Filesystem Permission Model

Each agent role must have a file access policy.

```yaml
developer:
  read:
    - "**/*"
  write:
    - "src/**"
    - "tests/**"
    - "package.json"
  protected:
    - ".env"
    - ".env.*"
    - "secrets/**"
    - ".git/**"

reviewer:
  read:
    - "**/*"
  write:
    - ".dbc/reports/**"
  protected:
    - "**/*"
```

Modes:

```text
read_only
write_workspace
write_tests_only
write_reports_only
approval_required
```

## 11. Context Packaging

DBC must generate role-specific context packages.

Developer receives:

- task brief
- acceptance criteria
- relevant files
- project memory
- current plan
- constraints
- allowed commands

Reviewer receives:

- task brief
- acceptance criteria
- git diff
- changed file list
- build/test logs
- developer summary

Security receives:

- changed file list
- diff
- dependency changes
- command history
- secrets scan result
- protected file changes

Product Owner receives:

- task brief
- acceptance criteria
- evidence report
- unresolved risks
- cost summary

## 12. Output Contracts

Each role must return structured sections.

## 12.1 Developer Output

```md
## Summary

## Files Changed

## Commands Requested

## Tests Added Or Updated

## Risks

## Next Step
```

## 12.2 Reviewer Output

```md
## Verdict
pass | request_changes | fail

## Findings

## Missing Tests

## Regression Risks

## Acceptance Criteria Coverage

## Required Changes
```

## 12.3 Security Output

```md
## Verdict
pass | approval_required | fail

## Sensitive Changes

## Secrets Check

## Dependency Risk

## Policy Violations

## Required Approvals
```

## 12.4 Acceptance Output

```md
## Final Status
accepted | blocked | failed

## Evidence

## Acceptance Criteria

## Changes

## Tests

## Review

## Security

## Cost

## Unresolved Items
```

DBC must parse verdicts. If parsing fails, the step is not accepted automatically.

## 13. Data Model

## 13.1 SQLite Tables

Required tables:

```sql
create table providers (
  id text primary key,
  name text not null,
  type text not null,
  enabled integer not null default 1,
  health text not null default 'unknown',
  capabilities_json text not null,
  config_json text not null,
  created_at text not null,
  updated_at text not null
);

create table cli_profiles (
  id text primary key,
  provider_id text not null references providers(id),
  label text not null,
  command text not null,
  args_template_json text not null,
  prompt_mode text not null,
  working_directory_mode text not null,
  env_json text not null,
  timeout_seconds integer not null,
  max_output_bytes integer not null,
  output_parser text not null,
  redaction_profile_id text not null,
  created_at text not null,
  updated_at text not null
);

create table agent_role_configs (
  id text primary key,
  role text not null,
  enabled integer not null default 1,
  primary_provider_id text not null references providers(id),
  fallback_provider_ids_json text not null,
  mode text not null,
  permissions_json text not null,
  context_policy_id text not null,
  budget_policy_id text not null,
  prompt_template_id text not null,
  output_contract_id text not null,
  created_at text not null,
  updated_at text not null
);

create table provider_runs (
  id text primary key,
  provider_id text not null references providers(id),
  role text not null,
  task_id text,
  loop_id text,
  step_id text,
  status text not null,
  command_preview text,
  stdout_path text,
  stderr_path text,
  redacted_output_path text,
  exit_code integer,
  duration_ms integer,
  cost_event_id text,
  created_at text not null
);
```

## 13.2 Audit Events

Every provider action must produce an audit event.

Required audit fields:

```text
actor
role
provider
action
decision
risk
project_id
task_id
loop_id
artifact_refs
timestamp
```

## 14. Settings Persistence

DBC must support:

- local SQLite persistence
- import/export provider profiles
- safe redaction of secrets on export
- reset to default presets
- duplicate preset
- per-project override
- global defaults

Exported config must not contain raw secrets.

Example export:

```yaml
version: 1
profiles:
  - id: codex_builder_claude_reviewer
    name: Codex Builder + Claude Reviewer
providers:
  - id: codex_cli
    type: cli
    command: codex
    secretRefs: []
  - id: claude_code
    type: cli
    command: claude
    secretRefs: []
roleMapping:
  developer: codex_cli
  reviewer: claude_code
  security: claude_code
```

## 15. Health Checks

Each provider must support health checks.

CLI health check:

1. command exists
2. version command succeeds
3. minimal prompt succeeds
4. working directory is accessible
5. timeout is respected
6. output can be parsed

UI result:

```text
OK
Warning
Failed
```

Example checks:

```bash
which codex
codex --version

which claude
claude --version
```

If command is not found, UI must offer manual path input.

## 16. Loop Execution With Codex + Claude

## 16.1 Feature Loop

```text
1. Team Lead / Codex
   Input: task brief
   Output: implementation plan

2. Developer / Codex
   Input: plan, files, acceptance criteria
   Output: code changes, summary, requested commands

3. Local Terminal
   Input: selected build/test commands
   Output: logs and exit codes

4. Reviewer / Claude Code
   Input: task, diff, logs
   Output: pass/request_changes/fail

5. Security / Claude Code
   Input: diff, command history, dependency changes
   Output: pass/approval_required/fail

6. Product Owner / Codex
   Input: evidence packet
   Output: final acceptance report
```

## 16.2 Failure Loop

If build/test fails:

```text
QA summarizes failure -> Developer receives failure context -> Developer fixes -> build/test reruns
```

Stop conditions:

- max iterations reached
- budget reached
- security fail
- denied command
- user stops loop
- unresolved approval

## 17. Budget And Cost

Each provider run must create a cost event.

Cost confidence:

```text
exact
estimated
unknown
```

CLI providers often start as estimated or unknown unless the CLI exposes usage.

Required UI:

- cost by role
- cost by provider
- cost by task
- cost by loop
- budget limit
- stop on budget
- request approval on budget increase

## 18. Security And Secrets

DBC must redact:

- API keys
- tokens
- passwords
- private keys
- `.env` values
- bearer tokens
- SSH keys
- database URLs with credentials

Secrets must not appear in:

- prompts
- logs
- reports
- audit previews
- exported support bundles

If a provider needs secrets, use secret references:

```text
secret://providers/openai/api_key
secret://providers/anthropic/api_key
```

## 19. Local-Only Mode

Project can be marked `local_only`.

If local-only is enabled:

- cloud API providers are blocked
- cloud CLI providers are blocked unless explicitly marked local
- local model adapters are allowed
- mock adapter is allowed
- audit logs must record blocked cloud attempts

## 20. Acceptance Criteria

## 20.1 Provider Setup

- User can add Codex CLI provider.
- User can add Claude Code CLI provider.
- User can use command auto-detect or manual path.
- User can test each provider.
- Failed provider test shows actionable error.
- Provider settings persist after app restart.

## 20.2 Role Mapping

- User can assign different providers to different roles.
- User can assign Codex as Developer.
- User can assign Claude Code as Reviewer.
- User can set fallback provider.
- Role mapping persists after app restart.

## 20.3 Loop Execution

- Loop uses provider configured for each role.
- Developer step calls Codex when mapped to Codex.
- Reviewer step calls Claude Code when mapped to Claude.
- Build/test step runs local commands, not AI-only checks.
- Failed build/test blocks acceptance.
- Reviewer `request_changes` returns loop to Developer.
- Security `fail` blocks acceptance.

## 20.4 Security

- `git push` requires approval.
- deploy requires approval.
- migration execution requires approval.
- destructive command is denied.
- AI cannot bypass command policy.
- Protected files require approval.
- Secrets are redacted from logs and reports.

## 20.5 Reporting

- Final report lists provider used per step.
- Final report includes build/test evidence.
- Final report includes review verdict.
- Final report includes security verdict.
- Final report includes cost summary.
- Final report marks unresolved approvals.

## 21. Implementation Phases

## Phase 1: Config Foundation

- SQLite tables for providers, CLI profiles, role configs
- Provider Settings UI
- AI Team role mapping UI
- provider health checks
- import/export config

## Phase 2: Generic CLI Runner

- structured spawn runner
- stdin/file/arg prompt modes
- timeout/cancel
- stdout/stderr capture
- output redaction
- audit events

## Phase 3: Codex + Claude Presets

- Codex CLI built-in profile
- Claude Code CLI built-in profile
- default preset: Codex Builder + Claude Reviewer
- prompt templates per role
- output contracts per role

## Phase 4: Loop Integration

- loop engine calls configured providers
- role-specific context packaging
- build/test local command integration
- reviewer feedback loop
- security gate
- acceptance report gate

## Phase 5: Hardening

- local-only mode enforcement
- secure credential storage
- policy tests
- redaction tests
- provider run recovery
- crash-safe loop state

## 22. Developer Notes

The existing MVP currently has:

- AI Team UI mock
- Settings mock
- Loop Monitor mock
- Approval queue mock
- Tauri command scaffold

Next implementation should replace mock provider data with persisted provider configuration and real CLI runs.

Recommended next files:

```text
src/domain/providers.ts
src/domain/agents.ts
src/domain/commandPolicy.ts
src/domain/loopEngine.ts
src/services/providerStore.ts
src/services/cliRunner.ts
src/services/redaction.ts
src-tauri/src/providers.rs
src-tauri/src/cli_runner.rs
src-tauri/src/policy.rs
```

## 23. Example End State

User configuration:

```yaml
preset: codex_builder_claude_reviewer

providers:
  codex_cli:
    command: /opt/homebrew/bin/codex
    mode: write_workspace
    roles:
      - team_lead
      - developer
      - product_owner

  claude_code:
    command: /opt/homebrew/bin/claude
    mode: review_only
    roles:
      - architect
      - qa
      - reviewer
      - security

commands:
  build:
    - pnpm build
  test:
    - pnpm test
  lint:
    - pnpm lint

policy:
  git_push: approval_required
  deploy: approval_required
  migrations: approval_required
  destructive_commands: deny
  secrets: redact
```

Expected behavior:

```text
User starts feature loop.
Codex plans and writes code.
DBC runs build/test.
Claude reviews diff and logs.
Claude performs security review.
DBC blocks unresolved failures.
User approves sensitive actions.
DBC generates final acceptance report.
```

