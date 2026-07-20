use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;
use std::env;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::Manager;

mod harness;

#[derive(Serialize)]
struct EnvironmentCheck {
    name: String,
    status: String,
    detail: String,
}

#[derive(Serialize)]
struct WorkspaceRecord {
    id: i64,
    name: String,
    path: String,
    created_at: String,
}

#[derive(Serialize)]
struct CliHealthResult {
    status: String,
    detail: String,
    version_output: String,
}

#[derive(Serialize)]
struct CliCandidate {
    path: String,
    source: String,
    version_output: String,
    status: String,
}

#[derive(Deserialize)]
struct CliContractCheckRequest {
    command: String,
    args_template: String,
    prompt_mode: String,
    cwd: String,
}

#[derive(Serialize)]
struct CliContractCheckResult {
    status: String,
    resolved_command: String,
    normalized_args_template: String,
    prompt_mode: String,
    diagnostics: Vec<ProjectConfigDiagnostic>,
}

#[derive(Deserialize)]
struct CliRunRequest {
    command: String,
    args: Vec<String>,
    prompt: String,
    cwd: String,
    prompt_mode: String,
    timeout_seconds: u64,
    max_output_bytes: usize,
    policy_mode: String,
}

#[derive(Serialize)]
struct CliRunResult {
    status: String,
    stdout: String,
    stderr: String,
    exit_code: Option<i32>,
    duration_ms: u128,
    decision: String,
    redacted_output: String,
}

#[derive(Deserialize)]
struct LoopStepInput {
    id: String,
    state: String,
    agent: String,
    role_id: String,
    provider_id: String,
    provider_type: String,
    provider_command: String,
    provider_args_template: String,
    provider_prompt_mode: String,
    provider_run_mode: String,
    agent_mode: String,
    local_commands: Vec<String>,
    timeout_seconds: u64,
    max_output_bytes: usize,
    #[serde(default = "default_max_attempts")]
    max_attempts: i64,
    summary: String,
    evidence: String,
}

#[derive(Deserialize)]
struct StartLoopRequest {
    project_id: String,
    task_id: String,
    project_path: String,
    task_title: String,
    task_brief: String,
    task_criteria: Vec<String>,
    task_constraints: Vec<String>,
    task_budget_limit: f64,
    task_spec_path: String,
    task_spec_checksum: String,
    memory_context: String,
    memory_refs: Vec<String>,
    steps: Vec<LoopStepInput>,
}

#[derive(Deserialize)]
struct ResolveApprovalRequest {
    loop_id: String,
    step_id: String,
    action: String,
}

#[derive(Deserialize, Serialize)]
struct TaskSpecRequest {
    project_path: String,
    id: String,
    title: String,
    brief: String,
    criteria: Vec<String>,
    constraints: Vec<String>,
    budget_limit: f64,
    status: String,
    risk: String,
    #[serde(default = "default_task_priority")]
    priority: String,
    #[serde(default = "default_loop_profile")]
    loop_profile: String,
    #[serde(default = "default_provider_strategy")]
    provider_strategy: String,
    affected_paths: Vec<String>,
    #[serde(default)]
    allowed_paths: Vec<String>,
    #[serde(default)]
    denied_paths: Vec<String>,
    required_reviewers: Vec<String>,
    #[serde(default)]
    stop_conditions: Vec<String>,
}

#[derive(Serialize)]
struct TaskSpecRecord {
    id: String,
    path: String,
    checksum: String,
    updated_at: String,
}

#[derive(Serialize)]
struct TaskSpecLoadResult {
    task: serde_json::Value,
    record: TaskSpecRecord,
}

#[derive(Deserialize, Serialize)]
struct MemoryNoteRequest {
    project_path: String,
    id: String,
    note_type: String,
    title: String,
    body: String,
    author: String,
    created_at: String,
}

#[derive(Serialize)]
struct MemoryNoteRecord {
    id: String,
    path: String,
    checksum: String,
    updated_at: String,
}

#[derive(Deserialize)]
struct ProjectConfigRequest {
    project_path: String,
    providers: serde_json::Value,
    command_policy: serde_json::Value,
}

#[derive(Deserialize)]
struct ProjectConfigLoadRequest {
    project_path: String,
}

#[derive(Serialize)]
struct ProjectConfigRecord {
    path: String,
    checksum: String,
    updated_at: String,
}

#[derive(Serialize)]
struct ProjectConfigResult {
    providers: ProjectConfigRecord,
    policy: ProjectConfigRecord,
}

#[derive(Serialize)]
struct ProjectConfigDiagnostic {
    level: String,
    subject: String,
    detail: String,
}

#[derive(Serialize)]
struct ProjectConfigLoadResult {
    providers: serde_json::Value,
    command_policy: serde_json::Value,
    providers_record: Option<ProjectConfigRecord>,
    policy_record: Option<ProjectConfigRecord>,
    diagnostics: Vec<ProjectConfigDiagnostic>,
}

#[derive(Serialize)]
struct ProjectRecoveryResult {
    providers: serde_json::Value,
    command_policy: serde_json::Value,
    tasks: Vec<serde_json::Value>,
    memory: Vec<serde_json::Value>,
    loops: Vec<LoopRunSummary>,
    diagnostics: Vec<ProjectConfigDiagnostic>,
}

#[derive(Deserialize)]
struct ReleasePackageRequest {
    project_path: String,
}

#[derive(Deserialize)]
struct ProviderProfileRequest {
    project_path: String,
    profile: String,
}

#[derive(Deserialize)]
struct ControlledSmokeLoopRequest {
    project_id: String,
    project_path: String,
}

#[derive(Serialize)]
struct ReleasePackageResult {
    json_path: String,
    markdown_path: String,
    version: String,
    dmg_path: String,
    dmg_checksum: String,
    app_path: String,
    binary_path: String,
    generated_at: String,
}

#[derive(Serialize)]
struct OperatorChecklistResult {
    json_path: String,
    markdown_path: String,
    status: String,
    blockers: usize,
    warnings: usize,
    next_action: String,
    generated_at: String,
    approval_path: String,
    approval_status: String,
}

#[derive(Serialize)]
struct ProviderProfileResult {
    applied: String,
    providers_path: String,
    mock_profile_path: String,
    real_micro_profile_path: String,
    backup_path: String,
    checksum: String,
    updated_at: String,
    providers: serde_json::Value,
    diagnostics: Vec<ProjectConfigDiagnostic>,
}

#[derive(Clone, Serialize)]
struct SecretFinding {
    source: String,
    line: usize,
    kind: String,
    severity: String,
}

#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(default)]
struct LoopRunSnapshot {
    id: String,
    project_id: String,
    project_path: String,
    task_id: String,
    status: String,
    active_step_index: i64,
    artifact_dir: String,
    manifest_path: String,
    report_json_path: String,
    report_markdown_path: String,
    git_baseline_path: String,
    commit_proposal_path: String,
    security_report_path: String,
    task_title: String,
    task_brief: String,
    task_criteria: Vec<String>,
    task_constraints: Vec<String>,
    task_budget_limit: f64,
    task_spec_path: String,
    task_spec_checksum: String,
    memory_context: String,
    memory_refs: Vec<String>,
    steps: Vec<LoopStepSnapshot>,
}

#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(default)]
struct LoopStepSnapshot {
    id: String,
    state: String,
    agent: String,
    role_id: String,
    provider_id: String,
    provider_type: String,
    provider_command: String,
    provider_args_template: String,
    provider_prompt_mode: String,
    provider_run_mode: String,
    agent_mode: String,
    local_commands: Vec<String>,
    timeout_seconds: u64,
    max_output_bytes: usize,
    max_attempts: i64,
    attempt_count: i64,
    requires_approval: bool,
    last_error: String,
    summary: String,
    evidence: String,
    status: String,
    output: String,
    structured_report_json: String,
    artifact_path: String,
    evidence_path: String,
    started_at: String,
    finished_at: String,
}

#[derive(Serialize)]
struct LoopRunSummary {
    id: String,
    project_id: String,
    project_path: String,
    task_id: String,
    task_title: String,
    status: String,
    active_step_index: i64,
    manifest_path: String,
    report_markdown_path: String,
    source: String,
    updated_at: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct StepStructuredReport {
    verdict: String,
    summary: String,
    actions: Vec<String>,
    files_touched: Vec<String>,
    evidence: Vec<String>,
    risks: Vec<String>,
    next_action: String,
}

#[tauri::command]
fn environment_check() -> Vec<EnvironmentCheck> {
    vec![
        command_available("Git", "git"),
        command_available("Docker", "docker"),
        command_available("Node", "node"),
        command_available("Python", "python3"),
    ]
}

#[tauri::command]
fn classify_command(command: String) -> String {
    let lowered = command.to_lowercase();
    let deny = [
        "rm -rf /",
        "rm -rf /*",
        "mkfs",
        "dd if=",
        "diskutil erase",
        "format c:",
        "credential exfiltration",
        "private key",
        "cat ~/.ssh",
        "cat /etc/passwd",
        "chmod -r 777 /",
    ];
    let approval = [
        "git push",
        "git reset --hard",
        "git clean",
        "deploy",
        "ssh ",
        "scp ",
        "kubectl",
        "terraform apply",
        "migration",
        "docker compose up",
        "docker run",
        "npm publish",
        "pnpm publish",
        "gh release",
        "curl ",
        "wget ",
        "brew install",
        "sudo ",
        ".env",
    ];

    if deny.iter().any(|needle| lowered.contains(needle)) {
        "deny".to_string()
    } else if approval.iter().any(|needle| lowered.contains(needle)) {
        "approval".to_string()
    } else {
        "allow".to_string()
    }
}

#[tauri::command]
fn test_cli_provider(command: String, version_args: Vec<String>) -> CliHealthResult {
    if command.trim().is_empty() {
        return CliHealthResult {
            status: "failed".to_string(),
            detail: "Command is empty.".to_string(),
            version_output: String::new(),
        };
    }

    let args = if version_args.is_empty() {
        vec!["--version".to_string()]
    } else {
        version_args
    };

    let resolved_command = match resolve_executable(command.trim()) {
        Some(path) => path,
        None => {
            return CliHealthResult {
                status: "failed".to_string(),
                detail: format!(
                    "Command was not found in app PATH or known macOS CLI locations: {}",
                    command.trim()
                ),
                version_output: String::new(),
            }
        }
    };

    match Command::new(&resolved_command).args(args).output() {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            let version_output = trim_output(&(stdout + &stderr), 8000);
            CliHealthResult {
                status: if output.status.success() {
                    "ok"
                } else {
                    "warning"
                }
                .to_string(),
                detail: if output.status.success() {
                    format!(
                        "Command is available at {} and version check succeeded.",
                        resolved_command.display()
                    )
                } else {
                    format!(
                        "Command was found at {}, but version check returned a non-zero exit code.",
                        resolved_command.display()
                    )
                },
                version_output,
            }
        }
        Err(err) => CliHealthResult {
            status: "failed".to_string(),
            detail: format!("Command failed to start: {err}"),
            version_output: String::new(),
        },
    }
}

#[tauri::command]
fn discover_cli(command: String, version_args: Vec<String>) -> Vec<CliCandidate> {
    let name = command.trim();
    if name.is_empty() {
        return Vec::new();
    }

    let args = if version_args.is_empty() {
        vec!["--version".to_string()]
    } else {
        version_args
    };

    discover_executables(name)
        .into_iter()
        .map(|(path, source)| {
            let (status, version_output) = match Command::new(&path).args(args.iter()).output() {
                Ok(output) => {
                    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
                    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
                    (
                        if output.status.success() {
                            "ok"
                        } else {
                            "warning"
                        }
                        .to_string(),
                        trim_output(&(stdout + &stderr), 8000),
                    )
                }
                Err(err) => ("failed".to_string(), err.to_string()),
            };
            CliCandidate {
                path: path.display().to_string(),
                source,
                version_output,
                status,
            }
        })
        .collect()
}

#[tauri::command]
fn check_cli_contract(request: CliContractCheckRequest) -> CliContractCheckResult {
    let mut diagnostics = Vec::new();
    let command = request.command.trim();
    let normalized_args_template = normalize_args_template(command, &request.args_template);
    let prompt_mode =
        normalize_prompt_mode(command, &normalized_args_template, &request.prompt_mode);

    if command.is_empty() {
        diagnostics.push(ProjectConfigDiagnostic {
            level: "error".to_string(),
            subject: "command".to_string(),
            detail: "Command is empty.".to_string(),
        });
        return CliContractCheckResult {
            status: "failed".to_string(),
            resolved_command: String::new(),
            normalized_args_template,
            prompt_mode,
            diagnostics,
        };
    }

    let resolved_command = match resolve_executable(command) {
        Some(path) => path,
        None => {
            diagnostics.push(ProjectConfigDiagnostic {
                level: "error".to_string(),
                subject: "command".to_string(),
                detail: format!(
                    "Command was not found in app PATH or known CLI locations: {command}"
                ),
            });
            return CliContractCheckResult {
                status: "failed".to_string(),
                resolved_command: String::new(),
                normalized_args_template,
                prompt_mode,
                diagnostics,
            };
        }
    };

    diagnostics.push(ProjectConfigDiagnostic {
        level: "ok".to_string(),
        subject: "command".to_string(),
        detail: format!("Resolved executable: {}", resolved_command.display()),
    });

    if !is_exact_command_path(command) {
        diagnostics.push(ProjectConfigDiagnostic {
            level: "warning".to_string(),
            subject: "portability".to_string(),
            detail: "Command is PATH-based; save the resolved exact path before moving this project to another machine.".to_string(),
        });
    }

    if normalized_args_template != request.args_template {
        diagnostics.push(ProjectConfigDiagnostic {
            level: "warning".to_string(),
            subject: "args-template".to_string(),
            detail: format!("Normalized legacy args to `{normalized_args_template}`."),
        });
    }

    let sample_prompt = "DBC CLI contract smoke prompt. Do not call a model.";
    let sample_cwd = if request.cwd.trim().is_empty() {
        "."
    } else {
        request.cwd.trim()
    };
    let normalized_args = normalize_cli_args(
        command,
        parse_args_template(&normalized_args_template, sample_prompt, sample_cwd),
    );

    if normalized_args
        .iter()
        .any(|arg| arg == "--ask-for-approval" || arg == "-a" || arg == "-")
    {
        diagnostics.push(ProjectConfigDiagnostic {
            level: "error".to_string(),
            subject: "args-template".to_string(),
            detail: "Normalized args still contain unsupported legacy stdin/approval flags."
                .to_string(),
        });
    } else {
        diagnostics.push(ProjectConfigDiagnostic {
            level: "ok".to_string(),
            subject: "args-template".to_string(),
            detail: format!("Effective args: {}", normalized_args.join(" ")),
        });
    }

    if is_codex_command(command) {
        validate_codex_contract(
            &resolved_command,
            &normalized_args_template,
            &prompt_mode,
            &mut diagnostics,
        );
    } else if is_claude_command(command) {
        validate_claude_contract(
            &resolved_command,
            &normalized_args_template,
            &prompt_mode,
            &mut diagnostics,
        );
    } else {
        diagnostics.push(ProjectConfigDiagnostic {
            level: "warning".to_string(),
            subject: "provider-kind".to_string(),
            detail: "Generic CLI provider; DBC can check resolution and args only.".to_string(),
        });
    }

    let status = if diagnostics.iter().any(|item| item.level == "error") {
        "failed"
    } else if diagnostics.iter().any(|item| item.level == "warning") {
        "warning"
    } else {
        "ok"
    }
    .to_string();

    CliContractCheckResult {
        status,
        resolved_command: resolved_command.display().to_string(),
        normalized_args_template,
        prompt_mode,
        diagnostics,
    }
}

#[tauri::command]
fn run_cli_provider(request: CliRunRequest) -> CliRunResult {
    let started = Instant::now();
    let command_preview = format!("{} {}", request.command, request.args.join(" "));
    let decision = classify_command(command_preview);

    if request.policy_mode == "no_commands" {
        return blocked_result(
            started,
            "deny",
            "Provider policy forbids command execution.",
        );
    }

    if decision == "deny" {
        return blocked_result(started, "deny", "Command denied by DBC policy.");
    }

    if decision == "approval" || decision == "approval_required" {
        return blocked_result(
            started,
            "approval_required",
            "Command requires human approval.",
        );
    }

    let prompt_findings = scan_text_for_secret_findings("cli.prompt", &request.prompt);
    if !prompt_findings.is_empty() {
        return blocked_result(
            started,
            "deny",
            &format!(
                "Security gate blocked CLI prompt before send: {} secret-like finding(s) detected.",
                prompt_findings.len()
            ),
        );
    }

    let cwd = if request.cwd.trim().is_empty() {
        None
    } else {
        Some(PathBuf::from(request.cwd.trim()))
    };

    let resolved_command = match resolve_executable(request.command.trim()) {
        Some(path) => path,
        None => {
            return CliRunResult {
                status: "not_available".to_string(),
                stdout: String::new(),
                stderr: format!(
                    "Command was not found in app PATH or known macOS CLI locations: {}",
                    request.command.trim()
                ),
                exit_code: None,
                duration_ms: started.elapsed().as_millis(),
                decision: "allow".to_string(),
                redacted_output: "Command was not found.".to_string(),
            }
        }
    };

    if request.prompt_mode == "terminal" {
        let message = format!(
            "Terminal mode requires an interactive human-operated terminal or PTY. DBC resolved `{}` but did not execute it through non-interactive stdin. Switch the provider to stdin/arg mode for automated runs, or run the command manually in an approved terminal surface.",
            resolved_command.display()
        );
        return CliRunResult {
            status: "approval_required".to_string(),
            stdout: String::new(),
            stderr: message.clone(),
            exit_code: None,
            duration_ms: started.elapsed().as_millis(),
            decision: "approval_required".to_string(),
            redacted_output: message,
        };
    }

    let mut command = Command::new(resolved_command);
    command.args(request.args.iter());
    if let Some(cwd) = cwd {
        command.current_dir(cwd);
    }
    command.stdout(Stdio::piped()).stderr(Stdio::piped());

    if request.prompt_mode == "stdin" {
        command.stdin(Stdio::piped());
    }

    let mut child = match command.spawn() {
        Ok(child) => child,
        Err(err) => {
            return CliRunResult {
                status: "not_available".to_string(),
                stdout: String::new(),
                stderr: err.to_string(),
                exit_code: None,
                duration_ms: started.elapsed().as_millis(),
                decision: "allow".to_string(),
                redacted_output: redact_text(&err.to_string()),
            }
        }
    };

    if request.prompt_mode == "stdin" {
        if let Some(mut stdin) = child.stdin.take() {
            let _ = stdin.write_all(request.prompt.as_bytes());
        }
    }

    let timeout = Duration::from_secs(request.timeout_seconds.max(1));
    loop {
        match child.try_wait() {
            Ok(Some(_)) => break,
            Ok(None) => {
                if started.elapsed() >= timeout {
                    let _ = child.kill();
                    return CliRunResult {
                        status: "timeout".to_string(),
                        stdout: String::new(),
                        stderr: "Process timed out and was killed.".to_string(),
                        exit_code: None,
                        duration_ms: started.elapsed().as_millis(),
                        decision: "allow".to_string(),
                        redacted_output: "Process timed out and was killed.".to_string(),
                    };
                }
                std::thread::sleep(Duration::from_millis(100));
            }
            Err(err) => {
                return CliRunResult {
                    status: "failed_exit_code".to_string(),
                    stdout: String::new(),
                    stderr: err.to_string(),
                    exit_code: None,
                    duration_ms: started.elapsed().as_millis(),
                    decision: "allow".to_string(),
                    redacted_output: redact_text(&err.to_string()),
                };
            }
        }
    }

    match child.wait_with_output() {
        Ok(output) => {
            let stdout = trim_output(
                &String::from_utf8_lossy(&output.stdout),
                request.max_output_bytes,
            );
            let stderr = trim_output(
                &String::from_utf8_lossy(&output.stderr),
                request.max_output_bytes,
            );
            let combined = format!("{stdout}\n{stderr}");
            CliRunResult {
                status: if output.status.success() {
                    "success".to_string()
                } else {
                    "failed_exit_code".to_string()
                },
                stdout,
                stderr,
                exit_code: output.status.code(),
                duration_ms: started.elapsed().as_millis(),
                decision: "allow".to_string(),
                redacted_output: redact_text(&combined),
            }
        }
        Err(err) => CliRunResult {
            status: "failed_exit_code".to_string(),
            stdout: String::new(),
            stderr: err.to_string(),
            exit_code: None,
            duration_ms: started.elapsed().as_millis(),
            decision: "allow".to_string(),
            redacted_output: redact_text(&err.to_string()),
        },
    }
}

fn validate_real_loop_launch(request: &StartLoopRequest) -> Result<(), String> {
    let real_cli_steps = request
        .steps
        .iter()
        .filter(|step| step.provider_type == "cli" && step.provider_run_mode == "real")
        .count();
    if real_cli_steps == 0 {
        return Ok(());
    }

    if request.task_budget_limit <= 0.0 {
        return Err("Real CLI loops require a positive task budgetLimit.".to_string());
    }

    let operator_path = PathBuf::from(&request.project_path)
        .join(".dbc")
        .join("operator")
        .join("latest.json");
    let operator = read_json_optional(&operator_path).ok_or_else(|| {
        format!(
            "Real CLI loop requires an Operator Checklist: {}",
            operator_path.display()
        )
    })?;

    let status = operator
        .get("status")
        .and_then(|value| value.as_str())
        .unwrap_or("");
    if status != "ready_to_start_real_micro" && status != "real_profile_already_active" {
        return Err(format!(
            "Operator Checklist status must be ready_to_start_real_micro or real_profile_already_active; got {status}."
        ));
    }

    if json_array_len(&operator, "blockers") > 0 {
        return Err("Operator Checklist has blockers; real CLI loop is blocked.".to_string());
    }

    let checklist_task_id = operator
        .get("task")
        .and_then(|value| value.get("id"))
        .and_then(|value| value.as_str())
        .unwrap_or("");
    if checklist_task_id != request.task_id {
        return Err(format!(
            "Operator Checklist task mismatch: expected {}, got {}.",
            request.task_id, checklist_task_id
        ));
    }

    let checklist_budget = operator
        .get("budget")
        .and_then(|value| value.get("budgetLimit"))
        .and_then(|value| value.as_f64())
        .unwrap_or(0.0);
    if (checklist_budget - request.task_budget_limit).abs() > f64::EPSILON {
        return Err(format!(
            "Operator Checklist budget mismatch: task budgetLimit {} but checklist budgetLimit {}.",
            request.task_budget_limit, checklist_budget
        ));
    }

    let preflight_path = PathBuf::from(&request.project_path)
        .join(".dbc")
        .join("preflight")
        .join("latest.json");
    let preflight = read_json_optional(&preflight_path).ok_or_else(|| {
        format!(
            "Real CLI loop requires a ready Real Micro Preflight report: {}",
            preflight_path.display()
        )
    })?;
    let preflight_status = preflight
        .get("status")
        .and_then(|value| value.as_str())
        .unwrap_or("");
    if preflight_status != "ready_to_run" {
        return Err(format!(
            "Real Micro Preflight status must be ready_to_run; got {preflight_status}."
        ));
    }
    if json_array_len(&preflight, "blockers") > 0 {
        return Err("Real Micro Preflight has blockers; real CLI loop is blocked.".to_string());
    }
    let preflight_task_id = preflight
        .get("task")
        .and_then(|value| value.get("id"))
        .and_then(|value| value.as_str())
        .unwrap_or("");
    if preflight_task_id != request.task_id {
        return Err(format!(
            "Real Micro Preflight task mismatch: expected {}, got {}.",
            request.task_id, preflight_task_id
        ));
    }

    let approval_path = PathBuf::from(&request.project_path)
        .join(".dbc")
        .join("operator")
        .join("approval.json");
    let approval = read_json_optional(&approval_path).ok_or_else(|| {
        format!(
            "Real CLI loop requires explicit operator approval: {}",
            approval_path.display()
        )
    })?;
    let checklist_generated_at = operator
        .get("generatedAt")
        .and_then(|value| value.as_str())
        .unwrap_or("");
    if !operator_approval_matches(
        &Some(approval),
        checklist_generated_at,
        &request.task_id,
        request.task_budget_limit,
    ) {
        return Err(
            "Operator approval is missing, stale, or does not match task/budget.".to_string(),
        );
    }

    ensure_approval_decision_approved(
        &PathBuf::from(&request.project_path).join(".dbc"),
        "RUN-REAL-MICRO-TASK",
    )?;

    let real_limit = real_provider_call_limit(request.task_budget_limit);
    if real_limit <= 0 {
        return Err("Real CLI call limit resolved to zero.".to_string());
    }

    Ok(())
}

#[tauri::command]
fn start_loop_run(
    app: tauri::AppHandle,
    request: StartLoopRequest,
) -> Result<LoopRunSnapshot, String> {
    if request.steps.is_empty() {
        return Err("Loop requires at least one step.".to_string());
    }
    validate_real_loop_launch(&request)?;

    let db_path = database_path(&app)?;
    let conn = open_db(db_path)?;
    let loop_id = format!("loop-{}", unix_millis());
    let artifact_dir = PathBuf::from(&request.project_path)
        .join(".dbc")
        .join("artifacts")
        .join(&loop_id);
    fs::create_dir_all(&artifact_dir).map_err(|err| err.to_string())?;

    conn.execute(
        "insert into loop_runs
         (id, project_id, task_id, project_path, task_title, task_brief, task_criteria_json, task_constraints_json,
          task_budget_limit, task_spec_path, task_spec_checksum, memory_context, memory_refs_json, status, active_step_index, artifact_dir, created_at, updated_at)
         values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, 'running', 0, ?14, datetime('now'), datetime('now'))",
        params![
            loop_id,
            request.project_id,
            request.task_id,
            request.project_path,
            request.task_title,
            request.task_brief,
            serde_json::to_string(&request.task_criteria).map_err(|err| err.to_string())?,
            serde_json::to_string(&request.task_constraints).map_err(|err| err.to_string())?,
            request.task_budget_limit,
            request.task_spec_path,
            request.task_spec_checksum,
            request.memory_context,
            serde_json::to_string(&request.memory_refs).map_err(|err| err.to_string())?,
            artifact_dir.display().to_string()
        ],
    )
    .map_err(|err| err.to_string())?;

    for (index, step) in request.steps.iter().enumerate() {
        let status = if index == 0 { "running" } else { "waiting" };
        let started_at = if index == 0 {
            current_sql_time()
        } else {
            String::new()
        };
        conn.execute(
            "insert into loop_steps
             (loop_id, step_index, step_id, state, agent, role_id, provider_id, provider_type, provider_command,
              provider_args_template, provider_prompt_mode, provider_run_mode, agent_mode, local_commands_json,
              timeout_seconds, max_output_bytes, max_attempts, attempt_count, requires_approval, last_error,
              summary, evidence, status, output, structured_report_json, artifact_path, started_at, finished_at)
             values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, 0, 0, '', ?18, ?19, ?20, '', '', '', ?21, '')",
            params![
                loop_id,
                index as i64,
                step.id,
                step.state,
                step.agent,
                step.role_id,
                step.provider_id,
                step.provider_type,
                step.provider_command,
                step.provider_args_template,
                step.provider_prompt_mode,
                step.provider_run_mode,
                step.agent_mode,
                serde_json::to_string(&step.local_commands).map_err(|err| err.to_string())?,
                step.timeout_seconds as i64,
                step.max_output_bytes as i64,
                step.max_attempts,
                step.summary,
                step.evidence,
                status,
                started_at
            ],
        )
        .map_err(|err| err.to_string())?;
    }

    let run = read_loop_run(&conn, &loop_id)?;
    let snapshot = build_loop_snapshot(&conn, run)?;
    persist_loop_outputs(&snapshot)?;
    Ok(snapshot)
}

#[tauri::command]
fn run_controlled_smoke_loop(
    app: tauri::AppHandle,
    request: ControlledSmokeLoopRequest,
) -> Result<LoopRunSnapshot, String> {
    let task_id = "SMOKE-LOOP-CONTROLLED".to_string();
    let task = TaskSpecRequest {
        project_path: request.project_path.clone(),
        id: task_id.clone(),
        title: "Controlled smoke loop: local evidence package".to_string(),
        brief: "Run the DBC loop engine end-to-end without model calls. Planning, coding, review, security, and acceptance use deterministic mock providers; build executes pnpm build through the local runner and records evidence.".to_string(),
        criteria: vec![
            "Loop reaches completed status.".to_string(),
            "Manifest, evidence, reports, git baseline, git workspace, diff, commit proposal, and security report are written under .dbc.".to_string(),
            "Build step records a successful pnpm build result.".to_string(),
            "Every step has a structured report and evidence path.".to_string(),
        ],
        constraints: vec![
            "Do not call external model providers.".to_string(),
            "Do not publish, push, install, or run destructive commands.".to_string(),
            "Only generated .dbc artifacts and existing build outputs may change.".to_string(),
        ],
        budget_limit: 0.0,
        status: "ready".to_string(),
        risk: "low".to_string(),
        priority: "normal".to_string(),
        loop_profile: "controlled_smoke".to_string(),
        provider_strategy: "mock_only".to_string(),
        affected_paths: vec![
            ".dbc/tasks".to_string(),
            ".dbc/loops".to_string(),
            ".dbc/evidence".to_string(),
            ".dbc/artifacts".to_string(),
            ".dbc/reports".to_string(),
        ],
        allowed_paths: vec![
            ".dbc/tasks".to_string(),
            ".dbc/loops".to_string(),
            ".dbc/evidence".to_string(),
            ".dbc/artifacts".to_string(),
            ".dbc/reports".to_string(),
            ".dbc/security".to_string(),
            ".dbc/git".to_string(),
        ],
        denied_paths: vec![
            ".env".to_string(),
            "node_modules".to_string(),
            "src-tauri/target".to_string(),
        ],
        required_reviewers: vec![
            "QA".to_string(),
            "Reviewer".to_string(),
            "Security".to_string(),
            "Product Owner".to_string(),
        ],
        stop_conditions: vec![
            "Stop if any real model provider is selected.".to_string(),
            "Stop if controlled smoke evidence cannot be written.".to_string(),
            "Stop if pnpm build fails.".to_string(),
        ],
    };
    let task_record = save_task_spec(task)?;
    let mut snapshot = start_loop_run(
        app.clone(),
        StartLoopRequest {
            project_id: request.project_id,
            task_id,
            project_path: request.project_path,
            task_title: "Controlled smoke loop: local evidence package".to_string(),
            task_brief: "Run the DBC loop engine end-to-end without model calls. The build step executes pnpm build and all other steps use deterministic mock providers.".to_string(),
            task_criteria: vec![
                "Loop reaches completed status.".to_string(),
                "Manifest, evidence, reports, git baseline, git workspace, diff, commit proposal, and security report are written under .dbc.".to_string(),
                "Build step records a successful pnpm build result.".to_string(),
                "Every step has a structured report and evidence path.".to_string(),
            ],
            task_constraints: vec![
                "Do not call external model providers.".to_string(),
                "Do not publish, push, install, or run destructive commands.".to_string(),
                "Only generated .dbc artifacts and existing build outputs may change.".to_string(),
            ],
            task_budget_limit: 0.0,
            task_spec_path: task_record.path,
            task_spec_checksum: task_record.checksum,
            memory_context: "- [decision] Controlled smoke loops verify DBC orchestration without external model calls.".to_string(),
            memory_refs: Vec::new(),
            steps: controlled_smoke_steps(),
        },
    )?;

    for _ in 0..snapshot.steps.len() {
        if snapshot.status != "running" {
            break;
        }
        snapshot = advance_loop_run(app.clone(), snapshot.id.clone())?;
    }

    Ok(snapshot)
}

fn controlled_smoke_steps() -> Vec<LoopStepInput> {
    vec![
        controlled_smoke_step(
            "plan",
            "planned",
            "Team Lead",
            "lead",
            "mock_adapter",
            "mock",
            "read_only",
            Vec::new(),
            "Controlled smoke task decomposed into bounded deterministic steps.",
            "Plan artifact confirms no model providers are called.",
        ),
        controlled_smoke_step(
            "code",
            "coding",
            "Developer",
            "developer",
            "mock_adapter",
            "mock",
            "write_workspace",
            Vec::new(),
            "Implementation step simulated without modifying source files.",
            "Mock provider records patch intent and affected artifact paths.",
        ),
        controlled_smoke_step(
            "build",
            "building",
            "DevOps",
            "devops",
            "local_terminal",
            "local_runner",
            "command_runner",
            vec!["pnpm build".to_string()],
            "Project build executed through the local command runner.",
            "Build log captured with exit code and redacted output.",
        ),
        controlled_smoke_step(
            "test",
            "testing",
            "QA",
            "qa",
            "mock_adapter",
            "mock",
            "review_only",
            Vec::new(),
            "QA validates generated loop evidence.",
            "Evidence paths and structured reports are checked by the loop engine.",
        ),
        controlled_smoke_step(
            "review",
            "reviewing",
            "Reviewer",
            "reviewer",
            "mock_adapter",
            "mock",
            "review_only",
            Vec::new(),
            "Reviewer checks acceptance criteria coverage.",
            "Review report lists no unresolved smoke-loop risks.",
        ),
        controlled_smoke_step(
            "security",
            "security",
            "Security",
            "security",
            "mock_adapter",
            "mock",
            "read_only",
            Vec::new(),
            "Security verifies no secret-like prompt content was sent.",
            "Security report confirms generated artifacts redact sensitive output.",
        ),
        controlled_smoke_step(
            "accept",
            "acceptance",
            "Product Owner",
            "product",
            "mock_adapter",
            "mock",
            "read_only",
            Vec::new(),
            "Product Owner accepts the controlled smoke package.",
            "Final report links task, build evidence, security report, and manifest.",
        ),
    ]
}

fn controlled_smoke_step(
    id: &str,
    state: &str,
    agent: &str,
    role_id: &str,
    provider_id: &str,
    provider_type: &str,
    agent_mode: &str,
    local_commands: Vec<String>,
    summary: &str,
    evidence: &str,
) -> LoopStepInput {
    LoopStepInput {
        id: id.to_string(),
        state: state.to_string(),
        agent: agent.to_string(),
        role_id: role_id.to_string(),
        provider_id: provider_id.to_string(),
        provider_type: provider_type.to_string(),
        provider_command: String::new(),
        provider_args_template: String::new(),
        provider_prompt_mode: "stdin".to_string(),
        provider_run_mode: "mock".to_string(),
        agent_mode: agent_mode.to_string(),
        local_commands,
        timeout_seconds: 300,
        max_output_bytes: 200000,
        max_attempts: 1,
        summary: summary.to_string(),
        evidence: evidence.to_string(),
    }
}

#[tauri::command]
fn advance_loop_run(app: tauri::AppHandle, loop_id: String) -> Result<LoopRunSnapshot, String> {
    let db_path = database_path(&app)?;
    let conn = open_db(db_path)?;
    let mut run = read_loop_run(&conn, &loop_id)?;

    if run.status != "running" {
        return get_loop_run(app, loop_id);
    }

    let active = run.active_step_index;
    let current_step = read_loop_step(&conn, &loop_id, active)?;
    let execution = budget_guard_execution(&conn, &run, &current_step)?
        .unwrap_or_else(|| execute_loop_step(&run, &current_step));
    let output = execution.output;
    let structured_report_json =
        serde_json::to_string_pretty(&execution.report).map_err(|err| err.to_string())?;
    let artifact_path = write_step_artifact(
        &run,
        &loop_id,
        &current_step,
        &execution.status,
        &execution.report,
        &output,
    )?;
    let evidence_path = write_step_evidence(
        &run,
        &loop_id,
        &current_step,
        &execution.status,
        &execution.report,
        &artifact_path,
        &output,
    )?;
    let last_error = if execution.status == "passed" {
        String::new()
    } else {
        summarize_step_error(&execution.status, &output)
    };
    let requires_approval = if execution.status == "approval_required" {
        1
    } else {
        0
    };

    conn.execute(
        "update loop_steps
         set status = ?1, output = ?2, structured_report_json = ?3, artifact_path = ?4, evidence_path = ?5, finished_at = datetime('now'),
             attempt_count = attempt_count + 1, requires_approval = ?6, last_error = ?7
         where loop_id = ?8 and step_index = ?9",
        params![execution.status, output, structured_report_json, artifact_path, evidence_path, requires_approval, last_error, loop_id, active],
    )
        .map_err(|err| err.to_string())?;

    if execution.status != "passed" {
        conn.execute(
            "update loop_runs set status = ?1, updated_at = datetime('now') where id = ?2",
            params![
                if execution.status == "approval_required" {
                    "blocked"
                } else {
                    "failed"
                },
                loop_id
            ],
        )
        .map_err(|err| err.to_string())?;
        run = read_loop_run(&conn, &loop_id)?;
        let snapshot = build_loop_snapshot(&conn, run)?;
        persist_loop_outputs(&snapshot)?;
        return Ok(snapshot);
    }

    let step_count: i64 = conn
        .query_row(
            "select count(*) from loop_steps where loop_id = ?1",
            params![loop_id],
            |row| row.get(0),
        )
        .map_err(|err| err.to_string())?;

    if active + 1 >= step_count {
        conn.execute(
            "update loop_runs set status = 'completed', active_step_index = ?1, updated_at = datetime('now'), completed_at = datetime('now') where id = ?2",
            params![active, loop_id],
        )
        .map_err(|err| err.to_string())?;
    } else {
        let next = active + 1;
        conn.execute(
            "update loop_steps set status = 'running', started_at = datetime('now') where loop_id = ?1 and step_index = ?2",
            params![loop_id, next],
        )
        .map_err(|err| err.to_string())?;
        conn.execute(
            "update loop_runs set active_step_index = ?1, updated_at = datetime('now') where id = ?2",
            params![next, loop_id],
        )
        .map_err(|err| err.to_string())?;
    }

    run = read_loop_run(&conn, &loop_id)?;
    let snapshot = build_loop_snapshot(&conn, run)?;
    persist_loop_outputs(&snapshot)?;
    Ok(snapshot)
}

#[tauri::command]
fn resume_loop_run(app: tauri::AppHandle, loop_id: String) -> Result<LoopRunSnapshot, String> {
    let db_path = database_path(&app)?;
    let conn = open_db(db_path)?;
    let run = read_loop_run(&conn, &loop_id)?;

    if run.status == "completed" {
        return build_loop_snapshot(&conn, run);
    }

    prepare_step_retry(&conn, &run, false)?;

    let resumed = read_loop_run(&conn, &loop_id)?;
    let snapshot = build_loop_snapshot(&conn, resumed)?;
    persist_loop_outputs(&snapshot)?;
    Ok(snapshot)
}

#[tauri::command]
fn retry_loop_step(app: tauri::AppHandle, loop_id: String) -> Result<LoopRunSnapshot, String> {
    let db_path = database_path(&app)?;
    let conn = open_db(db_path)?;
    let run = read_loop_run(&conn, &loop_id)?;

    if run.status == "completed" {
        return build_loop_snapshot(&conn, run);
    }

    prepare_step_retry(&conn, &run, true)?;
    let retried = read_loop_run(&conn, &loop_id)?;
    let snapshot = build_loop_snapshot(&conn, retried)?;
    persist_loop_outputs(&snapshot)?;
    Ok(snapshot)
}

#[tauri::command]
fn resolve_loop_approval(
    app: tauri::AppHandle,
    request: ResolveApprovalRequest,
) -> Result<LoopRunSnapshot, String> {
    let db_path = database_path(&app)?;
    let conn = open_db(db_path)?;
    let run = read_loop_run(&conn, &request.loop_id)?;
    let step = read_loop_step(&conn, &request.loop_id, run.active_step_index)?;

    if step.id != request.step_id {
        return Err(format!(
            "Approval targets step {}, but active step is {}.",
            request.step_id, step.id
        ));
    }

    match request.action.as_str() {
        "approved" => {
            conn.execute(
                "update loop_steps
                 set status = 'running', requires_approval = 0, last_error = '', output = '', structured_report_json = '', artifact_path = '', evidence_path = '',
                     started_at = datetime('now'), finished_at = ''
                 where loop_id = ?1 and step_index = ?2",
                params![request.loop_id, run.active_step_index],
            )
            .map_err(|err| err.to_string())?;
            conn.execute(
                "update loop_runs set status = 'running', updated_at = datetime('now'), completed_at = null where id = ?1",
                params![request.loop_id],
            )
            .map_err(|err| err.to_string())?;
        }
        "rejected" => {
            conn.execute(
                "update loop_steps
                 set status = 'blocked', requires_approval = 0, last_error = 'Rejected by human approval.', finished_at = datetime('now')
                 where loop_id = ?1 and step_index = ?2",
                params![request.loop_id, run.active_step_index],
            )
            .map_err(|err| err.to_string())?;
            conn.execute(
                "update loop_runs set status = 'failed', updated_at = datetime('now'), completed_at = datetime('now') where id = ?1",
                params![request.loop_id],
            )
            .map_err(|err| err.to_string())?;
        }
        "changes_requested" => {
            conn.execute(
                "update loop_steps
                 set status = 'failed', requires_approval = 0, last_error = 'Changes requested by human approval.', finished_at = datetime('now')
                 where loop_id = ?1 and step_index = ?2",
                params![request.loop_id, run.active_step_index],
            )
            .map_err(|err| err.to_string())?;
            conn.execute(
                "update loop_runs set status = 'failed', updated_at = datetime('now'), completed_at = datetime('now') where id = ?1",
                params![request.loop_id],
            )
            .map_err(|err| err.to_string())?;
        }
        other => return Err(format!("Unsupported approval action: {other}")),
    }

    let resolved = read_loop_run(&conn, &request.loop_id)?;
    let snapshot = build_loop_snapshot(&conn, resolved)?;
    persist_loop_outputs(&snapshot)?;
    Ok(snapshot)
}

#[tauri::command]
fn save_task_spec(request: TaskSpecRequest) -> Result<TaskSpecRecord, String> {
    let dir = PathBuf::from(&request.project_path)
        .join(".dbc")
        .join("tasks");
    fs::create_dir_all(&dir).map_err(|err| err.to_string())?;
    let path = dir.join(format!("{}.json", sanitize_file_stem(&request.id)));
    let updated_at = unix_millis().to_string();
    let allowed_paths = if request.allowed_paths.is_empty() {
        request.affected_paths.clone()
    } else {
        request.allowed_paths.clone()
    };
    let content = serde_json::to_string_pretty(&serde_json::json!({
        "version": 1,
        "id": request.id,
        "title": request.title,
        "brief": request.brief,
        "criteria": request.criteria,
        "constraints": request.constraints,
        "budgetLimit": request.budget_limit,
        "status": request.status,
        "risk": request.risk,
        "priority": request.priority,
        "loopProfile": request.loop_profile,
        "providerStrategy": request.provider_strategy,
        "affectedPaths": request.affected_paths,
        "allowedPaths": allowed_paths,
        "deniedPaths": request.denied_paths,
        "requiredReviewers": request.required_reviewers,
        "stopConditions": request.stop_conditions,
        "updatedAt": updated_at,
    }))
    .map_err(|err| err.to_string())?;
    fs::write(&path, &content).map_err(|err| err.to_string())?;
    Ok(TaskSpecRecord {
        id: path
            .file_stem()
            .and_then(|value| value.to_str())
            .unwrap_or("task")
            .to_string(),
        path: path.display().to_string(),
        checksum: stable_checksum(&content),
        updated_at,
    })
}

#[tauri::command]
fn list_task_specs(project_path: String) -> Result<Vec<TaskSpecRecord>, String> {
    let dir = PathBuf::from(project_path).join(".dbc").join("tasks");
    if !dir.exists() {
        return Ok(Vec::new());
    }

    let mut records = Vec::new();
    let entries = fs::read_dir(&dir).map_err(|err| err.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|err| err.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|value| value.to_str()) != Some("json") {
            continue;
        }
        let content = fs::read_to_string(&path).map_err(|err| err.to_string())?;
        records.push(TaskSpecRecord {
            id: path
                .file_stem()
                .and_then(|value| value.to_str())
                .unwrap_or("task")
                .to_string(),
            path: path.display().to_string(),
            checksum: stable_checksum(&content),
            updated_at: entry
                .metadata()
                .ok()
                .and_then(|metadata| metadata.modified().ok())
                .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
                .map(|duration| duration.as_millis().to_string())
                .unwrap_or_default(),
        });
    }
    records.sort_by(|left, right| right.updated_at.cmp(&left.updated_at));
    Ok(records)
}

#[tauri::command]
fn load_task_spec(project_path: String, task_id: String) -> Result<TaskSpecLoadResult, String> {
    let safe_id = sanitize_file_stem(&task_id);
    let path = PathBuf::from(project_path)
        .join(".dbc")
        .join("tasks")
        .join(format!("{safe_id}.json"));
    let content = fs::read_to_string(&path).map_err(|err| {
        format!(
            "Task spec is missing or unreadable: {} ({err})",
            path.display()
        )
    })?;
    let mut task: serde_json::Value = serde_json::from_str(&content)
        .map_err(|err| format!("Task spec is not valid JSON: {} ({err})", path.display()))?;
    if let Some(object) = task.as_object_mut() {
        object.insert(
            "path".to_string(),
            serde_json::Value::String(path.display().to_string()),
        );
        object.insert(
            "checksum".to_string(),
            serde_json::Value::String(stable_checksum(&content)),
        );
        object.insert(
            "updatedAt".to_string(),
            serde_json::Value::String(file_modified_millis(&path)),
        );
    }

    Ok(TaskSpecLoadResult {
        task,
        record: TaskSpecRecord {
            id: safe_id,
            path: path.display().to_string(),
            checksum: stable_checksum(&content),
            updated_at: file_modified_millis(&path),
        },
    })
}

#[tauri::command]
fn save_memory_note(request: MemoryNoteRequest) -> Result<MemoryNoteRecord, String> {
    let dir = PathBuf::from(&request.project_path)
        .join(".dbc")
        .join("memory");
    fs::create_dir_all(&dir).map_err(|err| err.to_string())?;
    let path = dir.join(format!("{}.json", sanitize_file_stem(&request.id)));
    let updated_at = unix_millis().to_string();
    let content = serde_json::to_string_pretty(&serde_json::json!({
        "version": 1,
        "id": request.id,
        "type": request.note_type,
        "title": request.title,
        "body": request.body,
        "author": request.author,
        "createdAt": request.created_at,
        "updatedAt": updated_at,
    }))
    .map_err(|err| err.to_string())?;
    fs::write(&path, &content).map_err(|err| err.to_string())?;
    Ok(MemoryNoteRecord {
        id: path
            .file_stem()
            .and_then(|value| value.to_str())
            .unwrap_or("memory")
            .to_string(),
        path: path.display().to_string(),
        checksum: stable_checksum(&content),
        updated_at,
    })
}

#[tauri::command]
fn list_memory_notes(project_path: String) -> Result<Vec<MemoryNoteRecord>, String> {
    let dir = PathBuf::from(project_path).join(".dbc").join("memory");
    if !dir.exists() {
        return Ok(Vec::new());
    }

    let mut records = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|err| err.to_string())? {
        let entry = entry.map_err(|err| err.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|value| value.to_str()) != Some("json") {
            continue;
        }
        let content = fs::read_to_string(&path).map_err(|err| err.to_string())?;
        records.push(MemoryNoteRecord {
            id: path
                .file_stem()
                .and_then(|value| value.to_str())
                .unwrap_or("memory")
                .to_string(),
            path: path.display().to_string(),
            checksum: stable_checksum(&content),
            updated_at: entry
                .metadata()
                .ok()
                .and_then(|metadata| metadata.modified().ok())
                .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
                .map(|duration| duration.as_millis().to_string())
                .unwrap_or_default(),
        });
    }
    records.sort_by(|left, right| right.updated_at.cmp(&left.updated_at));
    Ok(records)
}

#[tauri::command]
fn save_project_config(request: ProjectConfigRequest) -> Result<ProjectConfigResult, String> {
    let dir = PathBuf::from(&request.project_path).join(".dbc");
    fs::create_dir_all(&dir).map_err(|err| err.to_string())?;

    let updated_at = unix_millis().to_string();
    let providers_path = dir.join("providers.yaml");
    let policy_path = dir.join("policy.yaml");

    let providers_doc = serde_json::json!({
        "version": 1,
        "kind": "providers",
        "updatedAt": updated_at,
        "providers": request.providers,
    });
    let policy_doc = serde_json::json!({
        "version": 1,
        "kind": "command-policy",
        "updatedAt": updated_at,
        "policy": request.command_policy,
    });

    let providers_content = json_to_yaml(&providers_doc);
    let policy_content = json_to_yaml(&policy_doc);
    fs::write(&providers_path, &providers_content).map_err(|err| err.to_string())?;
    fs::write(&policy_path, &policy_content).map_err(|err| err.to_string())?;

    Ok(ProjectConfigResult {
        providers: ProjectConfigRecord {
            path: providers_path.display().to_string(),
            checksum: stable_checksum(&providers_content),
            updated_at: updated_at.clone(),
        },
        policy: ProjectConfigRecord {
            path: policy_path.display().to_string(),
            checksum: stable_checksum(&policy_content),
            updated_at,
        },
    })
}

#[tauri::command]
fn load_project_config(
    request: ProjectConfigLoadRequest,
) -> Result<ProjectConfigLoadResult, String> {
    let dir = PathBuf::from(&request.project_path).join(".dbc");
    let providers_path = dir.join("providers.yaml");
    let policy_path = dir.join("policy.yaml");
    let mut diagnostics = Vec::new();

    let (providers_doc, providers_record) =
        read_yaml_contract(&providers_path, "providers", &mut diagnostics)?;
    let (policy_doc, policy_record) = read_yaml_contract(&policy_path, "policy", &mut diagnostics)?;

    let providers = providers_doc
        .as_ref()
        .and_then(|value| value.get("providers"))
        .cloned()
        .unwrap_or(serde_json::Value::Array(Vec::new()));
    let command_policy = policy_doc
        .as_ref()
        .and_then(|value| value.get("policy"))
        .cloned()
        .unwrap_or_else(|| {
            serde_json::json!({
                "allow": [],
                "approvalRequired": [],
                "deny": [],
            })
        });

    validate_providers_contract(&providers, &mut diagnostics);
    validate_policy_contract(&command_policy, &mut diagnostics);

    Ok(ProjectConfigLoadResult {
        providers,
        command_policy,
        providers_record,
        policy_record,
        diagnostics,
    })
}

#[tauri::command]
fn apply_provider_profile(
    request: ProviderProfileRequest,
) -> Result<ProviderProfileResult, String> {
    let project = PathBuf::from(&request.project_path);
    let dbc_dir = project.join(".dbc");
    fs::create_dir_all(&dbc_dir).map_err(|err| err.to_string())?;

    let providers_path = dbc_dir.join("providers.yaml");
    if !providers_path.exists() {
        return Err(format!(
            "Missing {}. Sync .dbc config first.",
            providers_path.display()
        ));
    }

    let source = fs::read_to_string(&providers_path).map_err(|err| err.to_string())?;
    let source_doc: serde_json::Value =
        serde_yaml::from_str(&source).map_err(|err| err.to_string())?;
    let providers = source_doc
        .get("providers")
        .and_then(|value| value.as_array())
        .cloned()
        .ok_or_else(|| "providers.yaml must contain a providers array.".to_string())?;

    let updated_at = unix_millis().to_string();
    let mock_doc = provider_profile_doc(&providers, "mock", &updated_at);
    let real_micro_doc = provider_profile_doc(&providers, "real-micro", &updated_at);
    let mock_content = profile_header("mock", &updated_at) + &json_to_yaml(&mock_doc);
    let real_micro_content =
        profile_header("real-micro", &updated_at) + &json_to_yaml(&real_micro_doc);
    let mock_profile_path = dbc_dir.join("providers.mock.yaml");
    let real_micro_profile_path = dbc_dir.join("providers.real-micro.yaml");
    fs::write(&mock_profile_path, &mock_content).map_err(|err| err.to_string())?;
    fs::write(&real_micro_profile_path, &real_micro_content).map_err(|err| err.to_string())?;

    if request.profile == "real-micro" {
        ensure_real_micro_profile_approval(&dbc_dir)?;
    }

    let (applied, selected_content, selected_doc) = match request.profile.as_str() {
        "mock" => ("mock".to_string(), mock_content, mock_doc),
        "real-micro" => ("real-micro".to_string(), real_micro_content, real_micro_doc),
        other => {
            return Err(format!(
                "Unknown provider profile '{other}'. Expected mock or real-micro."
            ))
        }
    };

    let backup_dir = dbc_dir.join("providers.backups");
    fs::create_dir_all(&backup_dir).map_err(|err| err.to_string())?;
    let backup_path = backup_dir.join(format!("providers-{updated_at}.yaml"));
    fs::copy(&providers_path, &backup_path).map_err(|err| err.to_string())?;
    fs::write(&providers_path, &selected_content).map_err(|err| err.to_string())?;

    let providers_value = selected_doc
        .get("providers")
        .cloned()
        .unwrap_or_else(|| serde_json::Value::Array(Vec::new()));
    let mut diagnostics = Vec::new();
    validate_providers_contract(&providers_value, &mut diagnostics);

    Ok(ProviderProfileResult {
        applied,
        providers_path: providers_path.display().to_string(),
        mock_profile_path: mock_profile_path.display().to_string(),
        real_micro_profile_path: real_micro_profile_path.display().to_string(),
        backup_path: backup_path.display().to_string(),
        checksum: stable_checksum(&selected_content),
        updated_at,
        providers: providers_value,
        diagnostics,
    })
}

fn ensure_real_micro_profile_approval(dbc_dir: &Path) -> Result<(), String> {
    let checklist_path = dbc_dir.join("operator").join("latest.json");
    let approval_path = dbc_dir.join("operator").join("approval.json");
    let checklist = read_json_optional(&checklist_path).ok_or_else(|| {
        format!(
            "Refusing real-micro profile switch. Missing operator checklist: {}",
            checklist_path.display()
        )
    })?;
    if checklist
        .get("kind")
        .and_then(|value| value.as_str())
        .unwrap_or("")
        != "operator-checklist"
    {
        return Err(
            "Refusing real-micro profile switch. Invalid operator checklist kind.".to_string(),
        );
    }
    if json_array_len(&checklist, "blockers") > 0 {
        return Err(
            "Refusing real-micro profile switch. Operator checklist has blockers.".to_string(),
        );
    }
    let status = checklist
        .get("status")
        .and_then(|value| value.as_str())
        .unwrap_or("");
    if status != "ready_to_start_real_micro" && status != "real_profile_already_active" {
        return Err(format!(
            "Refusing real-micro profile switch. Operator checklist status is {status}; approve the gate first."
        ));
    }

    let approval = read_json_optional(&approval_path).ok_or_else(|| {
        format!(
            "Refusing real-micro profile switch. Missing operator approval: {}",
            approval_path.display()
        )
    })?;
    let checklist_generated_at = checklist
        .get("generatedAt")
        .and_then(|value| value.as_str())
        .unwrap_or("");
    let task_id = checklist
        .get("task")
        .and_then(|value| value.get("id"))
        .and_then(|value| value.as_str())
        .unwrap_or("");
    let budget_limit = checklist
        .get("budget")
        .and_then(|value| value.get("budgetLimit"))
        .or_else(|| {
            checklist
                .get("task")
                .and_then(|value| value.get("budgetLimit"))
        })
        .and_then(|value| value.as_f64())
        .unwrap_or(0.0);
    if !operator_approval_matches(
        &Some(approval),
        checklist_generated_at,
        task_id,
        budget_limit,
    ) {
        return Err("Refusing real-micro profile switch. Operator approval is missing, stale, or does not match task/budget.".to_string());
    }
    ensure_approval_decision_approved(dbc_dir, "APPLY-REAL-MICRO-PROFILE")?;

    Ok(())
}

fn ensure_approval_decision_approved(dbc_dir: &Path, id: &str) -> Result<(), String> {
    let decision_path = dbc_dir
        .join("approvals")
        .join("decisions")
        .join(format!("{}.json", sanitize_file_stem(id)));
    let decision = read_json_optional(&decision_path).ok_or_else(|| {
        format!(
            "Missing approved ledger decision: {}",
            decision_path.display()
        )
    })?;
    let decision_status = decision
        .get("decision")
        .and_then(|value| value.as_str())
        .unwrap_or("");
    if decision_status != "approved" {
        return Err(format!(
            "Ledger decision {id} must be approved; got {decision_status}."
        ));
    }
    Ok(())
}

#[tauri::command]
fn recover_project_state(
    app: tauri::AppHandle,
    project_path: String,
) -> Result<ProjectRecoveryResult, String> {
    let config = load_project_config(ProjectConfigLoadRequest {
        project_path: project_path.clone(),
    })?;
    let tasks =
        read_json_records_with_metadata(&PathBuf::from(&project_path).join(".dbc").join("tasks"))?;
    let memory =
        read_json_records_with_metadata(&PathBuf::from(&project_path).join(".dbc").join("memory"))?;
    let loops = list_loop_runs(app, project_path)?;
    let mut diagnostics = config.diagnostics;
    diagnostics.push(ProjectConfigDiagnostic {
        level: "info".to_string(),
        subject: "recovery".to_string(),
        detail: format!(
            "Recovered {} task(s), {} memory note(s), and {} loop summary item(s).",
            tasks.len(),
            memory.len(),
            loops.len()
        ),
    });

    Ok(ProjectRecoveryResult {
        providers: config.providers,
        command_policy: config.command_policy,
        tasks,
        memory,
        loops,
        diagnostics,
    })
}

#[tauri::command]
fn generate_release_package(
    request: ReleasePackageRequest,
) -> Result<ReleasePackageResult, String> {
    let project = PathBuf::from(&request.project_path);
    let tauri_config_path = project.join("src-tauri").join("tauri.conf.json");
    let tauri_config_text =
        fs::read_to_string(&tauri_config_path).map_err(|err| err.to_string())?;
    let tauri_config: serde_json::Value =
        serde_json::from_str(&tauri_config_text).map_err(|err| err.to_string())?;
    let product_name = tauri_config
        .get("productName")
        .and_then(|value| value.as_str())
        .unwrap_or("Dildin Build Control");
    let version = tauri_config
        .get("version")
        .and_then(|value| value.as_str())
        .unwrap_or("0.0.0")
        .to_string();
    let identifier = tauri_config
        .get("identifier")
        .and_then(|value| value.as_str())
        .unwrap_or("unknown");
    let icons = tauri_config
        .get("bundle")
        .and_then(|value| value.get("icon"))
        .and_then(|value| value.as_array())
        .map(|items| {
            items
                .iter()
                .filter_map(|value| value.as_str())
                .map(|value| value.to_string())
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    let release_dir = project.join(".dbc").join("release");
    fs::create_dir_all(&release_dir).map_err(|err| err.to_string())?;
    let generated_at = unix_millis().to_string();
    let app_path = project
        .join("src-tauri")
        .join("target")
        .join("release")
        .join("bundle")
        .join("macos")
        .join(format!("{product_name}.app"));
    let dmg_path = project
        .join("src-tauri")
        .join("target")
        .join("release")
        .join("bundle")
        .join("dmg")
        .join(format!("{product_name}_{version}_aarch64.dmg"));
    let binary_path = project
        .join("src-tauri")
        .join("target")
        .join("release")
        .join("dildin-build-control");
    let dmg_checksum = stable_file_checksum(&dmg_path).unwrap_or_default();
    let binary_checksum = stable_file_checksum(&binary_path).unwrap_or_default();
    let json_path = release_dir.join("latest.json");
    let markdown_path = release_dir.join("latest.md");
    let json_content = serde_json::to_string_pretty(&serde_json::json!({
        "version": 1,
        "kind": "release-package",
        "generatedAt": generated_at,
        "productName": product_name,
        "appVersion": version.clone(),
        "identifier": identifier,
        "paths": {
            "app": app_path.display().to_string(),
            "dmg": dmg_path.display().to_string(),
            "binary": binary_path.display().to_string(),
        },
        "checksums": {
            "dmg": dmg_checksum.clone(),
            "binary": binary_checksum.clone(),
        },
        "icons": icons.clone(),
        "checklist": {
            "appExists": app_path.exists(),
            "dmgExists": dmg_path.exists(),
            "binaryExists": binary_path.exists(),
            "iconsConfigured": !icons.is_empty(),
            "identifierPresent": identifier != "unknown",
            "versionPresent": version != "0.0.0",
            "dmgChecksumPresent": !dmg_checksum.is_empty(),
        },
    }))
    .map_err(|err| err.to_string())?;
    let markdown_content = format!(
        "# Release Package\n\nProduct: {product_name}\nVersion: {version}\nIdentifier: {identifier}\nGenerated: {generated_at}\n\n## Artifacts\n\n- App: {}\n- DMG: {}\n- Binary: {}\n\n## Checksums\n\n- DMG: {}\n- Binary: {}\n\n## Checklist\n\n- app exists: {}\n- dmg exists: {}\n- binary exists: {}\n- icons configured: {}\n- identifier present: {}\n- version present: {}\n- dmg checksum present: {}\n\n## Notes\n\nThis package records local build artifacts only. Signing, notarization, publishing, and update distribution remain manual approval-gated steps.\n",
        app_path.display(),
        dmg_path.display(),
        binary_path.display(),
        dmg_checksum,
        binary_checksum,
        app_path.exists(),
        dmg_path.exists(),
        binary_path.exists(),
        !icons.is_empty(),
        identifier != "unknown",
        version != "0.0.0",
        !dmg_checksum.is_empty()
    );
    fs::write(&json_path, json_content).map_err(|err| err.to_string())?;
    fs::write(&markdown_path, markdown_content).map_err(|err| err.to_string())?;

    Ok(ReleasePackageResult {
        json_path: json_path.display().to_string(),
        markdown_path: markdown_path.display().to_string(),
        version,
        dmg_path: dmg_path.display().to_string(),
        dmg_checksum,
        app_path: app_path.display().to_string(),
        binary_path: binary_path.display().to_string(),
        generated_at,
    })
}

#[tauri::command]
fn generate_operator_checklist(
    request: ReleasePackageRequest,
) -> Result<OperatorChecklistResult, String> {
    let project = PathBuf::from(&request.project_path);
    let dbc_dir = project.join(".dbc");
    let operator_dir = dbc_dir.join("operator");
    fs::create_dir_all(&operator_dir).map_err(|err| err.to_string())?;

    let providers_path = dbc_dir.join("providers.yaml");
    let mock_profile_path = dbc_dir.join("providers.mock.yaml");
    let real_micro_profile_path = dbc_dir.join("providers.real-micro.yaml");
    let readiness_path = dbc_dir.join("readiness").join("latest.json");
    let real_plan_path = dbc_dir.join("real-loop").join("latest.json");
    let comparison_path = dbc_dir.join("compare").join("latest.json");
    let release_path = dbc_dir.join("release").join("latest.json");
    let approval_path = operator_dir.join("approval.json");

    let generated_at = unix_millis().to_string();
    let readiness = read_json_optional(&readiness_path);
    let real_plan = read_json_optional(&real_plan_path);
    let comparison = read_json_optional(&comparison_path);
    let release = read_json_optional(&release_path);
    let providers_doc = read_yaml_optional(&providers_path);
    let providers = providers_doc
        .as_ref()
        .and_then(|value| value.get("providers"))
        .and_then(|value| value.as_array())
        .cloned()
        .unwrap_or_default();

    let mut checks: Vec<serde_json::Value> = Vec::new();
    let mut blockers: Vec<serde_json::Value> = Vec::new();
    let mut warnings: Vec<serde_json::Value> = Vec::new();

    operator_check_file("providers", &providers_path, &mut checks, &mut blockers);
    operator_check_file(
        "mock provider profile",
        &mock_profile_path,
        &mut checks,
        &mut blockers,
    );
    operator_check_file(
        "real micro provider profile",
        &real_micro_profile_path,
        &mut checks,
        &mut blockers,
    );
    operator_check_readiness(&readiness, &mut checks, &mut blockers, &mut warnings);
    operator_check_real_plan(&real_plan, &mut checks, &mut blockers);
    operator_check_comparison(&comparison, &mut checks, &mut blockers, &mut warnings);
    operator_check_release(&release, &mut checks, &mut blockers);
    operator_check_providers(&providers, &mut checks, &mut blockers);

    let active_real_providers: Vec<serde_json::Value> = providers
        .iter()
        .filter(|provider| {
            provider_string(provider, "type") == "cli"
                && provider_string(provider, "runMode") == "real"
        })
        .map(operator_provider_summary)
        .collect();
    let active_mock_cli_providers: Vec<serde_json::Value> = providers
        .iter()
        .filter(|provider| {
            provider_string(provider, "type") == "cli"
                && provider_string(provider, "runMode") != "real"
        })
        .map(operator_provider_summary)
        .collect();
    let task_id = real_plan
        .as_ref()
        .and_then(|value| value.get("task"))
        .and_then(|value| value.get("id"))
        .and_then(|value| value.as_str())
        .unwrap_or("REAL-MICRO-README")
        .to_string();
    let task_title = real_plan
        .as_ref()
        .and_then(|value| value.get("task"))
        .and_then(|value| value.get("title"))
        .and_then(|value| value.as_str())
        .unwrap_or("Real micro loop")
        .to_string();
    let task_path = real_plan
        .as_ref()
        .and_then(|value| value.get("taskPath"))
        .and_then(|value| value.as_str())
        .map(|value| value.to_string())
        .unwrap_or_else(|| {
            dbc_dir
                .join("tasks")
                .join(format!("{task_id}.json"))
                .display()
                .to_string()
        });
    let task_budget_limit = real_plan
        .as_ref()
        .and_then(|value| value.get("task"))
        .and_then(|value| value.get("budgetLimit"))
        .and_then(|value| value.as_f64())
        .unwrap_or(0.0);
    let task_real_cli_limit = real_provider_call_limit(task_budget_limit);
    let approval = read_json_optional(&approval_path);

    let base_status = if !blockers.is_empty() {
        "blocked".to_string()
    } else if !active_real_providers.is_empty() {
        "real_profile_already_active".to_string()
    } else {
        "ready_to_start_real_micro".to_string()
    };
    let approved = operator_approval_matches(&approval, &generated_at, &task_id, task_budget_limit);
    let approval_status = if approved {
        "approved"
    } else {
        "missing_or_stale"
    }
    .to_string();
    let status = if base_status == "ready_to_start_real_micro" && !approved {
        "awaiting_human_approval".to_string()
    } else {
        base_status
    };
    let next_action = if status == "blocked" {
        "Fix blockers, rerun readiness and plan checks, then generate this checklist again."
            .to_string()
    } else if status == "real_profile_already_active" {
        "Real providers are already active. Run only the staged micro task or revert with Settings -> Apply mock."
            .to_string()
    } else if status == "awaiting_human_approval" {
        "Review this checklist, then click Approve operator gate before applying real micro mode."
            .to_string()
    } else {
        "Review this checklist, then use Settings -> Apply real micro or run pnpm providers:apply-real-micro and load .dbc config."
            .to_string()
    };

    let human_confirmations = vec![
        "I accept that the real micro loop may spend Codex and Claude model tokens.",
        "I confirm the task is limited to README.md and generated .dbc artifacts.",
        "I confirm the task budgetLimit allows bounded real CLI provider calls.",
        "I confirm no publish, push, install, sudo, destructive git, or secret access is allowed.",
        "I will revert providers to mock mode after the real micro loop finishes or blocks.",
    ];
    let stop_conditions = vec![
        "Provider asks to edit outside README.md or .dbc.",
        "Command policy returns approval_required or deny.",
        "Secret-like content is detected in prompt/output.",
        "Build fails.",
        "Claude review returns request_changes or fail.",
    ];
    let steps = vec![
        serde_json::json!({
            "id": "provider-status",
            "title": "Confirm the active provider profile",
            "command": "pnpm providers:status",
            "expectedEvidence": "Codex CLI and Claude Code are still mock before the intentional switch.",
            "stopIf": "A real provider is active before the human confirms token spend."
        }),
        serde_json::json!({
            "id": "review-reports",
            "title": "Review readiness, plan, comparison, and release evidence",
            "files": [
                readiness_path.display().to_string(),
                real_plan_path.display().to_string(),
                comparison_path.display().to_string(),
                release_path.display().to_string()
            ],
            "expectedEvidence": "No blockers; warnings are understood by the operator.",
            "stopIf": "Any report is missing, blocked, or refers to a stale task/release."
        }),
        serde_json::json!({
            "id": "apply-real-profile",
            "title": "Apply the real micro provider profile",
            "ui": "Settings -> Apply real micro",
            "command": "pnpm providers:apply-real-micro",
            "expectedEvidence": ".dbc/providers.yaml switches codex_cli, claude_code, and local_terminal to real.",
            "stopIf": "The command fails or switches unexpected providers."
        }),
        serde_json::json!({
            "id": "reload-config",
            "title": "Reload provider config in the app",
            "ui": "Settings -> Load .dbc config",
            "expectedEvidence": "Provider cards show exact paths and real run mode for Codex and Claude.",
            "stopIf": "Codex or Claude exact path/contract diagnostics fail."
        }),
        serde_json::json!({
            "id": "start-task",
            "title": "Run only the staged real micro task",
            "ui": format!("Tasks -> {task_id} -> Preflight -> Run"),
            "expectedEvidence": "The loop creates a new manifest, evidence files, reports, git baseline, git workspace, diff artifacts, and security report.",
            "stopIf": "The active task is not REAL-MICRO-README or Preflight shows an error gate."
        }),
        serde_json::json!({
            "id": "compare",
            "title": "Compare real evidence against the controlled baseline",
            "command": "pnpm compare-real-micro",
            "expectedEvidence": ".dbc/compare/latest.json status is pass or pass_with_warnings.",
            "stopIf": "The comparator reports blockers."
        }),
        serde_json::json!({
            "id": "revert-profile",
            "title": "Revert providers to mock mode",
            "ui": "Settings -> Apply mock",
            "command": "pnpm providers:apply-mock",
            "expectedEvidence": ".dbc/providers.yaml returns CLI providers to mock mode.",
            "stopIf": "Revert fails; do not start broader loops until fixed."
        }),
    ];

    let report = serde_json::json!({
        "version": 1,
        "kind": "operator-checklist",
        "generatedAt": generated_at,
        "projectPath": project.display().to_string(),
        "status": status,
        "blockers": blockers,
        "warnings": warnings,
        "checks": checks,
        "task": {
            "id": task_id,
            "title": task_title,
            "path": task_path,
            "budgetLimit": task_budget_limit
        },
        "budget": {
            "budgetLimit": task_budget_limit,
            "realCliCallLimit": task_real_cli_limit,
            "rule": "Each budget unit allows up to 4 real CLI provider calls. Local runner steps are not counted."
        },
        "backendGate": {
            "realCliRequiresOperatorChecklist": true,
            "realCliRequiresHumanApproval": true,
            "realCliRequiresPositiveBudget": true,
            "taskIdMustMatch": task_id,
            "budgetLimitMustMatch": task_budget_limit
        },
        "approval": {
            "status": approval_status,
            "path": approval_path.display().to_string(),
            "approved": approved
        },
        "providerState": {
            "activeRealProviders": active_real_providers,
            "activeMockCliProviders": active_mock_cli_providers,
            "intendedRealMicroProviders": ["codex_cli", "claude_code", "local_terminal"],
            "activeProfilePath": providers_path.display().to_string(),
            "mockProfilePath": mock_profile_path.display().to_string(),
            "realMicroProfilePath": real_micro_profile_path.display().to_string()
        },
        "humanConfirmations": human_confirmations,
        "steps": steps,
        "stopConditions": stop_conditions,
        "rollback": [
            {
                "id": "rollback-profile",
                "ui": "Settings -> Apply mock",
                "command": "pnpm providers:apply-mock",
                "expectedEvidence": ".dbc/providers.yaml has mock runMode for CLI providers."
            },
            {
                "id": "reload-config",
                "ui": "Settings -> Load .dbc config",
                "expectedEvidence": "Provider cards show mock run mode again."
            }
        ],
        "refs": {
            "providers": providers_path.display().to_string(),
            "mockProfile": mock_profile_path.display().to_string(),
            "realMicroProfile": real_micro_profile_path.display().to_string(),
            "readiness": readiness_path.display().to_string(),
            "realPlan": real_plan_path.display().to_string(),
            "comparison": comparison_path.display().to_string(),
            "release": release_path.display().to_string()
        },
        "release": {
            "dmgChecksum": release.as_ref().and_then(|value| value.get("checksums")).and_then(|value| value.get("dmg")).and_then(|value| value.as_str()).unwrap_or(""),
            "binaryChecksum": release.as_ref().and_then(|value| value.get("checksums")).and_then(|value| value.get("binary")).and_then(|value| value.as_str()).unwrap_or(""),
            "dmgPath": release.as_ref().and_then(|value| value.get("paths")).and_then(|value| value.get("dmg")).and_then(|value| value.as_str()).unwrap_or("")
        },
        "nextAction": next_action
    });

    let json_path = operator_dir.join("latest.json");
    let markdown_path = operator_dir.join("latest.md");
    let json_content = serde_json::to_string_pretty(&report).map_err(|err| err.to_string())?;
    fs::write(&json_path, format!("{json_content}\n")).map_err(|err| err.to_string())?;
    fs::write(&markdown_path, operator_checklist_markdown(&report))
        .map_err(|err| err.to_string())?;

    Ok(OperatorChecklistResult {
        json_path: json_path.display().to_string(),
        markdown_path: markdown_path.display().to_string(),
        status: report
            .get("status")
            .and_then(|value| value.as_str())
            .unwrap_or("blocked")
            .to_string(),
        blockers: report
            .get("blockers")
            .and_then(|value| value.as_array())
            .map(|value| value.len())
            .unwrap_or(0),
        warnings: report
            .get("warnings")
            .and_then(|value| value.as_array())
            .map(|value| value.len())
            .unwrap_or(0),
        next_action: report
            .get("nextAction")
            .and_then(|value| value.as_str())
            .unwrap_or("")
            .to_string(),
        generated_at,
        approval_path: approval_path.display().to_string(),
        approval_status: report
            .get("approval")
            .and_then(|value| value.get("status"))
            .and_then(|value| value.as_str())
            .unwrap_or("missing_or_stale")
            .to_string(),
    })
}

#[tauri::command]
fn approve_operator_gate(
    request: ReleasePackageRequest,
) -> Result<OperatorChecklistResult, String> {
    let project = PathBuf::from(&request.project_path);
    let operator_dir = project.join(".dbc").join("operator");
    let checklist_path = operator_dir.join("latest.json");
    let markdown_path = operator_dir.join("latest.md");
    let approval_path = operator_dir.join("approval.json");
    let mut checklist = read_json_optional(&checklist_path).ok_or_else(|| {
        format!(
            "Operator checklist is missing: {}",
            checklist_path.display()
        )
    })?;

    if json_array_len(&checklist, "blockers") > 0 {
        return Err("Cannot approve operator gate while checklist has blockers.".to_string());
    }

    let status = checklist
        .get("status")
        .and_then(|value| value.as_str())
        .unwrap_or("");
    if status == "blocked" {
        return Err("Cannot approve a blocked operator checklist.".to_string());
    }

    let checklist_generated_at = checklist
        .get("generatedAt")
        .and_then(|value| value.as_str())
        .unwrap_or("")
        .to_string();
    let task_id = checklist
        .get("task")
        .and_then(|value| value.get("id"))
        .and_then(|value| value.as_str())
        .unwrap_or("")
        .to_string();
    let budget_limit = checklist
        .get("budget")
        .and_then(|value| value.get("budgetLimit"))
        .and_then(|value| value.as_f64())
        .unwrap_or(0.0);
    let approved_at = unix_millis().to_string();
    let approval = serde_json::json!({
        "version": 1,
        "kind": "operator-approval",
        "approved": true,
        "approvedAt": approved_at,
        "approvedBy": "local-operator",
        "projectPath": project.display().to_string(),
        "checklistPath": checklist_path.display().to_string(),
        "checklistGeneratedAt": checklist_generated_at,
        "taskId": task_id,
        "budgetLimit": budget_limit,
        "realCliCallLimit": real_provider_call_limit(budget_limit),
        "confirmations": checklist
            .get("humanConfirmations")
            .cloned()
            .unwrap_or_else(|| serde_json::Value::Array(Vec::new()))
    });
    fs::create_dir_all(&operator_dir).map_err(|err| err.to_string())?;
    fs::write(
        &approval_path,
        format!(
            "{}\n",
            serde_json::to_string_pretty(&approval).map_err(|err| err.to_string())?
        ),
    )
    .map_err(|err| err.to_string())?;
    write_approval_decision(
        &project,
        "REAL-MICRO-HUMAN-GATE",
        "Approve real micro loop gate",
        &approval,
        &checklist_path,
    )?;
    write_approval_decision(
        &project,
        "APPLY-REAL-MICRO-PROFILE",
        "Switch selected providers to real micro profile",
        &approval,
        &checklist_path,
    )?;
    write_approval_decision(
        &project,
        "RUN-REAL-MICRO-TASK",
        "Run REAL-MICRO-README through Preflight",
        &approval,
        &checklist_path,
    )?;

    if let Some(object) = checklist.as_object_mut() {
        object.insert(
            "status".to_string(),
            serde_json::Value::String("ready_to_start_real_micro".to_string()),
        );
        object.insert(
            "nextAction".to_string(),
            serde_json::Value::String(
                "Apply real micro mode, then run only REAL-MICRO-README through Preflight."
                    .to_string(),
            ),
        );
        object.insert(
            "approval".to_string(),
            serde_json::json!({
                "status": "approved",
                "path": approval_path.display().to_string(),
                "approved": true,
                "approvedAt": approved_at
            }),
        );
    }

    fs::write(
        &checklist_path,
        format!(
            "{}\n",
            serde_json::to_string_pretty(&checklist).map_err(|err| err.to_string())?
        ),
    )
    .map_err(|err| err.to_string())?;
    fs::write(&markdown_path, operator_checklist_markdown(&checklist))
        .map_err(|err| err.to_string())?;

    Ok(OperatorChecklistResult {
        json_path: checklist_path.display().to_string(),
        markdown_path: markdown_path.display().to_string(),
        status: checklist
            .get("status")
            .and_then(|value| value.as_str())
            .unwrap_or("ready_to_start_real_micro")
            .to_string(),
        blockers: json_array_len(&checklist, "blockers"),
        warnings: json_array_len(&checklist, "warnings"),
        next_action: checklist
            .get("nextAction")
            .and_then(|value| value.as_str())
            .unwrap_or("")
            .to_string(),
        generated_at: checklist_generated_at,
        approval_path: approval_path.display().to_string(),
        approval_status: "approved".to_string(),
    })
}

#[tauri::command]
fn load_operator_checklist_report(project_path: String) -> Result<OperatorChecklistResult, String> {
    let project = PathBuf::from(&project_path);
    let checklist_path = project.join(".dbc").join("operator").join("latest.json");
    let markdown_path = project.join(".dbc").join("operator").join("latest.md");
    let checklist = read_json_optional(&checklist_path).ok_or_else(|| {
        format!(
            "Operator checklist is missing: {}",
            checklist_path.display()
        )
    })?;
    let approval_path = checklist
        .get("approval")
        .and_then(|value| value.get("path"))
        .and_then(|value| value.as_str())
        .map(|value| value.to_string())
        .unwrap_or_else(|| {
            project
                .join(".dbc")
                .join("operator")
                .join("approval.json")
                .display()
                .to_string()
        });

    Ok(OperatorChecklistResult {
        json_path: checklist_path.display().to_string(),
        markdown_path: markdown_path.display().to_string(),
        status: checklist
            .get("status")
            .and_then(|value| value.as_str())
            .unwrap_or("missing")
            .to_string(),
        blockers: json_array_len(&checklist, "blockers"),
        warnings: json_array_len(&checklist, "warnings"),
        next_action: checklist
            .get("nextAction")
            .and_then(|value| value.as_str())
            .unwrap_or("")
            .to_string(),
        generated_at: checklist
            .get("generatedAt")
            .and_then(|value| value.as_str())
            .unwrap_or("")
            .to_string(),
        approval_path,
        approval_status: checklist
            .get("approval")
            .and_then(|value| value.get("status"))
            .and_then(|value| value.as_str())
            .unwrap_or("missing_or_stale")
            .to_string(),
    })
}

#[tauri::command]
fn generate_real_micro_preflight_report(
    request: ReleasePackageRequest,
) -> Result<serde_json::Value, String> {
    let project = PathBuf::from(&request.project_path);
    let dbc_dir = project.join(".dbc");
    let output_dir = dbc_dir.join("preflight");
    fs::create_dir_all(&output_dir).map_err(|err| err.to_string())?;

    let task_path = dbc_dir.join("tasks").join("REAL-MICRO-README.json");
    let operator_path = dbc_dir.join("operator").join("latest.json");
    let operator_approval_path = dbc_dir.join("operator").join("approval.json");
    let approval_ledger_path = dbc_dir.join("approvals").join("latest.json");
    let provider_contracts_path = dbc_dir.join("provider-contracts").join("latest.json");
    let readiness_path = dbc_dir.join("readiness").join("latest.json");
    let real_plan_path = dbc_dir.join("real-loop").join("latest.json");
    let comparison_path = dbc_dir.join("compare").join("latest.json");
    let revert_path = dbc_dir.join("revert").join("latest.json");
    let providers_path = dbc_dir.join("providers.yaml");
    let real_profile_path = dbc_dir.join("providers.real-micro.yaml");
    let mock_profile_path = dbc_dir.join("providers.mock.yaml");
    let required_decisions = vec![
        "REAL-MICRO-HUMAN-GATE".to_string(),
        "APPLY-REAL-MICRO-PROFILE".to_string(),
        "RUN-REAL-MICRO-TASK".to_string(),
    ];
    let intended_real_providers = vec![
        "codex_cli".to_string(),
        "claude_code".to_string(),
        "local_terminal".to_string(),
    ];

    let task = read_json_optional(&task_path);
    let operator = read_json_optional(&operator_path);
    let operator_approval = read_json_optional(&operator_approval_path);
    let ledger = read_json_optional(&approval_ledger_path);
    let contracts = read_json_optional(&provider_contracts_path);
    let readiness = read_json_optional(&readiness_path);
    let real_plan = read_json_optional(&real_plan_path);
    let comparison = read_json_optional(&comparison_path);
    let revert = read_json_optional(&revert_path);
    let providers_doc = read_yaml_optional(&providers_path);
    let providers = providers_doc
        .as_ref()
        .and_then(|value| value.get("providers"))
        .and_then(|value| value.as_array())
        .cloned()
        .unwrap_or_default();

    let mut checks: Vec<serde_json::Value> = Vec::new();
    let mut blockers: Vec<serde_json::Value> = Vec::new();
    let mut warnings: Vec<serde_json::Value> = Vec::new();

    preflight_check_file("task", &task_path, &mut checks, &mut blockers);
    preflight_check_file(
        "operator checklist",
        &operator_path,
        &mut checks,
        &mut blockers,
    );
    preflight_check_file(
        "approval ledger",
        &approval_ledger_path,
        &mut checks,
        &mut blockers,
    );
    preflight_check_file(
        "provider contracts",
        &provider_contracts_path,
        &mut checks,
        &mut blockers,
    );
    preflight_check_file("readiness", &readiness_path, &mut checks, &mut blockers);
    preflight_check_file("real plan", &real_plan_path, &mut checks, &mut blockers);
    preflight_check_file("comparison", &comparison_path, &mut checks, &mut blockers);
    preflight_check_file("revert evidence", &revert_path, &mut checks, &mut blockers);
    preflight_check_file("providers", &providers_path, &mut checks, &mut blockers);
    preflight_check_file(
        "real profile",
        &real_profile_path,
        &mut checks,
        &mut blockers,
    );
    preflight_check_file(
        "mock profile",
        &mock_profile_path,
        &mut checks,
        &mut blockers,
    );

    preflight_check_task(&task, &mut checks, &mut blockers, &mut warnings);
    preflight_check_operator(
        &operator,
        &operator_approval,
        &mut checks,
        &mut blockers,
        &mut warnings,
    );
    preflight_check_ledger(
        &dbc_dir,
        &ledger,
        &required_decisions,
        &mut checks,
        &mut blockers,
        &mut warnings,
    );
    preflight_check_artifact(
        "provider contracts",
        &contracts,
        "provider-contracts",
        &mut checks,
        &mut blockers,
        &mut warnings,
    );
    preflight_check_artifact(
        "readiness",
        &readiness,
        "",
        &mut checks,
        &mut blockers,
        &mut warnings,
    );
    preflight_check_real_plan(&real_plan, &mut checks, &mut blockers);
    preflight_check_comparison(&comparison, &mut checks, &mut blockers);
    preflight_check_revert(&revert, &mut checks, &mut blockers);
    preflight_check_providers(
        &providers,
        &intended_real_providers,
        &mut checks,
        &mut blockers,
        &mut warnings,
    );

    let mut approved_decisions = serde_json::Map::new();
    for id in &required_decisions {
        approved_decisions.insert(
            id.clone(),
            serde_json::Value::Bool(approval_decision_is_approved(&dbc_dir, id)),
        );
    }
    let approvals_ready = required_decisions.iter().all(|id| {
        approved_decisions
            .get(id)
            .and_then(|value| value.as_bool())
            .unwrap_or(false)
    });
    let active_real_provider_ids: Vec<String> = providers
        .iter()
        .filter(|provider| {
            intended_real_providers.contains(&provider_string(provider, "id"))
                && provider_string(provider, "runMode") == "real"
        })
        .map(|provider| provider_string(provider, "id"))
        .collect();
    let profile_ready = intended_real_providers
        .iter()
        .all(|id| active_real_provider_ids.contains(id));
    let any_real_provider = providers
        .iter()
        .any(|provider| provider_string(provider, "runMode") == "real");
    let terminal_handoff_provider_ids: Vec<String> = providers
        .iter()
        .filter(|provider| {
            intended_real_providers.contains(&provider_string(provider, "id"))
                && provider_string(provider, "runMode") == "real"
                && provider_string(provider, "promptMode") == "terminal"
        })
        .map(|provider| provider_string(provider, "id"))
        .collect();
    if any_real_provider && !approvals_ready {
        operator_fail(
            &mut blockers,
            &mut checks,
            "real profile safety",
            "A real provider is active before all required approval decisions are approved.",
        );
    }
    if !terminal_handoff_provider_ids.is_empty() {
        operator_warn(
            &mut warnings,
            &mut checks,
            "terminal handoff",
            &format!(
                "Provider(s) {} require a human-operated terminal; DBC will stop before non-interactive execution.",
                terminal_handoff_provider_ids.join(", ")
            ),
        );
    }

    let status = if !blockers.is_empty() {
        "blocked"
    } else if !approvals_ready {
        "awaiting_human_approval"
    } else if !profile_ready {
        "ready_to_apply_real_profile"
    } else {
        "ready_to_run"
    };
    let next_action = if status == "blocked" {
        "Fix blockers, rerun launch doctor, then regenerate this dry-run preflight."
    } else if status == "awaiting_human_approval" {
        "Review and approve the Operator Gate before applying real micro mode."
    } else if status == "ready_to_apply_real_profile" {
        "Apply the real micro provider profile, reload project config, then open Preflight for REAL-MICRO-README."
    } else {
        "Open Preflight and run only REAL-MICRO-README."
    };

    let report = serde_json::json!({
        "version": 1,
        "kind": "real-micro-preflight",
        "generatedAt": unix_millis().to_string(),
        "projectPath": project.display().to_string(),
        "status": status,
        "blockers": blockers,
        "warnings": warnings,
        "checks": checks,
        "approvals": {
            "required": required_decisions,
            "approved": serde_json::Value::Object(approved_decisions),
            "ready": approvals_ready
        },
        "profile": {
            "intendedRealProviders": intended_real_providers,
            "activeRealProviderIds": active_real_provider_ids,
            "ready": profile_ready
        },
        "terminalHandoff": {
            "required": !terminal_handoff_provider_ids.is_empty(),
            "providerIds": terminal_handoff_provider_ids,
            "surface": "human_operated_terminal"
        },
        "task": {
            "id": task.as_ref().and_then(|value| value.get("id")).and_then(|value| value.as_str()).unwrap_or(""),
            "budgetLimit": task.as_ref().and_then(|value| value.get("budgetLimit")).and_then(|value| value.as_f64()).unwrap_or(0.0),
            "loopProfile": task.as_ref().and_then(|value| value.get("loopProfile")).and_then(|value| value.as_str()).unwrap_or(""),
            "providerStrategy": task.as_ref().and_then(|value| value.get("providerStrategy")).and_then(|value| value.as_str()).unwrap_or(""),
            "allowedPaths": task.as_ref().and_then(|value| value.get("allowedPaths")).cloned().unwrap_or_else(|| serde_json::Value::Array(Vec::new())),
            "deniedPaths": task.as_ref().and_then(|value| value.get("deniedPaths")).cloned().unwrap_or_else(|| serde_json::Value::Array(Vec::new()))
        },
        "refs": {
            "task": task_path.display().to_string(),
            "operator": operator_path.display().to_string(),
            "operatorApproval": operator_approval_path.display().to_string(),
            "approvalLedger": approval_ledger_path.display().to_string(),
            "providerContracts": provider_contracts_path.display().to_string(),
            "readiness": readiness_path.display().to_string(),
            "realPlan": real_plan_path.display().to_string(),
            "comparison": comparison_path.display().to_string(),
            "revert": revert_path.display().to_string(),
            "providers": providers_path.display().to_string(),
            "realProfile": real_profile_path.display().to_string(),
            "mockProfile": mock_profile_path.display().to_string()
        },
        "nextAction": next_action
    });

    let json_path = output_dir.join("latest.json");
    let markdown_path = output_dir.join("latest.md");
    fs::write(
        &json_path,
        format!(
            "{}\n",
            serde_json::to_string_pretty(&report).map_err(|err| err.to_string())?
        ),
    )
    .map_err(|err| err.to_string())?;
    fs::write(&markdown_path, real_micro_preflight_markdown(&report))
        .map_err(|err| err.to_string())?;
    Ok(report)
}

#[tauri::command]
fn generate_real_micro_runbook_report(
    request: ReleasePackageRequest,
) -> Result<serde_json::Value, String> {
    let project = PathBuf::from(&request.project_path);
    let dbc_dir = project.join(".dbc");
    let runbook_dir = dbc_dir.join("runbook");
    let policy_dir = dbc_dir.join("policy");
    fs::create_dir_all(&runbook_dir).map_err(|err| err.to_string())?;
    fs::create_dir_all(&policy_dir).map_err(|err| err.to_string())?;

    let task_path = dbc_dir.join("tasks").join("REAL-MICRO-README.json");
    let readiness_path = dbc_dir.join("readiness").join("latest.json");
    let real_plan_path = dbc_dir.join("real-loop").join("latest.json");
    let operator_path = dbc_dir.join("operator").join("latest.json");
    let operator_approval_path = dbc_dir.join("operator").join("approval.json");
    let approval_ledger_path = dbc_dir.join("approvals").join("latest.json");
    let preflight_path = dbc_dir.join("preflight").join("latest.json");
    let provider_contracts_path = dbc_dir.join("provider-contracts").join("latest.json");
    let revert_path = dbc_dir.join("revert").join("latest.json");
    let providers_path = dbc_dir.join("providers.yaml");
    let real_profile_path = dbc_dir.join("providers.real-micro.yaml");
    let mock_profile_path = dbc_dir.join("providers.mock.yaml");
    let surfaces_policy_path = policy_dir.join("surfaces.md");

    let task = read_json_optional(&task_path);
    let readiness = read_json_optional(&readiness_path);
    let real_plan = read_json_optional(&real_plan_path);
    let operator = read_json_optional(&operator_path);
    let operator_approval = read_json_optional(&operator_approval_path);
    let approval_ledger = read_json_optional(&approval_ledger_path);
    let preflight = read_json_optional(&preflight_path);
    let provider_contracts = read_json_optional(&provider_contracts_path);
    let revert = read_json_optional(&revert_path);
    let providers_doc = read_yaml_optional(&providers_path);
    let providers = providers_doc
        .as_ref()
        .and_then(|value| value.get("providers"))
        .and_then(|value| value.as_array())
        .cloned()
        .unwrap_or_default();

    let mut checks: Vec<serde_json::Value> = Vec::new();
    let mut blockers: Vec<serde_json::Value> = Vec::new();
    let mut warnings: Vec<serde_json::Value> = Vec::new();

    preflight_check_file("task", &task_path, &mut checks, &mut blockers);
    preflight_check_file("readiness", &readiness_path, &mut checks, &mut blockers);
    preflight_check_file(
        "real micro plan",
        &real_plan_path,
        &mut checks,
        &mut blockers,
    );
    preflight_check_file(
        "operator checklist",
        &operator_path,
        &mut checks,
        &mut blockers,
    );
    preflight_check_file(
        "approval ledger",
        &approval_ledger_path,
        &mut checks,
        &mut blockers,
    );
    preflight_check_file(
        "real micro preflight",
        &preflight_path,
        &mut checks,
        &mut blockers,
    );
    preflight_check_file(
        "provider contracts",
        &provider_contracts_path,
        &mut checks,
        &mut blockers,
    );
    preflight_check_file("revert evidence", &revert_path, &mut checks, &mut blockers);
    preflight_check_file("providers", &providers_path, &mut checks, &mut blockers);
    preflight_check_file(
        "real provider profile",
        &real_profile_path,
        &mut checks,
        &mut blockers,
    );
    preflight_check_file(
        "mock provider profile",
        &mock_profile_path,
        &mut checks,
        &mut blockers,
    );

    preflight_check_task(&task, &mut checks, &mut blockers, &mut warnings);
    preflight_check_real_plan(&real_plan, &mut checks, &mut blockers);
    runbook_check_preflight(&preflight, &mut checks, &mut blockers, &mut warnings);
    preflight_check_operator(
        &operator,
        &operator_approval,
        &mut checks,
        &mut blockers,
        &mut warnings,
    );
    let required_decisions = vec![
        "REAL-MICRO-HUMAN-GATE".to_string(),
        "APPLY-REAL-MICRO-PROFILE".to_string(),
        "RUN-REAL-MICRO-TASK".to_string(),
    ];
    preflight_check_ledger(
        &dbc_dir,
        &approval_ledger,
        &required_decisions,
        &mut checks,
        &mut blockers,
        &mut warnings,
    );
    preflight_check_artifact(
        "readiness",
        &readiness,
        "",
        &mut checks,
        &mut blockers,
        &mut warnings,
    );
    preflight_check_artifact(
        "provider contracts",
        &provider_contracts,
        "provider-contracts",
        &mut checks,
        &mut blockers,
        &mut warnings,
    );
    preflight_check_revert(&revert, &mut checks, &mut blockers);
    runbook_check_providers(&providers, &mut checks, &mut blockers);

    let active_real_providers = providers
        .iter()
        .filter(|provider| provider_string(provider, "runMode") == "real")
        .map(|provider| provider_string(provider, "id"))
        .filter(|value| !value.is_empty())
        .collect::<Vec<_>>();
    let preflight_status = preflight
        .as_ref()
        .map(|value| json_str(value, "status"))
        .unwrap_or_else(|| "missing".to_string());
    let status = if !blockers.is_empty() {
        "blocked"
    } else if preflight_status == "ready_to_run" {
        "ready_to_run"
    } else if preflight_status == "ready_to_apply_real_profile" {
        "ready_to_apply_real_profile"
    } else {
        "awaiting_human_approval"
    };
    let next_action = if status == "blocked" {
        "Fix runbook blockers, rerun launch doctor, then regenerate this runbook."
    } else if status == "awaiting_human_approval" {
        "Review operator checklist and approve the human gate before applying real micro mode."
    } else if status == "ready_to_apply_real_profile" {
        "Apply the real micro provider profile, reload .dbc config, then regenerate preflight."
    } else {
        "Run only REAL-MICRO-README through the approved real micro flow."
    };

    let report = serde_json::json!({
        "version": 1,
        "kind": "real-micro-runbook",
        "generatedAt": unix_millis().to_string(),
        "projectPath": project.display().to_string(),
        "status": status,
        "blockers": blockers,
        "warnings": warnings,
        "checks": checks,
        "surfaces": real_micro_runbook_surfaces(),
        "sequence": real_micro_runbook_sequence(),
        "manualCommands": real_micro_runbook_manual_commands(),
        "gates": {
            "taskId": task.as_ref().map(|value| json_str(value, "id")).unwrap_or_default(),
            "budgetLimit": task.as_ref().and_then(|value| value.get("budgetLimit")).and_then(|value| value.as_f64()).unwrap_or(0.0),
            "preflightStatus": preflight_status,
            "operatorStatus": operator.as_ref().map(|value| json_str(value, "status")).unwrap_or_else(|| "missing".to_string()),
            "operatorApprovalStatus": operator.as_ref()
                .and_then(|value| value.get("approval"))
                .and_then(|value| value.get("status"))
                .and_then(|value| value.as_str())
                .map(|value| value.to_string())
                .unwrap_or_else(|| if operator_approval_matches(
                    &operator_approval,
                    operator.as_ref().map(|value| json_str(value, "generatedAt")).unwrap_or_default().as_str(),
                    operator.as_ref().and_then(|value| value.get("task")).and_then(|value| value.get("id")).and_then(|value| value.as_str()).unwrap_or(""),
                    operator.as_ref().and_then(|value| value.get("budget")).and_then(|value| value.get("budgetLimit")).and_then(|value| value.as_f64()).unwrap_or(0.0)
                ) { "approved".to_string() } else { "missing_or_stale".to_string() }),
            "approvalLedgerStatus": approval_ledger.as_ref().map(|value| json_str(value, "status")).unwrap_or_else(|| "missing".to_string()),
            "pendingApprovals": approval_ledger.as_ref().and_then(|value| value.get("pending")).and_then(|value| value.as_i64()).unwrap_or(0),
            "activeRealProviders": active_real_providers
        },
        "refs": {
            "task": task_path.display().to_string(),
            "readiness": readiness_path.display().to_string(),
            "realPlan": real_plan_path.display().to_string(),
            "operator": operator_path.display().to_string(),
            "operatorApproval": operator_approval_path.display().to_string(),
            "approvalLedger": approval_ledger_path.display().to_string(),
            "preflight": preflight_path.display().to_string(),
            "providerContracts": provider_contracts_path.display().to_string(),
            "revertEvidence": revert_path.display().to_string(),
            "providers": providers_path.display().to_string(),
            "realProfile": real_profile_path.display().to_string(),
            "mockProfile": mock_profile_path.display().to_string(),
            "surfacesPolicy": surfaces_policy_path.display().to_string()
        },
        "nextAction": next_action
    });

    let json_path = runbook_dir.join("latest.json");
    let markdown_path = runbook_dir.join("latest.md");
    fs::write(&surfaces_policy_path, real_micro_surfaces_markdown(&report))
        .map_err(|err| err.to_string())?;
    fs::write(
        &json_path,
        format!(
            "{}\n",
            serde_json::to_string_pretty(&report).map_err(|err| err.to_string())?
        ),
    )
    .map_err(|err| err.to_string())?;
    fs::write(&markdown_path, real_micro_runbook_markdown(&report))
        .map_err(|err| err.to_string())?;

    Ok(report)
}

fn write_approval_decision(
    project: &Path,
    id: &str,
    action: &str,
    approval: &serde_json::Value,
    checklist_path: &Path,
) -> Result<(), String> {
    let decisions_dir = project.join(".dbc").join("approvals").join("decisions");
    fs::create_dir_all(&decisions_dir).map_err(|err| err.to_string())?;
    let decision_path = decisions_dir.join(format!("{}.json", sanitize_file_stem(id)));
    let decided_at = approval
        .get("approvedAt")
        .and_then(|value| value.as_str())
        .unwrap_or("");
    let decision = serde_json::json!({
        "version": 1,
        "kind": "approval-decision",
        "id": id,
        "decision": "approved",
        "decidedAt": decided_at,
        "note": "Approved through operator gate.",
        "operatorApprovalPath": project.join(".dbc").join("operator").join("approval.json").display().to_string(),
        "record": {
            "id": id,
            "action": action,
            "requester": "Operator Checklist",
            "risk": "high",
            "status": "pending",
            "artifactPath": checklist_path.display().to_string()
        }
    });
    fs::write(
        decision_path,
        format!(
            "{}\n",
            serde_json::to_string_pretty(&decision).map_err(|err| err.to_string())?
        ),
    )
    .map_err(|err| err.to_string())
}

#[tauri::command]
fn get_loop_run(app: tauri::AppHandle, loop_id: String) -> Result<LoopRunSnapshot, String> {
    let db_path = database_path(&app)?;
    let conn = open_db(db_path)?;
    let run = read_loop_run(&conn, &loop_id)?;
    build_loop_snapshot(&conn, run)
}

#[tauri::command]
fn list_loop_runs(
    app: tauri::AppHandle,
    project_path: String,
) -> Result<Vec<LoopRunSummary>, String> {
    let db_path = database_path(&app)?;
    let conn = open_db(db_path)?;
    let mut summaries = Vec::new();
    let mut stmt = conn
        .prepare(
            "select id, project_id, task_id, project_path, task_title, status, active_step_index, updated_at
             from loop_runs
             where project_path = ?1
             order by updated_at desc
             limit 100",
        )
        .map_err(|err| err.to_string())?;
    let rows = stmt
        .query_map(params![project_path.clone()], |row| {
            let id: String = row.get(0)?;
            let row_project_path: String = row.get(3)?;
            Ok(LoopRunSummary {
                manifest_path: loop_manifest_path(&row_project_path, &id)
                    .display()
                    .to_string(),
                report_markdown_path: loop_report_markdown_path(&row_project_path, &id)
                    .display()
                    .to_string(),
                id,
                project_id: row.get(1)?,
                task_id: row.get(2)?,
                project_path: row_project_path,
                task_title: row.get(4)?,
                status: row.get(5)?,
                active_step_index: row.get(6)?,
                source: "sqlite".to_string(),
                updated_at: row.get(7)?,
            })
        })
        .map_err(|err| err.to_string())?;
    for row in rows {
        summaries.push(row.map_err(|err| err.to_string())?);
    }

    let known = summaries
        .iter()
        .map(|summary| summary.id.clone())
        .collect::<Vec<_>>();
    let manifest_dir = PathBuf::from(&project_path).join(".dbc").join("loops");
    if manifest_dir.exists() {
        for entry in fs::read_dir(&manifest_dir).map_err(|err| err.to_string())? {
            let entry = entry.map_err(|err| err.to_string())?;
            let path = entry.path();
            if path.extension().and_then(|value| value.to_str()) != Some("json") {
                continue;
            }
            if let Ok(snapshot) = read_loop_manifest_file(&path) {
                if known.iter().any(|id| id == &snapshot.id) {
                    continue;
                }
                summaries.push(loop_summary_from_snapshot(
                    &snapshot,
                    "manifest",
                    file_modified_millis(&path),
                ));
            }
        }
    }

    summaries.sort_by(|left, right| right.updated_at.cmp(&left.updated_at));
    Ok(summaries)
}

#[tauri::command]
fn load_loop_manifest(project_path: String, loop_id: String) -> Result<LoopRunSnapshot, String> {
    let path = loop_manifest_path(&project_path, &loop_id);
    read_loop_manifest_file(&path)
}

#[tauri::command]
fn load_loop_evidence_bundle(
    project_path: String,
    loop_id: String,
) -> Result<serde_json::Value, String> {
    let mut diagnostics = Vec::<serde_json::Value>::new();
    let manifest_path = loop_manifest_path(&project_path, &loop_id);
    let loop_snapshot = match read_loop_manifest_file(&manifest_path) {
        Ok(snapshot) => {
            diagnostics.push(evidence_diag(
                "ok",
                "loop manifest",
                &manifest_path.display().to_string(),
            ));
            serde_json::to_value(snapshot).map_err(|err| err.to_string())?
        }
        Err(err) => {
            diagnostics.push(evidence_diag(
                "error",
                "loop manifest",
                &format!("{}: {err}", manifest_path.display()),
            ));
            serde_json::Value::Null
        }
    };

    let task_spec_path = loop_snapshot
        .get("task_spec_path")
        .and_then(|value| value.as_str())
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            PathBuf::from(&project_path)
                .join(".dbc")
                .join("tasks")
                .join("TASK.json")
        });
    let report_json_path = loop_report_json_path(&project_path, &loop_id);
    let report_markdown_path = loop_report_markdown_path(&project_path, &loop_id);
    let security_report_path = loop_security_report_path(&project_path, &loop_id);
    let git_workspace_path = loop_git_workspace_path(&project_path, &loop_id);
    let git_diff_path = loop_git_diff_path(&project_path, &loop_id);
    let git_diff_stat_path = loop_git_diff_stat_path(&project_path, &loop_id);
    let approval_ledger_path = PathBuf::from(&project_path)
        .join(".dbc")
        .join("approvals")
        .join("latest.json");
    let evidence_dir = PathBuf::from(&project_path)
        .join(".dbc")
        .join("evidence")
        .join(sanitize_file_stem(&loop_id));

    let task_spec = read_json_artifact("task spec", &task_spec_path, &mut diagnostics);
    let acceptance = read_json_artifact("acceptance package", &report_json_path, &mut diagnostics);
    let security = read_json_artifact("security report", &security_report_path, &mut diagnostics);
    let git_workspace = read_json_artifact("git workspace", &git_workspace_path, &mut diagnostics);
    let approval_ledger =
        read_json_artifact("approval ledger", &approval_ledger_path, &mut diagnostics);
    let report_markdown = read_text_artifact(
        "acceptance markdown",
        &report_markdown_path,
        &mut diagnostics,
    );
    let git_diff = read_text_artifact("git diff", &git_diff_path, &mut diagnostics);
    let git_diff_stat = read_text_artifact("git diff stat", &git_diff_stat_path, &mut diagnostics);
    let step_evidence = read_step_evidence_artifacts(&evidence_dir, &mut diagnostics)?;

    let gates = acceptance
        .get("gates")
        .cloned()
        .unwrap_or(serde_json::Value::Null);
    let scope_gate = acceptance
        .get("scopeGate")
        .cloned()
        .or_else(|| {
            acceptance
                .get("task")
                .and_then(|value| value.get("scopeGate"))
                .cloned()
        })
        .unwrap_or(serde_json::Value::Null);
    let pending_approvals = approval_ledger
        .get("pending")
        .and_then(|value| value.as_u64())
        .unwrap_or(0);
    let missing = diagnostics
        .iter()
        .filter(|item| item.get("level").and_then(|value| value.as_str()) == Some("error"))
        .count();
    let warnings = diagnostics
        .iter()
        .filter(|item| item.get("level").and_then(|value| value.as_str()) == Some("warning"))
        .count();

    Ok(serde_json::json!({
        "version": 1,
        "kind": "loop-evidence-bundle",
        "loadedAt": unix_millis().to_string(),
        "projectPath": project_path,
        "loopId": loop_id,
        "loop": loop_snapshot,
        "taskSpec": task_spec,
        "acceptancePackage": acceptance,
        "acceptanceMarkdown": report_markdown,
        "securityReport": security,
        "gitWorkspace": git_workspace,
        "gitDiff": git_diff,
        "gitDiffStat": git_diff_stat,
        "approvalLedger": approval_ledger,
        "stepEvidence": step_evidence,
        "diagnostics": diagnostics,
        "health": {
            "missingArtifacts": missing,
            "warnings": warnings,
            "stepEvidenceCount": step_evidence.as_array().map(|items| items.len()).unwrap_or(0),
            "pendingApprovals": pending_approvals,
            "verdict": acceptance.get("verdict").and_then(|value| value.as_str()).unwrap_or("missing"),
            "status": acceptance.get("status").and_then(|value| value.as_str()).unwrap_or("missing"),
            "scopePassed": scope_gate.get("passed").and_then(|value| value.as_bool()).unwrap_or(false),
            "securityFindings": gates.get("securityFindings").and_then(|value| value.as_u64()).unwrap_or(0)
        },
        "refs": {
            "manifestPath": manifest_path.display().to_string(),
            "taskSpecPath": task_spec_path.display().to_string(),
            "reportJsonPath": report_json_path.display().to_string(),
            "reportMarkdownPath": report_markdown_path.display().to_string(),
            "securityReportPath": security_report_path.display().to_string(),
            "gitWorkspacePath": git_workspace_path.display().to_string(),
            "gitDiffPath": git_diff_path.display().to_string(),
            "gitDiffStatPath": git_diff_stat_path.display().to_string(),
            "approvalLedgerPath": approval_ledger_path.display().to_string(),
            "stepEvidenceDir": evidence_dir.display().to_string()
        }
    }))
}

#[tauri::command]
fn load_launch_doctor_report(project_path: String) -> Result<serde_json::Value, String> {
    let path = PathBuf::from(&project_path)
        .join(".dbc")
        .join("doctor")
        .join("latest.json");
    read_json_optional(&path)
        .ok_or_else(|| format!("Launch Doctor report is missing: {}", path.display()))
}

#[tauri::command]
fn load_approval_queue_report(project_path: String) -> Result<serde_json::Value, String> {
    let path = PathBuf::from(&project_path)
        .join(".dbc")
        .join("approval-queue")
        .join("latest.json");
    read_json_optional(&path)
        .ok_or_else(|| format!("Approval Queue report is missing: {}", path.display()))
}

#[tauri::command]
fn load_provider_session_report(project_path: String) -> Result<serde_json::Value, String> {
    let path = PathBuf::from(&project_path)
        .join(".dbc")
        .join("provider-sessions")
        .join("latest.json");
    read_json_optional(&path)
        .ok_or_else(|| format!("Provider Sessions report is missing: {}", path.display()))
}

#[tauri::command]
fn load_loop_state_machine_report(project_path: String) -> Result<serde_json::Value, String> {
    let path = PathBuf::from(&project_path)
        .join(".dbc")
        .join("state-machine")
        .join("latest.json");
    read_json_optional(&path)
        .ok_or_else(|| format!("Loop State Machine report is missing: {}", path.display()))
}

#[tauri::command]
fn load_run_journal_report(project_path: String) -> Result<serde_json::Value, String> {
    let path = PathBuf::from(&project_path)
        .join(".dbc")
        .join("run-journal")
        .join("latest.json");
    read_json_optional(&path)
        .ok_or_else(|| format!("Run Journal report is missing: {}", path.display()))
}

#[tauri::command]
fn load_real_micro_comparison_report(project_path: String) -> Result<serde_json::Value, String> {
    let path = PathBuf::from(&project_path)
        .join(".dbc")
        .join("compare")
        .join("latest.json");
    read_json_optional(&path).ok_or_else(|| {
        format!(
            "Real Micro Comparison report is missing: {}",
            path.display()
        )
    })
}

#[tauri::command]
fn load_revert_evidence_report(project_path: String) -> Result<serde_json::Value, String> {
    let path = PathBuf::from(&project_path)
        .join(".dbc")
        .join("revert")
        .join("latest.json");
    read_json_optional(&path)
        .ok_or_else(|| format!("Revert Evidence report is missing: {}", path.display()))
}

#[tauri::command]
fn load_support_bundle_report(project_path: String) -> Result<serde_json::Value, String> {
    let path = PathBuf::from(&project_path)
        .join(".dbc")
        .join("support")
        .join("latest.json");
    read_json_optional(&path)
        .ok_or_else(|| format!("Support Bundle report is missing: {}", path.display()))
}

#[tauri::command]
fn load_real_micro_preflight_report(project_path: String) -> Result<serde_json::Value, String> {
    let path = PathBuf::from(&project_path)
        .join(".dbc")
        .join("preflight")
        .join("latest.json");
    read_json_optional(&path)
        .ok_or_else(|| format!("Real Micro Preflight report is missing: {}", path.display()))
}

#[tauri::command]
fn load_real_micro_runbook_report(project_path: String) -> Result<serde_json::Value, String> {
    let path = PathBuf::from(&project_path)
        .join(".dbc")
        .join("runbook")
        .join("latest.json");
    read_json_optional(&path)
        .ok_or_else(|| format!("Real Micro Runbook report is missing: {}", path.display()))
}

#[tauri::command]
fn create_workspace(
    app: tauri::AppHandle,
    name: String,
    path: String,
) -> Result<WorkspaceRecord, String> {
    let db_path = database_path(&app)?;
    let conn = open_db(db_path)?;
    conn.execute(
        "insert into workspaces (name, path, created_at) values (?1, ?2, datetime('now'))",
        params![name, path],
    )
    .map_err(|err| err.to_string())?;

    let id = conn.last_insert_rowid();
    let mut stmt = conn
        .prepare("select id, name, path, created_at from workspaces where id = ?1")
        .map_err(|err| err.to_string())?;

    stmt.query_row(params![id], |row| {
        Ok(WorkspaceRecord {
            id: row.get(0)?,
            name: row.get(1)?,
            path: row.get(2)?,
            created_at: row.get(3)?,
        })
    })
    .map_err(|err| err.to_string())
}

#[tauri::command]
fn list_workspaces(app: tauri::AppHandle) -> Result<Vec<WorkspaceRecord>, String> {
    let db_path = database_path(&app)?;
    let conn = open_db(db_path)?;
    let mut stmt = conn
        .prepare("select id, name, path, created_at from workspaces order by id desc")
        .map_err(|err| err.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(WorkspaceRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                path: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|err| err.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|err| err.to_string())
}

fn command_available(name: &str, command: &str) -> EnvironmentCheck {
    let resolved_command = resolve_executable(command);
    let status = resolved_command
        .as_ref()
        .and_then(|path| Command::new(path).arg("--version").output().ok())
        .map(|output| {
            if output.status.success() {
                "ok"
            } else {
                "missing"
            }
        })
        .unwrap_or("missing");

    EnvironmentCheck {
        name: name.to_string(),
        status: status.to_string(),
        detail: resolved_command
            .map(|path| path.display().to_string())
            .unwrap_or_else(|| command.to_string()),
    }
}

fn resolve_executable(command: &str) -> Option<PathBuf> {
    let trimmed = command.trim();
    if trimmed.is_empty() {
        return None;
    }

    let direct = PathBuf::from(trimmed);
    if trimmed.contains('/') && is_executable_file(&direct) {
        return Some(direct);
    }

    discover_executables(trimmed)
        .into_iter()
        .map(|(path, _source)| path)
        .next()
}

fn discover_executables(command: &str) -> Vec<(PathBuf, String)> {
    let trimmed = command.trim();
    let mut found: Vec<(PathBuf, String)> = Vec::new();
    let direct = PathBuf::from(trimmed);

    if trimmed.contains('/') || trimmed.contains('\\') {
        if is_executable_file(&direct) {
            found.push((direct, "exact path".to_string()));
        }
        return found;
    }

    let mut search_dirs: Vec<(PathBuf, String)> = env::var_os("PATH")
        .map(|paths| {
            env::split_paths(&paths)
                .map(|path| (path, "PATH".to_string()))
                .collect()
        })
        .unwrap_or_default();

    if let Some(home) = env::var_os("HOME") {
        let home = PathBuf::from(home);
        search_dirs.push((home.join(".cargo/bin"), "~/.cargo/bin".to_string()));
        search_dirs.push((home.join(".local/bin"), "~/.local/bin".to_string()));
        search_dirs.push((
            home.join(".npm-global/bin"),
            "~/.npm-global/bin".to_string(),
        ));
        search_dirs.push((home.join(".bun/bin"), "~/.bun/bin".to_string()));
        search_dirs.push((home.join("Library/pnpm"), "~/Library/pnpm".to_string()));
    }

    if let Some(user_profile) = env::var_os("USERPROFILE") {
        let user_profile = PathBuf::from(user_profile);
        search_dirs.push((
            user_profile.join(".local/bin"),
            "%USERPROFILE%\\.local\\bin".to_string(),
        ));
    }

    if let Some(appdata) = env::var_os("APPDATA") {
        let appdata = PathBuf::from(appdata);
        search_dirs.push((appdata.join("npm"), "%APPDATA%\\npm".to_string()));
        search_dirs.push((
            appdata.join("Claude/bin"),
            "%APPDATA%\\Claude\\bin".to_string(),
        ));
    }

    if let Some(local_appdata) = env::var_os("LOCALAPPDATA") {
        let local_appdata = PathBuf::from(local_appdata);
        search_dirs.push((
            local_appdata.join("Programs/Claude/bin"),
            "%LOCALAPPDATA%\\Programs\\Claude\\bin".to_string(),
        ));
        search_dirs.push((
            local_appdata.join("Programs/Codex/bin"),
            "%LOCALAPPDATA%\\Programs\\Codex\\bin".to_string(),
        ));
        search_dirs.push((
            local_appdata.join("Microsoft/WindowsApps"),
            "%LOCALAPPDATA%\\Microsoft\\WindowsApps".to_string(),
        ));
    }

    if let Some(program_files) = env::var_os("ProgramFiles") {
        let program_files = PathBuf::from(program_files);
        search_dirs.push((
            program_files.join("Claude/bin"),
            "%ProgramFiles%\\Claude\\bin".to_string(),
        ));
        search_dirs.push((
            program_files.join("Codex/bin"),
            "%ProgramFiles%\\Codex\\bin".to_string(),
        ));
    }

    if let Some(program_files_x86) = env::var_os("ProgramFiles(x86)") {
        let program_files_x86 = PathBuf::from(program_files_x86);
        search_dirs.push((
            program_files_x86.join("Claude/bin"),
            "%ProgramFiles(x86)%\\Claude\\bin".to_string(),
        ));
        search_dirs.push((
            program_files_x86.join("Codex/bin"),
            "%ProgramFiles(x86)%\\Codex\\bin".to_string(),
        ));
    }

    search_dirs.extend([
        (
            PathBuf::from("/Applications/Codex.app/Contents/Resources"),
            "Codex.app resources".to_string(),
        ),
        (
            PathBuf::from("/Applications/Claude.app/Contents/Resources"),
            "Claude.app resources".to_string(),
        ),
        (
            PathBuf::from("/opt/homebrew/bin"),
            "/opt/homebrew/bin".to_string(),
        ),
        (
            PathBuf::from("/usr/local/bin"),
            "/usr/local/bin".to_string(),
        ),
        (
            PathBuf::from("/opt/local/bin"),
            "/opt/local/bin".to_string(),
        ),
        (PathBuf::from("/usr/bin"), "/usr/bin".to_string()),
        (PathBuf::from("/bin"), "/bin".to_string()),
        (PathBuf::from("/usr/sbin"), "/usr/sbin".to_string()),
        (PathBuf::from("/sbin"), "/sbin".to_string()),
    ]);

    let names = executable_names(trimmed);
    for (dir, source) in search_dirs {
        for name in &names {
            let candidate = dir.join(name);
            if is_executable_file(&candidate)
                && !found.iter().any(|(existing, _)| existing == &candidate)
            {
                found.push((candidate, source.clone()));
            }
        }
    }

    found
}

fn is_executable_file(path: &Path) -> bool {
    path.is_file()
}

fn executable_names(command: &str) -> Vec<String> {
    let mut names = vec![command.to_string()];
    if cfg!(windows) && !command.contains('.') {
        names.push(format!("{command}.exe"));
        names.push(format!("{command}.cmd"));
        names.push(format!("{command}.bat"));
        names.push(format!("{command}.ps1"));
    }
    names
}

fn blocked_result(started: Instant, decision: &str, message: &str) -> CliRunResult {
    CliRunResult {
        status: if decision == "approval_required" {
            "approval_required".to_string()
        } else {
            "blocked_by_policy".to_string()
        },
        stdout: String::new(),
        stderr: message.to_string(),
        exit_code: None,
        duration_ms: started.elapsed().as_millis(),
        decision: decision.to_string(),
        redacted_output: message.to_string(),
    }
}

fn trim_output(text: &str, max_bytes: usize) -> String {
    if text.len() <= max_bytes {
        return text.trim().to_string();
    }
    let mut out = text.chars().take(max_bytes).collect::<String>();
    out.push_str("\n[output truncated]");
    out
}

fn summarize_step_error(status: &str, output: &str) -> String {
    let first_line = output
        .lines()
        .find(|line| !line.trim().is_empty())
        .unwrap_or("No output captured.");
    trim_output(&format!("{status}: {first_line}"), 600)
}

fn redact_text(text: &str) -> String {
    text.lines()
        .map(|line| {
            let lowered = line.to_lowercase();
            if lowered.contains("api_key")
                || lowered.contains("apikey")
                || lowered.contains("authorization:")
                || lowered.contains("bearer ")
                || lowered.contains("password")
                || lowered.contains("private key")
                || lowered.contains("secret")
                || lowered.contains("api_token")
                || lowered.contains("access_token")
                || lowered.contains("refresh_token")
                || lowered.contains("auth token")
                || lowered.contains("token:")
                || lowered.contains("token=")
            {
                "[REDACTED SECRET-LIKE LINE]".to_string()
            } else {
                line.to_string()
            }
        })
        .collect::<Vec<_>>()
        .join("\n")
}

struct LoopRunRow {
    id: String,
    project_id: String,
    task_id: String,
    project_path: String,
    task_title: String,
    task_brief: String,
    task_criteria: Vec<String>,
    task_constraints: Vec<String>,
    task_budget_limit: f64,
    task_spec_path: String,
    task_spec_checksum: String,
    memory_context: String,
    memory_refs: Vec<String>,
    status: String,
    active_step_index: i64,
    artifact_dir: String,
}

fn read_loop_run(conn: &Connection, loop_id: &str) -> Result<LoopRunRow, String> {
    conn.query_row(
        "select id, project_id, task_id, project_path, task_title, task_brief, task_criteria_json, task_constraints_json,
                task_budget_limit, task_spec_path, task_spec_checksum, memory_context, memory_refs_json, status, active_step_index, artifact_dir
         from loop_runs where id = ?1",
        params![loop_id],
        |row| {
            let criteria_json: String = row.get(6)?;
            let constraints_json: String = row.get(7)?;
            let memory_refs_json: String = row.get(12)?;
            Ok(LoopRunRow {
                id: row.get(0)?,
                project_id: row.get(1)?,
                task_id: row.get(2)?,
                project_path: row.get(3)?,
                task_title: row.get(4)?,
                task_brief: row.get(5)?,
                task_criteria: serde_json::from_str(&criteria_json).unwrap_or_default(),
                task_constraints: serde_json::from_str(&constraints_json).unwrap_or_default(),
                task_budget_limit: row.get(8)?,
                task_spec_path: row.get(9)?,
                task_spec_checksum: row.get(10)?,
                memory_context: row.get(11)?,
                memory_refs: serde_json::from_str(&memory_refs_json).unwrap_or_default(),
                status: row.get(13)?,
                active_step_index: row.get(14)?,
                artifact_dir: row.get(15)?,
            })
        },
    )
    .map_err(|err| err.to_string())
}

fn read_loop_step(
    conn: &Connection,
    loop_id: &str,
    step_index: i64,
) -> Result<LoopStepSnapshot, String> {
    conn.query_row(
        "select step_id, state, agent, role_id, provider_id, provider_type, provider_command, provider_args_template,
                provider_prompt_mode, provider_run_mode, agent_mode, local_commands_json, timeout_seconds, max_output_bytes,
                max_attempts, attempt_count, requires_approval, last_error, summary, evidence, status, output,
                structured_report_json, artifact_path, evidence_path, started_at, finished_at
         from loop_steps where loop_id = ?1 and step_index = ?2",
        params![loop_id, step_index],
        |row| {
            let local_commands_json: String = row.get(11)?;
            Ok(LoopStepSnapshot {
                id: row.get(0)?,
                state: row.get(1)?,
                agent: row.get(2)?,
                role_id: row.get(3)?,
                provider_id: row.get(4)?,
                provider_type: row.get(5)?,
                provider_command: row.get(6)?,
                provider_args_template: row.get(7)?,
                provider_prompt_mode: row.get(8)?,
                provider_run_mode: row.get(9)?,
                agent_mode: row.get(10)?,
                local_commands: serde_json::from_str(&local_commands_json).unwrap_or_default(),
                timeout_seconds: row.get::<_, i64>(12)? as u64,
                max_output_bytes: row.get::<_, i64>(13)? as usize,
                max_attempts: row.get(14)?,
                attempt_count: row.get(15)?,
                requires_approval: row.get::<_, i64>(16)? != 0,
                last_error: row.get(17)?,
                summary: row.get(18)?,
                evidence: row.get(19)?,
                status: row.get(20)?,
                output: row.get(21)?,
                structured_report_json: row.get(22)?,
                artifact_path: row.get(23)?,
                evidence_path: row.get(24)?,
                started_at: row.get(25)?,
                finished_at: row.get(26)?,
            })
        },
    )
    .map_err(|err| err.to_string())
}

fn build_loop_snapshot(conn: &Connection, run: LoopRunRow) -> Result<LoopRunSnapshot, String> {
    let loop_id = run.id.clone();
    let manifest_path = loop_manifest_path(&run.project_path, &run.id)
        .display()
        .to_string();
    let report_json_path = loop_report_json_path(&run.project_path, &run.id)
        .display()
        .to_string();
    let report_markdown_path = loop_report_markdown_path(&run.project_path, &run.id)
        .display()
        .to_string();
    let git_baseline_path = loop_git_baseline_path(&run.project_path, &run.id)
        .display()
        .to_string();
    let commit_proposal_path = loop_commit_proposal_path(&run.project_path, &run.id)
        .display()
        .to_string();
    let security_report_path = loop_security_report_path(&run.project_path, &run.id)
        .display()
        .to_string();
    let mut stmt = conn
        .prepare(
            "select step_id, state, agent, role_id, provider_id, provider_type, provider_command, provider_args_template,
                    provider_prompt_mode, provider_run_mode, agent_mode, local_commands_json, timeout_seconds, max_output_bytes,
                    max_attempts, attempt_count, requires_approval, last_error, summary, evidence, status, output,
                    structured_report_json, artifact_path, evidence_path, started_at, finished_at
             from loop_steps where loop_id = ?1 order by step_index",
        )
        .map_err(|err| err.to_string())?;
    let rows = stmt
        .query_map(params![loop_id], |row| {
            let local_commands_json: String = row.get(11)?;
            Ok(LoopStepSnapshot {
                id: row.get(0)?,
                state: row.get(1)?,
                agent: row.get(2)?,
                role_id: row.get(3)?,
                provider_id: row.get(4)?,
                provider_type: row.get(5)?,
                provider_command: row.get(6)?,
                provider_args_template: row.get(7)?,
                provider_prompt_mode: row.get(8)?,
                provider_run_mode: row.get(9)?,
                agent_mode: row.get(10)?,
                local_commands: serde_json::from_str(&local_commands_json).unwrap_or_default(),
                timeout_seconds: row.get::<_, i64>(12)? as u64,
                max_output_bytes: row.get::<_, i64>(13)? as usize,
                max_attempts: row.get(14)?,
                attempt_count: row.get(15)?,
                requires_approval: row.get::<_, i64>(16)? != 0,
                last_error: row.get(17)?,
                summary: row.get(18)?,
                evidence: row.get(19)?,
                status: row.get(20)?,
                output: row.get(21)?,
                structured_report_json: row.get(22)?,
                artifact_path: row.get(23)?,
                evidence_path: row.get(24)?,
                started_at: row.get(25)?,
                finished_at: row.get(26)?,
            })
        })
        .map_err(|err| err.to_string())?;

    Ok(LoopRunSnapshot {
        id: run.id,
        project_id: run.project_id,
        project_path: run.project_path,
        task_id: run.task_id,
        task_title: run.task_title,
        task_brief: run.task_brief,
        task_criteria: run.task_criteria,
        task_constraints: run.task_constraints,
        task_budget_limit: run.task_budget_limit,
        task_spec_path: run.task_spec_path,
        task_spec_checksum: run.task_spec_checksum,
        memory_context: run.memory_context,
        memory_refs: run.memory_refs,
        status: run.status,
        active_step_index: run.active_step_index,
        artifact_dir: run.artifact_dir,
        manifest_path,
        report_json_path,
        report_markdown_path,
        git_baseline_path,
        commit_proposal_path,
        security_report_path,
        steps: rows
            .collect::<Result<Vec<_>, _>>()
            .map_err(|err| err.to_string())?,
    })
}

fn write_loop_manifest(snapshot: &LoopRunSnapshot) -> Result<(), String> {
    let path = PathBuf::from(&snapshot.manifest_path);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    let content = serde_json::to_string_pretty(&serde_json::json!({
        "version": 1,
        "kind": "loop-manifest",
        "updatedAt": unix_millis().to_string(),
        "opsEvidence": loop_ops_evidence_snapshot(snapshot),
        "loop": snapshot,
    }))
    .map_err(|err| err.to_string())?;
    fs::write(&path, content).map_err(|err| err.to_string())
}

fn loop_ops_evidence_snapshot(snapshot: &LoopRunSnapshot) -> serde_json::Value {
    let dbc_dir = PathBuf::from(&snapshot.project_path).join(".dbc");
    let preflight_path = dbc_dir.join("preflight").join("latest.json");
    let operator_path = dbc_dir.join("operator").join("latest.json");
    let approval_path = dbc_dir.join("operator").join("approval.json");
    let ledger_path = dbc_dir.join("approvals").join("latest.json");
    let required_decisions = [
        "REAL-MICRO-HUMAN-GATE",
        "APPLY-REAL-MICRO-PROFILE",
        "RUN-REAL-MICRO-TASK",
    ];

    let preflight = read_json_optional(&preflight_path);
    let operator = read_json_optional(&operator_path);
    let approval = read_json_optional(&approval_path);
    let mut approved_decisions = serde_json::Map::new();
    for id in required_decisions {
        approved_decisions.insert(
            id.to_string(),
            serde_json::Value::Bool(approval_decision_is_approved(&dbc_dir, id)),
        );
    }
    let approvals_ready = approved_decisions
        .values()
        .all(|value| value.as_bool().unwrap_or(false));
    let real_cli_steps = snapshot
        .steps
        .iter()
        .filter(|step| step.provider_type == "cli" && step.provider_run_mode == "real")
        .collect::<Vec<_>>();
    let real_provider_ids = real_cli_steps
        .iter()
        .map(|step| step.provider_id.clone())
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect::<Vec<_>>();
    let operator_budget = operator
        .as_ref()
        .and_then(|value| value.get("budget"))
        .and_then(|value| value.get("budgetLimit"))
        .and_then(|value| value.as_f64())
        .unwrap_or(0.0);
    let operator_task_id = operator
        .as_ref()
        .and_then(|value| value.get("task"))
        .and_then(|value| value.get("id"))
        .and_then(|value| value.as_str())
        .unwrap_or("");
    let checklist_generated_at = operator
        .as_ref()
        .and_then(|value| value.get("generatedAt"))
        .and_then(|value| value.as_str())
        .unwrap_or("");
    let approval_matches = operator_approval_matches(
        &approval,
        checklist_generated_at,
        operator_task_id,
        operator_budget,
    );

    serde_json::json!({
        "version": 1,
        "kind": "loop-ops-evidence",
        "capturedAt": unix_millis().to_string(),
        "realCli": {
            "enabled": !real_cli_steps.is_empty(),
            "stepCount": real_cli_steps.len(),
            "providerIds": real_provider_ids,
            "callLimit": real_provider_call_limit(snapshot.task_budget_limit),
            "budgetLimit": snapshot.task_budget_limit
        },
        "preflight": {
            "path": preflight_path.display().to_string(),
            "status": preflight.as_ref().map(|value| json_str(value, "status")).unwrap_or_else(|| "missing".to_string()),
            "generatedAt": preflight.as_ref().map(|value| json_str(value, "generatedAt")).unwrap_or_default(),
            "blockers": preflight.as_ref().map(|value| json_array_len(value, "blockers")).unwrap_or(0),
            "warnings": preflight.as_ref().map(|value| json_array_len(value, "warnings")).unwrap_or(0)
        },
        "operator": {
            "path": operator_path.display().to_string(),
            "status": operator.as_ref().map(|value| json_str(value, "status")).unwrap_or_else(|| "missing".to_string()),
            "generatedAt": checklist_generated_at,
            "taskId": operator_task_id,
            "budgetLimit": operator_budget,
            "blockers": operator.as_ref().map(|value| json_array_len(value, "blockers")).unwrap_or(0)
        },
        "operatorApproval": {
            "path": approval_path.display().to_string(),
            "approved": approval.as_ref().and_then(|value| value.get("approved")).and_then(|value| value.as_bool()).unwrap_or(false),
            "matchesCurrentChecklist": approval_matches
        },
        "approvalLedger": {
            "path": ledger_path.display().to_string(),
            "required": required_decisions,
            "approved": serde_json::Value::Object(approved_decisions),
            "ready": approvals_ready
        },
        "policy": {
            "realCliRequiresOperatorChecklist": true,
            "realCliRequiresMatchingOperatorApproval": true,
            "realCliRequiresRunDecision": true,
            "consumerWebAutomation": "not_used"
        }
    })
}

fn persist_loop_outputs(snapshot: &LoopRunSnapshot) -> Result<(), String> {
    ensure_git_baseline(snapshot)?;
    write_git_workspace_package(snapshot)?;
    write_commit_proposal(snapshot)?;
    write_security_report(snapshot)?;
    write_loop_manifest(snapshot)?;
    write_acceptance_package(snapshot)?;
    Ok(())
}

fn loop_manifest_path(project_path: &str, loop_id: &str) -> PathBuf {
    PathBuf::from(project_path)
        .join(".dbc")
        .join("loops")
        .join(format!("{}.json", sanitize_file_stem(loop_id)))
}

fn read_loop_manifest_file(path: &Path) -> Result<LoopRunSnapshot, String> {
    let content = fs::read_to_string(path).map_err(|err| err.to_string())?;
    let value: serde_json::Value = serde_json::from_str(&content).map_err(|err| err.to_string())?;
    let loop_value = value
        .get("loop")
        .cloned()
        .ok_or_else(|| format!("Loop manifest has no loop object: {}", path.display()))?;
    serde_json::from_value(loop_value).map_err(|err| err.to_string())
}

fn loop_summary_from_snapshot(
    snapshot: &LoopRunSnapshot,
    source: &str,
    updated_at: String,
) -> LoopRunSummary {
    LoopRunSummary {
        id: snapshot.id.clone(),
        project_id: snapshot.project_id.clone(),
        project_path: snapshot.project_path.clone(),
        task_id: snapshot.task_id.clone(),
        task_title: snapshot.task_title.clone(),
        status: snapshot.status.clone(),
        active_step_index: snapshot.active_step_index,
        manifest_path: snapshot.manifest_path.clone(),
        report_markdown_path: snapshot.report_markdown_path.clone(),
        source: source.to_string(),
        updated_at,
    }
}

fn loop_report_json_path(project_path: &str, loop_id: &str) -> PathBuf {
    PathBuf::from(project_path)
        .join(".dbc")
        .join("reports")
        .join(format!("{}.json", sanitize_file_stem(loop_id)))
}

fn loop_report_markdown_path(project_path: &str, loop_id: &str) -> PathBuf {
    PathBuf::from(project_path)
        .join(".dbc")
        .join("reports")
        .join(format!("{}.md", sanitize_file_stem(loop_id)))
}

fn loop_git_baseline_path(project_path: &str, loop_id: &str) -> PathBuf {
    PathBuf::from(project_path)
        .join(".dbc")
        .join("git")
        .join(sanitize_file_stem(loop_id))
        .join("baseline.json")
}

fn loop_git_workspace_path(project_path: &str, loop_id: &str) -> PathBuf {
    PathBuf::from(project_path)
        .join(".dbc")
        .join("git")
        .join(sanitize_file_stem(loop_id))
        .join("workspace.json")
}

fn loop_git_diff_path(project_path: &str, loop_id: &str) -> PathBuf {
    PathBuf::from(project_path)
        .join(".dbc")
        .join("git")
        .join(sanitize_file_stem(loop_id))
        .join("diff.patch")
}

fn loop_git_diff_stat_path(project_path: &str, loop_id: &str) -> PathBuf {
    PathBuf::from(project_path)
        .join(".dbc")
        .join("git")
        .join(sanitize_file_stem(loop_id))
        .join("diff-stat.txt")
}

fn loop_commit_proposal_path(project_path: &str, loop_id: &str) -> PathBuf {
    PathBuf::from(project_path)
        .join(".dbc")
        .join("git")
        .join(sanitize_file_stem(loop_id))
        .join("commit-proposal.md")
}

fn loop_security_report_path(project_path: &str, loop_id: &str) -> PathBuf {
    PathBuf::from(project_path)
        .join(".dbc")
        .join("security")
        .join(format!("{}.json", sanitize_file_stem(loop_id)))
}

fn ensure_git_baseline(snapshot: &LoopRunSnapshot) -> Result<(), String> {
    let path = PathBuf::from(&snapshot.git_baseline_path);
    if path.exists() {
        return Ok(());
    }
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    let content = serde_json::to_string_pretty(&serde_json::json!({
        "version": 1,
        "kind": "git-baseline",
        "capturedAt": unix_millis().to_string(),
        "loopId": snapshot.id,
        "taskId": snapshot.task_id,
        "taskTitle": snapshot.task_title,
        "projectPath": snapshot.project_path,
        "git": collect_git_evidence(&snapshot.project_path),
        "policy": {
            "branchCreation": "manual",
            "commit": "manual",
            "push": "approval_required",
            "resetCleanCheckout": "deny_without_explicit_human_action"
        }
    }))
    .map_err(|err| err.to_string())?;
    fs::write(&path, content).map_err(|err| err.to_string())
}

fn write_git_workspace_package(snapshot: &LoopRunSnapshot) -> Result<(), String> {
    let workspace_path = loop_git_workspace_path(&snapshot.project_path, &snapshot.id);
    let diff_path = loop_git_diff_path(&snapshot.project_path, &snapshot.id);
    let diff_stat_path = loop_git_diff_stat_path(&snapshot.project_path, &snapshot.id);
    if let Some(parent) = workspace_path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }

    let git = collect_git_evidence(&snapshot.project_path);
    let scope_gate = scope_gate_from_git(&snapshot.task_spec_path, &git);
    let is_git_repo = git
        .get("isGitRepo")
        .and_then(|value| value.as_bool())
        .unwrap_or(false);
    let branch = git
        .get("branch")
        .and_then(|value| value.as_str())
        .unwrap_or("unknown");
    let changed_files = git
        .get("changedFiles")
        .and_then(|value| value.as_array())
        .map(|items| {
            items
                .iter()
                .filter_map(|value| value.as_str().map(|item| item.to_string()))
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    let suggested_branch = suggested_task_branch(snapshot);
    let diff_capture = if is_git_repo {
        run_git_capture(&snapshot.project_path, &["diff", "--"])
    } else {
        CaptureResult {
            status: "not_git_repo".to_string(),
            output: "No git diff is available because the project is not inside a git repository."
                .to_string(),
        }
    };
    let diff_stat_capture = if is_git_repo {
        run_git_capture(&snapshot.project_path, &["diff", "--stat"])
    } else {
        CaptureResult {
            status: "not_git_repo".to_string(),
            output:
                "No git diff stat is available because the project is not inside a git repository."
                    .to_string(),
        }
    };
    fs::write(&diff_path, &diff_capture.output).map_err(|err| err.to_string())?;
    fs::write(&diff_stat_path, &diff_stat_capture.output).map_err(|err| err.to_string())?;

    let scope_passed = scope_gate
        .get("passed")
        .and_then(|value| value.as_bool())
        .unwrap_or(false);
    let content = serde_json::to_string_pretty(&serde_json::json!({
        "version": 1,
        "kind": "git-workspace",
        "capturedAt": unix_millis().to_string(),
        "loopId": snapshot.id,
        "taskId": snapshot.task_id,
        "taskTitle": snapshot.task_title,
        "projectPath": snapshot.project_path,
        "isGitRepo": is_git_repo,
        "currentBranch": branch,
        "suggestedTaskBranch": suggested_branch,
        "dirtyTree": !changed_files.is_empty(),
        "changedFiles": changed_files,
        "scopeGate": scope_gate,
        "artifacts": {
            "baselinePath": snapshot.git_baseline_path,
            "workspacePath": workspace_path.display().to_string(),
            "diffPath": diff_path.display().to_string(),
            "diffStatPath": diff_stat_path.display().to_string(),
            "commitProposalPath": snapshot.commit_proposal_path
        },
        "gates": {
            "insideGitRepo": is_git_repo,
            "scopePassed": scope_passed,
            "diffArtifactWritten": diff_path.exists(),
            "diffStatArtifactWritten": diff_stat_path.exists()
        },
        "manualCommands": {
            "inspect": ["git status --short", "git diff --stat", "git diff --"],
            "createTaskBranch": format!("git switch -c {}", suggested_branch),
            "stageAllowed": format!("git add {}", suggested_git_add_path(snapshot)),
            "commit": format!("git commit -m {:?}", format!("{}: {}", snapshot.task_id, snapshot.task_title))
        },
        "policy": {
            "branchCreation": "manual",
            "stage": "manual_allowed_paths_only",
            "commit": "manual",
            "push": "approval_required",
            "resetCleanCheckout": "deny_without_explicit_human_action"
        }
    }))
    .map_err(|err| err.to_string())?;
    fs::write(&workspace_path, content).map_err(|err| err.to_string())
}

fn write_commit_proposal(snapshot: &LoopRunSnapshot) -> Result<(), String> {
    let path = PathBuf::from(&snapshot.commit_proposal_path);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    let git = collect_git_evidence(&snapshot.project_path);
    let changed_files = git
        .get("changedFiles")
        .and_then(|value| value.as_array())
        .map(|items| {
            items
                .iter()
                .filter_map(|value| value.as_str())
                .map(|value| value.to_string())
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    let branch = git
        .get("branch")
        .and_then(|value| value.as_str())
        .unwrap_or("unknown");
    let message = format!("{}: {}", snapshot.task_id, snapshot.task_title);
    let mut lines = vec![
        format!("# Commit Proposal: {}", snapshot.task_title),
        String::new(),
        format!("Loop: {}", snapshot.id),
        format!("Task: {} - {}", snapshot.task_id, snapshot.task_title),
        format!("Current branch: {branch}"),
        format!("Suggested task branch: {}", suggested_task_branch(snapshot)),
        format!("Acceptance report: {}", snapshot.report_markdown_path),
        format!("Git baseline: {}", snapshot.git_baseline_path),
        format!(
            "Git workspace report: {}",
            loop_git_workspace_path(&snapshot.project_path, &snapshot.id).display()
        ),
        String::new(),
        "## Suggested Commit Message".to_string(),
        String::new(),
        format!("```text\n{message}\n```"),
        String::new(),
        "## Changed Files".to_string(),
    ];
    if changed_files.is_empty() {
        lines.push("- No tracked diff files detected yet.".to_string());
    } else {
        for file in changed_files {
            lines.push(format!("- {file}"));
        }
    }
    lines.extend([
        String::new(),
        "## Manual Commands".to_string(),
        String::new(),
        "```bash".to_string(),
        "git status --short".to_string(),
        "git diff --stat".to_string(),
        format!("git switch -c {}", suggested_task_branch(snapshot)),
        format!("git add {}", suggested_git_add_path(snapshot)),
        format!("git commit -m {:?}", message),
        "```".to_string(),
        String::new(),
        "Push, reset, clean, checkout, and branch deletion require explicit human approval outside this proposal.".to_string(),
    ]);
    fs::write(&path, lines.join("\n")).map_err(|err| err.to_string())
}

fn suggested_git_add_path(snapshot: &LoopRunSnapshot) -> String {
    let allowed = task_allowed_paths(&snapshot.task_spec_path);
    if allowed.is_empty() {
        ".".to_string()
    } else {
        allowed
            .iter()
            .map(|value| shell_quote_path(value))
            .collect::<Vec<_>>()
            .join(" ")
    }
}

fn suggested_task_branch(snapshot: &LoopRunSnapshot) -> String {
    let task = sanitize_file_stem(&snapshot.task_id)
        .to_lowercase()
        .replace('_', "-");
    format!("dbc/{}", task.trim_matches('-'))
}

fn task_allowed_paths(task_spec_path: &str) -> Vec<String> {
    read_json_optional(&PathBuf::from(task_spec_path))
        .map(|value| json_string_array(&value, "allowedPaths"))
        .unwrap_or_default()
        .into_iter()
        .map(|value| normalize_scope_path(&value))
        .filter(|value| !value.is_empty())
        .collect::<Vec<_>>()
}

fn shell_quote_path(value: &str) -> String {
    if value
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '/' | '.' | '_' | '-'))
    {
        value.to_string()
    } else {
        format!("'{}'", value.replace('\'', "'\\''"))
    }
}

fn write_security_report(snapshot: &LoopRunSnapshot) -> Result<(), String> {
    let path = PathBuf::from(&snapshot.security_report_path);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    let findings = collect_loop_secret_findings(snapshot);
    let blocked_steps = snapshot
        .steps
        .iter()
        .filter(|step| {
            step.status == "blocked" && step.last_error.to_lowercase().contains("secret")
        })
        .map(|step| step.id.clone())
        .collect::<Vec<_>>();
    let content = serde_json::to_string_pretty(&serde_json::json!({
        "version": 1,
        "kind": "security-report",
        "updatedAt": unix_millis().to_string(),
        "loopId": snapshot.id,
        "taskId": snapshot.task_id,
        "policy": {
            "promptSecretScan": "block_real_cli_before_send",
            "secretValues": "never_written_to_report",
            "redaction": "enabled",
            "destructiveCommands": "deny_or_human_approval"
        },
        "gates": {
            "secretFindings": findings.len(),
            "blockedSteps": blocked_steps,
            "passed": findings.is_empty()
        },
        "findings": findings,
    }))
    .map_err(|err| err.to_string())?;
    fs::write(&path, content).map_err(|err| err.to_string())
}

fn collect_loop_secret_findings(snapshot: &LoopRunSnapshot) -> Vec<SecretFinding> {
    let mut findings = Vec::new();
    findings.extend(scan_text_for_secret_findings(
        "task.title",
        &snapshot.task_title,
    ));
    findings.extend(scan_text_for_secret_findings(
        "task.brief",
        &snapshot.task_brief,
    ));
    findings.extend(scan_text_for_secret_findings(
        "task.criteria",
        &snapshot.task_criteria.join("\n"),
    ));
    findings.extend(scan_text_for_secret_findings(
        "task.constraints",
        &snapshot.task_constraints.join("\n"),
    ));
    findings.extend(scan_text_for_secret_findings(
        "task.scope",
        &task_scope_from_spec(&snapshot.task_spec_path),
    ));
    findings.extend(scan_text_for_secret_findings(
        "memory.context",
        &snapshot.memory_context,
    ));
    for step in &snapshot.steps {
        findings.extend(scan_text_for_secret_findings(
            &format!("step.{}.lastError", step.id),
            &step.last_error,
        ));
        findings.extend(scan_text_for_secret_findings(
            &format!("step.{}.output", step.id),
            &step.output,
        ));
    }
    findings
}

fn scan_text_for_secret_findings(source: &str, text: &str) -> Vec<SecretFinding> {
    let patterns = [
        ("openai-api-key", "openai_api_key"),
        ("anthropic-api-key", "anthropic_api_key"),
        ("aws-secret-access-key", "aws_secret_access_key"),
        ("authorization-bearer", "authorization: bearer"),
        ("api-key-assignment", "api_key="),
        ("api-key-header", "api-key:"),
        ("access-token-assignment", "access_token="),
        ("refresh-token-assignment", "refresh_token="),
        ("token-assignment", "token="),
        ("password-assignment", "password="),
        ("private-key-assignment", "private_key="),
        ("pem-private-key", "-----begin"),
        ("openai-secret-prefix", "sk-"),
        ("github-token", "ghp_"),
        ("github-pat", "github_pat_"),
        ("slack-token", "xoxb-"),
        ("redacted-secret-line", "[redacted secret-like line]"),
    ];

    let mut findings = Vec::new();
    for (index, line) in text.lines().enumerate() {
        let lowered = line.to_lowercase();
        for (kind, needle) in patterns {
            if lowered.contains(needle) {
                findings.push(SecretFinding {
                    source: source.to_string(),
                    line: index + 1,
                    kind: kind.to_string(),
                    severity: "high".to_string(),
                });
            }
        }
    }
    findings
}

fn write_acceptance_package(snapshot: &LoopRunSnapshot) -> Result<(), String> {
    let json_path = PathBuf::from(&snapshot.report_json_path);
    let markdown_path = PathBuf::from(&snapshot.report_markdown_path);
    if let Some(parent) = json_path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    if let Some(parent) = markdown_path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }

    let updated_at = unix_millis().to_string();
    let gates = acceptance_gates(snapshot);
    let verdict = acceptance_verdict(snapshot, &gates);
    let git = collect_git_evidence(&snapshot.project_path);
    let scope_gate = scope_gate_from_git(&snapshot.task_spec_path, &git);
    let ops_evidence = loop_ops_evidence_snapshot(snapshot);
    let steps = snapshot
        .steps
        .iter()
        .map(|step| {
            serde_json::json!({
                "id": step.id,
                "state": step.state,
                "agent": step.agent,
                "roleId": step.role_id,
                "providerId": step.provider_id,
                "status": step.status,
                "attemptCount": step.attempt_count,
                "maxAttempts": step.max_attempts,
                "requiresApproval": step.requires_approval,
                "lastError": step.last_error,
                "artifactPath": step.artifact_path,
                "evidencePath": step.evidence_path,
                "structuredReport": parse_structured_report_value(&step.structured_report_json),
                "startedAt": step.started_at,
                "finishedAt": step.finished_at,
            })
        })
        .collect::<Vec<_>>();

    let package = serde_json::json!({
        "version": 1,
        "kind": "acceptance-package",
        "updatedAt": updated_at,
        "loopId": snapshot.id,
        "projectId": snapshot.project_id,
        "projectPath": snapshot.project_path,
        "task": {
            "id": snapshot.task_id,
            "title": snapshot.task_title,
            "brief": snapshot.task_brief,
            "criteria": snapshot.task_criteria,
            "constraints": snapshot.task_constraints,
            "budgetLimit": snapshot.task_budget_limit,
            "specPath": snapshot.task_spec_path,
            "specChecksum": snapshot.task_spec_checksum,
            "scope": task_scope_from_spec(&snapshot.task_spec_path),
            "scopeGate": scope_gate,
        },
        "status": snapshot.status,
        "verdict": verdict,
        "gates": gates,
        "refs": {
            "manifestPath": snapshot.manifest_path,
            "artifactDir": snapshot.artifact_dir,
            "reportJsonPath": snapshot.report_json_path,
            "reportMarkdownPath": snapshot.report_markdown_path,
            "gitBaselinePath": snapshot.git_baseline_path,
            "gitWorkspacePath": loop_git_workspace_path(&snapshot.project_path, &snapshot.id).display().to_string(),
            "gitDiffPath": loop_git_diff_path(&snapshot.project_path, &snapshot.id).display().to_string(),
            "gitDiffStatPath": loop_git_diff_stat_path(&snapshot.project_path, &snapshot.id).display().to_string(),
            "commitProposalPath": snapshot.commit_proposal_path,
            "securityReportPath": snapshot.security_report_path,
            "memoryRefs": snapshot.memory_refs,
        },
        "gitSafety": {
            "baselinePath": snapshot.git_baseline_path,
            "commitProposalPath": snapshot.commit_proposal_path,
            "destructiveCommands": "deny_without_explicit_human_action",
            "push": "approval_required"
        },
        "steps": steps,
        "git": git,
        "scopeGate": scope_gate,
        "opsEvidence": ops_evidence,
        "security": {
            "reportPath": snapshot.security_report_path,
            "findings": collect_loop_secret_findings(snapshot)
        },
    });
    let json_content = serde_json::to_string_pretty(&package).map_err(|err| err.to_string())?;
    let markdown_content = acceptance_markdown(snapshot, &verdict, &gates);
    fs::write(&json_path, json_content).map_err(|err| err.to_string())?;
    fs::write(&markdown_path, markdown_content).map_err(|err| err.to_string())
}

fn acceptance_gates(snapshot: &LoopRunSnapshot) -> serde_json::Value {
    let all_steps_passed =
        !snapshot.steps.is_empty() && snapshot.steps.iter().all(|step| step.status == "passed");
    let has_artifacts = snapshot
        .steps
        .iter()
        .any(|step| !step.artifact_path.is_empty());
    let has_evidence = snapshot
        .steps
        .iter()
        .any(|step| !step.evidence_path.is_empty());
    let has_structured = snapshot
        .steps
        .iter()
        .any(|step| !step.structured_report_json.trim().is_empty());
    let has_task_spec =
        !snapshot.task_spec_path.is_empty() && !snapshot.task_spec_checksum.is_empty();
    let pending_approval = snapshot
        .steps
        .iter()
        .filter(|step| step.requires_approval)
        .count();
    let security_findings = collect_loop_secret_findings(snapshot).len();
    let real_provider_limit = real_provider_call_limit(snapshot.task_budget_limit);
    let real_provider_calls_used = snapshot
        .steps
        .iter()
        .filter(|step| step.provider_type == "cli" && step.provider_run_mode == "real")
        .map(|step| step.attempt_count)
        .sum::<i64>();
    let real_provider_budget_ok =
        real_provider_limit <= 0 || real_provider_calls_used <= real_provider_limit;
    let git = collect_git_evidence(&snapshot.project_path);
    let scope_gate = scope_gate_from_git(&snapshot.task_spec_path, &git);
    let scope_passed = scope_gate
        .get("passed")
        .and_then(|value| value.as_bool())
        .unwrap_or(false);
    let scope_verified = scope_gate
        .get("verified")
        .and_then(|value| value.as_bool())
        .unwrap_or(false);
    let scope_outside_allowed = json_array_len(&scope_gate, "outsideAllowed");
    let scope_denied_matches = json_array_len(&scope_gate, "deniedMatches");
    let ops_evidence = loop_ops_evidence_snapshot(snapshot);
    let real_cli_enabled = ops_evidence
        .get("realCli")
        .and_then(|value| value.get("enabled"))
        .and_then(|value| value.as_bool())
        .unwrap_or(false);
    let real_ops_preflight_ready = !real_cli_enabled
        || (ops_evidence
            .get("preflight")
            .and_then(|value| value.get("status"))
            .and_then(|value| value.as_str())
            == Some("ready_to_run")
            && ops_evidence
                .get("preflight")
                .and_then(|value| value.get("blockers"))
                .and_then(|value| value.as_u64())
                .unwrap_or(1)
                == 0);
    let real_ops_operator_ready = !real_cli_enabled
        || (ops_evidence
            .get("operator")
            .and_then(|value| value.get("blockers"))
            .and_then(|value| value.as_u64())
            .unwrap_or(1)
            == 0
            && ["ready_to_start_real_micro", "real_profile_already_active"].contains(
                &ops_evidence
                    .get("operator")
                    .and_then(|value| value.get("status"))
                    .and_then(|value| value.as_str())
                    .unwrap_or(""),
            ));
    let real_ops_approval_ready = !real_cli_enabled
        || (ops_evidence
            .get("operatorApproval")
            .and_then(|value| value.get("matchesCurrentChecklist"))
            .and_then(|value| value.as_bool())
            .unwrap_or(false)
            && ops_evidence
                .get("approvalLedger")
                .and_then(|value| value.get("ready"))
                .and_then(|value| value.as_bool())
                .unwrap_or(false));

    serde_json::json!({
        "allStepsPassed": all_steps_passed,
        "hasArtifacts": has_artifacts,
        "hasEvidenceFiles": has_evidence,
        "hasStructuredReports": has_structured,
        "hasTaskSpec": has_task_spec,
        "pendingApprovals": pending_approval,
        "securityFindings": security_findings,
        "hasSecurityReport": !snapshot.security_report_path.is_empty(),
        "realProviderCallLimit": real_provider_limit,
        "realProviderCallsUsed": real_provider_calls_used,
        "realProviderBudgetOk": real_provider_budget_ok,
        "scopeVerified": scope_verified,
        "scopePassed": scope_passed,
        "scopeOutsideAllowed": scope_outside_allowed,
        "scopeDeniedMatches": scope_denied_matches,
        "realOpsPreflightReady": real_ops_preflight_ready,
        "realOpsOperatorReady": real_ops_operator_ready,
        "realOpsApprovalReady": real_ops_approval_ready,
    })
}

fn acceptance_verdict(snapshot: &LoopRunSnapshot, gates: &serde_json::Value) -> String {
    if snapshot.status == "completed"
        && gates
            .get("allStepsPassed")
            .and_then(|value| value.as_bool())
            .unwrap_or(false)
        && gates
            .get("pendingApprovals")
            .and_then(|value| value.as_u64())
            .unwrap_or(1)
            == 0
        && gates
            .get("securityFindings")
            .and_then(|value| value.as_u64())
            .unwrap_or(1)
            == 0
        && gates
            .get("scopePassed")
            .and_then(|value| value.as_bool())
            .unwrap_or(false)
        && gates
            .get("realOpsPreflightReady")
            .and_then(|value| value.as_bool())
            .unwrap_or(false)
        && gates
            .get("realOpsOperatorReady")
            .and_then(|value| value.as_bool())
            .unwrap_or(false)
        && gates
            .get("realOpsApprovalReady")
            .and_then(|value| value.as_bool())
            .unwrap_or(false)
    {
        "accepted".to_string()
    } else if snapshot.status == "running" {
        "running".to_string()
    } else {
        "blocked".to_string()
    }
}

fn parse_structured_report_value(raw: &str) -> serde_json::Value {
    if raw.trim().is_empty() {
        return serde_json::Value::Null;
    }
    serde_json::from_str(raw).unwrap_or_else(|_| serde_json::Value::String(raw.to_string()))
}

fn acceptance_markdown(
    snapshot: &LoopRunSnapshot,
    verdict: &str,
    gates: &serde_json::Value,
) -> String {
    let mut lines = vec![
        format!("# Acceptance Package: {}", snapshot.task_title),
        String::new(),
        format!("Loop: {}", snapshot.id),
        format!("Task: {} - {}", snapshot.task_id, snapshot.task_title),
        format!("Status: {}", snapshot.status),
        format!("Verdict: {verdict}"),
        format!(
            "Task Spec: {}#{}",
            snapshot.task_spec_path, snapshot.task_spec_checksum
        ),
        format!("Manifest: {}", snapshot.manifest_path),
        format!("Artifacts: {}", snapshot.artifact_dir),
        format!("JSON Report: {}", snapshot.report_json_path),
        format!("Security Report: {}", snapshot.security_report_path),
        format!("Git Baseline: {}", snapshot.git_baseline_path),
        format!(
            "Git Workspace: {}",
            loop_git_workspace_path(&snapshot.project_path, &snapshot.id).display()
        ),
        format!(
            "Git Diff: {}",
            loop_git_diff_path(&snapshot.project_path, &snapshot.id).display()
        ),
        format!("Commit Proposal: {}", snapshot.commit_proposal_path),
        String::new(),
        "## Task Scope".to_string(),
        task_scope_from_spec(&snapshot.task_spec_path),
        String::new(),
        "## Gates".to_string(),
    ];

    if let Some(map) = gates.as_object() {
        for (key, value) in map {
            lines.push(format!("- {key}: {value}"));
        }
    }

    let git = collect_git_evidence(&snapshot.project_path);
    let scope_gate = scope_gate_from_git(&snapshot.task_spec_path, &git);
    lines.extend([String::new(), "## Scope Gate".to_string()]);
    for key in [
        "mode",
        "verified",
        "passed",
        "changedFiles",
        "outsideAllowed",
        "deniedMatches",
    ] {
        let value = scope_gate
            .get(key)
            .cloned()
            .unwrap_or(serde_json::Value::Null);
        lines.push(format!("- {key}: {value}"));
    }

    lines.extend([String::new(), "## Steps".to_string()]);
    for step in &snapshot.steps {
        lines.push(format!(
            "- {}: {} by {} (artifact: {}; evidence: {})",
            step.state,
            step.status,
            step.agent,
            empty_as_missing(&step.artifact_path),
            empty_as_missing(&step.evidence_path)
        ));
        if !step.last_error.is_empty() {
            lines.push(format!("  - Error: {}", step.last_error));
        }
        if !step.structured_report_json.trim().is_empty() {
            let report = parse_structured_report_value(&step.structured_report_json);
            let verdict = report
                .get("verdict")
                .and_then(|value| value.as_str())
                .unwrap_or("n/a");
            let summary = report
                .get("summary")
                .and_then(|value| value.as_str())
                .unwrap_or("");
            lines.push(format!("  - Structured verdict: {verdict} - {summary}"));
        }
    }

    lines.extend([String::new(), "## Memory Refs".to_string()]);
    if snapshot.memory_refs.is_empty() {
        lines.push("- none".to_string());
    } else {
        for item in &snapshot.memory_refs {
            lines.push(format!("- {item}"));
        }
    }

    lines.push(String::new());
    lines.join("\n")
}

fn empty_as_missing(value: &str) -> &str {
    if value.is_empty() {
        "missing"
    } else {
        value
    }
}

fn prepare_step_retry(
    conn: &Connection,
    run: &LoopRunRow,
    enforce_attempt_limit: bool,
) -> Result<(), String> {
    let step = read_loop_step(conn, &run.id, run.active_step_index)?;
    if enforce_attempt_limit && step.attempt_count >= step.max_attempts {
        return Err(format!(
            "Step {} already used {}/{} attempts.",
            step.id, step.attempt_count, step.max_attempts
        ));
    }

    conn.execute(
        "update loop_steps
         set status = 'running', requires_approval = 0, last_error = '', output = '', structured_report_json = '', artifact_path = '', evidence_path = '',
             started_at = datetime('now'), finished_at = ''
         where loop_id = ?1 and step_index = ?2",
        params![run.id, run.active_step_index],
    )
    .map_err(|err| err.to_string())?;

    conn.execute(
        "update loop_runs set status = 'running', updated_at = datetime('now'), completed_at = null where id = ?1",
        params![run.id],
    )
    .map_err(|err| err.to_string())?;

    Ok(())
}

fn write_step_artifact(
    run: &LoopRunRow,
    loop_id: &str,
    step: &LoopStepSnapshot,
    status: &str,
    report: &StepStructuredReport,
    output: &str,
) -> Result<String, String> {
    let dir = PathBuf::from(&run.artifact_dir);
    fs::create_dir_all(&dir).map_err(|err| err.to_string())?;
    let path = dir.join(format!("{:02}-{}.md", artifact_order(&step.state), step.id));
    let content = format!(
        "# Loop Step Artifact\n\nLoop: {loop_id}\nTask: {} - {}\nTask Spec: {}#{}\nMemory Refs: {}\nStep: {}\nState: {}\nAgent: {}\nRole: {}\nProvider: {}\nStatus: {}\n\n## Structured Report\n\n```json\n{}\n```\n\n## Summary\n{}\n\n## Evidence\n{}\n\n## Output\n{}\n",
        run.task_id,
        run.task_title,
        run.task_spec_path,
        run.task_spec_checksum,
        run.memory_refs.join(", "),
        step.id,
        step.state,
        step.agent,
        step.role_id,
        step.provider_id,
        status,
        serde_json::to_string_pretty(report).map_err(|err| err.to_string())?,
        step.summary,
        step.evidence,
        output
    );
    fs::write(&path, content).map_err(|err| err.to_string())?;
    Ok(path.display().to_string())
}

fn write_step_evidence(
    run: &LoopRunRow,
    loop_id: &str,
    step: &LoopStepSnapshot,
    status: &str,
    report: &StepStructuredReport,
    artifact_path: &str,
    output: &str,
) -> Result<String, String> {
    let dir = PathBuf::from(&run.project_path)
        .join(".dbc")
        .join("evidence")
        .join(loop_id);
    fs::create_dir_all(&dir).map_err(|err| err.to_string())?;
    let path = dir.join(format!(
        "{:02}-{}.json",
        artifact_order(&step.state),
        step.id
    ));
    let git = collect_git_evidence(&run.project_path);
    let scope_gate = scope_gate_from_git(&run.task_spec_path, &git);
    let content = serde_json::to_string_pretty(&serde_json::json!({
        "version": 1,
        "loopId": loop_id,
        "taskId": run.task_id,
        "taskTitle": run.task_title,
        "taskSpecPath": run.task_spec_path,
        "taskSpecChecksum": run.task_spec_checksum,
        "memoryContext": run.memory_context,
        "memoryRefs": run.memory_refs,
        "stepId": step.id,
        "state": step.state,
        "agent": step.agent,
        "roleId": step.role_id,
        "providerId": step.provider_id,
        "providerType": step.provider_type,
        "status": status,
        "structuredReport": report,
        "attemptCount": step.attempt_count + 1,
        "maxAttempts": step.max_attempts,
        "artifactPath": artifact_path,
        "outputExcerpt": trim_output(output, 6000),
        "git": git,
        "scopeGate": scope_gate,
        "gitWorkspace": {
            "workspacePath": loop_git_workspace_path(&run.project_path, loop_id).display().to_string(),
            "diffPath": loop_git_diff_path(&run.project_path, loop_id).display().to_string(),
            "diffStatPath": loop_git_diff_stat_path(&run.project_path, loop_id).display().to_string()
        },
        "capturedAt": unix_millis().to_string(),
    }))
    .map_err(|err| err.to_string())?;
    fs::write(&path, content).map_err(|err| err.to_string())?;
    Ok(path.display().to_string())
}

fn collect_git_evidence(project_path: &str) -> serde_json::Value {
    let inside = run_git_capture(project_path, &["rev-parse", "--is-inside-work-tree"]);
    let is_repo = inside.status == "success" && inside.output.trim() == "true";
    if !is_repo {
        return serde_json::json!({
            "isGitRepo": false,
            "status": inside.status,
            "message": trim_output(&inside.output, 1000),
        });
    }

    let status = run_git_capture(project_path, &["status", "--short"]);
    let diff_stat = run_git_capture(project_path, &["diff", "--stat"]);
    let changed = run_git_capture(project_path, &["diff", "--name-only"]);
    let branch = run_git_capture(project_path, &["branch", "--show-current"]);
    let head = run_git_capture(project_path, &["rev-parse", "--short", "HEAD"]);
    let changed_files = changed_files_from_git_outputs(&status.output, &changed.output);

    serde_json::json!({
        "isGitRepo": true,
        "branch": trim_output(&branch.output, 200),
        "head": trim_output(&head.output, 200),
        "statusShort": trim_output(&status.output, 8000),
        "diffStat": trim_output(&diff_stat.output, 8000),
        "changedFiles": changed_files,
    })
}

fn changed_files_from_git_outputs(status_short: &str, diff_name_only: &str) -> Vec<String> {
    let mut changed_files = diff_name_only
        .lines()
        .map(normalize_scope_path)
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>();
    for line in status_short.lines() {
        let trimmed = line.trim();
        if trimmed.len() <= 3 {
            continue;
        }
        let path = normalize_scope_path(trimmed.get(3..).unwrap_or("").trim());
        if !path.is_empty() && !changed_files.contains(&path) {
            changed_files.push(path);
        }
    }
    changed_files.sort();
    changed_files
}

struct CaptureResult {
    status: String,
    output: String,
}

fn run_git_capture(project_path: &str, args: &[&str]) -> CaptureResult {
    match Command::new("git")
        .arg("-C")
        .arg(project_path)
        .args(args)
        .output()
    {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            CaptureResult {
                status: if output.status.success() {
                    "success"
                } else {
                    "failed"
                }
                .to_string(),
                output: redact_text(&(stdout + &stderr)),
            }
        }
        Err(err) => CaptureResult {
            status: "not_available".to_string(),
            output: err.to_string(),
        },
    }
}

struct StepExecution {
    status: String,
    output: String,
    report: StepStructuredReport,
}

fn budget_guard_execution(
    conn: &Connection,
    run: &LoopRunRow,
    step: &LoopStepSnapshot,
) -> Result<Option<StepExecution>, String> {
    if step.provider_type != "cli" || step.provider_run_mode != "real" {
        return Ok(None);
    }
    let limit = real_provider_call_limit(run.task_budget_limit);
    if limit <= 0 {
        return Ok(None);
    }
    let used = real_provider_calls_used(conn, &run.id)?;
    if used < limit {
        return Ok(None);
    }

    let output = format!(
        "Budget guard blocked real provider call. Used {used}/{limit} allowed real CLI call(s) for budgetLimit {}.",
        run.task_budget_limit
    );
    Ok(Some(StepExecution {
        status: "blocked".to_string(),
        output: output.clone(),
        report: StepStructuredReport {
            verdict: "blocked".to_string(),
            summary: output,
            actions: vec![
                "Review task budgetLimit and operator checklist before retrying.".to_string(),
                "Increase the task budget only after human confirmation.".to_string(),
            ],
            files_touched: Vec::new(),
            evidence: vec![format!(
                "Real provider call budget: {used}/{limit}; step {} was not executed.",
                step.id
            )],
            risks: vec!["Prevented unbounded model/provider execution.".to_string()],
            next_action: "Adjust budgetLimit or reduce provider calls, then retry deliberately."
                .to_string(),
        },
    }))
}

fn real_provider_call_limit(task_budget_limit: f64) -> i64 {
    if task_budget_limit <= 0.0 {
        0
    } else {
        (task_budget_limit.ceil() as i64).max(1) * 4
    }
}

fn real_provider_calls_used(conn: &Connection, loop_id: &str) -> Result<i64, String> {
    conn.query_row(
        "select coalesce(sum(attempt_count), 0)
         from loop_steps
         where loop_id = ?1 and provider_type = 'cli' and provider_run_mode = 'real'",
        params![loop_id],
        |row| row.get(0),
    )
    .map_err(|err| err.to_string())
}

fn execute_loop_step(run: &LoopRunRow, step: &LoopStepSnapshot) -> StepExecution {
    if step.provider_type == "local_runner" || step.agent_mode == "command_runner" {
        return execute_local_commands(run, step);
    }

    if step.provider_run_mode != "real" || step.provider_type == "mock" {
        let output = format!(
            "{} completed in mock mode by {} through provider {}.",
            step.state, step.agent, step.provider_id
        );
        return StepExecution {
            status: "passed".to_string(),
            report: fallback_report_from_status("passed", &output),
            output,
        };
    }

    let prompt = build_backend_prompt(run, step);
    let prompt_findings = scan_text_for_secret_findings("cli.prompt", &prompt);
    if !prompt_findings.is_empty() {
        let output = format!(
            "Security gate blocked real CLI prompt before send. {} secret-like finding(s) detected; values were not written to logs.",
            prompt_findings.len()
        );
        return StepExecution {
            status: "blocked".to_string(),
            report: StepStructuredReport {
                verdict: "blocked".to_string(),
                summary: output.clone(),
                actions: vec![
                    "Review task spec, memory, and constraints for secret-like content."
                        .to_string(),
                ],
                files_touched: Vec::new(),
                evidence: vec!["Prompt secret scan ran before CLI execution.".to_string()],
                risks: vec!["Potential secret exposure prevented.".to_string()],
                next_action:
                    "Remove secret-like values or replace them with references before retry."
                        .to_string(),
            },
            output,
        };
    }
    let args_template =
        normalize_args_template(&step.provider_command, &step.provider_args_template);
    let prompt_mode = normalize_prompt_mode(
        &step.provider_command,
        &args_template,
        &step.provider_prompt_mode,
    );
    let args = normalize_cli_args(
        &step.provider_command,
        parse_args_template(&args_template, &prompt, &run.project_path),
    );
    let request = CliRunRequest {
        command: step.provider_command.clone(),
        args,
        prompt: if prompt_mode == "arg" {
            String::new()
        } else {
            prompt
        },
        cwd: run.project_path.clone(),
        prompt_mode,
        timeout_seconds: step.timeout_seconds,
        max_output_bytes: step.max_output_bytes,
        policy_mode: if step.agent_mode == "write_workspace" {
            "allow".to_string()
        } else {
            "review".to_string()
        },
    };
    let result = run_cli_provider(request);
    let report = report_from_cli_result(&result);
    StepExecution {
        status: status_from_report(&report),
        output: result.redacted_output,
        report,
    }
}

fn execute_local_commands(run: &LoopRunRow, step: &LoopStepSnapshot) -> StepExecution {
    if step.local_commands.is_empty() {
        let output =
            "No local commands configured; local runner step passed as configuration-only."
                .to_string();
        return StepExecution {
            status: "passed".to_string(),
            report: fallback_report_from_status("passed", &output),
            output,
        };
    }

    let mut output = String::new();
    for command_line in &step.local_commands {
        let decision = classify_command(command_line.clone());
        if decision == "deny" {
            output.push_str(&format!("\n## {command_line}\nDenied by command policy.\n"));
            return StepExecution {
                status: "blocked".to_string(),
                report: fallback_report_from_status("blocked", &output),
                output,
            };
        }
        if decision == "approval" || decision == "approval_required" {
            output.push_str(&format!("\n## {command_line}\nRequires human approval.\n"));
            return StepExecution {
                status: "approval_required".to_string(),
                report: fallback_report_from_status("approval_required", &output),
                output,
            };
        }

        let parts = split_command_line(command_line);
        if parts.is_empty() {
            continue;
        }
        let request = CliRunRequest {
            command: parts[0].clone(),
            args: parts[1..].to_vec(),
            prompt: String::new(),
            cwd: run.project_path.clone(),
            prompt_mode: "stdin".to_string(),
            timeout_seconds: step.timeout_seconds,
            max_output_bytes: step.max_output_bytes,
            policy_mode: "allow".to_string(),
        };
        let result = run_cli_provider(request);
        output.push_str(&format!(
            "\n## {command_line}\nStatus: {}\nExit: {:?}\n\n{}\n",
            result.status, result.exit_code, result.redacted_output
        ));
        if result.status != "success" {
            let report = report_from_cli_result(&result);
            return StepExecution {
                status: status_from_report(&report),
                output,
                report,
            };
        }
    }

    StepExecution {
        status: "passed".to_string(),
        report: fallback_report_from_status("passed", &output),
        output,
    }
}

fn report_from_cli_result(result: &CliRunResult) -> StepStructuredReport {
    if result.status == "success" {
        return report_from_output(&result.redacted_output);
    }

    let status = match result.status.as_str() {
        "approval_required" => "approval_required",
        "blocked_by_policy" => "blocked",
        _ => "failed",
    };
    fallback_report_from_status(status, &result.redacted_output)
}

fn report_from_output(output: &str) -> StepStructuredReport {
    parse_structured_report(output)
        .unwrap_or_else(|| fallback_report_from_status(&verdict_from_output(output), output))
}

fn status_from_report(report: &StepStructuredReport) -> String {
    match report.verdict.as_str() {
        "pass" | "passed" => "passed".to_string(),
        "approval_required" => "approval_required".to_string(),
        "blocked" => "blocked".to_string(),
        "request_changes" | "fail" | "failed" => "failed".to_string(),
        _ => "failed".to_string(),
    }
}

fn parse_structured_report(output: &str) -> Option<StepStructuredReport> {
    let json = extract_first_json_object(output)?;
    let value: serde_json::Value = serde_json::from_str(&json).ok()?;
    Some(StepStructuredReport {
        verdict: normalize_verdict(value.get("verdict")?.as_str()?),
        summary: value
            .get("summary")
            .and_then(|item| item.as_str())
            .unwrap_or("No summary provided.")
            .to_string(),
        actions: json_string_array(&value, "actions"),
        files_touched: json_string_array(&value, "filesTouched"),
        evidence: json_string_array(&value, "evidence"),
        risks: json_string_array(&value, "risks"),
        next_action: value
            .get("nextAction")
            .and_then(|item| item.as_str())
            .unwrap_or("")
            .to_string(),
    })
}

fn fallback_report_from_status(status: &str, output: &str) -> StepStructuredReport {
    let verdict = match status {
        "passed" | "pass" => "pass",
        "approval_required" => "approval_required",
        "blocked" => "blocked",
        "request_changes" => "request_changes",
        _ => "fail",
    };
    StepStructuredReport {
        verdict: verdict.to_string(),
        summary: trim_output(output, 800),
        actions: Vec::new(),
        files_touched: Vec::new(),
        evidence: Vec::new(),
        risks: if verdict == "pass" {
            Vec::new()
        } else {
            vec![trim_output(output, 300)]
        },
        next_action: if verdict == "pass" {
            "continue".to_string()
        } else {
            "review".to_string()
        },
    }
}

fn verdict_from_output(output: &str) -> String {
    let lowered = output.to_lowercase();
    if lowered.contains("verdict: fail") || lowered.contains("## verdict\nfail") {
        "fail".to_string()
    } else if lowered.contains("verdict: request_changes") || lowered.contains("request_changes") {
        "request_changes".to_string()
    } else if lowered.contains("verdict: approval_required")
        || lowered.contains("approval_required")
    {
        "approval_required".to_string()
    } else {
        "pass".to_string()
    }
}

fn normalize_verdict(value: &str) -> String {
    match value.trim().to_lowercase().as_str() {
        "pass" | "passed" | "ok" | "success" => "pass".to_string(),
        "approval_required" | "approval-required" | "approval required" => {
            "approval_required".to_string()
        }
        "request_changes" | "changes_requested" | "request changes" => {
            "request_changes".to_string()
        }
        "blocked" => "blocked".to_string(),
        _ => "fail".to_string(),
    }
}

fn json_string_array(value: &serde_json::Value, key: &str) -> Vec<String> {
    value
        .get(key)
        .and_then(|item| item.as_array())
        .map(|items| {
            items
                .iter()
                .filter_map(|item| item.as_str().map(|value| value.to_string()))
                .collect::<Vec<_>>()
        })
        .unwrap_or_default()
}

fn extract_first_json_object(output: &str) -> Option<String> {
    let start = output.find('{')?;
    let mut depth = 0_i32;
    let mut in_string = false;
    let mut escaped = false;
    for (offset, ch) in output[start..].char_indices() {
        if in_string {
            if escaped {
                escaped = false;
            } else if ch == '\\' {
                escaped = true;
            } else if ch == '"' {
                in_string = false;
            }
            continue;
        }

        match ch {
            '"' => in_string = true,
            '{' => depth += 1,
            '}' => {
                depth -= 1;
                if depth == 0 {
                    return Some(output[start..start + offset + ch.len_utf8()].to_string());
                }
            }
            _ => {}
        }
    }
    None
}

fn build_backend_prompt(run: &LoopRunRow, step: &LoopStepSnapshot) -> String {
    let criteria = list_or_placeholder(&run.task_criteria, "No acceptance criteria were provided.");
    let constraints = list_or_placeholder(&run.task_constraints, "No constraints were provided.");
    let task_scope = task_scope_from_spec(&run.task_spec_path);
    let memory = if run.memory_context.trim().is_empty() {
        "No project memory notes were supplied.".to_string()
    } else {
        run.memory_context.clone()
    };
    if step.state == "planned" {
        return format!(
            "DBC role: {}\nMode: {}\nStep: planned\nProject path: {}\nTask: {} - {}\nTask spec: {}#{}\nBudget limit: {} budget unit(s); DBC allows up to {} real CLI call(s) for this loop.\n\nBrief:\n{}\n\nAcceptance criteria:\n{}\n\nConstraints:\n{}\n\nTask scope:\n{}\n\nProject memory:\n{}\n\nYou are executing the planning step now. Create a bounded implementation plan for this task. Do not treat old files under .dbc/artifacts as proof of this run; previous failed CLI artifacts are historical noise unless they reveal a current blocker.\n\nReturn exactly one JSON object and no prose. Schema:\n{{\"verdict\":\"pass|request_changes|approval_required|fail\",\"summary\":\"bounded plan summary with scope, risks, and stop conditions\",\"actions\":[\"implementation step\"],\"filesTouched\":[\"path or empty if none\"],\"evidence\":[\"evidence item\"],\"risks\":[\"risk or blocker\"],\"nextAction\":\"continue|retry|request_changes|approval\"}}\nUse verdict=pass only if the JSON contains concrete actions, risks, and stop conditions in summary/actions/risks.",
            step.agent,
            step.agent_mode,
            run.project_path,
            run.task_id,
            run.task_title,
            run.task_spec_path,
            run.task_spec_checksum,
            run.task_budget_limit,
            real_provider_call_limit(run.task_budget_limit),
            run.task_brief,
            criteria,
            constraints,
            task_scope,
            memory
        );
    }

    format!(
        "DBC role: {}\nMode: {}\nStep: {}\nProject path: {}\nTask: {} - {}\nTask spec: {}#{}\nBudget limit: {} budget unit(s); DBC allows up to {} real CLI call(s) for this loop.\n\nBrief:\n{}\n\nAcceptance criteria:\n{}\n\nConstraints:\n{}\n\nTask scope:\n{}\n\nProject memory:\n{}\n\nStep expectation:\n{}\n\nEvidence so far:\n{}\n\nPerform this loop step against the current task. Do not mark success from placeholder text alone.\n\nReturn exactly one JSON object and no prose. Schema:\n{{\"verdict\":\"pass|request_changes|approval_required|fail\",\"summary\":\"what happened and why\",\"actions\":[\"action performed or checked\"],\"filesTouched\":[\"path or empty if none\"],\"evidence\":[\"artifact, command, diff, or check\"],\"risks\":[\"risk or blocker\"],\"nextAction\":\"continue|retry|request_changes|approval\"}}",
        step.agent,
        step.agent_mode,
        step.state,
        run.project_path,
        run.task_id,
        run.task_title,
        run.task_spec_path,
        run.task_spec_checksum,
        run.task_budget_limit,
        real_provider_call_limit(run.task_budget_limit),
        run.task_brief,
        criteria,
        constraints,
        task_scope,
        memory,
        step.summary,
        step.evidence
    )
}

fn task_scope_from_spec(task_spec_path: &str) -> String {
    let spec = read_json_optional(&PathBuf::from(task_spec_path));
    let Some(spec) = spec else {
        return "Task spec scope metadata is unavailable.".to_string();
    };
    let priority = spec
        .get("priority")
        .and_then(|value| value.as_str())
        .unwrap_or("normal");
    let loop_profile = spec
        .get("loopProfile")
        .and_then(|value| value.as_str())
        .unwrap_or("mock");
    let provider_strategy = spec
        .get("providerStrategy")
        .and_then(|value| value.as_str())
        .unwrap_or("codex_build_claude_review");
    let allowed_paths = json_string_array(&spec, "allowedPaths");
    let denied_paths = json_string_array(&spec, "deniedPaths");
    let stop_conditions = json_string_array(&spec, "stopConditions");
    [
        format!("- Priority: {priority}"),
        format!("- Loop profile: {loop_profile}"),
        format!("- Provider strategy: {provider_strategy}"),
        format!(
            "- Allowed paths:\n{}",
            list_or_placeholder(&allowed_paths, "  - not configured")
        ),
        format!(
            "- Denied paths:\n{}",
            list_or_placeholder(&denied_paths, "  - not configured")
        ),
        format!(
            "- Stop conditions:\n{}",
            list_or_placeholder(&stop_conditions, "  - not configured")
        ),
    ]
    .join("\n")
}

fn scope_gate_from_git(task_spec_path: &str, git: &serde_json::Value) -> serde_json::Value {
    let spec = read_json_optional(&PathBuf::from(task_spec_path));
    let allowed_paths = spec
        .as_ref()
        .map(|value| json_string_array(value, "allowedPaths"))
        .unwrap_or_default();
    let denied_paths = spec
        .as_ref()
        .map(|value| json_string_array(value, "deniedPaths"))
        .unwrap_or_default();
    let changed_files = git
        .get("changedFiles")
        .and_then(|value| value.as_array())
        .map(|items| {
            items
                .iter()
                .filter_map(|value| value.as_str())
                .map(normalize_scope_path)
                .filter(|value| !value.is_empty())
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    let is_git_repo = git
        .get("isGitRepo")
        .and_then(|value| value.as_bool())
        .unwrap_or(false);
    let normalized_allowed = allowed_paths
        .iter()
        .map(|value| normalize_scope_path(value))
        .filter(|value| !value.is_empty())
        .collect::<Vec<_>>();
    let normalized_denied = denied_paths
        .iter()
        .map(|value| normalize_scope_path(value))
        .filter(|value| !value.is_empty())
        .collect::<Vec<_>>();
    let outside_allowed = if normalized_allowed.is_empty() {
        Vec::new()
    } else {
        changed_files
            .iter()
            .filter(|path| {
                !normalized_allowed
                    .iter()
                    .any(|allowed| scope_path_matches(path, allowed))
            })
            .cloned()
            .collect::<Vec<_>>()
    };
    let denied_matches = changed_files
        .iter()
        .filter(|path| {
            normalized_denied
                .iter()
                .any(|denied| scope_path_matches(path, denied))
        })
        .cloned()
        .collect::<Vec<_>>();
    let passed = outside_allowed.is_empty() && denied_matches.is_empty();
    let mode = if !is_git_repo {
        "unverified_non_git"
    } else if normalized_allowed.is_empty() {
        "broad_no_allowed_paths"
    } else {
        "git_changed_files"
    };

    serde_json::json!({
        "version": 1,
        "mode": mode,
        "verified": is_git_repo,
        "passed": passed,
        "allowedPaths": normalized_allowed,
        "deniedPaths": normalized_denied,
        "changedFiles": changed_files,
        "outsideAllowed": outside_allowed,
        "deniedMatches": denied_matches,
    })
}

fn normalize_scope_path(value: &str) -> String {
    value
        .trim()
        .trim_start_matches("./")
        .replace('\\', "/")
        .trim_end_matches('/')
        .to_string()
}

fn scope_path_matches(path: &str, scope: &str) -> bool {
    if scope.is_empty() {
        return false;
    }
    path == scope || path.starts_with(&format!("{scope}/"))
}

fn list_or_placeholder(items: &[String], placeholder: &str) -> String {
    if items.is_empty() {
        return placeholder.to_string();
    }
    items
        .iter()
        .map(|item| format!("- {item}"))
        .collect::<Vec<_>>()
        .join("\n")
}

fn parse_args_template(template: &str, prompt: &str, cwd: &str) -> Vec<String> {
    split_command_line(
        &template
            .replace("{{prompt}}", prompt)
            .replace("{{cwd}}", cwd),
    )
}

fn normalize_args_template(command: &str, template: &str) -> String {
    let trimmed = template.trim();
    if is_codex_command(command)
        && (trimmed.is_empty()
            || trimmed.contains("--ask-for-approval")
            || trimmed.contains("{{cwd}} -")
            || trimmed.contains("--cd {{cwd}}")
            || trimmed.ends_with(" -"))
    {
        return "exec --skip-git-repo-check --sandbox workspace-write --cd \"{{cwd}}\"".to_string();
    }
    if is_claude_command(command) && trimmed.is_empty() {
        return "-p".to_string();
    }
    template.to_string()
}

fn normalize_prompt_mode(command: &str, args_template: &str, prompt_mode: &str) -> String {
    if prompt_mode == "terminal" {
        return "terminal".to_string();
    }
    if (is_codex_command(command) || is_claude_command(command))
        && !args_template.contains("{{prompt}}")
    {
        return "stdin".to_string();
    }
    prompt_mode.to_string()
}

fn normalize_cli_args(command: &str, args: Vec<String>) -> Vec<String> {
    let is_codex = is_codex_command(command);
    let is_claude = is_claude_command(command);
    if !is_codex && !is_claude {
        return args;
    }

    let mut normalized = Vec::new();
    let mut index = 0;
    while index < args.len() {
        if is_codex && (args[index] == "--ask-for-approval" || args[index] == "-a") {
            index += if index + 1 < args.len() { 2 } else { 1 };
            continue;
        }
        if args[index] == "-" {
            index += 1;
            continue;
        }
        normalized.push(args[index].clone());
        index += 1;
    }
    normalized
}

fn is_codex_command(command: &str) -> bool {
    Path::new(command)
        .file_stem()
        .and_then(|value| value.to_str())
        .map(|value| value.eq_ignore_ascii_case("codex"))
        .unwrap_or_else(|| command.trim().eq_ignore_ascii_case("codex"))
}

fn is_claude_command(command: &str) -> bool {
    Path::new(command)
        .file_stem()
        .and_then(|value| value.to_str())
        .map(|value| value.eq_ignore_ascii_case("claude"))
        .unwrap_or_else(|| command.trim().eq_ignore_ascii_case("claude"))
}

fn is_exact_command_path(command: &str) -> bool {
    let trimmed = command.trim();
    Path::new(trimmed).is_absolute()
        || trimmed.contains('/')
        || trimmed.contains('\\')
        || trimmed
            .chars()
            .nth(1)
            .map(|value| value == ':')
            .unwrap_or(false)
}

fn validate_codex_contract(
    resolved_command: &Path,
    args_template: &str,
    prompt_mode: &str,
    diagnostics: &mut Vec<ProjectConfigDiagnostic>,
) {
    if prompt_mode == "terminal" {
        diagnostics.push(ProjectConfigDiagnostic {
            level: "warning".to_string(),
            subject: "terminal-contract".to_string(),
            detail: "Terminal mode requires a human-operated interactive terminal or PTY; DBC will stop before auto-execution.".to_string(),
        });
        return;
    }
    if !args_template.trim().starts_with("exec") {
        diagnostics.push(ProjectConfigDiagnostic {
            level: "error".to_string(),
            subject: "codex-contract".to_string(),
            detail: "Codex must use `exec` for non-interactive loop runs.".to_string(),
        });
    }
    if args_template.contains("--ask-for-approval") || args_template.trim_end().ends_with(" -") {
        diagnostics.push(ProjectConfigDiagnostic {
            level: "error".to_string(),
            subject: "codex-contract".to_string(),
            detail: "Codex args contain legacy flags that this installed CLI rejects.".to_string(),
        });
    }
    if prompt_mode != "stdin" && !args_template.contains("{{prompt}}") {
        diagnostics.push(ProjectConfigDiagnostic {
            level: "error".to_string(),
            subject: "codex-contract".to_string(),
            detail: "Codex prompt mode must be stdin unless the args template explicitly contains `{{prompt}}`.".to_string(),
        });
    }

    match Command::new(resolved_command)
        .args(["exec", "--help"])
        .output()
    {
        Ok(output) => {
            let help = trim_output(
                &(String::from_utf8_lossy(&output.stdout).to_string()
                    + &String::from_utf8_lossy(&output.stderr)),
                12000,
            );
            if output.status.success()
                && help.contains("Usage: codex exec")
                && help.contains("--cd")
                && help.contains("--sandbox")
            {
                diagnostics.push(ProjectConfigDiagnostic {
                    level: "ok".to_string(),
                    subject: "codex-contract".to_string(),
                    detail: "Installed Codex CLI exposes non-interactive `codex exec` with --cd and --sandbox.".to_string(),
                });
            } else {
                diagnostics.push(ProjectConfigDiagnostic {
                    level: "error".to_string(),
                    subject: "codex-contract".to_string(),
                    detail:
                        "Installed Codex CLI did not expose the expected `codex exec` contract."
                            .to_string(),
                });
            }
        }
        Err(err) => diagnostics.push(ProjectConfigDiagnostic {
            level: "error".to_string(),
            subject: "codex-contract".to_string(),
            detail: format!("Failed to run `codex exec --help`: {err}"),
        }),
    }
}

fn validate_claude_contract(
    resolved_command: &Path,
    args_template: &str,
    prompt_mode: &str,
    diagnostics: &mut Vec<ProjectConfigDiagnostic>,
) {
    if prompt_mode == "terminal" {
        diagnostics.push(ProjectConfigDiagnostic {
            level: "warning".to_string(),
            subject: "terminal-contract".to_string(),
            detail: "Terminal mode requires a human-operated interactive terminal or PTY; DBC will stop before auto-execution.".to_string(),
        });
        return;
    }
    let args = split_command_line(args_template);
    if !args.iter().any(|arg| arg == "-p" || arg == "--print") {
        diagnostics.push(ProjectConfigDiagnostic {
            level: "error".to_string(),
            subject: "claude-contract".to_string(),
            detail: "Claude Code must use `-p` or `--print` for non-interactive loop runs."
                .to_string(),
        });
    }
    if prompt_mode != "stdin" && !args_template.contains("{{prompt}}") {
        diagnostics.push(ProjectConfigDiagnostic {
            level: "error".to_string(),
            subject: "claude-contract".to_string(),
            detail: "Claude prompt mode must be stdin unless the args template explicitly contains `{{prompt}}`.".to_string(),
        });
    }

    match Command::new(resolved_command).arg("--help").output() {
        Ok(output) => {
            let help = trim_output(
                &(String::from_utf8_lossy(&output.stdout).to_string()
                    + &String::from_utf8_lossy(&output.stderr)),
                12000,
            );
            if output.status.success()
                && help.contains("--print")
                && help.contains("non-interactive")
            {
                diagnostics.push(ProjectConfigDiagnostic {
                    level: "ok".to_string(),
                    subject: "claude-contract".to_string(),
                    detail: "Installed Claude Code exposes non-interactive print mode.".to_string(),
                });
            } else {
                diagnostics.push(ProjectConfigDiagnostic {
                    level: "error".to_string(),
                    subject: "claude-contract".to_string(),
                    detail:
                        "Installed Claude Code did not expose the expected `-p/--print` contract."
                            .to_string(),
                });
            }
        }
        Err(err) => diagnostics.push(ProjectConfigDiagnostic {
            level: "error".to_string(),
            subject: "claude-contract".to_string(),
            detail: format!("Failed to run `claude --help`: {err}"),
        }),
    }
}

fn split_command_line(input: &str) -> Vec<String> {
    let mut args = Vec::new();
    let mut current = String::new();
    let mut quote: Option<char> = None;
    for ch in input.chars() {
        match (quote, ch) {
            (Some(q), c) if c == q => quote = None,
            (None, '"' | '\'') => quote = Some(ch),
            (None, c) if c.is_whitespace() => {
                if !current.is_empty() {
                    args.push(current.clone());
                    current.clear();
                }
            }
            _ => current.push(ch),
        }
    }
    if !current.is_empty() {
        args.push(current);
    }
    args
}

fn artifact_order(state: &str) -> i32 {
    match state {
        "planned" => 1,
        "coding" => 2,
        "building" => 3,
        "testing" => 4,
        "reviewing" => 5,
        "security" => 6,
        "acceptance" => 7,
        _ => 99,
    }
}

fn unix_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}

fn sanitize_file_stem(value: &str) -> String {
    let sanitized = value
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' {
                ch
            } else {
                '-'
            }
        })
        .collect::<String>()
        .trim_matches('-')
        .to_string();
    if sanitized.is_empty() {
        "task".to_string()
    } else {
        sanitized
    }
}

fn stable_checksum(content: &str) -> String {
    let mut hash: u64 = 0xcbf29ce484222325;
    for byte in content.as_bytes() {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("{hash:016x}")
}

fn provider_profile_doc(
    providers: &[serde_json::Value],
    profile: &str,
    updated_at: &str,
) -> serde_json::Value {
    let providers = providers
        .iter()
        .map(|provider| {
            let mut provider = provider.clone();
            let id = provider
                .get("id")
                .and_then(|value| value.as_str())
                .unwrap_or_default()
                .to_string();
            let run_mode = if profile == "real-micro"
                && ["codex_cli", "claude_code", "local_terminal"].contains(&id.as_str())
            {
                "real"
            } else {
                "mock"
            };
            if let Some(object) = provider.as_object_mut() {
                object.insert(
                    "runMode".to_string(),
                    serde_json::Value::String(run_mode.to_string()),
                );
            }
            provider
        })
        .collect::<Vec<_>>();
    serde_json::json!({
        "version": 1,
        "kind": "providers",
        "updatedAt": updated_at,
        "providers": providers,
    })
}

fn profile_header(name: &str, generated_at: &str) -> String {
    let command = if name == "mock" {
        "pnpm providers:apply-mock"
    } else {
        "pnpm providers:apply-real-micro"
    };
    format!(
        "# DBC provider profile: {name}\n# Generated: {generated_at}\n# Apply explicitly with {command} or through Settings.\n"
    )
}

fn stable_file_checksum(path: &Path) -> Result<String, String> {
    let bytes = fs::read(path).map_err(|err| err.to_string())?;
    let mut hash: u64 = 0xcbf29ce484222325;
    for byte in bytes {
        hash ^= byte as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    Ok(format!("{hash:016x}"))
}

fn read_json_optional(path: &Path) -> Option<serde_json::Value> {
    fs::read_to_string(path)
        .ok()
        .and_then(|content| serde_json::from_str::<serde_json::Value>(&content).ok())
}

fn evidence_diag(level: &str, subject: &str, detail: &str) -> serde_json::Value {
    serde_json::json!({
        "level": level,
        "subject": subject,
        "detail": detail
    })
}

fn read_json_artifact(
    subject: &str,
    path: &Path,
    diagnostics: &mut Vec<serde_json::Value>,
) -> serde_json::Value {
    match fs::read_to_string(path) {
        Ok(content) => match serde_json::from_str::<serde_json::Value>(&content) {
            Ok(value) => {
                diagnostics.push(evidence_diag("ok", subject, &path.display().to_string()));
                value
            }
            Err(err) => {
                diagnostics.push(evidence_diag(
                    "error",
                    subject,
                    &format!("{} parse error: {err}", path.display()),
                ));
                serde_json::Value::Null
            }
        },
        Err(err) => {
            diagnostics.push(evidence_diag(
                "error",
                subject,
                &format!("{} missing: {err}", path.display()),
            ));
            serde_json::Value::Null
        }
    }
}

fn read_text_artifact(
    subject: &str,
    path: &Path,
    diagnostics: &mut Vec<serde_json::Value>,
) -> serde_json::Value {
    match fs::read_to_string(path) {
        Ok(content) => {
            diagnostics.push(evidence_diag("ok", subject, &path.display().to_string()));
            serde_json::Value::String(content)
        }
        Err(err) => {
            diagnostics.push(evidence_diag(
                "warning",
                subject,
                &format!("{} missing: {err}", path.display()),
            ));
            serde_json::Value::String(String::new())
        }
    }
}

fn read_step_evidence_artifacts(
    dir: &Path,
    diagnostics: &mut Vec<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    if !dir.exists() {
        diagnostics.push(evidence_diag(
            "error",
            "step evidence",
            &format!("{} missing", dir.display()),
        ));
        return Ok(serde_json::Value::Array(Vec::new()));
    }
    let mut records = Vec::new();
    for entry in fs::read_dir(dir).map_err(|err| err.to_string())? {
        let entry = entry.map_err(|err| err.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|value| value.to_str()) != Some("json") {
            continue;
        }
        let mut value = read_json_artifact("step evidence", &path, diagnostics);
        if let Some(map) = value.as_object_mut() {
            map.insert(
                "path".to_string(),
                serde_json::Value::String(path.display().to_string()),
            );
        }
        records.push(value);
    }
    records.sort_by(|left, right| {
        left.get("path")
            .and_then(|value| value.as_str())
            .unwrap_or("")
            .cmp(
                right
                    .get("path")
                    .and_then(|value| value.as_str())
                    .unwrap_or(""),
            )
    });
    Ok(serde_json::Value::Array(records))
}

fn read_yaml_optional(path: &Path) -> Option<serde_json::Value> {
    fs::read_to_string(path)
        .ok()
        .and_then(|content| serde_yaml::from_str::<serde_json::Value>(&content).ok())
}

fn operator_check_file(
    subject: &str,
    path: &Path,
    checks: &mut Vec<serde_json::Value>,
    blockers: &mut Vec<serde_json::Value>,
) {
    if path.exists() {
        operator_pass(checks, subject, &path.display().to_string());
    } else {
        operator_fail(
            blockers,
            checks,
            subject,
            &format!("{} is missing.", path.display()),
        );
    }
}

fn operator_check_readiness(
    value: &Option<serde_json::Value>,
    checks: &mut Vec<serde_json::Value>,
    blockers: &mut Vec<serde_json::Value>,
    warnings: &mut Vec<serde_json::Value>,
) {
    let Some(report) = value else {
        operator_fail(
            blockers,
            checks,
            "readiness",
            "Readiness report is missing.",
        );
        return;
    };
    let blocker_count = json_array_len(report, "blockers");
    if blocker_count > 0 {
        operator_fail(
            blockers,
            checks,
            "readiness",
            &format!("Readiness has {blocker_count} blocker(s)."),
        );
    } else {
        operator_pass(
            checks,
            "readiness",
            &format!(
                "Status is {}.",
                report
                    .get("status")
                    .and_then(|value| value.as_str())
                    .unwrap_or("unknown")
            ),
        );
    }
    if let Some(items) = report.get("warnings").and_then(|value| value.as_array()) {
        for warning in items {
            let subject = warning
                .get("subject")
                .and_then(|value| value.as_str())
                .unwrap_or("readiness");
            let detail = warning
                .get("detail")
                .and_then(|value| value.as_str())
                .unwrap_or("");
            operator_warn(warnings, checks, &format!("readiness: {subject}"), detail);
        }
    }
}

fn operator_check_real_plan(
    value: &Option<serde_json::Value>,
    checks: &mut Vec<serde_json::Value>,
    blockers: &mut Vec<serde_json::Value>,
) {
    let Some(report) = value else {
        operator_fail(
            blockers,
            checks,
            "real micro plan",
            "Real micro plan is missing.",
        );
        return;
    };
    let status = report
        .get("status")
        .and_then(|value| value.as_str())
        .unwrap_or("missing");
    if status == "prepared" && json_array_len(report, "blockers") == 0 {
        let task_id = report
            .get("task")
            .and_then(|value| value.get("id"))
            .and_then(|value| value.as_str())
            .unwrap_or("unknown");
        operator_pass(
            checks,
            "real micro plan",
            &format!("Prepared task {task_id}."),
        );
    } else {
        operator_fail(
            blockers,
            checks,
            "real micro plan",
            &format!("Plan status is {status}."),
        );
    }
}

fn operator_check_comparison(
    value: &Option<serde_json::Value>,
    checks: &mut Vec<serde_json::Value>,
    blockers: &mut Vec<serde_json::Value>,
    warnings: &mut Vec<serde_json::Value>,
) {
    let Some(report) = value else {
        operator_fail(
            blockers,
            checks,
            "comparison",
            "Comparison report is missing.",
        );
        return;
    };
    let blocker_count = json_array_len(report, "blockers");
    let status = report
        .get("status")
        .and_then(|value| value.as_str())
        .unwrap_or("missing");
    if blocker_count > 0 {
        operator_fail(
            blockers,
            checks,
            "comparison",
            &format!("Comparison has {blocker_count} blocker(s)."),
        );
    } else if status == "pending_real" {
        operator_pass(
            checks,
            "comparison",
            "Controlled baseline is ready; real micro evidence is still pending.",
        );
    } else if status == "pass" || status == "pass_with_warnings" {
        operator_pass(
            checks,
            "comparison",
            &format!("Comparison status is {status}."),
        );
    } else {
        operator_warn(
            warnings,
            checks,
            "comparison",
            &format!("Comparison status is {status}; review before broader loops."),
        );
    }
}

fn operator_check_release(
    value: &Option<serde_json::Value>,
    checks: &mut Vec<serde_json::Value>,
    blockers: &mut Vec<serde_json::Value>,
) {
    let Some(report) = value else {
        operator_fail(blockers, checks, "release", "Release package is missing.");
        return;
    };
    let failed = report
        .get("checklist")
        .and_then(|value| value.as_object())
        .map(|items| {
            items
                .iter()
                .filter_map(|(key, value)| (value != true).then_some(key.to_string()))
                .collect::<Vec<_>>()
        })
        .unwrap_or_else(|| vec!["checklist".to_string()]);
    if failed.is_empty() {
        let checksum = report
            .get("checksums")
            .and_then(|value| value.get("dmg"))
            .and_then(|value| value.as_str())
            .unwrap_or("missing");
        operator_pass(checks, "release", &format!("Release checksum {checksum}."));
    } else {
        operator_fail(
            blockers,
            checks,
            "release",
            &format!("Release checklist has failing items: {}", failed.join(", ")),
        );
    }
}

fn operator_check_providers(
    providers: &[serde_json::Value],
    checks: &mut Vec<serde_json::Value>,
    blockers: &mut Vec<serde_json::Value>,
) {
    for id in ["codex_cli", "claude_code"] {
        let provider = providers
            .iter()
            .find(|provider| provider_string(provider, "id") == id);
        let Some(provider) = provider else {
            operator_fail(
                blockers,
                checks,
                &format!("provider {id}"),
                "Provider is missing.",
            );
            continue;
        };
        let command = provider_string(provider, "command");
        if !command.is_empty() && PathBuf::from(&command).exists() {
            operator_pass(
                checks,
                &format!("provider {id}"),
                &format!("Executable exists: {command}."),
            );
        } else {
            operator_fail(
                blockers,
                checks,
                &format!("provider {id}"),
                &format!(
                    "Executable is missing: {}.",
                    if command.is_empty() {
                        "(empty)"
                    } else {
                        &command
                    }
                ),
            );
        }
    }
    if let Some(provider) = providers
        .iter()
        .find(|provider| provider_string(provider, "id") == "local_terminal")
    {
        operator_pass(
            checks,
            "provider local_terminal",
            &format!("Run mode is {}.", provider_string(provider, "runMode")),
        );
    } else {
        operator_fail(
            blockers,
            checks,
            "provider local_terminal",
            "Local Terminal Runner is missing.",
        );
    }
}

fn operator_approval_matches(
    approval: &Option<serde_json::Value>,
    checklist_generated_at: &str,
    task_id: &str,
    budget_limit: f64,
) -> bool {
    let Some(approval) = approval else {
        return false;
    };
    let approved = approval
        .get("approved")
        .and_then(|value| value.as_bool())
        .unwrap_or(false);
    let approval_generated_at = approval
        .get("checklistGeneratedAt")
        .and_then(|value| value.as_str())
        .unwrap_or("");
    let approval_task_id = approval
        .get("taskId")
        .and_then(|value| value.as_str())
        .unwrap_or("");
    let approval_budget = approval
        .get("budgetLimit")
        .and_then(|value| value.as_f64())
        .unwrap_or(-1.0);
    approved
        && approval_generated_at == checklist_generated_at
        && approval_task_id == task_id
        && (approval_budget - budget_limit).abs() <= f64::EPSILON
}

fn operator_pass(checks: &mut Vec<serde_json::Value>, subject: &str, detail: &str) {
    checks.push(serde_json::json!({ "level": "ok", "subject": subject, "detail": detail }));
}

fn operator_warn(
    warnings: &mut Vec<serde_json::Value>,
    checks: &mut Vec<serde_json::Value>,
    subject: &str,
    detail: &str,
) {
    warnings.push(serde_json::json!({ "subject": subject, "detail": detail }));
    checks.push(serde_json::json!({ "level": "warning", "subject": subject, "detail": detail }));
}

fn operator_fail(
    blockers: &mut Vec<serde_json::Value>,
    checks: &mut Vec<serde_json::Value>,
    subject: &str,
    detail: &str,
) {
    blockers.push(serde_json::json!({ "subject": subject, "detail": detail }));
    checks.push(serde_json::json!({ "level": "error", "subject": subject, "detail": detail }));
}

fn operator_provider_summary(provider: &serde_json::Value) -> serde_json::Value {
    serde_json::json!({
        "id": provider_string(provider, "id"),
        "name": provider_string(provider, "name"),
        "type": provider_string(provider, "type"),
        "runMode": provider_string(provider, "runMode"),
        "command": provider_string(provider, "command"),
        "argsTemplate": provider_string(provider, "argsTemplate"),
    })
}

fn provider_string(provider: &serde_json::Value, key: &str) -> String {
    provider
        .get(key)
        .and_then(|value| value.as_str())
        .unwrap_or("")
        .to_string()
}

fn approval_decision_is_approved(dbc_dir: &Path, id: &str) -> bool {
    let path = dbc_dir
        .join("approvals")
        .join("decisions")
        .join(format!("{}.json", sanitize_file_stem(id)));
    read_json_optional(&path)
        .and_then(|value| {
            value
                .get("decision")
                .and_then(|decision| decision.as_str())
                .map(|decision| decision == "approved")
        })
        .unwrap_or(false)
}

fn preflight_check_file(
    subject: &str,
    path: &Path,
    checks: &mut Vec<serde_json::Value>,
    blockers: &mut Vec<serde_json::Value>,
) {
    if path.exists() {
        operator_pass(checks, subject, &path.display().to_string());
    } else {
        operator_fail(
            blockers,
            checks,
            subject,
            &format!("{} is missing.", path.display()),
        );
    }
}

fn preflight_check_task(
    task: &Option<serde_json::Value>,
    checks: &mut Vec<serde_json::Value>,
    blockers: &mut Vec<serde_json::Value>,
    warnings: &mut Vec<serde_json::Value>,
) {
    let Some(task) = task else {
        return;
    };
    let task_id = json_str(task, "id");
    if task_id == "REAL-MICRO-README" {
        operator_pass(checks, "task id", &task_id);
    } else {
        operator_fail(
            blockers,
            checks,
            "task id",
            &format!("Expected REAL-MICRO-README, got {task_id}."),
        );
    }
    let loop_profile = json_str(task, "loopProfile");
    if loop_profile == "real_micro" {
        operator_pass(checks, "task profile", "real_micro");
    } else {
        operator_fail(
            blockers,
            checks,
            "task profile",
            &format!("Expected real_micro, got {loop_profile}."),
        );
    }
    let budget_limit = task
        .get("budgetLimit")
        .and_then(|value| value.as_f64())
        .unwrap_or(0.0);
    if budget_limit > 0.0 {
        operator_pass(
            checks,
            "task budget",
            &format!("budgetLimit {budget_limit}"),
        );
    } else {
        operator_fail(
            blockers,
            checks,
            "task budget",
            "Real micro task requires positive budgetLimit.",
        );
    }
    let allowed_paths = task
        .get("allowedPaths")
        .and_then(|value| value.as_array())
        .cloned()
        .unwrap_or_default();
    if allowed_paths
        .iter()
        .any(|value| value.as_str() == Some("README.md"))
    {
        operator_pass(checks, "task scope", "README.md allowed.");
    } else {
        operator_fail(
            blockers,
            checks,
            "task scope",
            "README.md must be in allowedPaths.",
        );
    }
    let denied_paths = task
        .get("deniedPaths")
        .and_then(|value| value.as_array())
        .cloned()
        .unwrap_or_default();
    if denied_paths
        .iter()
        .any(|value| value.as_str() == Some(".env"))
    {
        operator_pass(checks, "task denied paths", ".env denied.");
    } else {
        operator_warn(
            warnings,
            checks,
            "task denied paths",
            ".env is not explicitly denied.",
        );
    }
}

fn preflight_check_operator(
    operator: &Option<serde_json::Value>,
    approval: &Option<serde_json::Value>,
    checks: &mut Vec<serde_json::Value>,
    blockers: &mut Vec<serde_json::Value>,
    warnings: &mut Vec<serde_json::Value>,
) {
    let Some(operator) = operator else {
        return;
    };
    if json_str(operator, "kind") != "operator-checklist" {
        operator_fail(
            blockers,
            checks,
            "operator checklist",
            "Invalid checklist kind.",
        );
        return;
    }
    let blocker_count = json_array_len(operator, "blockers");
    if blocker_count > 0 {
        operator_fail(
            blockers,
            checks,
            "operator checklist",
            &format!("{blocker_count} blocker(s)."),
        );
    } else {
        operator_pass(checks, "operator checklist", &json_str(operator, "status"));
    }
    let budget_limit = operator
        .get("budget")
        .and_then(|value| value.get("budgetLimit"))
        .and_then(|value| value.as_f64())
        .unwrap_or(0.0);
    let task_id = operator
        .get("task")
        .and_then(|value| value.get("id"))
        .and_then(|value| value.as_str())
        .unwrap_or("");
    if operator_approval_matches(
        approval,
        &json_str(operator, "generatedAt"),
        task_id,
        budget_limit,
    ) {
        operator_pass(
            checks,
            "operator approval",
            "Approval matches current checklist.",
        );
    } else {
        operator_warn(
            warnings,
            checks,
            "operator approval",
            "Approval is missing or stale.",
        );
    }
}

fn preflight_check_ledger(
    dbc_dir: &Path,
    ledger: &Option<serde_json::Value>,
    required_decisions: &[String],
    checks: &mut Vec<serde_json::Value>,
    blockers: &mut Vec<serde_json::Value>,
    warnings: &mut Vec<serde_json::Value>,
) {
    let Some(ledger) = ledger else {
        return;
    };
    if json_str(ledger, "kind") != "approval-ledger" {
        operator_fail(blockers, checks, "approval ledger", "Invalid ledger kind.");
        return;
    }
    for id in required_decisions {
        if approval_decision_is_approved(dbc_dir, id) {
            operator_pass(checks, &format!("approval {id}"), "approved");
        } else {
            operator_warn(warnings, checks, &format!("approval {id}"), "pending");
        }
    }
}

fn preflight_check_artifact(
    subject: &str,
    artifact: &Option<serde_json::Value>,
    expected_kind: &str,
    checks: &mut Vec<serde_json::Value>,
    blockers: &mut Vec<serde_json::Value>,
    warnings: &mut Vec<serde_json::Value>,
) {
    let Some(artifact) = artifact else {
        return;
    };
    if !expected_kind.is_empty() && json_str(artifact, "kind") != expected_kind {
        operator_fail(
            blockers,
            checks,
            subject,
            &format!("Invalid kind {}.", json_str(artifact, "kind")),
        );
        return;
    }
    let blocker_count = json_array_len(artifact, "blockers");
    if blocker_count > 0 {
        operator_fail(
            blockers,
            checks,
            subject,
            &format!("{blocker_count} blocker(s)."),
        );
    } else {
        operator_pass(checks, subject, &json_str(artifact, "status"));
    }
    if let Some(items) = artifact.get("warnings").and_then(|value| value.as_array()) {
        for item in items {
            let item_subject = item
                .get("subject")
                .and_then(|value| value.as_str())
                .unwrap_or(subject);
            let detail = item
                .get("detail")
                .and_then(|value| value.as_str())
                .unwrap_or("");
            operator_warn(
                warnings,
                checks,
                &format!("{subject}: {item_subject}"),
                detail,
            );
        }
    }
}

fn preflight_check_real_plan(
    real_plan: &Option<serde_json::Value>,
    checks: &mut Vec<serde_json::Value>,
    blockers: &mut Vec<serde_json::Value>,
) {
    let Some(real_plan) = real_plan else {
        return;
    };
    let task_id = real_plan
        .get("task")
        .and_then(|value| value.get("id"))
        .and_then(|value| value.as_str())
        .unwrap_or("");
    if json_str(real_plan, "status") == "prepared" && task_id == "REAL-MICRO-README" {
        operator_pass(checks, "real micro plan", "prepared");
    } else {
        operator_fail(
            blockers,
            checks,
            "real micro plan",
            &format!(
                "Unexpected status/task: {} / {task_id}.",
                json_str(real_plan, "status")
            ),
        );
    }
}

fn preflight_check_comparison(
    comparison: &Option<serde_json::Value>,
    checks: &mut Vec<serde_json::Value>,
    blockers: &mut Vec<serde_json::Value>,
) {
    let Some(comparison) = comparison else {
        return;
    };
    let blocker_count = json_array_len(comparison, "blockers");
    if blocker_count > 0 {
        operator_fail(
            blockers,
            checks,
            "comparison",
            &format!("{blocker_count} blocker(s)."),
        );
    } else {
        operator_pass(checks, "comparison", &json_str(comparison, "status"));
    }
    let status = json_str(comparison, "status");
    if !["pending_real", "pass", "pass_with_warnings"].contains(&status.as_str()) {
        operator_fail(
            blockers,
            checks,
            "comparison status",
            &format!("Unexpected status {status}."),
        );
    }
}

fn preflight_check_revert(
    revert: &Option<serde_json::Value>,
    checks: &mut Vec<serde_json::Value>,
    blockers: &mut Vec<serde_json::Value>,
) {
    let Some(revert) = revert else {
        return;
    };
    if json_str(revert, "kind") != "revert-evidence" {
        operator_fail(
            blockers,
            checks,
            "revert evidence",
            "Invalid revert evidence kind.",
        );
        return;
    }
    let blocker_count = json_array_len(revert, "blockers");
    if blocker_count > 0 {
        operator_fail(
            blockers,
            checks,
            "revert evidence",
            &format!("{blocker_count} blocker(s)."),
        );
    } else {
        operator_pass(checks, "revert evidence", &json_str(revert, "status"));
    }
}

fn preflight_check_providers(
    providers: &[serde_json::Value],
    intended_real_providers: &[String],
    checks: &mut Vec<serde_json::Value>,
    blockers: &mut Vec<serde_json::Value>,
    warnings: &mut Vec<serde_json::Value>,
) {
    for id in intended_real_providers {
        let provider = providers
            .iter()
            .find(|provider| provider_string(provider, "id") == *id);
        let Some(provider) = provider else {
            operator_fail(
                blockers,
                checks,
                &format!("provider {id}"),
                "Missing provider.",
            );
            continue;
        };
        let run_mode = provider_string(provider, "runMode");
        if run_mode == "real" {
            operator_pass(checks, &format!("provider {id}"), "real");
        } else {
            operator_warn(
                warnings,
                checks,
                &format!("provider {id}"),
                &format!(
                    "runMode is {}.",
                    if run_mode.is_empty() {
                        "mock"
                    } else {
                        &run_mode
                    }
                ),
            );
        }
    }
}

fn runbook_check_preflight(
    preflight: &Option<serde_json::Value>,
    checks: &mut Vec<serde_json::Value>,
    blockers: &mut Vec<serde_json::Value>,
    warnings: &mut Vec<serde_json::Value>,
) {
    let Some(preflight) = preflight else {
        return;
    };
    if json_str(preflight, "kind") != "real-micro-preflight" {
        operator_fail(
            blockers,
            checks,
            "preflight kind",
            "Invalid real micro preflight kind.",
        );
        return;
    }
    let blocker_count = json_array_len(preflight, "blockers");
    if blocker_count > 0 {
        operator_fail(
            blockers,
            checks,
            "preflight blockers",
            &format!("{blocker_count} blocker(s)."),
        );
    } else {
        operator_pass(checks, "preflight blockers", "none");
    }
    let status = json_str(preflight, "status");
    if [
        "awaiting_human_approval",
        "ready_to_apply_real_profile",
        "ready_to_run",
    ]
    .contains(&status.as_str())
    {
        operator_pass(checks, "preflight status", &status);
    } else {
        operator_fail(
            blockers,
            checks,
            "preflight status",
            &format!("Unexpected status {status}."),
        );
    }
    if let Some(items) = preflight.get("warnings").and_then(|value| value.as_array()) {
        for item in items {
            let subject = item
                .get("subject")
                .and_then(|value| value.as_str())
                .unwrap_or("warning");
            let detail = item
                .get("detail")
                .and_then(|value| value.as_str())
                .unwrap_or("");
            operator_warn(warnings, checks, &format!("preflight: {subject}"), detail);
        }
    }
}

fn runbook_check_providers(
    providers: &[serde_json::Value],
    checks: &mut Vec<serde_json::Value>,
    blockers: &mut Vec<serde_json::Value>,
) {
    for id in ["codex_cli", "claude_code", "local_terminal"] {
        if let Some(provider) = providers
            .iter()
            .find(|provider| provider_string(provider, "id") == id)
        {
            operator_pass(
                checks,
                &format!("provider {id}"),
                &format!(
                    "runMode {}",
                    empty_as_missing(&provider_string(provider, "runMode"))
                ),
            );
        } else {
            operator_fail(blockers, checks, &format!("provider {id}"), "missing");
        }
    }
}

fn real_micro_runbook_surfaces() -> serde_json::Value {
    serde_json::json!({
        "allowed": [
            {
                "id": "official_cli",
                "detail": "Codex CLI and Claude Code CLI invoked as local terminal commands with exact executable paths."
            },
            {
                "id": "local_terminal",
                "detail": "Local build/test commands executed through DBC command policy."
            },
            {
                "id": "tauri_filesystem",
                "detail": "DBC reads/writes project-local .dbc artifacts, task specs, reports, and support bundles."
            }
        ],
        "denied": [
            {
                "id": "consumer_web_automation",
                "detail": "No scraping or automation of ChatGPT, Claude, or other consumer web interfaces."
            },
            {
                "id": "background_real_provider_start",
                "detail": "No real provider loop starts without operator checklist, approval artifact, approval ledger decisions, and ready preflight."
            }
        ]
    })
}

fn real_micro_runbook_sequence() -> serde_json::Value {
    serde_json::json!([
        {"id": "review_operator", "title": "Review .dbc/operator/latest.md", "actor": "human", "detail": "Do not continue until blockers are zero."},
        {"id": "approve_gate", "title": "Approve the operator gate in the app or with pnpm operator-approve", "actor": "human", "detail": "Writes operator approval and the three real-micro approval decisions."},
        {"id": "apply_real_profile", "title": "Apply real micro provider profile", "actor": "human", "detail": "Switches only Codex CLI, Claude Code, and Local Terminal Runner to real mode after approval."},
        {"id": "generate_preflight", "title": "Generate real micro dry-run preflight", "actor": "system", "detail": "Writes .dbc/preflight/latest.json without spawning providers."},
        {"id": "run_approved", "title": "Run approved REAL-MICRO-README", "actor": "human", "detail": "Backend requires ready preflight and RUN-REAL-MICRO-TASK before spawning real CLI providers."},
        {"id": "compare_evidence", "title": "Compare real evidence with controlled baseline", "actor": "system", "detail": "Run pnpm compare-real-micro after the loop completes or blocks."},
        {"id": "revert_mock", "title": "Apply mock provider profile", "actor": "human", "detail": "Return providers to mock mode after the real micro run."},
        {"id": "collect_support", "title": "Generate support bundle", "actor": "system", "detail": "Archive diagnostic artifacts for review."}
    ])
}

fn real_micro_runbook_manual_commands() -> serde_json::Value {
    serde_json::json!([
        {"command": "pnpm operator-checklist", "reason": "Refresh the checklist before approval.", "requiresApproval": false, "automatic": false},
        {"command": "pnpm operator-approve -- --confirm \"I APPROVE REAL MICRO LOOP\"", "reason": "Terminal fallback for explicit approval.", "requiresApproval": true, "automatic": false},
        {"command": "pnpm providers:apply-real-micro", "reason": "Terminal fallback for applying the approved real profile.", "requiresApproval": true, "automatic": false},
        {"command": "pnpm real-micro-preflight", "reason": "Generate dry-run preflight without provider calls.", "requiresApproval": false, "automatic": false},
        {"command": "pnpm compare-real-micro", "reason": "Compare real loop evidence after the run.", "requiresApproval": false, "automatic": false},
        {"command": "pnpm providers:apply-mock", "reason": "Return providers to mock mode.", "requiresApproval": true, "automatic": false},
        {"command": "pnpm revert-evidence", "reason": "Verify providers are back in mock mode.", "requiresApproval": false, "automatic": false},
        {"command": "pnpm support-bundle", "reason": "Collect operator handoff diagnostics.", "requiresApproval": false, "automatic": false}
    ])
}

fn real_micro_runbook_markdown(report: &serde_json::Value) -> String {
    let mut lines = vec![
        "# Real Micro Runbook".to_string(),
        "".to_string(),
        format!("Status: {}", json_str(report, "status")),
        format!("Generated: {}", json_str(report, "generatedAt")),
        format!("Project: {}", json_str(report, "projectPath")),
        "".to_string(),
        "## Next Action".to_string(),
        format!("- {}", json_str(report, "nextAction")),
        "".to_string(),
        "## Allowed Surfaces".to_string(),
    ];
    push_surface_list(&mut lines, report, "allowed");
    lines.push("".to_string());
    lines.push("## Denied Surfaces".to_string());
    push_surface_list(&mut lines, report, "denied");
    lines.push("".to_string());
    lines.push("## Sequence".to_string());
    if let Some(items) = report.get("sequence").and_then(|value| value.as_array()) {
        for (index, item) in items.iter().enumerate() {
            lines.push(format!(
                "{}. {} ({}) - {}",
                index + 1,
                item.get("title")
                    .and_then(|value| value.as_str())
                    .unwrap_or(""),
                item.get("actor")
                    .and_then(|value| value.as_str())
                    .unwrap_or(""),
                item.get("detail")
                    .and_then(|value| value.as_str())
                    .unwrap_or("")
            ));
        }
    }
    lines.push("".to_string());
    lines.push("## Manual Commands".to_string());
    if let Some(items) = report
        .get("manualCommands")
        .and_then(|value| value.as_array())
    {
        for item in items {
            let approval = if item
                .get("requiresApproval")
                .and_then(|value| value.as_bool())
                .unwrap_or(false)
            {
                "approval required"
            } else {
                "read-only/check"
            };
            lines.push(format!(
                "- {} ({}) - {}",
                item.get("command")
                    .and_then(|value| value.as_str())
                    .unwrap_or(""),
                approval,
                item.get("reason")
                    .and_then(|value| value.as_str())
                    .unwrap_or("")
            ));
        }
    }
    lines.push("".to_string());
    lines.push("## Gates".to_string());
    if let Some(items) = report.get("gates").and_then(|value| value.as_object()) {
        for (key, value) in items {
            let rendered = if let Some(array) = value.as_array() {
                let joined = array
                    .iter()
                    .filter_map(|item| item.as_str())
                    .collect::<Vec<_>>()
                    .join(", ");
                if joined.is_empty() {
                    "none".to_string()
                } else {
                    joined
                }
            } else {
                value
                    .as_str()
                    .map(|item| item.to_string())
                    .unwrap_or_else(|| value.to_string())
            };
            lines.push(format!("- {key}: {rendered}"));
        }
    }
    lines.push("".to_string());
    lines.push("## Blockers".to_string());
    push_subject_detail_list(&mut lines, report, "blockers");
    lines.push("".to_string());
    lines.push("## Warnings".to_string());
    push_subject_detail_list(&mut lines, report, "warnings");
    lines.push("".to_string());
    lines.push("## Refs".to_string());
    if let Some(items) = report.get("refs").and_then(|value| value.as_object()) {
        for (key, value) in items {
            lines.push(format!("- {key}: {}", value.as_str().unwrap_or("")));
        }
    }
    lines.push("".to_string());
    lines.join("\n")
}

fn real_micro_surfaces_markdown(report: &serde_json::Value) -> String {
    let mut lines = vec![
        "# DBC Allowed Surfaces".to_string(),
        "".to_string(),
        "This file is generated by DBC and records the permitted automation surfaces for Dildin Build Control.".to_string(),
        "".to_string(),
        "## Allowed".to_string(),
    ];
    push_surface_list(&mut lines, report, "allowed");
    lines.push("".to_string());
    lines.push("## Denied".to_string());
    push_surface_list(&mut lines, report, "denied");
    lines.push("".to_string());
    lines.push("## Human Control".to_string());
    lines.push("- Real provider execution requires operator checklist, matching operator approval, approval ledger decisions, and ready real-micro preflight.".to_string());
    lines.push("- The app must not start background real provider runs on project load, recovery, support bundle generation, doctor checks, or dry-run preflight generation.".to_string());
    lines.push("- Browser or consumer-web scraping is outside the DBC run surface; use official CLI/API surfaces only.".to_string());
    lines.push("".to_string());
    lines.join("\n")
}

fn push_surface_list(lines: &mut Vec<String>, report: &serde_json::Value, key: &str) {
    if let Some(items) = report
        .get("surfaces")
        .and_then(|value| value.get(key))
        .and_then(|value| value.as_array())
    {
        for item in items {
            lines.push(format!(
                "- {}: {}",
                item.get("id")
                    .and_then(|value| value.as_str())
                    .unwrap_or(""),
                item.get("detail")
                    .and_then(|value| value.as_str())
                    .unwrap_or("")
            ));
        }
    }
}

fn real_micro_preflight_markdown(report: &serde_json::Value) -> String {
    let mut lines = vec![
        "# Real Micro Preflight".to_string(),
        "".to_string(),
        format!("Status: {}", json_str(report, "status")),
        format!("Generated: {}", json_str(report, "generatedAt")),
        format!("Project: {}", json_str(report, "projectPath")),
        "".to_string(),
        "## Next Action".to_string(),
        format!("- {}", json_str(report, "nextAction")),
        "".to_string(),
        "## Approvals".to_string(),
    ];
    let approvals = report.get("approvals").unwrap_or(&serde_json::Value::Null);
    let approved = approvals
        .get("approved")
        .and_then(|value| value.as_object())
        .cloned()
        .unwrap_or_default();
    if let Some(items) = approvals.get("required").and_then(|value| value.as_array()) {
        for item in items {
            let id = item.as_str().unwrap_or("");
            let status = approved
                .get(id)
                .and_then(|value| value.as_bool())
                .unwrap_or(false);
            lines.push(format!(
                "- {id}: {}",
                if status { "approved" } else { "pending" }
            ));
        }
    }
    let profile = report.get("profile").unwrap_or(&serde_json::Value::Null);
    let active = profile
        .get("activeRealProviderIds")
        .and_then(|value| value.as_array())
        .map(|items| {
            items
                .iter()
                .filter_map(|value| value.as_str())
                .collect::<Vec<_>>()
                .join(", ")
        })
        .unwrap_or_default();
    lines.push("".to_string());
    lines.push("## Profile".to_string());
    lines.push(format!(
        "- Ready: {}",
        profile
            .get("ready")
            .and_then(|value| value.as_bool())
            .unwrap_or(false)
    ));
    lines.push(format!(
        "- Active real providers: {}",
        if active.is_empty() { "none" } else { &active }
    ));
    let terminal_handoff = report
        .get("terminalHandoff")
        .unwrap_or(&serde_json::Value::Null);
    let terminal_required = terminal_handoff
        .get("required")
        .and_then(|value| value.as_bool())
        .unwrap_or(false);
    let terminal_providers = terminal_handoff
        .get("providerIds")
        .and_then(|value| value.as_array())
        .map(|items| {
            items
                .iter()
                .filter_map(|value| value.as_str())
                .collect::<Vec<_>>()
                .join(", ")
        })
        .unwrap_or_default();
    lines.push(format!(
        "- Terminal handoff: {}",
        if terminal_required {
            if terminal_providers.is_empty() {
                "required"
            } else {
                &terminal_providers
            }
        } else {
            "not required"
        }
    ));
    lines.push("".to_string());
    lines.push("## Blockers".to_string());
    push_subject_detail_list(&mut lines, report, "blockers");
    lines.push("".to_string());
    lines.push("## Warnings".to_string());
    push_subject_detail_list(&mut lines, report, "warnings");
    lines.push("".to_string());
    lines.push("## Checks".to_string());
    if let Some(items) = report.get("checks").and_then(|value| value.as_array()) {
        for item in items {
            lines.push(format!(
                "- [{}] {}: {}",
                item.get("level")
                    .and_then(|value| value.as_str())
                    .unwrap_or("unknown"),
                item.get("subject")
                    .and_then(|value| value.as_str())
                    .unwrap_or("check"),
                item.get("detail")
                    .and_then(|value| value.as_str())
                    .unwrap_or("")
            ));
        }
    }
    lines.push("".to_string());
    lines.join("\n")
}

fn json_array_len(value: &serde_json::Value, key: &str) -> usize {
    value
        .get(key)
        .and_then(|value| value.as_array())
        .map(|items| items.len())
        .unwrap_or(0)
}

fn operator_checklist_markdown(report: &serde_json::Value) -> String {
    let mut lines = vec![
        "# Operator Checklist".to_string(),
        "".to_string(),
        format!("Status: {}", json_str(report, "status")),
        format!("Generated: {}", json_str(report, "generatedAt")),
        format!("Project: {}", json_str(report, "projectPath")),
        "".to_string(),
        "## Human Confirmations".to_string(),
    ];
    if let Some(items) = report
        .get("humanConfirmations")
        .and_then(|value| value.as_array())
    {
        for item in items {
            lines.push(format!("- [ ] {}", item.as_str().unwrap_or("")));
        }
    }
    lines.push("".to_string());
    lines.push("## Steps".to_string());
    if let Some(items) = report.get("steps").and_then(|value| value.as_array()) {
        for (index, step) in items.iter().enumerate() {
            lines.push(format!(
                "{}. {}",
                index + 1,
                step.get("title")
                    .and_then(|value| value.as_str())
                    .unwrap_or("")
            ));
            for key in ["command", "ui", "expectedEvidence", "stopIf"] {
                if let Some(value) = step.get(key).and_then(|value| value.as_str()) {
                    let label = match key {
                        "expectedEvidence" => "Evidence",
                        "stopIf" => "Stop if",
                        "command" => "Command",
                        "ui" => "UI",
                        _ => key,
                    };
                    lines.push(format!("   - {label}: {value}"));
                }
            }
        }
    }
    lines.push("".to_string());
    lines.push("## Stop Conditions".to_string());
    if let Some(items) = report
        .get("stopConditions")
        .and_then(|value| value.as_array())
    {
        for item in items {
            lines.push(format!("- {}", item.as_str().unwrap_or("")));
        }
    }
    lines.push("".to_string());
    lines.push("## Budget Guard".to_string());
    let budget = report.get("budget").unwrap_or(&serde_json::Value::Null);
    lines.push(format!(
        "- Budget limit: {}",
        budget
            .get("budgetLimit")
            .map(|value| value.to_string())
            .unwrap_or_else(|| "0".to_string())
    ));
    lines.push(format!(
        "- Real CLI call limit: {}",
        budget
            .get("realCliCallLimit")
            .map(|value| value.to_string())
            .unwrap_or_else(|| "0".to_string())
    ));
    lines.push(format!(
        "- Rule: {}",
        budget
            .get("rule")
            .and_then(|value| value.as_str())
            .unwrap_or("")
    ));
    lines.push("- Backend gate: real CLI loops require this checklist, matching task id, matching budget, zero blockers, and explicit operator approval.".to_string());
    lines.push("".to_string());
    lines.push("## Approval".to_string());
    let approval = report.get("approval").unwrap_or(&serde_json::Value::Null);
    lines.push(format!(
        "- Status: {}",
        approval
            .get("status")
            .and_then(|value| value.as_str())
            .unwrap_or("missing_or_stale")
    ));
    lines.push(format!(
        "- Path: {}",
        approval
            .get("path")
            .and_then(|value| value.as_str())
            .unwrap_or("")
    ));
    lines.push("".to_string());
    lines.push("## Blockers".to_string());
    push_subject_detail_list(&mut lines, report, "blockers");
    lines.push("".to_string());
    lines.push("## Warnings".to_string());
    push_subject_detail_list(&mut lines, report, "warnings");
    lines.push("".to_string());
    lines.push("## Next Action".to_string());
    lines.push(format!("- {}", json_str(report, "nextAction")));
    lines.push("".to_string());
    lines.join("\n")
}

fn push_subject_detail_list(lines: &mut Vec<String>, report: &serde_json::Value, key: &str) {
    if let Some(items) = report.get(key).and_then(|value| value.as_array()) {
        if items.is_empty() {
            lines.push("- None".to_string());
        } else {
            for item in items {
                lines.push(format!(
                    "- {}: {}",
                    item.get("subject")
                        .and_then(|value| value.as_str())
                        .unwrap_or("item"),
                    item.get("detail")
                        .and_then(|value| value.as_str())
                        .unwrap_or("")
                ));
            }
        }
    } else {
        lines.push("- None".to_string());
    }
}

fn json_str(value: &serde_json::Value, key: &str) -> String {
    value
        .get(key)
        .and_then(|value| value.as_str())
        .unwrap_or("")
        .to_string()
}

fn read_yaml_contract(
    path: &Path,
    label: &str,
    diagnostics: &mut Vec<ProjectConfigDiagnostic>,
) -> Result<(Option<serde_json::Value>, Option<ProjectConfigRecord>), String> {
    if !path.exists() {
        diagnostics.push(ProjectConfigDiagnostic {
            level: "warning".to_string(),
            subject: label.to_string(),
            detail: format!("{} is not present yet.", path.display()),
        });
        return Ok((None, None));
    }

    let content = fs::read_to_string(path).map_err(|err| err.to_string())?;
    let record = ProjectConfigRecord {
        path: path.display().to_string(),
        checksum: stable_checksum(&content),
        updated_at: file_modified_millis(path),
    };
    match serde_yaml::from_str::<serde_json::Value>(&content) {
        Ok(value) => Ok((Some(value), Some(record))),
        Err(err) => {
            diagnostics.push(ProjectConfigDiagnostic {
                level: "error".to_string(),
                subject: label.to_string(),
                detail: format!("Cannot parse {}: {}", path.display(), err),
            });
            Ok((None, Some(record)))
        }
    }
}

fn read_json_records_with_metadata(dir: &Path) -> Result<Vec<serde_json::Value>, String> {
    if !dir.exists() {
        return Ok(Vec::new());
    }
    let mut records = Vec::new();
    for entry in fs::read_dir(dir).map_err(|err| err.to_string())? {
        let entry = entry.map_err(|err| err.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|value| value.to_str()) != Some("json") {
            continue;
        }
        let content = fs::read_to_string(&path).map_err(|err| err.to_string())?;
        let mut value: serde_json::Value =
            serde_json::from_str(&content).map_err(|err| err.to_string())?;
        if let Some(map) = value.as_object_mut() {
            map.insert(
                "path".to_string(),
                serde_json::Value::String(path.display().to_string()),
            );
            map.insert(
                "checksum".to_string(),
                serde_json::Value::String(stable_checksum(&content)),
            );
            map.insert(
                "updatedAt".to_string(),
                serde_json::Value::String(file_modified_millis(&path)),
            );
        }
        records.push(value);
    }
    records.sort_by(|left, right| {
        right
            .get("updatedAt")
            .and_then(|value| value.as_str())
            .unwrap_or("")
            .cmp(
                left.get("updatedAt")
                    .and_then(|value| value.as_str())
                    .unwrap_or(""),
            )
    });
    Ok(records)
}

fn validate_providers_contract(
    value: &serde_json::Value,
    diagnostics: &mut Vec<ProjectConfigDiagnostic>,
) {
    let providers = match value.as_array() {
        Some(items) => items,
        None => {
            diagnostics.push(ProjectConfigDiagnostic {
                level: "error".to_string(),
                subject: "providers".to_string(),
                detail: "providers.yaml must contain a providers array.".to_string(),
            });
            return;
        }
    };

    if providers.is_empty() {
        diagnostics.push(ProjectConfigDiagnostic {
            level: "warning".to_string(),
            subject: "providers".to_string(),
            detail: "No providers are configured in the project contract.".to_string(),
        });
        return;
    }

    for provider in providers {
        let id = provider
            .get("id")
            .and_then(|value| value.as_str())
            .unwrap_or("provider");
        let name = provider
            .get("name")
            .and_then(|value| value.as_str())
            .unwrap_or(id);
        let provider_type = provider
            .get("type")
            .and_then(|value| value.as_str())
            .unwrap_or("cli");
        let enabled = provider
            .get("enabled")
            .and_then(|value| value.as_bool())
            .unwrap_or(true);
        let command = provider
            .get("command")
            .and_then(|value| value.as_str())
            .unwrap_or("")
            .trim();

        if enabled && provider_type == "cli" && command.is_empty() {
            diagnostics.push(ProjectConfigDiagnostic {
                level: "error".to_string(),
                subject: name.to_string(),
                detail: "Enabled CLI provider has an empty command.".to_string(),
            });
            continue;
        }

        if provider_type != "cli" || command.is_empty() {
            continue;
        }

        let command_path = Path::new(command);
        let looks_like_path =
            command_path.is_absolute() || command.contains('/') || command.contains('\\');
        if !looks_like_path {
            diagnostics.push(ProjectConfigDiagnostic {
                level: "warning".to_string(),
                subject: name.to_string(),
                detail: format!("Command `{command}` is PATH-based; save an exact executable path for cross-platform restore."),
            });
        } else if !is_executable_file(command_path) {
            diagnostics.push(ProjectConfigDiagnostic {
                level: "warning".to_string(),
                subject: name.to_string(),
                detail: format!("Exact CLI path is not available on this machine: {command}"),
            });
        }
    }
}

fn validate_policy_contract(
    value: &serde_json::Value,
    diagnostics: &mut Vec<ProjectConfigDiagnostic>,
) {
    let Some(policy) = value.as_object() else {
        diagnostics.push(ProjectConfigDiagnostic {
            level: "error".to_string(),
            subject: "policy".to_string(),
            detail: "policy.yaml must contain a policy object.".to_string(),
        });
        return;
    };

    for key in ["allow", "approvalRequired", "deny"] {
        if !policy
            .get(key)
            .map(|value| value.is_array())
            .unwrap_or(false)
        {
            diagnostics.push(ProjectConfigDiagnostic {
                level: "error".to_string(),
                subject: "policy".to_string(),
                detail: format!("Policy field `{key}` must be an array."),
            });
        }
    }
}

fn file_modified_millis(path: &Path) -> String {
    path.metadata()
        .ok()
        .and_then(|metadata| metadata.modified().ok())
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis().to_string())
        .unwrap_or_default()
}

fn json_to_yaml(value: &serde_json::Value) -> String {
    let mut out = String::new();
    write_yaml_node(value, 0, &mut out);
    out
}

fn write_yaml_node(value: &serde_json::Value, indent: usize, out: &mut String) {
    match value {
        serde_json::Value::Object(map) => {
            for (key, item) in map {
                out.push_str(&" ".repeat(indent));
                if is_yaml_scalar(item) {
                    out.push_str(key);
                    out.push_str(": ");
                    out.push_str(&yaml_scalar(item));
                    out.push('\n');
                } else {
                    out.push_str(key);
                    out.push_str(":\n");
                    write_yaml_node(item, indent + 2, out);
                }
            }
        }
        serde_json::Value::Array(items) => {
            if items.is_empty() {
                out.push_str(&" ".repeat(indent));
                out.push_str("[]\n");
                return;
            }
            for item in items {
                out.push_str(&" ".repeat(indent));
                if is_yaml_scalar(item) {
                    out.push_str("- ");
                    out.push_str(&yaml_scalar(item));
                    out.push('\n');
                } else {
                    out.push_str("-\n");
                    write_yaml_node(item, indent + 2, out);
                }
            }
        }
        _ => {
            out.push_str(&" ".repeat(indent));
            out.push_str(&yaml_scalar(value));
            out.push('\n');
        }
    }
}

fn is_yaml_scalar(value: &serde_json::Value) -> bool {
    !matches!(
        value,
        serde_json::Value::Array(_) | serde_json::Value::Object(_)
    )
}

fn yaml_scalar(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::Null => "null".to_string(),
        serde_json::Value::Bool(value) => value.to_string(),
        serde_json::Value::Number(value) => value.to_string(),
        serde_json::Value::String(value) => {
            serde_json::to_string(value).unwrap_or_else(|_| "\"\"".to_string())
        }
        serde_json::Value::Array(_) | serde_json::Value::Object(_) => "{}".to_string(),
    }
}

fn current_sql_time() -> String {
    "datetime('now')".to_string()
}

fn default_max_attempts() -> i64 {
    3
}

fn default_task_priority() -> String {
    "normal".to_string()
}

fn default_loop_profile() -> String {
    "mock".to_string()
}

fn default_provider_strategy() -> String {
    "codex_build_claude_review".to_string()
}

fn database_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|err| err.to_string())?;
    fs::create_dir_all(&dir).map_err(|err| err.to_string())?;
    Ok(dir.join("dbc.sqlite"))
}

fn open_db(path: PathBuf) -> Result<Connection, String> {
    let conn = Connection::open(path).map_err(|err| err.to_string())?;
    conn.execute_batch(
        "
        create table if not exists workspaces (
            id integer primary key,
            name text not null,
            path text not null,
            created_at text not null
        );
        create table if not exists audit_events (
            id integer primary key,
            actor text not null,
            action text not null,
            result text not null,
            created_at text not null default current_timestamp
        );
        create table if not exists loop_runs (
            id text primary key,
            project_id text not null,
            task_id text not null,
            project_path text not null,
            task_title text not null default '',
            task_brief text not null default '',
            task_criteria_json text not null default '[]',
            task_constraints_json text not null default '[]',
            task_budget_limit real not null default 0,
            task_spec_path text not null default '',
            task_spec_checksum text not null default '',
            memory_context text not null default '',
            memory_refs_json text not null default '[]',
            status text not null,
            active_step_index integer not null,
            artifact_dir text not null,
            created_at text not null,
            updated_at text not null,
            completed_at text
        );
        create table if not exists loop_steps (
            loop_id text not null,
            step_index integer not null,
            step_id text not null,
            state text not null,
            agent text not null,
            role_id text not null,
            provider_id text not null,
            provider_type text not null default 'mock',
            provider_command text not null default '',
            provider_args_template text not null default '',
            provider_prompt_mode text not null default 'stdin',
            provider_run_mode text not null default 'mock',
            agent_mode text not null default 'read_only',
            local_commands_json text not null default '[]',
            timeout_seconds integer not null default 900,
            max_output_bytes integer not null default 200000,
            max_attempts integer not null default 3,
            attempt_count integer not null default 0,
            requires_approval integer not null default 0,
            last_error text not null default '',
            summary text not null,
            evidence text not null,
            status text not null,
            output text not null default '',
            structured_report_json text not null default '',
            artifact_path text not null default '',
            evidence_path text not null default '',
            started_at text not null default '',
            finished_at text not null default '',
            primary key (loop_id, step_index)
        );
        ",
    )
    .map_err(|err| err.to_string())?;
    ensure_loop_run_columns(&conn)?;
    ensure_loop_step_columns(&conn)?;
    harness::ensure_schema(&conn)?;
    Ok(conn)
}

fn ensure_loop_run_columns(conn: &Connection) -> Result<(), String> {
    let columns = [
        ("task_title", "text not null default ''"),
        ("task_brief", "text not null default ''"),
        ("task_criteria_json", "text not null default '[]'"),
        ("task_constraints_json", "text not null default '[]'"),
        ("task_budget_limit", "real not null default 0"),
        ("task_spec_path", "text not null default ''"),
        ("task_spec_checksum", "text not null default ''"),
        ("memory_context", "text not null default ''"),
        ("memory_refs_json", "text not null default '[]'"),
    ];

    for (name, definition) in columns {
        if !table_has_column(conn, "loop_runs", name)? {
            conn.execute(
                &format!("alter table loop_runs add column {name} {definition}"),
                [],
            )
            .map_err(|err| err.to_string())?;
        }
    }

    Ok(())
}

fn ensure_loop_step_columns(conn: &Connection) -> Result<(), String> {
    let columns = [
        ("provider_type", "text not null default 'mock'"),
        ("provider_command", "text not null default ''"),
        ("provider_args_template", "text not null default ''"),
        ("provider_prompt_mode", "text not null default 'stdin'"),
        ("provider_run_mode", "text not null default 'mock'"),
        ("agent_mode", "text not null default 'read_only'"),
        ("local_commands_json", "text not null default '[]'"),
        ("timeout_seconds", "integer not null default 900"),
        ("max_output_bytes", "integer not null default 200000"),
        ("max_attempts", "integer not null default 3"),
        ("attempt_count", "integer not null default 0"),
        ("requires_approval", "integer not null default 0"),
        ("last_error", "text not null default ''"),
        ("structured_report_json", "text not null default ''"),
        ("evidence_path", "text not null default ''"),
    ];

    for (name, definition) in columns {
        if !table_has_column(conn, "loop_steps", name)? {
            conn.execute(
                &format!("alter table loop_steps add column {name} {definition}"),
                [],
            )
            .map_err(|err| err.to_string())?;
        }
    }

    Ok(())
}

fn table_has_column(conn: &Connection, table: &str, column: &str) -> Result<bool, String> {
    let mut stmt = conn
        .prepare(&format!("pragma table_info({table})"))
        .map_err(|err| err.to_string())?;
    let rows = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|err| err.to_string())?;
    for row in rows {
        if row.map_err(|err| err.to_string())? == column {
            return Ok(true);
        }
    }
    Ok(false)
}

#[tauri::command]
fn create_task_contract(
    app: tauri::AppHandle,
    request: harness::TaskContractRequest,
) -> Result<harness::TaskContract, String> {
    let conn = open_db(database_path(&app)?)?;
    harness::create_task_contract(&conn, request)
}

#[tauri::command]
fn freeze_task_contract(
    app: tauri::AppHandle,
    contract_id: String,
) -> Result<harness::TaskContract, String> {
    let conn = open_db(database_path(&app)?)?;
    harness::freeze_task_contract(&conn, &contract_id)
}

#[tauri::command]
fn approve_task_contract(
    app: tauri::AppHandle,
    contract_id: String,
) -> Result<harness::TaskContract, String> {
    let conn = open_db(database_path(&app)?)?;
    harness::approve_task_contract(&conn, &contract_id)
}

#[tauri::command]
fn reject_task_contract(
    app: tauri::AppHandle,
    contract_id: String,
) -> Result<harness::TaskContract, String> {
    let conn = open_db(database_path(&app)?)?;
    harness::reject_task_contract(&conn, &contract_id)
}

#[tauri::command]
fn create_work_slice(
    app: tauri::AppHandle,
    request: harness::WorkSliceRequest,
) -> Result<harness::WorkSlice, String> {
    let conn = open_db(database_path(&app)?)?;
    harness::create_work_slice(&conn, request)
}

#[tauri::command]
fn approve_work_slice(
    app: tauri::AppHandle,
    slice_id: String,
) -> Result<harness::WorkSlice, String> {
    let conn = open_db(database_path(&app)?)?;
    harness::approve_work_slice(&conn, &slice_id)
}

#[tauri::command]
fn start_harness_run(
    app: tauri::AppHandle,
    request: harness::HarnessRunRequest,
) -> Result<harness::HarnessRun, String> {
    let conn = open_db(database_path(&app)?)?;
    let run = harness::create_harness_run(&conn, request)?;
    let contract = harness::read_contract(&conn, &run.contract_id)?;
    let slice = harness::read_slice(&conn, &run.current_slice_id)?;
    let snapshot = start_loop_run(
        app.clone(),
        StartLoopRequest {
            project_id: run.project_id.clone(),
            task_id: run.task_id.clone(),
            project_path: run.project_path.clone(),
            task_title: slice.title.clone(),
            task_brief: slice.description.clone(),
            task_criteria: if slice.acceptance_criteria.is_empty() {
                contract.acceptance_criteria.clone()
            } else {
                slice.acceptance_criteria.clone()
            },
            task_constraints: contract.stop_conditions.clone(),
            task_budget_limit: harness_budget_limit(&contract),
            task_spec_path: contract.artifact_path.clone(),
            task_spec_checksum: contract.checksum.clone(),
            memory_context: format!(
                "- [harness] HarnessRun {} wraps loop execution for contract {} and slice {}.",
                run.id, run.contract_id, run.current_slice_id
            ),
            memory_refs: vec![contract.artifact_path.clone(), slice.artifact_path.clone()],
            steps: harness_compatibility_steps(&slice),
        },
    )?;
    harness::attach_compatibility_loop(&conn, &run.id, &snapshot.id)
}

#[tauri::command]
fn advance_harness_run(
    app: tauri::AppHandle,
    harness_run_id: String,
) -> Result<harness::HarnessRun, String> {
    let conn = open_db(database_path(&app)?)?;
    let run = harness::read_harness_run(&conn, &harness_run_id)?;
    if run.compatibility_loop_run_id.is_empty() {
        return Err("HarnessRun has no compatibility loop attached.".to_string());
    }
    let snapshot = advance_loop_run(app, run.compatibility_loop_run_id.clone())?;
    let active_state = snapshot
        .steps
        .get(snapshot.active_step_index.max(0) as usize)
        .map(|step| step.state.clone())
        .unwrap_or_else(|| snapshot.status.clone());
    harness::update_harness_from_loop(&conn, &harness_run_id, &snapshot.status, &active_state)
}

#[tauri::command]
fn generate_evidence_pack(
    app: tauri::AppHandle,
    harness_run_id: String,
) -> Result<harness::EvidencePack, String> {
    let conn = open_db(database_path(&app)?)?;
    harness::generate_evidence_pack(&conn, &harness_run_id)
}

#[tauri::command]
fn accept_or_rework_harness_result(
    app: tauri::AppHandle,
    request: harness::FinalDecisionRequest,
) -> Result<harness::HarnessRun, String> {
    let conn = open_db(database_path(&app)?)?;
    harness::accept_or_rework(&conn, request)
}

#[tauri::command]
fn load_harness_overview(
    app: tauri::AppHandle,
    project_path: String,
) -> Result<harness::HarnessOverview, String> {
    let conn = open_db(database_path(&app)?)?;
    harness::overview(&conn, &project_path)
}

fn harness_budget_limit(contract: &harness::TaskContract) -> f64 {
    contract
        .budget_limits
        .get("costUsd")
        .or_else(|| contract.budget_limits.get("maxUsd"))
        .or_else(|| contract.budget_limits.get("budgetLimit"))
        .and_then(|value| value.as_f64())
        .unwrap_or(0.0)
}

fn harness_compatibility_steps(slice: &harness::WorkSlice) -> Vec<LoopStepInput> {
    vec![
        controlled_smoke_step(
            "plan",
            "planned",
            "Team Lead",
            "lead",
            "mock_adapter",
            "mock",
            "read_only",
            Vec::new(),
            "Harness plan prepared from the approved TaskContract and WorkSlice.",
            "Plan evidence links the frozen contract, approved slice, and stop conditions.",
        ),
        controlled_smoke_step(
            "code",
            "coding",
            "Developer",
            "developer",
            "mock_adapter",
            "mock",
            "write_workspace",
            Vec::new(),
            "Implementation slice prepared by the compatibility executor.",
            "Patch intent is recorded without real provider execution.",
        ),
        controlled_smoke_step(
            "build",
            "building",
            "DevOps",
            "devops",
            "local_terminal",
            "local_runner",
            "command_runner",
            slice.commands_allowed.clone(),
            "Allowed WorkSlice commands executed through the local runner.",
            "Build or command evidence is captured with redacted output.",
        ),
        controlled_smoke_step(
            "test",
            "testing",
            "QA",
            "qa",
            "mock_adapter",
            "mock",
            "review_only",
            Vec::new(),
            "Self-check verifies acceptance criteria coverage for the slice.",
            "Self-check evidence references the WorkSlice acceptance criteria.",
        ),
        controlled_smoke_step(
            "review",
            "reviewing",
            "Reviewer",
            "reviewer",
            "mock_adapter",
            "mock",
            "review_only",
            Vec::new(),
            "Review checks the slice against the approved contract.",
            "Review report records risks, gaps, and unresolved items.",
        ),
        controlled_smoke_step(
            "security",
            "security",
            "Security",
            "security",
            "mock_adapter",
            "mock",
            "read_only",
            Vec::new(),
            "Security review checks command policy and artifact hygiene.",
            "Security evidence confirms no real provider was used by the wrapper.",
        ),
        controlled_smoke_step(
            "accept",
            "acceptance",
            "Product Owner",
            "product",
            "mock_adapter",
            "mock",
            "read_only",
            Vec::new(),
            "Acceptance stage prepares the EvidencePack handoff.",
            "Final report links task, contract, slice, loop run, and evidence.",
        ),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    static TEST_COUNTER: AtomicUsize = AtomicUsize::new(0);

    #[test]
    fn real_provider_call_limit_uses_four_calls_per_budget_unit() {
        assert_eq!(real_provider_call_limit(0.0), 0);
        assert_eq!(real_provider_call_limit(-1.0), 0);
        assert_eq!(real_provider_call_limit(1.0), 4);
        assert_eq!(real_provider_call_limit(1.1), 8);
        assert_eq!(real_provider_call_limit(2.0), 8);
    }

    #[test]
    fn codex_legacy_exec_args_are_normalized_before_run() {
        let template = normalize_args_template(
            "/opt/homebrew/bin/codex",
            "exec --ask-for-approval on-request --cd {{cwd}} -",
        );
        let args = normalize_cli_args(
            "/opt/homebrew/bin/codex",
            parse_args_template(&template, "hello", "/tmp/example"),
        );

        assert_eq!(
            template,
            "exec --skip-git-repo-check --sandbox workspace-write --cd \"{{cwd}}\""
        );
        assert!(!args
            .iter()
            .any(|arg| arg == "--ask-for-approval" || arg == "-a" || arg == "-"));
        assert_eq!(normalize_prompt_mode("codex", &template, "arg"), "stdin");
    }

    #[test]
    fn claude_empty_args_default_to_print_stdin_contract() {
        let template = normalize_args_template("/opt/homebrew/bin/claude", "");
        let args = normalize_cli_args(
            "/opt/homebrew/bin/claude",
            parse_args_template(&template, "hello", "/tmp/example"),
        );

        assert_eq!(template, "-p");
        assert_eq!(args, vec!["-p".to_string()]);
        assert_eq!(normalize_prompt_mode("claude", &template, "arg"), "stdin");
    }

    #[test]
    fn terminal_prompt_mode_is_preserved_for_cli_contracts() {
        let codex_template = normalize_args_template("/opt/homebrew/bin/codex", "");
        assert_eq!(
            normalize_prompt_mode("/opt/homebrew/bin/codex", &codex_template, "terminal"),
            "terminal"
        );
        let claude_template = normalize_args_template("/opt/homebrew/bin/claude", "");
        assert_eq!(
            normalize_prompt_mode("/opt/homebrew/bin/claude", &claude_template, "terminal"),
            "terminal"
        );
    }

    #[test]
    fn terminal_prompt_mode_requires_manual_execution_before_spawn() {
        let result = run_cli_provider(CliRunRequest {
            command: "/bin/echo".to_string(),
            args: vec!["should-not-print".to_string()],
            prompt: "hello".to_string(),
            cwd: String::new(),
            prompt_mode: "terminal".to_string(),
            timeout_seconds: 1,
            max_output_bytes: 1000,
            policy_mode: "allow".to_string(),
        });

        assert_eq!(result.status, "approval_required");
        assert!(result.stdout.is_empty());
        assert!(result.redacted_output.contains("Terminal mode requires"));
        assert!(!result.redacted_output.contains("should-not-print"));
    }

    #[test]
    fn project_config_round_trip_preserves_portable_contracts() {
        let dir = temp_project_dir();
        let providers = serde_json::json!([
            {
                "id": "mock_adapter",
                "name": "Mock Adapter",
                "type": "mock",
                "enabled": true,
                "runMode": "mock"
            }
        ]);
        let command_policy = serde_json::json!({
            "allow": ["pnpm build", "pnpm test"],
            "approvalRequired": ["git commit"],
            "deny": ["git push", "git reset --hard"]
        });

        let saved = save_project_config(ProjectConfigRequest {
            project_path: dir.display().to_string(),
            providers: providers.clone(),
            command_policy: command_policy.clone(),
        })
        .unwrap();
        let loaded = load_project_config(ProjectConfigLoadRequest {
            project_path: dir.display().to_string(),
        })
        .unwrap();

        assert_eq!(loaded.providers, providers);
        assert_eq!(loaded.command_policy, command_policy);
        assert!(loaded.diagnostics.is_empty());
        assert_eq!(
            loaded
                .providers_record
                .as_ref()
                .map(|record| &record.checksum),
            Some(&saved.providers.checksum)
        );
        assert_eq!(
            loaded.policy_record.as_ref().map(|record| &record.checksum),
            Some(&saved.policy.checksum)
        );
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn missing_project_config_uses_safe_defaults_with_diagnostics() {
        let dir = temp_project_dir();

        let loaded = load_project_config(ProjectConfigLoadRequest {
            project_path: dir.display().to_string(),
        })
        .unwrap();

        assert_eq!(loaded.providers, serde_json::json!([]));
        assert_eq!(
            loaded.command_policy,
            serde_json::json!({
                "allow": [],
                "approvalRequired": [],
                "deny": []
            })
        );
        assert!(loaded.providers_record.is_none());
        assert!(loaded.policy_record.is_none());
        assert!(loaded
            .diagnostics
            .iter()
            .any(|item| item.subject == "providers" && item.level == "warning"));
        assert!(loaded
            .diagnostics
            .iter()
            .any(|item| item.subject == "policy" && item.level == "warning"));
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn malformed_project_config_is_reported_without_discarding_valid_contracts() {
        let dir = temp_project_dir();
        let dbc_dir = dir.join(".dbc");
        fs::create_dir_all(&dbc_dir).unwrap();
        fs::write(dbc_dir.join("providers.yaml"), "providers:\n  - [\n").unwrap();
        fs::write(
            dbc_dir.join("policy.yaml"),
            "policy:\n  allow: []\n  approvalRequired: []\n  deny:\n    - git push\n",
        )
        .unwrap();

        let loaded = load_project_config(ProjectConfigLoadRequest {
            project_path: dir.display().to_string(),
        })
        .unwrap();

        assert_eq!(loaded.providers, serde_json::json!([]));
        assert_eq!(
            loaded.command_policy,
            serde_json::json!({
                "allow": [],
                "approvalRequired": [],
                "deny": ["git push"]
            })
        );
        assert!(loaded.providers_record.is_some());
        assert!(loaded.policy_record.is_some());
        assert!(loaded.diagnostics.iter().any(|item| {
            item.subject == "providers"
                && item.level == "error"
                && item.detail.contains("Cannot parse")
        }));
        assert!(!loaded
            .diagnostics
            .iter()
            .any(|item| item.subject == "policy" && item.level == "error"));
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn mock_only_loop_does_not_require_operator_checklist_or_budget() {
        let dir = temp_project_dir();
        let request = start_request(
            &dir,
            "TASK",
            0.0,
            vec![step("mock_adapter", "mock", "mock")],
        );

        assert!(validate_real_loop_launch(&request).is_ok());
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn real_cli_loop_requires_positive_budget() {
        let dir = temp_project_dir();
        write_operator(&dir, "TASK", 0.0, "ready_to_start_real_micro", Vec::new());
        let request = start_request(&dir, "TASK", 0.0, vec![step("codex_cli", "cli", "real")]);

        let error = validate_real_loop_launch(&request).unwrap_err();
        assert!(error.contains("positive task budgetLimit"));
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn real_cli_loop_requires_operator_checklist() {
        let dir = temp_project_dir();
        let request = start_request(&dir, "TASK", 1.0, vec![step("codex_cli", "cli", "real")]);

        let error = validate_real_loop_launch(&request).unwrap_err();
        assert!(error.contains("Operator Checklist"));
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn real_cli_loop_requires_matching_ready_operator_checklist() {
        let dir = temp_project_dir();
        write_operator(&dir, "OTHER", 1.0, "ready_to_start_real_micro", Vec::new());
        let request = start_request(&dir, "TASK", 1.0, vec![step("codex_cli", "cli", "real")]);

        let error = validate_real_loop_launch(&request).unwrap_err();
        assert!(error.contains("task mismatch"));

        write_operator(&dir, "TASK", 2.0, "ready_to_start_real_micro", Vec::new());
        let error = validate_real_loop_launch(&request).unwrap_err();
        assert!(error.contains("budget mismatch"));

        write_operator(
            &dir,
            "TASK",
            1.0,
            "ready_to_start_real_micro",
            vec![serde_json::json!({"subject": "x", "detail": "blocked"})],
        );
        let error = validate_real_loop_launch(&request).unwrap_err();
        assert!(error.contains("has blockers"));

        write_operator(&dir, "TASK", 1.0, "ready_to_start_real_micro", Vec::new());
        let error = validate_real_loop_launch(&request).unwrap_err();
        assert!(error.contains("Real Micro Preflight"));

        write_preflight(&dir, "TASK", "awaiting_human_approval", Vec::new());
        let error = validate_real_loop_launch(&request).unwrap_err();
        assert!(error.contains("status must be ready_to_run"));

        write_preflight(&dir, "OTHER", "ready_to_run", Vec::new());
        let error = validate_real_loop_launch(&request).unwrap_err();
        assert!(error.contains("Preflight task mismatch"));

        write_preflight(
            &dir,
            "TASK",
            "ready_to_run",
            vec![serde_json::json!({"subject": "x", "detail": "blocked"})],
        );
        let error = validate_real_loop_launch(&request).unwrap_err();
        assert!(error.contains("Preflight has blockers"));

        write_preflight(&dir, "TASK", "ready_to_run", Vec::new());
        let error = validate_real_loop_launch(&request).unwrap_err();
        assert!(error.contains("explicit operator approval"));

        write_approval(&dir, "TASK", 1.0, "test-generated-at");
        let error = validate_real_loop_launch(&request).unwrap_err();
        assert!(error.contains("Missing approved ledger decision"));

        write_test_decision(&dir, "RUN-REAL-MICRO-TASK", "approved");
        assert!(validate_real_loop_launch(&request).is_ok());
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn loop_manifest_records_real_micro_ops_evidence() {
        let dir = temp_project_dir();
        write_operator(&dir, "TASK", 1.0, "ready_to_start_real_micro", Vec::new());
        write_preflight(&dir, "TASK", "ready_to_run", Vec::new());
        write_approval(&dir, "TASK", 1.0, "test-generated-at");
        write_test_decision(&dir, "REAL-MICRO-HUMAN-GATE", "approved");
        write_test_decision(&dir, "APPLY-REAL-MICRO-PROFILE", "approved");
        write_test_decision(&dir, "RUN-REAL-MICRO-TASK", "approved");
        let manifest_path = loop_manifest_path(&dir.display().to_string(), "loop-real");
        let snapshot = LoopRunSnapshot {
            id: "loop-real".to_string(),
            project_path: dir.display().to_string(),
            task_id: "TASK".to_string(),
            task_budget_limit: 1.0,
            manifest_path: manifest_path.display().to_string(),
            steps: vec![loop_step_snapshot("codex_cli", "cli", "real")],
            ..LoopRunSnapshot::default()
        };

        write_loop_manifest(&snapshot).unwrap();
        let manifest: serde_json::Value =
            serde_json::from_str(&fs::read_to_string(&manifest_path).unwrap()).unwrap();
        let ops = manifest.get("opsEvidence").unwrap();

        assert_eq!(
            ops.get("realCli")
                .and_then(|value| value.get("enabled"))
                .and_then(|value| value.as_bool()),
            Some(true)
        );
        assert_eq!(
            ops.get("preflight")
                .and_then(|value| value.get("status"))
                .and_then(|value| value.as_str()),
            Some("ready_to_run")
        );
        assert_eq!(
            ops.get("approvalLedger")
                .and_then(|value| value.get("ready"))
                .and_then(|value| value.as_bool()),
            Some(true)
        );
        assert_eq!(
            ops.get("operatorApproval")
                .and_then(|value| value.get("matchesCurrentChecklist"))
                .and_then(|value| value.as_bool()),
            Some(true)
        );
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn real_micro_runbook_generator_writes_surfaces_policy() {
        let dir = temp_project_dir();
        write_real_micro_runbook_inputs(&dir);

        let report = generate_real_micro_runbook_report(ReleasePackageRequest {
            project_path: dir.display().to_string(),
        })
        .unwrap();

        assert_eq!(json_str(&report, "kind"), "real-micro-runbook");
        assert_eq!(json_array_len(&report, "blockers"), 0);
        assert!(dir.join(".dbc/runbook/latest.json").exists());
        assert!(dir.join(".dbc/runbook/latest.md").exists());
        let surfaces = fs::read_to_string(dir.join(".dbc/policy/surfaces.md")).unwrap();
        assert!(surfaces.contains("official_cli"));
        assert!(surfaces.contains("consumer_web_automation"));
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn real_micro_profile_switch_requires_matching_operator_approval() {
        let dir = temp_project_dir();
        let dbc_dir = dir.join(".dbc");
        fs::create_dir_all(&dbc_dir).unwrap();

        let error = ensure_real_micro_profile_approval(&dbc_dir).unwrap_err();
        assert!(error.contains("Missing operator checklist"));

        write_operator(&dir, "TASK", 1.0, "awaiting_human_approval", Vec::new());
        let error = ensure_real_micro_profile_approval(&dbc_dir).unwrap_err();
        assert!(error.contains("approve the gate first"));

        write_operator(&dir, "TASK", 1.0, "ready_to_start_real_micro", Vec::new());
        let error = ensure_real_micro_profile_approval(&dbc_dir).unwrap_err();
        assert!(error.contains("Missing operator approval"));

        write_approval(&dir, "OTHER", 1.0, "test-generated-at");
        let error = ensure_real_micro_profile_approval(&dbc_dir).unwrap_err();
        assert!(error.contains("missing, stale, or does not match"));

        write_approval(&dir, "TASK", 1.0, "test-generated-at");
        let error = ensure_real_micro_profile_approval(&dbc_dir).unwrap_err();
        assert!(error.contains("Missing approved ledger decision"));

        write_test_decision(&dir, "APPLY-REAL-MICRO-PROFILE", "approved");
        assert!(ensure_real_micro_profile_approval(&dbc_dir).is_ok());
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn budget_guard_blocks_real_provider_when_limit_is_exhausted() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute(
            "create table loop_steps (
                loop_id text not null,
                provider_type text not null,
                provider_run_mode text not null,
                attempt_count integer not null
            )",
            [],
        )
        .unwrap();
        conn.execute(
            "insert into loop_steps (loop_id, provider_type, provider_run_mode, attempt_count)
             values ('loop-test', 'cli', 'real', 4)",
            [],
        )
        .unwrap();

        let run = loop_run_row("loop-test", 1.0);
        let step = loop_step_snapshot("codex_cli", "cli", "real");
        let execution = budget_guard_execution(&conn, &run, &step).unwrap();

        assert!(execution.is_some());
        let execution = execution.unwrap();
        assert_eq!(execution.status, "blocked");
        assert_eq!(execution.report.verdict, "blocked");
        assert!(execution.output.contains("Budget guard blocked"));
    }

    #[test]
    fn scope_gate_blocks_files_outside_allowed_paths() {
        let dir = temp_project_dir();
        let task_path = write_task_scope(
            &dir,
            vec!["README.md".to_string(), ".dbc".to_string()],
            vec![".env".to_string()],
        );
        let git = serde_json::json!({
            "isGitRepo": true,
            "changedFiles": ["README.md", "src/App.tsx"]
        });

        let gate = scope_gate_from_git(&task_path.display().to_string(), &git);

        assert_eq!(
            gate.get("passed").and_then(|value| value.as_bool()),
            Some(false)
        );
        assert_eq!(
            gate.get("outsideAllowed")
                .and_then(|value| value.as_array())
                .map(|items| items.len()),
            Some(1)
        );
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn scope_gate_blocks_denied_paths() {
        let dir = temp_project_dir();
        let task_path = write_task_scope(
            &dir,
            vec!["README.md".to_string(), ".dbc".to_string()],
            vec![".env".to_string()],
        );
        let git = serde_json::json!({
            "isGitRepo": true,
            "changedFiles": ["README.md", ".env"]
        });

        let gate = scope_gate_from_git(&task_path.display().to_string(), &git);

        assert_eq!(
            gate.get("passed").and_then(|value| value.as_bool()),
            Some(false)
        );
        assert_eq!(
            gate.get("deniedMatches")
                .and_then(|value| value.as_array())
                .map(|items| items.len()),
            Some(1)
        );
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn suggested_git_add_uses_task_allowed_paths() {
        let dir = temp_project_dir();
        let task_path = write_task_scope(
            &dir,
            vec!["README.md".to_string(), ".dbc/tasks".to_string()],
            vec![".env".to_string()],
        );
        let snapshot = LoopRunSnapshot {
            task_id: "TASK-ADD".to_string(),
            task_spec_path: task_path.display().to_string(),
            ..LoopRunSnapshot::default()
        };

        let command_paths = suggested_git_add_path(&snapshot);

        assert_eq!(command_paths, "README.md .dbc/tasks");
        let _ = fs::remove_dir_all(dir);
    }

    fn temp_project_dir() -> PathBuf {
        let id = TEST_COUNTER.fetch_add(1, Ordering::SeqCst);
        let dir = std::env::temp_dir().join(format!("dbc-test-{}-{id}", unix_millis()));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn write_task_scope(
        project_dir: &Path,
        allowed_paths: Vec<String>,
        denied_paths: Vec<String>,
    ) -> PathBuf {
        let tasks_dir = project_dir.join(".dbc").join("tasks");
        fs::create_dir_all(&tasks_dir).unwrap();
        let path = tasks_dir.join("TASK.json");
        fs::write(
            &path,
            serde_json::to_string_pretty(&serde_json::json!({
                "id": "TASK",
                "title": "Scope test",
                "allowedPaths": allowed_paths,
                "deniedPaths": denied_paths,
                "stopConditions": ["Stop on scope violations"]
            }))
            .unwrap(),
        )
        .unwrap();
        path
    }

    fn write_operator(
        project_dir: &Path,
        task_id: &str,
        budget_limit: f64,
        status: &str,
        blockers: Vec<serde_json::Value>,
    ) {
        let dir = project_dir.join(".dbc").join("operator");
        fs::create_dir_all(&dir).unwrap();
        let content = serde_json::to_string_pretty(&serde_json::json!({
            "version": 1,
            "kind": "operator-checklist",
            "generatedAt": "test-generated-at",
            "status": status,
            "blockers": blockers,
            "task": {
                "id": task_id,
                "budgetLimit": budget_limit
            },
            "budget": {
                "budgetLimit": budget_limit,
                "realCliCallLimit": real_provider_call_limit(budget_limit)
            }
        }))
        .unwrap();
        fs::write(dir.join("latest.json"), content).unwrap();
    }

    fn write_approval(project_dir: &Path, task_id: &str, budget_limit: f64, generated_at: &str) {
        let dir = project_dir.join(".dbc").join("operator");
        fs::create_dir_all(&dir).unwrap();
        let content = serde_json::to_string_pretty(&serde_json::json!({
            "version": 1,
            "kind": "operator-approval",
            "approved": true,
            "checklistGeneratedAt": generated_at,
            "taskId": task_id,
            "budgetLimit": budget_limit
        }))
        .unwrap();
        fs::write(dir.join("approval.json"), content).unwrap();
    }

    fn write_preflight(
        project_dir: &Path,
        task_id: &str,
        status: &str,
        blockers: Vec<serde_json::Value>,
    ) {
        let dir = project_dir.join(".dbc").join("preflight");
        fs::create_dir_all(&dir).unwrap();
        let content = serde_json::to_string_pretty(&serde_json::json!({
            "version": 1,
            "kind": "real-micro-preflight",
            "generatedAt": "test-preflight-at",
            "status": status,
            "blockers": blockers,
            "warnings": [],
            "task": {
                "id": task_id,
                "budgetLimit": 1.0,
                "loopProfile": "real_micro"
            },
            "approvals": {
                "ready": status == "ready_to_run"
            },
            "profile": {
                "ready": status == "ready_to_run"
            }
        }))
        .unwrap();
        fs::write(dir.join("latest.json"), content).unwrap();
    }

    fn write_real_micro_runbook_inputs(project_dir: &Path) {
        let dbc = project_dir.join(".dbc");
        fs::create_dir_all(dbc.join("tasks")).unwrap();
        fs::write(
            dbc.join("tasks").join("REAL-MICRO-README.json"),
            serde_json::to_string_pretty(&serde_json::json!({
                "id": "REAL-MICRO-README",
                "title": "README real micro",
                "loopProfile": "real_micro",
                "budgetLimit": 1.0,
                "allowedPaths": ["README.md"],
                "deniedPaths": [".env"]
            }))
            .unwrap(),
        )
        .unwrap();
        fs::create_dir_all(dbc.join("readiness")).unwrap();
        fs::write(
            dbc.join("readiness").join("latest.json"),
            serde_json::to_string_pretty(&serde_json::json!({
                "status": "ready_with_warnings",
                "blockers": [],
                "warnings": []
            }))
            .unwrap(),
        )
        .unwrap();
        fs::create_dir_all(dbc.join("real-loop")).unwrap();
        fs::write(
            dbc.join("real-loop").join("latest.json"),
            serde_json::to_string_pretty(&serde_json::json!({
                "status": "prepared",
                "blockers": [],
                "task": {"id": "REAL-MICRO-README"}
            }))
            .unwrap(),
        )
        .unwrap();
        write_operator(
            project_dir,
            "REAL-MICRO-README",
            1.0,
            "awaiting_human_approval",
            Vec::new(),
        );
        write_preflight(
            project_dir,
            "REAL-MICRO-README",
            "awaiting_human_approval",
            Vec::new(),
        );
        fs::create_dir_all(dbc.join("approvals")).unwrap();
        fs::write(
            dbc.join("approvals").join("latest.json"),
            serde_json::to_string_pretty(&serde_json::json!({
                "kind": "approval-ledger",
                "status": "pending_approvals",
                "pending": 3,
                "records": []
            }))
            .unwrap(),
        )
        .unwrap();
        fs::create_dir_all(dbc.join("provider-contracts")).unwrap();
        fs::write(
            dbc.join("provider-contracts").join("latest.json"),
            serde_json::to_string_pretty(&serde_json::json!({
                "kind": "provider-contracts",
                "status": "ok",
                "blockers": [],
                "warnings": []
            }))
            .unwrap(),
        )
        .unwrap();
        fs::create_dir_all(dbc.join("revert")).unwrap();
        fs::write(
            dbc.join("revert").join("latest.json"),
            serde_json::to_string_pretty(&serde_json::json!({
                "kind": "revert-evidence",
                "status": "ok",
                "blockers": [],
                "warnings": []
            }))
            .unwrap(),
        )
        .unwrap();
        fs::write(
            dbc.join("providers.yaml"),
            r#"providers:
  - id: codex_cli
    name: Codex CLI
    type: cli
    runMode: mock
  - id: claude_code
    name: Claude Code
    type: cli
    runMode: mock
  - id: local_terminal
    name: Local Terminal Runner
    type: local_runner
    runMode: mock
"#,
        )
        .unwrap();
        fs::write(dbc.join("providers.real-micro.yaml"), "providers: []\n").unwrap();
        fs::write(dbc.join("providers.mock.yaml"), "providers: []\n").unwrap();
    }

    fn write_test_decision(project_dir: &Path, id: &str, decision: &str) {
        let dir = project_dir.join(".dbc").join("approvals").join("decisions");
        fs::create_dir_all(&dir).unwrap();
        let content = serde_json::to_string_pretty(&serde_json::json!({
            "version": 1,
            "kind": "approval-decision",
            "id": id,
            "decision": decision,
            "decidedAt": "test-decided-at"
        }))
        .unwrap();
        fs::write(
            dir.join(format!("{}.json", sanitize_file_stem(id))),
            content,
        )
        .unwrap();
    }

    fn start_request(
        project_dir: &Path,
        task_id: &str,
        budget_limit: f64,
        steps: Vec<LoopStepInput>,
    ) -> StartLoopRequest {
        StartLoopRequest {
            project_id: "project".to_string(),
            task_id: task_id.to_string(),
            project_path: project_dir.display().to_string(),
            task_title: "Task".to_string(),
            task_brief: "Brief".to_string(),
            task_criteria: Vec::new(),
            task_constraints: Vec::new(),
            task_budget_limit: budget_limit,
            task_spec_path: project_dir
                .join(".dbc/tasks/TASK.json")
                .display()
                .to_string(),
            task_spec_checksum: "checksum".to_string(),
            memory_context: String::new(),
            memory_refs: Vec::new(),
            steps,
        }
    }

    fn step(provider_id: &str, provider_type: &str, run_mode: &str) -> LoopStepInput {
        LoopStepInput {
            id: "plan".to_string(),
            state: "planned".to_string(),
            agent: "Team Lead".to_string(),
            role_id: "lead".to_string(),
            provider_id: provider_id.to_string(),
            provider_type: provider_type.to_string(),
            provider_command: String::new(),
            provider_args_template: String::new(),
            provider_prompt_mode: "stdin".to_string(),
            provider_run_mode: run_mode.to_string(),
            agent_mode: "read_only".to_string(),
            local_commands: Vec::new(),
            timeout_seconds: 1,
            max_output_bytes: 1024,
            max_attempts: 1,
            summary: "summary".to_string(),
            evidence: "evidence".to_string(),
        }
    }

    fn loop_run_row(loop_id: &str, budget_limit: f64) -> LoopRunRow {
        LoopRunRow {
            id: loop_id.to_string(),
            project_id: "project".to_string(),
            task_id: "TASK".to_string(),
            project_path: String::new(),
            task_title: "Task".to_string(),
            task_brief: String::new(),
            task_criteria: Vec::new(),
            task_constraints: Vec::new(),
            task_budget_limit: budget_limit,
            task_spec_path: String::new(),
            task_spec_checksum: String::new(),
            memory_context: String::new(),
            memory_refs: Vec::new(),
            status: "running".to_string(),
            active_step_index: 0,
            artifact_dir: String::new(),
        }
    }

    fn loop_step_snapshot(
        provider_id: &str,
        provider_type: &str,
        run_mode: &str,
    ) -> LoopStepSnapshot {
        LoopStepSnapshot {
            id: "plan".to_string(),
            state: "planned".to_string(),
            agent: "Team Lead".to_string(),
            role_id: "lead".to_string(),
            provider_id: provider_id.to_string(),
            provider_type: provider_type.to_string(),
            provider_command: String::new(),
            provider_args_template: String::new(),
            provider_prompt_mode: "stdin".to_string(),
            provider_run_mode: run_mode.to_string(),
            agent_mode: "read_only".to_string(),
            local_commands: Vec::new(),
            timeout_seconds: 1,
            max_output_bytes: 1024,
            max_attempts: 1,
            attempt_count: 0,
            requires_approval: false,
            last_error: String::new(),
            summary: String::new(),
            evidence: String::new(),
            status: "running".to_string(),
            output: String::new(),
            structured_report_json: String::new(),
            artifact_path: String::new(),
            evidence_path: String::new(),
            started_at: String::new(),
            finished_at: String::new(),
        }
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            environment_check,
            classify_command,
            discover_cli,
            check_cli_contract,
            test_cli_provider,
            run_cli_provider,
            run_controlled_smoke_loop,
            start_loop_run,
            advance_loop_run,
            resume_loop_run,
            retry_loop_step,
            resolve_loop_approval,
            create_task_contract,
            freeze_task_contract,
            approve_task_contract,
            reject_task_contract,
            create_work_slice,
            approve_work_slice,
            start_harness_run,
            advance_harness_run,
            generate_evidence_pack,
            accept_or_rework_harness_result,
            load_harness_overview,
            save_task_spec,
            list_task_specs,
            load_task_spec,
            save_memory_note,
            list_memory_notes,
            save_project_config,
            load_project_config,
            apply_provider_profile,
            recover_project_state,
            generate_release_package,
            generate_operator_checklist,
            approve_operator_gate,
            load_operator_checklist_report,
            generate_real_micro_preflight_report,
            generate_real_micro_runbook_report,
            get_loop_run,
            list_loop_runs,
            load_loop_manifest,
            load_loop_evidence_bundle,
            load_launch_doctor_report,
            load_approval_queue_report,
            load_provider_session_report,
            load_loop_state_machine_report,
            load_run_journal_report,
            load_real_micro_comparison_report,
            load_revert_evidence_report,
            load_support_bundle_report,
            load_real_micro_preflight_report,
            load_real_micro_runbook_report,
            create_workspace,
            list_workspaces
        ])
        .run(tauri::generate_context!())
        .expect("error while running Dildin Build Control");
}
