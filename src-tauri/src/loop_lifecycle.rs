//! Durable loop transitions. Call mutation helpers under the loop's ScopeGuard,
//! except request_stop, which must be able to interrupt that guard's owner.
use rusqlite::{params, Connection, TransactionBehavior};

type Result<T> = std::result::Result<T, String>;

pub fn claim_step(conn: &Connection, id: &str, index: i64) -> Result<bool> {
    // Count before side effects: an application crash must not refund an attempt.
    let changed = conn
        .execute(
            "update loop_steps set status = 'executing', attempt_count = attempt_count + 1,
         started_at = datetime('now'), finished_at = ''
         where loop_id = ?1 and step_index = ?2 and status = 'running' and requires_approval = 0
         and attempt_count < max_attempts and exists
         (select 1 from loop_runs where id = ?1 and status = 'running' and active_step_index = ?2)",
            params![id, index],
        )
        .map_err(|e| e.to_string())?;
    Ok(changed == 1)
}

pub fn request_stop(conn: &Connection, id: &str) -> Result<()> {
    let status: String = conn
        .query_row("select status from loop_runs where id = ?1", [id], |r| {
            r.get(0)
        })
        .map_err(|e| e.to_string())?;
    if status != "completed" {
        conn.execute("update loop_runs set status = 'stopping', updated_at = datetime('now') where id = ?1 and status != 'completed'", [id])
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn finish_stop(conn: &Connection, id: &str) -> Result<()> {
    // The caller has reacquired ScopeGuard: execution and evidence persistence ended.
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
    tx.execute("update loop_steps set status = 'interrupted', last_error = 'Execution interrupted; review effects before Retry.' where loop_id = ?1 and status = 'executing'", [id])
        .map_err(|e| e.to_string())?;
    tx.execute("update loop_runs set status = 'stopped', updated_at = datetime('now') where id = ?1 and status = 'stopping'", [id])
        .map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())
}

/// Called inside the same transaction as the completed step's evidence update.
pub fn finish_step(conn: &Connection, id: &str, index: i64, status: &str) -> Result<()> {
    let stopping: bool = conn
        .query_row(
            "select status = 'stopping' from loop_runs where id = ?1",
            [id],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    let mut next = index;
    let outcome = if status == "passed" {
        let count: i64 = conn
            .query_row(
                "select count(*) from loop_steps where loop_id = ?1",
                [id],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;
        if index + 1 < count {
            next += 1;
            conn.execute("update loop_steps set status = 'running' where loop_id = ?1 and step_index = ?2 and status = 'waiting'", params![id, next])
                .map_err(|e| e.to_string())?;
            "running"
        } else {
            "completed"
        }
    } else if status == "approval_required" {
        "blocked"
    } else {
        "failed"
    };
    let outcome = if stopping { "stopping" } else { outcome };
    conn.execute("update loop_runs set status = ?1, active_step_index = ?2, updated_at = datetime('now'), completed_at = case when ?1 = 'completed' then datetime('now') else null end where id = ?3",
        params![outcome, next, id]).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn continue_run(conn: &mut Connection, id: &str, retry: bool) -> Result<()> {
    let tx = conn
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|e| e.to_string())?;
    let (status, index): (String, i64) = tx
        .query_row(
            "select status, active_step_index from loop_runs where id = ?1",
            [id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .map_err(|e| e.to_string())?;
    if !matches!(
        status.as_str(),
        "stopped" | "interrupted" | "failed" | "blocked"
    ) {
        return Err("Only an idle, stopped or interrupted run can be continued.".into());
    }
    let (step, approval, attempts, limit): (String, bool, i64, i64) = tx.query_row(
        "select status, requires_approval, attempt_count, max_attempts from loop_steps where loop_id = ?1 and step_index = ?2",
        params![id, index], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)))
        .map_err(|e| e.to_string())?;
    if approval || step == "approval_required" || status == "blocked" {
        return Err("Resolve the pending approval before continuing this run.".into());
    }
    let pending = matches!(step.as_str(), "running" | "waiting");
    let completed = step == "passed";
    if retry && (pending || completed) {
        return Err(
            "This step does not need Retry. Use Resume without replaying completed work.".into(),
        );
    }
    if !retry && !pending && !completed {
        return Err("Review the interrupted or failed attempt, then explicitly Retry; Resume cannot replay it.".into());
    }
    if !completed && attempts >= limit {
        return Err(format!("Step already used {attempts}/{limit} attempts."));
    }
    // Preserve previous output/evidence until a new result is available.
    if !completed {
        tx.execute(
            "update loop_steps set status = 'running' where loop_id = ?1 and step_index = ?2",
            params![id, index],
        )
        .map_err(|e| e.to_string())?;
    }
    tx.execute("update loop_runs set status = ?1, updated_at = datetime('now'), completed_at = case when ?1 = 'completed' then datetime('now') else null end where id = ?2",
        params![if completed { "completed" } else { "running" }, id]).map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())
}

/// Only at application startup, after acquiring the exclusive runtime lease.
pub fn recover_interrupted(conn: &Connection) -> Result<Vec<String>> {
    let ids = conn
        .prepare("select id from loop_runs where status in ('running', 'stopping')")
        .map_err(|e| e.to_string())?
        .query_map([], |r| r.get::<_, String>(0))
        .map_err(|e| e.to_string())?
        .collect::<std::result::Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
    for id in &ids {
        tx.execute("update loop_steps set status = 'interrupted', last_error = 'Previous application session ended. Inspect workspace and external processes before Retry.' where loop_id = ?1 and status in ('executing', 'running')", [id])
            .map_err(|e| e.to_string())?;
        tx.execute("update loop_runs set status = 'interrupted', updated_at = datetime('now') where id = ?1", [id])
            .map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(ids)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn fixture() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("create table loop_runs (id text primary key, status text, active_step_index integer, updated_at text, completed_at text);
            create table loop_steps (loop_id text, step_index integer, status text, attempt_count integer, max_attempts integer, requires_approval integer, last_error text, started_at text, finished_at text);
            insert into loop_runs values ('run', 'running', 0, '', null);
            insert into loop_steps values ('run', 0, 'running', 0, 3, 0, '', '', '');
            insert into loop_steps values ('run', 1, 'waiting', 0, 3, 0, '', '', '');").unwrap();
        conn
    }
    fn state(conn: &Connection) -> (String, i64, i64) {
        conn.query_row("select r.status, r.active_step_index, s.attempt_count from loop_runs r join loop_steps s on r.id = s.loop_id and r.active_step_index = s.step_index", [], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?))).unwrap()
    }
    #[test]
    fn stop_before_claim_does_not_spend_or_replay_an_attempt() {
        let mut conn = fixture();
        request_stop(&conn, "run").unwrap();
        assert!(!claim_step(&conn, "run", 0).unwrap());
        assert!(continue_run(&mut conn, "run", false).is_err());
        finish_stop(&conn, "run").unwrap();
        assert_eq!(state(&conn), ("stopped".into(), 0, 0));
        continue_run(&mut conn, "run", false).unwrap();
        assert!(claim_step(&conn, "run", 0).unwrap());
        assert!(!claim_step(&conn, "run", 0).unwrap());
        assert_eq!(state(&conn), ("running".into(), 0, 1));
    }
    #[test]
    fn late_success_preserves_stop_and_resume_skips_completed_step() {
        let mut conn = fixture();
        assert!(claim_step(&conn, "run", 0).unwrap());
        request_stop(&conn, "run").unwrap();
        conn.execute(
            "update loop_steps set status = 'passed' where step_index = 0",
            [],
        )
        .unwrap();
        finish_step(&conn, "run", 0, "passed").unwrap();
        assert_eq!(state(&conn), ("stopping".into(), 1, 0));
        finish_stop(&conn, "run").unwrap();
        assert!(continue_run(&mut conn, "run", true).is_err());
        continue_run(&mut conn, "run", false).unwrap();
        assert!(!claim_step(&conn, "run", 0).unwrap());
        assert!(claim_step(&conn, "run", 1).unwrap());
    }
    #[test]
    fn interrupted_attempt_requires_retry_and_keeps_budget() {
        let mut conn = fixture();
        assert!(claim_step(&conn, "run", 0).unwrap());
        assert_eq!(recover_interrupted(&conn).unwrap(), vec!["run"]);
        assert_eq!(state(&conn), ("interrupted".into(), 0, 1));
        assert!(continue_run(&mut conn, "run", false).is_err());
        continue_run(&mut conn, "run", true).unwrap();
        conn.execute("update loop_runs set status = 'failed'", [])
            .unwrap();
        conn.execute(
            "update loop_steps set status = 'failed', attempt_count = 3 where step_index = 0",
            [],
        )
        .unwrap();
        assert!(continue_run(&mut conn, "run", true).is_err());
        assert!(continue_run(&mut conn, "run", false).is_err());
    }
    #[test]
    fn approval_cannot_be_bypassed_by_stop_resume_or_retry() {
        let mut conn = fixture();
        request_stop(&conn, "run").unwrap();
        conn.execute("update loop_steps set status = 'approval_required', requires_approval = 1 where step_index = 0", []).unwrap();
        finish_step(&conn, "run", 0, "approval_required").unwrap();
        finish_stop(&conn, "run").unwrap();
        assert!(continue_run(&mut conn, "run", false).is_err());
        assert!(continue_run(&mut conn, "run", true).is_err());
    }
    #[test]
    fn settled_stops_survive_recovery_without_becoming_interrupted() {
        let mut conn = fixture();
        request_stop(&conn, "run").unwrap();
        finish_stop(&conn, "run").unwrap();
        assert!(recover_interrupted(&conn).unwrap().is_empty());
        continue_run(&mut conn, "run", false).unwrap();
    }

    #[test]
    fn stop_at_final_success_can_finalize_without_spending_another_attempt() {
        let mut conn = fixture();
        conn.execute("delete from loop_steps where step_index = 1", [])
            .unwrap();
        assert!(claim_step(&conn, "run", 0).unwrap());
        request_stop(&conn, "run").unwrap();
        conn.execute(
            "update loop_steps set status = 'passed', max_attempts = 1",
            [],
        )
        .unwrap();
        finish_step(&conn, "run", 0, "passed").unwrap();
        finish_stop(&conn, "run").unwrap();
        continue_run(&mut conn, "run", false).unwrap();
        assert_eq!(state(&conn), ("completed".into(), 0, 1));
        assert!(!claim_step(&conn, "run", 0).unwrap());
    }
}
