use rusqlite::{params, Connection};
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};

#[derive(Clone, Serialize, Deserialize)]
pub struct TaskContractRequest {
    pub project_id: String,
    pub project_path: String,
    pub task_id: String,
    pub title: String,
    pub business_goal: String,
    pub scope: String,
    pub out_of_scope: String,
    pub allowed_paths: Vec<String>,
    pub forbidden_paths: Vec<String>,
    pub acceptance_criteria: Vec<String>,
    pub test_requirements: Vec<String>,
    pub evidence_requirements: Vec<String>,
    pub approval_required_actions: Vec<String>,
    pub stop_conditions: Vec<String>,
    pub budget_limits: serde_json::Value,
    pub risk_level: String,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct TaskContract {
    pub id: String,
    pub project_id: String,
    pub project_path: String,
    pub task_id: String,
    pub version: i64,
    pub title: String,
    pub business_goal: String,
    pub scope: String,
    pub out_of_scope: String,
    pub allowed_paths: Vec<String>,
    pub forbidden_paths: Vec<String>,
    pub acceptance_criteria: Vec<String>,
    pub test_requirements: Vec<String>,
    pub evidence_requirements: Vec<String>,
    pub approval_required_actions: Vec<String>,
    pub stop_conditions: Vec<String>,
    pub budget_limits: serde_json::Value,
    pub risk_level: String,
    pub status: String,
    pub created_at: String,
    pub frozen_at: String,
    pub approved_at: String,
    pub artifact_path: String,
    pub checksum: String,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct WorkSliceRequest {
    pub project_id: String,
    pub project_path: String,
    pub task_id: String,
    pub contract_id: String,
    pub title: String,
    pub description: String,
    pub sequence: i64,
    pub agent_role: String,
    pub allowed_paths: Vec<String>,
    pub commands_allowed: Vec<String>,
    pub approval_required: bool,
    pub acceptance_criteria: Vec<String>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct WorkSlice {
    pub id: String,
    pub project_id: String,
    pub project_path: String,
    pub task_id: String,
    pub contract_id: String,
    pub title: String,
    pub description: String,
    pub sequence: i64,
    pub status: String,
    pub agent_role: String,
    pub allowed_paths: Vec<String>,
    pub commands_allowed: Vec<String>,
    pub approval_required: bool,
    pub acceptance_criteria: Vec<String>,
    pub result_summary: String,
    pub created_at: String,
    pub started_at: String,
    pub completed_at: String,
    pub artifact_path: String,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct HarnessRunRequest {
    pub project_id: String,
    pub project_path: String,
    pub task_id: String,
    pub contract_id: String,
    pub work_slice_id: String,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct HarnessRun {
    pub id: String,
    pub project_id: String,
    pub project_path: String,
    pub task_id: String,
    pub contract_id: String,
    pub status: String,
    pub current_stage: String,
    pub current_slice_id: String,
    pub created_at: String,
    pub started_at: String,
    pub completed_at: String,
    pub last_error: String,
    pub compatibility_loop_run_id: String,
    pub manifest_path: String,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct EvidencePack {
    pub id: String,
    pub project_id: String,
    pub project_path: String,
    pub task_id: String,
    pub contract_id: String,
    pub harness_run_id: String,
    pub status: String,
    pub manifest_path: String,
    pub report_path: String,
    pub created_at: String,
    pub finalized_at: String,
    pub final_decision: String,
    pub refs: serde_json::Value,
}

#[derive(Clone, Deserialize)]
pub struct FinalDecisionRequest {
    pub harness_run_id: String,
    pub decision: String,
    pub note: String,
}

#[derive(Clone, Serialize)]
pub struct HarnessOverview {
    pub contracts: Vec<TaskContract>,
    pub slices: Vec<WorkSlice>,
    pub runs: Vec<HarnessRun>,
    pub evidence_packs: Vec<EvidencePack>,
}

pub fn ensure_schema(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        create table if not exists task_contracts (
            id text primary key,
            project_id text not null,
            project_path text not null,
            task_id text not null,
            version integer not null,
            title text not null,
            business_goal text not null,
            scope text not null,
            out_of_scope text not null,
            allowed_paths_json text not null default '[]',
            forbidden_paths_json text not null default '[]',
            acceptance_criteria_json text not null default '[]',
            test_requirements_json text not null default '[]',
            evidence_requirements_json text not null default '[]',
            approval_required_actions_json text not null default '[]',
            stop_conditions_json text not null default '[]',
            budget_limits_json text not null default '{}',
            risk_level text not null,
            status text not null,
            created_at text not null,
            frozen_at text not null default '',
            approved_at text not null default '',
            artifact_path text not null default '',
            checksum text not null default ''
        );
        create table if not exists work_slices (
            id text primary key,
            project_id text not null,
            project_path text not null,
            task_id text not null,
            contract_id text not null,
            title text not null,
            description text not null,
            sequence integer not null,
            status text not null,
            agent_role text not null,
            allowed_paths_json text not null default '[]',
            commands_allowed_json text not null default '[]',
            approval_required integer not null default 0,
            acceptance_criteria_json text not null default '[]',
            result_summary text not null default '',
            created_at text not null,
            started_at text not null default '',
            completed_at text not null default '',
            artifact_path text not null default ''
        );
        create table if not exists harness_runs (
            id text primary key,
            project_id text not null,
            project_path text not null,
            task_id text not null,
            contract_id text not null,
            status text not null,
            current_stage text not null,
            current_slice_id text not null,
            created_at text not null,
            started_at text not null default '',
            completed_at text not null default '',
            last_error text not null default '',
            compatibility_loop_run_id text not null default '',
            manifest_path text not null default ''
        );
        create table if not exists evidence_packs (
            id text primary key,
            project_id text not null,
            project_path text not null,
            task_id text not null,
            contract_id text not null,
            harness_run_id text not null,
            status text not null,
            manifest_path text not null,
            report_path text not null default '',
            created_at text not null,
            finalized_at text not null default '',
            final_decision text not null default '',
            refs_json text not null default '{}'
        );
        ",
    )
    .map_err(|err| err.to_string())?;
    Ok(())
}

pub fn create_task_contract(
    conn: &Connection,
    request: TaskContractRequest,
) -> Result<TaskContract, String> {
    let version = next_contract_version(conn, &request.project_id, &request.task_id)?;
    let id = format!(
        "contract-{}-v{}",
        sanitize_file_stem(&request.task_id),
        version
    );
    let created_at = unix_millis();
    let artifact_path = contract_path(&request.project_path, &id);
    let mut contract = TaskContract {
        id,
        project_id: request.project_id,
        project_path: request.project_path,
        task_id: request.task_id,
        version,
        title: request.title,
        business_goal: request.business_goal,
        scope: request.scope,
        out_of_scope: request.out_of_scope,
        allowed_paths: request.allowed_paths,
        forbidden_paths: request.forbidden_paths,
        acceptance_criteria: request.acceptance_criteria,
        test_requirements: request.test_requirements,
        evidence_requirements: request.evidence_requirements,
        approval_required_actions: request.approval_required_actions,
        stop_conditions: request.stop_conditions,
        budget_limits: request.budget_limits,
        risk_level: request.risk_level,
        status: "draft".to_string(),
        created_at,
        frozen_at: String::new(),
        approved_at: String::new(),
        artifact_path: artifact_path.display().to_string(),
        checksum: String::new(),
    };
    write_contract_artifact(&mut contract)?;
    insert_contract(conn, &contract)?;
    Ok(contract)
}

pub fn freeze_task_contract(conn: &Connection, contract_id: &str) -> Result<TaskContract, String> {
    let mut contract = read_contract(conn, contract_id)?;
    if contract.status != "draft" {
        return Err(format!(
            "Only draft contracts can be frozen. Current status: {}",
            contract.status
        ));
    }
    contract.status = "waiting_approval".to_string();
    contract.frozen_at = unix_millis();
    write_contract_artifact(&mut contract)?;
    update_contract_status(conn, &contract)?;
    write_approval_gate(
        &contract.project_path,
        "spec",
        &contract.id,
        "pending",
        true,
        "medium",
        "Spec approval",
        "Frozen TaskContract requires human approval before WorkSlice creation.",
        vec![contract.artifact_path.clone()],
    )?;
    Ok(contract)
}

pub fn approve_task_contract(conn: &Connection, contract_id: &str) -> Result<TaskContract, String> {
    let mut contract = read_contract(conn, contract_id)?;
    if !["frozen", "waiting_approval"].contains(&contract.status.as_str()) {
        return Err(format!(
            "Only frozen or waiting_approval contracts can be approved. Current status: {}",
            contract.status
        ));
    }
    contract.status = "approved".to_string();
    contract.approved_at = unix_millis();
    write_contract_artifact(&mut contract)?;
    update_contract_status(conn, &contract)?;
    write_approval_gate(
        &contract.project_path,
        "spec",
        &contract.id,
        "approved",
        true,
        "medium",
        "Spec approval",
        "TaskContract approved by human operator.",
        vec![contract.artifact_path.clone()],
    )?;
    Ok(contract)
}

pub fn reject_task_contract(conn: &Connection, contract_id: &str) -> Result<TaskContract, String> {
    let mut contract = read_contract(conn, contract_id)?;
    if contract.status == "approved" {
        return Err(
            "Approved contracts cannot be rejected directly; create a superseding contract."
                .to_string(),
        );
    }
    contract.status = "rejected".to_string();
    write_contract_artifact(&mut contract)?;
    update_contract_status(conn, &contract)?;
    write_approval_gate(
        &contract.project_path,
        "spec",
        &contract.id,
        "blocked",
        true,
        "medium",
        "Spec approval",
        "TaskContract rejected by human operator.",
        vec![contract.artifact_path.clone()],
    )?;
    Ok(contract)
}

pub fn create_work_slice(
    conn: &Connection,
    request: WorkSliceRequest,
) -> Result<WorkSlice, String> {
    let contract = read_contract(conn, &request.contract_id)?;
    if contract.status != "approved" {
        return Err(format!(
            "WorkSlice requires an approved TaskContract. Current contract status: {}",
            contract.status
        ));
    }
    ensure_contract_matches_request(
        &contract,
        &request.project_id,
        &request.project_path,
        &request.task_id,
    )?;
    let id = format!(
        "slice-{}-{}-{}",
        sanitize_file_stem(&request.task_id),
        request.sequence.max(1),
        unix_millis()
    );
    let artifact_path = slice_path(&request.project_path, &id);
    let slice = WorkSlice {
        id,
        project_id: request.project_id,
        project_path: request.project_path,
        task_id: request.task_id,
        contract_id: request.contract_id,
        title: request.title,
        description: request.description,
        sequence: request.sequence,
        status: if request.approval_required {
            "waiting_approval".to_string()
        } else {
            "approved".to_string()
        },
        agent_role: request.agent_role,
        allowed_paths: request.allowed_paths,
        commands_allowed: request.commands_allowed,
        approval_required: request.approval_required,
        acceptance_criteria: request.acceptance_criteria,
        result_summary: String::new(),
        created_at: unix_millis(),
        started_at: String::new(),
        completed_at: String::new(),
        artifact_path: artifact_path.display().to_string(),
    };
    write_json(&artifact_path, &slice)?;
    insert_slice(conn, &slice)?;
    write_approval_gate(
        &slice.project_path,
        "work_slice",
        &slice.id,
        if slice.approval_required {
            "pending"
        } else {
            "approved"
        },
        slice.approval_required,
        "medium",
        "WorkSlice approval",
        "WorkSlice approval gate controls execution of this bounded slice.",
        vec![slice.artifact_path.clone(), contract.artifact_path],
    )?;
    Ok(slice)
}

pub fn approve_work_slice(conn: &Connection, slice_id: &str) -> Result<WorkSlice, String> {
    let mut slice = read_slice(conn, slice_id)?;
    if !["proposed", "waiting_approval"].contains(&slice.status.as_str()) {
        return Err(format!(
            "Only proposed or waiting_approval slices can be approved. Current status: {}",
            slice.status
        ));
    }
    slice.status = "approved".to_string();
    write_json(Path::new(&slice.artifact_path), &slice)?;
    update_slice(conn, &slice)?;
    write_approval_gate(
        &slice.project_path,
        "work_slice",
        &slice.id,
        "approved",
        slice.approval_required,
        "medium",
        "WorkSlice approval",
        "WorkSlice approved by human operator.",
        vec![slice.artifact_path.clone()],
    )?;
    Ok(slice)
}

pub fn create_harness_run(
    conn: &Connection,
    request: HarnessRunRequest,
) -> Result<HarnessRun, String> {
    let contract = read_contract(conn, &request.contract_id)?;
    if contract.status != "approved" {
        return Err(format!(
            "HarnessRun requires approved contract. Current status: {}",
            contract.status
        ));
    }
    let slice = read_slice(conn, &request.work_slice_id)?;
    if slice.status != "approved" {
        return Err(format!(
            "HarnessRun requires approved slice. Current status: {}",
            slice.status
        ));
    }
    ensure_contract_matches_request(
        &contract,
        &request.project_id,
        &request.project_path,
        &request.task_id,
    )?;
    ensure_slice_matches_contract(&slice, &contract)?;
    let id = format!("harness-{}", unix_millis());
    let manifest_path = harness_manifest_path(&request.project_path, &id);
    let run = HarnessRun {
        id,
        project_id: request.project_id,
        project_path: request.project_path,
        task_id: request.task_id,
        contract_id: request.contract_id,
        status: "approved".to_string(),
        current_stage: "approved".to_string(),
        current_slice_id: request.work_slice_id,
        created_at: unix_millis(),
        started_at: String::new(),
        completed_at: String::new(),
        last_error: String::new(),
        compatibility_loop_run_id: String::new(),
        manifest_path: manifest_path.display().to_string(),
    };
    write_harness_artifacts(&run)?;
    insert_harness_run(conn, &run)?;
    write_approval_gate(
        &run.project_path,
        "plan",
        &run.id,
        "approved",
        true,
        "medium",
        "Plan approval",
        "HarnessRun plan approved through approved TaskContract and WorkSlice.",
        vec![run.manifest_path.clone()],
    )?;
    write_approval_gate(
        &run.project_path,
        "real_provider",
        &run.id,
        "not_required",
        false,
        "high",
        "Real provider approval",
        "Harness v0.2 compatibility execution does not auto-run real Codex or Claude providers.",
        vec![run.manifest_path.clone()],
    )?;
    write_approval_gate(
        &run.project_path,
        "command",
        &run.id,
        if slice.commands_allowed.is_empty() {
            "not_required"
        } else {
            "pending"
        },
        !slice.commands_allowed.is_empty(),
        "high",
        "Command approval",
        "Local commands are constrained to WorkSlice.commandsAllowed and existing command policy.",
        vec![run.manifest_path.clone(), slice.artifact_path],
    )?;
    Ok(run)
}

pub fn attach_compatibility_loop(
    conn: &Connection,
    harness_run_id: &str,
    loop_run_id: &str,
) -> Result<HarnessRun, String> {
    let mut run = read_harness_run(conn, harness_run_id)?;
    run.status = "slice_running".to_string();
    run.current_stage = "slice_running".to_string();
    run.started_at = unix_millis();
    run.compatibility_loop_run_id = loop_run_id.to_string();
    update_harness_run(conn, &run)?;
    write_harness_event(
        &run,
        "compatibility_loop_started",
        &format!("Compatibility loop {loop_run_id} started."),
    )?;
    write_harness_artifacts(&run)?;
    Ok(run)
}

pub fn update_harness_from_loop(
    conn: &Connection,
    harness_run_id: &str,
    loop_status: &str,
    active_state: &str,
) -> Result<HarnessRun, String> {
    let mut run = read_harness_run(conn, harness_run_id)?;
    match loop_status {
        "completed" => {
            run.status = "evidence_ready".to_string();
            run.current_stage = "evidence_ready".to_string();
            run.completed_at = unix_millis();
        }
        "failed" | "blocked" | "stopped" => {
            run.status = "blocked".to_string();
            run.current_stage = "blocked".to_string();
            run.last_error = format!("Compatibility loop stopped with status {loop_status}.");
        }
        _ => {
            let mapped = map_loop_state_to_harness_status(active_state);
            run.status = mapped.to_string();
            run.current_stage = mapped.to_string();
        }
    }
    update_current_slice_from_run(conn, &run)?;
    update_harness_run(conn, &run)?;
    write_harness_event(
        &run,
        "harness_advanced",
        &format!("Loop status {loop_status}; stage {}.", run.current_stage),
    )?;
    write_harness_artifacts(&run)?;
    Ok(run)
}

pub fn generate_evidence_pack(
    conn: &Connection,
    harness_run_id: &str,
) -> Result<EvidencePack, String> {
    let run = read_harness_run(conn, harness_run_id)?;
    let pack_id = format!("pack-{}", sanitize_file_stem(harness_run_id));
    let manifest_path = evidence_pack_manifest_path(&run.project_path, &pack_id);
    let report_path = PathBuf::from(&run.project_path)
        .join(".dbc")
        .join("reports")
        .join(format!("{pack_id}-acceptance.md"));
    let refs = serde_json::json!({
        "taskContract": contract_path(&run.project_path, &run.contract_id).display().to_string(),
        "workSlice": slice_path(&run.project_path, &run.current_slice_id).display().to_string(),
        "harnessRun": run.manifest_path,
        "compatibilityLoopRunId": run.compatibility_loop_run_id,
        "runJournal": PathBuf::from(&run.project_path).join(".dbc").join("run-journal").join("latest.json").display().to_string(),
        "stepEvidenceDir": if run.compatibility_loop_run_id.is_empty() { String::new() } else { PathBuf::from(&run.project_path).join(".dbc").join("evidence").join(&run.compatibility_loop_run_id).display().to_string() },
        "approvalDecisions": PathBuf::from(&run.project_path).join(".dbc").join("approvals").join("decisions").display().to_string(),
        "reviewReport": if run.compatibility_loop_run_id.is_empty() { String::new() } else { PathBuf::from(&run.project_path).join(".dbc").join("artifacts").join(&run.compatibility_loop_run_id).join("05-review.md").display().to_string() },
        "securityReport": if run.compatibility_loop_run_id.is_empty() { String::new() } else { PathBuf::from(&run.project_path).join(".dbc").join("security").join(format!("{}.json", run.compatibility_loop_run_id)).display().to_string() },
        "buildLog": if run.compatibility_loop_run_id.is_empty() { String::new() } else { PathBuf::from(&run.project_path).join(".dbc").join("artifacts").join(&run.compatibility_loop_run_id).join("03-build.md").display().to_string() },
        "testLog": if run.compatibility_loop_run_id.is_empty() { String::new() } else { PathBuf::from(&run.project_path).join(".dbc").join("artifacts").join(&run.compatibility_loop_run_id).join("04-test.md").display().to_string() },
        "finalDecision": ""
    });
    let pack = EvidencePack {
        id: pack_id,
        project_id: run.project_id.clone(),
        project_path: run.project_path.clone(),
        task_id: run.task_id.clone(),
        contract_id: run.contract_id.clone(),
        harness_run_id: run.id.clone(),
        status: "ready".to_string(),
        manifest_path: manifest_path.display().to_string(),
        report_path: report_path.display().to_string(),
        created_at: unix_millis(),
        finalized_at: String::new(),
        final_decision: String::new(),
        refs,
    };
    write_json(&manifest_path, &pack)?;
    write_evidence_report(&report_path, &pack)?;
    insert_or_replace_pack(conn, &pack)?;
    write_approval_gate(
        &pack.project_path,
        "evidence",
        &pack.id,
        "pending",
        true,
        "medium",
        "Evidence acceptance",
        "EvidencePack is ready and requires final accept/rework/reject decision.",
        vec![pack.manifest_path.clone(), pack.report_path.clone()],
    )?;
    Ok(pack)
}

pub fn accept_or_rework(
    conn: &Connection,
    request: FinalDecisionRequest,
) -> Result<HarnessRun, String> {
    let mut run = read_harness_run(conn, &request.harness_run_id)?;
    run.status = match request.decision.as_str() {
        "accepted" | "accept" => "accepted".to_string(),
        "rework" | "rework_required" => "rework".to_string(),
        "rejected" | "reject" => "rejected".to_string(),
        other => return Err(format!("Unsupported final decision: {other}")),
    };
    run.current_stage = run.status.clone();
    run.completed_at = unix_millis();
    run.last_error = request.note;
    update_current_slice_from_run(conn, &run)?;
    update_harness_run(conn, &run)?;
    write_harness_event(
        &run,
        "final_decision",
        &format!("Harness result marked {}.", run.status),
    )?;
    write_harness_artifacts(&run)?;
    finalize_evidence_packs(conn, &run)?;
    Ok(run)
}

pub fn overview(conn: &Connection, project_path: &str) -> Result<HarnessOverview, String> {
    Ok(HarnessOverview {
        contracts: list_contracts(conn, project_path)?,
        slices: list_slices(conn, project_path)?,
        runs: list_harness_runs(conn, project_path)?,
        evidence_packs: list_evidence_packs(conn, project_path)?,
    })
}

pub fn read_contract(conn: &Connection, id: &str) -> Result<TaskContract, String> {
    conn.query_row(
        "select id, project_id, project_path, task_id, version, title, business_goal, scope, out_of_scope,
         allowed_paths_json, forbidden_paths_json, acceptance_criteria_json, test_requirements_json,
         evidence_requirements_json, approval_required_actions_json, stop_conditions_json, budget_limits_json,
         risk_level, status, created_at, frozen_at, approved_at, artifact_path, checksum
         from task_contracts where id = ?1",
        params![id],
        row_to_contract,
    )
    .map_err(|err| err.to_string())
}

pub fn read_slice(conn: &Connection, id: &str) -> Result<WorkSlice, String> {
    conn.query_row(
        "select id, project_id, project_path, task_id, contract_id, title, description, sequence, status, agent_role,
         allowed_paths_json, commands_allowed_json, approval_required, acceptance_criteria_json, result_summary,
         created_at, started_at, completed_at, artifact_path from work_slices where id = ?1",
        params![id],
        row_to_slice,
    )
    .map_err(|err| err.to_string())
}

pub fn read_harness_run(conn: &Connection, id: &str) -> Result<HarnessRun, String> {
    conn.query_row(
        "select id, project_id, project_path, task_id, contract_id, status, current_stage, current_slice_id,
         created_at, started_at, completed_at, last_error, compatibility_loop_run_id, manifest_path from harness_runs where id = ?1",
        params![id],
        row_to_harness_run,
    )
    .map_err(|err| err.to_string())
}

fn next_contract_version(
    conn: &Connection,
    project_id: &str,
    task_id: &str,
) -> Result<i64, String> {
    conn.query_row(
        "select coalesce(max(version), 0) + 1 from task_contracts where project_id = ?1 and task_id = ?2",
        params![project_id, task_id],
        |row| row.get(0),
    )
    .map_err(|err| err.to_string())
}

fn insert_contract(conn: &Connection, contract: &TaskContract) -> Result<(), String> {
    conn.execute(
        "insert into task_contracts
         (id, project_id, project_path, task_id, version, title, business_goal, scope, out_of_scope,
          allowed_paths_json, forbidden_paths_json, acceptance_criteria_json, test_requirements_json,
          evidence_requirements_json, approval_required_actions_json, stop_conditions_json, budget_limits_json,
          risk_level, status, created_at, frozen_at, approved_at, artifact_path, checksum)
         values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24)",
        params![
            contract.id,
            contract.project_id,
            contract.project_path,
            contract.task_id,
            contract.version,
            contract.title,
            contract.business_goal,
            contract.scope,
            contract.out_of_scope,
            to_json(&contract.allowed_paths)?,
            to_json(&contract.forbidden_paths)?,
            to_json(&contract.acceptance_criteria)?,
            to_json(&contract.test_requirements)?,
            to_json(&contract.evidence_requirements)?,
            to_json(&contract.approval_required_actions)?,
            to_json(&contract.stop_conditions)?,
            serde_json::to_string(&contract.budget_limits).map_err(|err| err.to_string())?,
            contract.risk_level,
            contract.status,
            contract.created_at,
            contract.frozen_at,
            contract.approved_at,
            contract.artifact_path,
            contract.checksum,
        ],
    )
    .map_err(|err| err.to_string())?;
    Ok(())
}

fn insert_slice(conn: &Connection, slice: &WorkSlice) -> Result<(), String> {
    conn.execute(
        "insert into work_slices
         (id, project_id, project_path, task_id, contract_id, title, description, sequence, status, agent_role,
          allowed_paths_json, commands_allowed_json, approval_required, acceptance_criteria_json, result_summary,
          created_at, started_at, completed_at, artifact_path)
         values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)",
        params![
            slice.id,
            slice.project_id,
            slice.project_path,
            slice.task_id,
            slice.contract_id,
            slice.title,
            slice.description,
            slice.sequence,
            slice.status,
            slice.agent_role,
            to_json(&slice.allowed_paths)?,
            to_json(&slice.commands_allowed)?,
            if slice.approval_required { 1 } else { 0 },
            to_json(&slice.acceptance_criteria)?,
            slice.result_summary,
            slice.created_at,
            slice.started_at,
            slice.completed_at,
            slice.artifact_path,
        ],
    )
    .map_err(|err| err.to_string())?;
    Ok(())
}

fn insert_harness_run(conn: &Connection, run: &HarnessRun) -> Result<(), String> {
    conn.execute(
        "insert into harness_runs
         (id, project_id, project_path, task_id, contract_id, status, current_stage, current_slice_id,
          created_at, started_at, completed_at, last_error, compatibility_loop_run_id, manifest_path)
         values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        params![
            run.id,
            run.project_id,
            run.project_path,
            run.task_id,
            run.contract_id,
            run.status,
            run.current_stage,
            run.current_slice_id,
            run.created_at,
            run.started_at,
            run.completed_at,
            run.last_error,
            run.compatibility_loop_run_id,
            run.manifest_path,
        ],
    )
    .map_err(|err| err.to_string())?;
    Ok(())
}

fn insert_or_replace_pack(conn: &Connection, pack: &EvidencePack) -> Result<(), String> {
    conn.execute(
        "insert or replace into evidence_packs
         (id, project_id, project_path, task_id, contract_id, harness_run_id, status, manifest_path, report_path,
          created_at, finalized_at, final_decision, refs_json)
         values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        params![
            pack.id,
            pack.project_id,
            pack.project_path,
            pack.task_id,
            pack.contract_id,
            pack.harness_run_id,
            pack.status,
            pack.manifest_path,
            pack.report_path,
            pack.created_at,
            pack.finalized_at,
            pack.final_decision,
            serde_json::to_string(&pack.refs).map_err(|err| err.to_string())?,
        ],
    )
    .map_err(|err| err.to_string())?;
    Ok(())
}

fn update_contract_status(conn: &Connection, contract: &TaskContract) -> Result<(), String> {
    conn.execute(
        "update task_contracts
         set status = ?1, frozen_at = ?2, approved_at = ?3, artifact_path = ?4, checksum = ?5
         where id = ?6",
        params![
            contract.status,
            contract.frozen_at,
            contract.approved_at,
            contract.artifact_path,
            contract.checksum,
            contract.id,
        ],
    )
    .map_err(|err| err.to_string())?;
    Ok(())
}

fn update_slice(conn: &Connection, slice: &WorkSlice) -> Result<(), String> {
    conn.execute(
        "update work_slices
         set status = ?1, result_summary = ?2, started_at = ?3, completed_at = ?4, artifact_path = ?5
         where id = ?6",
        params![
            slice.status,
            slice.result_summary,
            slice.started_at,
            slice.completed_at,
            slice.artifact_path,
            slice.id,
        ],
    )
    .map_err(|err| err.to_string())?;
    Ok(())
}

fn update_harness_run(conn: &Connection, run: &HarnessRun) -> Result<(), String> {
    conn.execute(
        "update harness_runs
         set status = ?1, current_stage = ?2, started_at = ?3, completed_at = ?4, last_error = ?5,
             compatibility_loop_run_id = ?6, manifest_path = ?7
         where id = ?8",
        params![
            run.status,
            run.current_stage,
            run.started_at,
            run.completed_at,
            run.last_error,
            run.compatibility_loop_run_id,
            run.manifest_path,
            run.id,
        ],
    )
    .map_err(|err| err.to_string())?;
    Ok(())
}

fn list_contracts(conn: &Connection, project_path: &str) -> Result<Vec<TaskContract>, String> {
    let mut stmt = conn
        .prepare(
            "select id, project_id, project_path, task_id, version, title, business_goal, scope, out_of_scope,
             allowed_paths_json, forbidden_paths_json, acceptance_criteria_json, test_requirements_json,
             evidence_requirements_json, approval_required_actions_json, stop_conditions_json, budget_limits_json,
             risk_level, status, created_at, frozen_at, approved_at, artifact_path, checksum
             from task_contracts where project_path = ?1 order by created_at desc",
        )
        .map_err(|err| err.to_string())?;
    let rows = stmt
        .query_map(params![project_path], row_to_contract)
        .map_err(|err| err.to_string())?;
    collect_rows(rows)
}

fn list_slices(conn: &Connection, project_path: &str) -> Result<Vec<WorkSlice>, String> {
    let mut stmt = conn
        .prepare(
            "select id, project_id, project_path, task_id, contract_id, title, description, sequence, status, agent_role,
             allowed_paths_json, commands_allowed_json, approval_required, acceptance_criteria_json, result_summary,
             created_at, started_at, completed_at, artifact_path from work_slices where project_path = ?1 order by created_at desc",
        )
        .map_err(|err| err.to_string())?;
    let rows = stmt
        .query_map(params![project_path], row_to_slice)
        .map_err(|err| err.to_string())?;
    collect_rows(rows)
}

fn list_harness_runs(conn: &Connection, project_path: &str) -> Result<Vec<HarnessRun>, String> {
    let mut stmt = conn
        .prepare(
            "select id, project_id, project_path, task_id, contract_id, status, current_stage, current_slice_id,
             created_at, started_at, completed_at, last_error, compatibility_loop_run_id, manifest_path
             from harness_runs where project_path = ?1 order by created_at desc",
        )
        .map_err(|err| err.to_string())?;
    let rows = stmt
        .query_map(params![project_path], row_to_harness_run)
        .map_err(|err| err.to_string())?;
    collect_rows(rows)
}

fn list_evidence_packs(conn: &Connection, project_path: &str) -> Result<Vec<EvidencePack>, String> {
    let mut stmt = conn
        .prepare(
            "select id, project_id, project_path, task_id, contract_id, harness_run_id, status, manifest_path, report_path,
             created_at, finalized_at, final_decision, refs_json from evidence_packs where project_path = ?1 order by created_at desc",
        )
        .map_err(|err| err.to_string())?;
    let rows = stmt
        .query_map(params![project_path], row_to_evidence_pack)
        .map_err(|err| err.to_string())?;
    collect_rows(rows)
}

fn list_evidence_packs_for_run(
    conn: &Connection,
    harness_run_id: &str,
) -> Result<Vec<EvidencePack>, String> {
    let mut stmt = conn
        .prepare(
            "select id, project_id, project_path, task_id, contract_id, harness_run_id, status, manifest_path, report_path,
             created_at, finalized_at, final_decision, refs_json from evidence_packs where harness_run_id = ?1 order by created_at desc",
        )
        .map_err(|err| err.to_string())?;
    let rows = stmt
        .query_map(params![harness_run_id], row_to_evidence_pack)
        .map_err(|err| err.to_string())?;
    collect_rows(rows)
}

fn collect_rows<T, F>(rows: rusqlite::MappedRows<'_, F>) -> Result<Vec<T>, String>
where
    F: FnMut(&rusqlite::Row<'_>) -> rusqlite::Result<T>,
{
    let mut values = Vec::new();
    for row in rows {
        values.push(row.map_err(|err| err.to_string())?);
    }
    Ok(values)
}

fn row_to_contract(row: &rusqlite::Row<'_>) -> rusqlite::Result<TaskContract> {
    Ok(TaskContract {
        id: row.get(0)?,
        project_id: row.get(1)?,
        project_path: row.get(2)?,
        task_id: row.get(3)?,
        version: row.get(4)?,
        title: row.get(5)?,
        business_goal: row.get(6)?,
        scope: row.get(7)?,
        out_of_scope: row.get(8)?,
        allowed_paths: from_json_cell(row.get(9)?, 9)?,
        forbidden_paths: from_json_cell(row.get(10)?, 10)?,
        acceptance_criteria: from_json_cell(row.get(11)?, 11)?,
        test_requirements: from_json_cell(row.get(12)?, 12)?,
        evidence_requirements: from_json_cell(row.get(13)?, 13)?,
        approval_required_actions: from_json_cell(row.get(14)?, 14)?,
        stop_conditions: from_json_cell(row.get(15)?, 15)?,
        budget_limits: from_json_cell(row.get(16)?, 16)?,
        risk_level: row.get(17)?,
        status: row.get(18)?,
        created_at: row.get(19)?,
        frozen_at: row.get(20)?,
        approved_at: row.get(21)?,
        artifact_path: row.get(22)?,
        checksum: row.get(23)?,
    })
}

fn row_to_slice(row: &rusqlite::Row<'_>) -> rusqlite::Result<WorkSlice> {
    Ok(WorkSlice {
        id: row.get(0)?,
        project_id: row.get(1)?,
        project_path: row.get(2)?,
        task_id: row.get(3)?,
        contract_id: row.get(4)?,
        title: row.get(5)?,
        description: row.get(6)?,
        sequence: row.get(7)?,
        status: row.get(8)?,
        agent_role: row.get(9)?,
        allowed_paths: from_json_cell(row.get(10)?, 10)?,
        commands_allowed: from_json_cell(row.get(11)?, 11)?,
        approval_required: row.get::<_, i64>(12)? == 1,
        acceptance_criteria: from_json_cell(row.get(13)?, 13)?,
        result_summary: row.get(14)?,
        created_at: row.get(15)?,
        started_at: row.get(16)?,
        completed_at: row.get(17)?,
        artifact_path: row.get(18)?,
    })
}

fn row_to_harness_run(row: &rusqlite::Row<'_>) -> rusqlite::Result<HarnessRun> {
    Ok(HarnessRun {
        id: row.get(0)?,
        project_id: row.get(1)?,
        project_path: row.get(2)?,
        task_id: row.get(3)?,
        contract_id: row.get(4)?,
        status: row.get(5)?,
        current_stage: row.get(6)?,
        current_slice_id: row.get(7)?,
        created_at: row.get(8)?,
        started_at: row.get(9)?,
        completed_at: row.get(10)?,
        last_error: row.get(11)?,
        compatibility_loop_run_id: row.get(12)?,
        manifest_path: row.get(13)?,
    })
}

fn row_to_evidence_pack(row: &rusqlite::Row<'_>) -> rusqlite::Result<EvidencePack> {
    Ok(EvidencePack {
        id: row.get(0)?,
        project_id: row.get(1)?,
        project_path: row.get(2)?,
        task_id: row.get(3)?,
        contract_id: row.get(4)?,
        harness_run_id: row.get(5)?,
        status: row.get(6)?,
        manifest_path: row.get(7)?,
        report_path: row.get(8)?,
        created_at: row.get(9)?,
        finalized_at: row.get(10)?,
        final_decision: row.get(11)?,
        refs: from_json_cell(row.get(12)?, 12)?,
    })
}

fn from_json_cell<T: DeserializeOwned>(value: String, column: usize) -> rusqlite::Result<T> {
    serde_json::from_str(&value).map_err(|err| {
        rusqlite::Error::FromSqlConversionFailure(
            column,
            rusqlite::types::Type::Text,
            Box::new(err),
        )
    })
}

fn to_json<T: Serialize>(value: &T) -> Result<String, String> {
    serde_json::to_string(value).map_err(|err| err.to_string())
}

fn ensure_contract_matches_request(
    contract: &TaskContract,
    project_id: &str,
    project_path: &str,
    task_id: &str,
) -> Result<(), String> {
    if contract.project_id != project_id {
        return Err(format!(
            "TaskContract project_id mismatch: contract {} belongs to {}, request uses {}.",
            contract.id, contract.project_id, project_id
        ));
    }
    if contract.project_path != project_path {
        return Err(format!(
            "TaskContract project_path mismatch: contract {} belongs to {}, request uses {}.",
            contract.id, contract.project_path, project_path
        ));
    }
    if contract.task_id != task_id {
        return Err(format!(
            "TaskContract task_id mismatch: contract {} belongs to {}, request uses {}.",
            contract.id, contract.task_id, task_id
        ));
    }
    Ok(())
}

fn ensure_slice_matches_contract(slice: &WorkSlice, contract: &TaskContract) -> Result<(), String> {
    if slice.contract_id != contract.id {
        return Err(format!(
            "WorkSlice contract_id mismatch: slice {} belongs to {}, harness requested {}.",
            slice.id, slice.contract_id, contract.id
        ));
    }
    if slice.project_id != contract.project_id
        || slice.project_path != contract.project_path
        || slice.task_id != contract.task_id
    {
        return Err(format!(
            "WorkSlice scope mismatch: slice {} does not match contract {} project/task scope.",
            slice.id, contract.id
        ));
    }
    Ok(())
}

fn map_loop_state_to_harness_status(active_state: &str) -> &'static str {
    match active_state {
        "planned" => "planned",
        "testing" => "self_checked",
        "reviewing" => "reviewed",
        "security" => "security_reviewed",
        "acceptance" => "evidence_ready",
        "completed" => "evidence_ready",
        "failed" | "blocked" | "stopped" => "blocked",
        _ => "slice_running",
    }
}

fn update_current_slice_from_run(conn: &Connection, run: &HarnessRun) -> Result<(), String> {
    let mut slice = read_slice(conn, &run.current_slice_id)?;
    let next_status = match run.status.as_str() {
        "slice_running" | "planned" => "running",
        "self_checked" => "self_checked",
        "reviewed" => "reviewed",
        "security_reviewed" | "evidence_ready" => "security_reviewed",
        "accepted" | "shipped" => "accepted",
        "rework" => "rework_required",
        "rejected" => "rejected",
        "blocked" => "blocked",
        _ => return Ok(()),
    };
    slice.status = next_status.to_string();
    if slice.started_at.is_empty()
        && ["running", "self_checked", "reviewed", "security_reviewed"].contains(&next_status)
    {
        slice.started_at = unix_millis();
    }
    if ["accepted", "rework_required", "rejected", "blocked"].contains(&next_status) {
        slice.completed_at = unix_millis();
    }
    slice.result_summary = format!("HarnessRun {} reached {}.", run.id, run.status);
    write_json(Path::new(&slice.artifact_path), &slice)?;
    update_slice(conn, &slice)
}

fn finalize_evidence_packs(conn: &Connection, run: &HarnessRun) -> Result<(), String> {
    let mut packs = list_evidence_packs_for_run(conn, &run.id)?;
    if packs.is_empty() {
        packs.push(generate_evidence_pack(conn, &run.id)?);
    }
    for mut pack in packs {
        pack.status = "finalized".to_string();
        pack.finalized_at = unix_millis();
        pack.final_decision = run.status.clone();
        if !pack.refs.is_object() {
            pack.refs = serde_json::json!({});
        }
        if let Some(refs) = pack.refs.as_object_mut() {
            refs.insert(
                "finalDecision".to_string(),
                serde_json::Value::String(run.status.clone()),
            );
            refs.insert(
                "finalDecisionNote".to_string(),
                serde_json::Value::String(run.last_error.clone()),
            );
            refs.insert(
                "finalizedAt".to_string(),
                serde_json::Value::String(pack.finalized_at.clone()),
            );
        }
        write_json(Path::new(&pack.manifest_path), &pack)?;
        write_evidence_report(Path::new(&pack.report_path), &pack)?;
        insert_or_replace_pack(conn, &pack)?;
        write_approval_gate(
            &pack.project_path,
            "evidence",
            &pack.id,
            "approved",
            true,
            "medium",
            "Evidence acceptance",
            "EvidencePack final decision recorded.",
            vec![pack.manifest_path.clone(), pack.report_path.clone()],
        )?;
    }
    Ok(())
}

fn write_approval_gate(
    project_path: &str,
    phase: &str,
    target_id: &str,
    status: &str,
    required: bool,
    risk: &str,
    title: &str,
    reason: &str,
    evidence: Vec<String>,
) -> Result<(), String> {
    let id = format!("harness-{phase}-{target_id}");
    let path = PathBuf::from(project_path)
        .join(".dbc")
        .join("approval-gates")
        .join(format!("{}.json", sanitize_file_stem(&id)));
    let gate = serde_json::json!({
        "version": 1,
        "kind": "harness-approval-gate",
        "id": id,
        "phase": phase,
        "targetId": target_id,
        "status": status,
        "required": required,
        "risk": risk,
        "title": title,
        "reason": reason,
        "evidence": evidence,
        "updatedAt": unix_millis()
    });
    write_json(&path, &gate)
}

fn write_contract_artifact(contract: &mut TaskContract) -> Result<(), String> {
    contract.checksum.clear();
    let payload = serde_json::to_string_pretty(contract).map_err(|err| err.to_string())?;
    contract.checksum = stable_checksum(&payload);
    write_json(Path::new(&contract.artifact_path), contract)
}

fn write_harness_artifacts(run: &HarnessRun) -> Result<(), String> {
    write_json(Path::new(&run.manifest_path), run)?;
    let events_path = PathBuf::from(&run.project_path)
        .join(".dbc")
        .join("harness-runs")
        .join(&run.id)
        .join("events.jsonl");
    if !events_path.exists() {
        if let Some(parent) = events_path.parent() {
            fs::create_dir_all(parent).map_err(|err| err.to_string())?;
        }
        fs::write(&events_path, "").map_err(|err| err.to_string())?;
    }
    Ok(())
}

fn write_harness_event(run: &HarnessRun, event_type: &str, detail: &str) -> Result<(), String> {
    let events_path = PathBuf::from(&run.project_path)
        .join(".dbc")
        .join("harness-runs")
        .join(&run.id)
        .join("events.jsonl");
    if let Some(parent) = events_path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    let line = serde_json::json!({
        "id": format!("event-{}", unix_millis()),
        "type": event_type,
        "detail": detail,
        "harnessRunId": run.id,
        "status": run.status,
        "stage": run.current_stage,
        "createdAt": unix_millis()
    });
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&events_path)
        .map_err(|err| err.to_string())?;
    writeln!(
        file,
        "{}",
        serde_json::to_string(&line).map_err(|err| err.to_string())?
    )
    .map_err(|err| err.to_string())?;
    Ok(())
}

fn write_evidence_report(path: &Path, pack: &EvidencePack) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    let refs = serde_json::to_string_pretty(&pack.refs).map_err(|err| err.to_string())?;
    fs::write(
        path,
        format!(
            "# Evidence Pack {}\n\nStatus: {}\n\nHarness run: {}\n\nContract: {}\n\nFinal decision: {}\n\n## References\n\n```json\n{}\n```\n",
            pack.id,
            pack.status,
            pack.harness_run_id,
            pack.contract_id,
            if pack.final_decision.is_empty() { "pending" } else { &pack.final_decision },
            refs
        ),
    )
    .map_err(|err| err.to_string())
}

fn write_json<T: Serialize>(path: &Path, value: &T) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    let json = serde_json::to_string_pretty(value).map_err(|err| err.to_string())?;
    fs::write(path, format!("{json}\n")).map_err(|err| err.to_string())
}

fn contract_path(project_path: &str, id: &str) -> PathBuf {
    PathBuf::from(project_path)
        .join(".dbc")
        .join("contracts")
        .join(format!("{id}.json"))
}

fn slice_path(project_path: &str, id: &str) -> PathBuf {
    PathBuf::from(project_path)
        .join(".dbc")
        .join("slices")
        .join(format!("{id}.json"))
}

fn harness_manifest_path(project_path: &str, id: &str) -> PathBuf {
    PathBuf::from(project_path)
        .join(".dbc")
        .join("harness-runs")
        .join(id)
        .join("manifest.json")
}

fn evidence_pack_manifest_path(project_path: &str, id: &str) -> PathBuf {
    PathBuf::from(project_path)
        .join(".dbc")
        .join("packs")
        .join(id)
        .join("manifest.json")
}

fn unix_millis() -> String {
    let millis = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    millis.to_string()
}

fn sanitize_file_stem(value: &str) -> String {
    let stem: String = value
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' {
                ch.to_ascii_lowercase()
            } else {
                '-'
            }
        })
        .collect();
    let collapsed = stem
        .split('-')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("-");
    if collapsed.is_empty() {
        "item".to_string()
    } else {
        collapsed
    }
}

fn stable_checksum(value: &str) -> String {
    let mut hash: u64 = 0xcbf29ce484222325;
    for byte in value.as_bytes() {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("fnv1a64:{hash:016x}")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_project(name: &str) -> PathBuf {
        let path = std::env::temp_dir().join(format!("dbc-harness-test-{name}-{}", unix_millis()));
        fs::create_dir_all(&path).unwrap();
        path
    }

    fn contract_request(project: &Path) -> TaskContractRequest {
        TaskContractRequest {
            project_id: "project".to_string(),
            project_path: project.display().to_string(),
            task_id: "TASK-HARNESS".to_string(),
            title: "Harness task".to_string(),
            business_goal: "Create a durable Harness contract.".to_string(),
            scope: "src".to_string(),
            out_of_scope: ".env".to_string(),
            allowed_paths: vec!["src".to_string()],
            forbidden_paths: vec![".env".to_string()],
            acceptance_criteria: vec!["Contract is persisted.".to_string()],
            test_requirements: vec!["cargo test".to_string()],
            evidence_requirements: vec!["manifest".to_string()],
            approval_required_actions: vec!["spec".to_string(), "slice".to_string()],
            stop_conditions: vec!["Stop on policy deny.".to_string()],
            budget_limits: serde_json::json!({ "budgetLimit": 0 }),
            risk_level: "low".to_string(),
        }
    }

    fn approved_contract(conn: &Connection, project: &Path) -> TaskContract {
        let contract = create_task_contract(conn, contract_request(project)).unwrap();
        freeze_task_contract(conn, &contract.id).unwrap();
        approve_task_contract(conn, &contract.id).unwrap()
    }

    fn approved_slice(conn: &Connection, project: &Path, contract: &TaskContract) -> WorkSlice {
        create_work_slice(
            conn,
            WorkSliceRequest {
                project_id: contract.project_id.clone(),
                project_path: project.display().to_string(),
                task_id: contract.task_id.clone(),
                contract_id: contract.id.clone(),
                title: "Slice".to_string(),
                description: "Do the smallest useful work.".to_string(),
                sequence: 1,
                agent_role: "developer".to_string(),
                allowed_paths: vec!["src".to_string()],
                commands_allowed: Vec::new(),
                approval_required: false,
                acceptance_criteria: vec!["Done".to_string()],
            },
        )
        .unwrap()
    }

    #[test]
    fn task_contract_freeze_and_approval_are_durable() {
        let project = temp_project("contract");
        let conn = Connection::open_in_memory().unwrap();
        ensure_schema(&conn).unwrap();

        let contract = create_task_contract(&conn, contract_request(&project)).unwrap();
        assert_eq!(contract.status, "draft");
        assert!(Path::new(&contract.artifact_path).exists());

        let frozen = freeze_task_contract(&conn, &contract.id).unwrap();
        assert_eq!(frozen.status, "waiting_approval");
        assert!(freeze_task_contract(&conn, &contract.id).is_err());

        let approved = approve_task_contract(&conn, &contract.id).unwrap();
        assert_eq!(approved.status, "approved");
        assert!(!approved.checksum.is_empty());

        fs::remove_dir_all(project).ok();
    }

    #[test]
    fn approved_contract_can_create_slice_run_and_evidence_pack() {
        let project = temp_project("run");
        let conn = Connection::open_in_memory().unwrap();
        ensure_schema(&conn).unwrap();

        let contract = approved_contract(&conn, &project);
        let slice = approved_slice(&conn, &project, &contract);
        assert_eq!(slice.status, "approved");

        let run = create_harness_run(
            &conn,
            HarnessRunRequest {
                project_id: "project".to_string(),
                project_path: project.display().to_string(),
                task_id: "TASK-HARNESS".to_string(),
                contract_id: contract.id.clone(),
                work_slice_id: slice.id.clone(),
            },
        )
        .unwrap();
        assert_eq!(run.status, "approved");
        assert!(Path::new(&run.manifest_path).exists());

        let pack = generate_evidence_pack(&conn, &run.id).unwrap();
        assert_eq!(pack.status, "ready");
        assert!(Path::new(&pack.manifest_path).exists());
        assert!(Path::new(&pack.report_path).exists());

        fs::remove_dir_all(project).ok();
    }

    #[test]
    fn slice_and_run_creation_reject_mismatched_links() {
        let project = temp_project("mismatch");
        let conn = Connection::open_in_memory().unwrap();
        ensure_schema(&conn).unwrap();
        let contract = approved_contract(&conn, &project);

        let bad_slice = create_work_slice(
            &conn,
            WorkSliceRequest {
                project_id: contract.project_id.clone(),
                project_path: project.display().to_string(),
                task_id: "OTHER-TASK".to_string(),
                contract_id: contract.id.clone(),
                title: "Bad Slice".to_string(),
                description: "Wrong task scope.".to_string(),
                sequence: 1,
                agent_role: "developer".to_string(),
                allowed_paths: vec!["src".to_string()],
                commands_allowed: Vec::new(),
                approval_required: false,
                acceptance_criteria: vec!["Done".to_string()],
            },
        );
        assert!(bad_slice.is_err());

        let slice = approved_slice(&conn, &project, &contract);
        let wrong_run = create_harness_run(
            &conn,
            HarnessRunRequest {
                project_id: contract.project_id.clone(),
                project_path: project.display().to_string(),
                task_id: "OTHER-TASK".to_string(),
                contract_id: contract.id.clone(),
                work_slice_id: slice.id.clone(),
            },
        );
        assert!(wrong_run.is_err());

        fs::remove_dir_all(project).ok();
    }

    #[test]
    fn final_decision_updates_evidence_pack_manifest_and_report() {
        let project = temp_project("finalize");
        let conn = Connection::open_in_memory().unwrap();
        ensure_schema(&conn).unwrap();
        let contract = approved_contract(&conn, &project);
        let slice = approved_slice(&conn, &project, &contract);
        let run = create_harness_run(
            &conn,
            HarnessRunRequest {
                project_id: contract.project_id.clone(),
                project_path: project.display().to_string(),
                task_id: contract.task_id.clone(),
                contract_id: contract.id.clone(),
                work_slice_id: slice.id.clone(),
            },
        )
        .unwrap();
        let pack = generate_evidence_pack(&conn, &run.id).unwrap();

        let accepted = accept_or_rework(
            &conn,
            FinalDecisionRequest {
                harness_run_id: run.id.clone(),
                decision: "accepted".to_string(),
                note: "Meets criteria.".to_string(),
            },
        )
        .unwrap();
        assert_eq!(accepted.status, "accepted");

        let manifest: serde_json::Value =
            serde_json::from_str(&fs::read_to_string(&pack.manifest_path).unwrap()).unwrap();
        assert_eq!(manifest["status"], "finalized");
        assert_eq!(manifest["final_decision"], "accepted");
        assert_eq!(manifest["refs"]["finalDecision"], "accepted");
        let report = fs::read_to_string(&pack.report_path).unwrap();
        assert!(report.contains("Final decision: accepted"));

        fs::remove_dir_all(project).ok();
    }

    #[test]
    fn loop_state_updates_harness_and_slice_lifecycle() {
        let project = temp_project("lifecycle");
        let conn = Connection::open_in_memory().unwrap();
        ensure_schema(&conn).unwrap();
        let contract = approved_contract(&conn, &project);
        let slice = approved_slice(&conn, &project, &contract);
        let run = create_harness_run(
            &conn,
            HarnessRunRequest {
                project_id: contract.project_id.clone(),
                project_path: project.display().to_string(),
                task_id: contract.task_id.clone(),
                contract_id: contract.id.clone(),
                work_slice_id: slice.id.clone(),
            },
        )
        .unwrap();

        let reviewed = update_harness_from_loop(&conn, &run.id, "running", "reviewing").unwrap();
        assert_eq!(reviewed.status, "reviewed");
        assert_eq!(read_slice(&conn, &slice.id).unwrap().status, "reviewed");

        let ready = update_harness_from_loop(&conn, &run.id, "completed", "acceptance").unwrap();
        assert_eq!(ready.status, "evidence_ready");
        assert_eq!(
            read_slice(&conn, &slice.id).unwrap().status,
            "security_reviewed"
        );

        fs::remove_dir_all(project).ok();
    }
}
