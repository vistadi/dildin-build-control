//! Bounded subprocess I/O. Only metadata is exposed while a process is running.
use serde::Serialize;
use std::collections::{BTreeMap, VecDeque};
use std::io::{self, Read, Write};
use std::process::{Child, Command, ExitStatus, Stdio};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{mpsc, Arc, Mutex, OnceLock};
use std::thread;
use std::time::{Duration, Instant};

const MAX_CAPTURE: usize = 4 * 1024 * 1024;
const POLL: Duration = Duration::from_millis(10);
static NEXT_ID: AtomicU64 = AtomicU64::new(1);
static ACTIVE: OnceLock<Mutex<BTreeMap<String, Active>>> = OnceLock::new();
static SCOPES: OnceLock<Mutex<BTreeMap<String, Arc<AtomicBool>>>> = OnceLock::new();

#[derive(Default)]
struct Capture {
    head: Vec<u8>,
    tail: VecDeque<u8>,
    total: u64,
    limit: usize,
}

impl Capture {
    fn new(limit: usize) -> Self {
        Self {
            limit: limit.clamp(256, MAX_CAPTURE),
            ..Self::default()
        }
    }

    fn append(&mut self, bytes: &[u8]) {
        self.total = self.total.saturating_add(bytes.len() as u64);
        let head_count = (self.limit / 2 - self.head.len()).min(bytes.len());
        self.head.extend_from_slice(&bytes[..head_count]);
        let remaining = &bytes[head_count..];
        let tail_limit = self.limit - self.limit / 2;
        if remaining.len() >= tail_limit {
            self.tail.clear();
            self.tail.extend(&remaining[remaining.len() - tail_limit..]);
        } else {
            let remove = (self.tail.len() + remaining.len()).saturating_sub(tail_limit);
            self.tail.drain(..remove);
            self.tail.extend(remaining);
        }
    }

    fn truncated(&self) -> bool {
        self.total > self.limit as u64
    }

    fn text(&self) -> String {
        let mut bytes = self.head.clone();
        if self.truncated() {
            bytes.extend_from_slice(b"\n[DBC: output truncated; head and tail retained]\n");
        }
        bytes.extend(self.tail.iter());
        String::from_utf8_lossy(&bytes).into_owned()
    }
}

struct Active {
    scope: String,
    label: String,
    started: Instant,
    cancelled: Arc<AtomicBool>,
    stdout: Arc<Mutex<Capture>>,
    stderr: Arc<Mutex<Capture>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Activity {
    pub id: String,
    pub scope: String,
    label: String,
    elapsed_ms: u128,
    pub stdout_bytes: u64,
    stderr_bytes: u64,
    cancel_requested: bool,
}

fn active() -> &'static Mutex<BTreeMap<String, Active>> {
    ACTIVE.get_or_init(Mutex::default)
}

pub fn activities() -> Vec<Activity> {
    active()
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .iter()
        .map(|(id, run)| Activity {
            id: id.clone(),
            scope: run.scope.clone(),
            label: run.label.clone(),
            elapsed_ms: run.started.elapsed().as_millis(),
            stdout_bytes: run.stdout.lock().unwrap_or_else(|e| e.into_inner()).total,
            stderr_bytes: run.stderr.lock().unwrap_or_else(|e| e.into_inner()).total,
            cancel_requested: run.cancelled.load(Ordering::Relaxed),
        })
        .collect()
}

pub fn cancel(id: &str) -> bool {
    let runs = active().lock().unwrap_or_else(|e| e.into_inner());
    if let Some(run) = runs.get(id) {
        run.cancelled.store(true, Ordering::Relaxed);
        true
    } else {
        false
    }
}

pub fn cancel_scope(scope: &str) -> usize {
    if let Some(cancelled) = SCOPES
        .get_or_init(Mutex::default)
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .get(scope)
    {
        // Also cancel an operation still preparing its first subprocess.
        cancelled.store(true, Ordering::Relaxed);
    }
    let runs = active().lock().unwrap_or_else(|e| e.into_inner());
    let mut count = 0;
    for run in runs.values().filter(|run| run.scope == scope) {
        run.cancelled.store(true, Ordering::Relaxed);
        count += 1;
    }
    count
}

/// Hold across the entire DB read/execute/persist operation, not just process spawn.
pub struct ScopeGuard(String);
impl ScopeGuard {
    pub fn acquire(scope: &str) -> Result<Self, String> {
        let mut scopes = SCOPES
            .get_or_init(Mutex::default)
            .lock()
            .map_err(|_| "Execution lock unavailable.")?;
        if scopes.contains_key(scope) {
            return Err("This run already has an operation in progress.".into());
        }
        scopes.insert(scope.to_string(), Arc::new(AtomicBool::new(false)));
        Ok(Self(scope.to_string()))
    }
}
impl Drop for ScopeGuard {
    fn drop(&mut self) {
        SCOPES
            .get_or_init(Mutex::default)
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .remove(&self.0);
    }
}

struct Registration(String);
impl Drop for Registration {
    fn drop(&mut self) {
        active()
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .remove(&self.0);
    }
}

struct OwnedChild(Child, bool);
impl OwnedChild {
    fn terminate(&mut self) {
        if self.1 {
            return;
        }
        self.1 = true;
        #[cfg(unix)]
        {
            // The child was spawned with process_group(0). Never signal our own group.
            let pid = self.0.id();
            if pid > 1 && pid <= i32::MAX as u32 {
                unsafe {
                    libc::kill(-(pid as i32), libc::SIGKILL);
                }
            }
        }
        let _ = self.0.kill();
    }
}
impl Drop for OwnedChild {
    fn drop(&mut self) {
        self.terminate();
        let _ = self.0.wait();
    }
}

#[cfg(unix)]
fn nonblocking(pipe: &impl std::os::fd::AsRawFd) -> io::Result<()> {
    let fd = pipe.as_raw_fd();
    // The pipe owns this fd for the whole operation; preserve all existing flags.
    let flags = unsafe { libc::fcntl(fd, libc::F_GETFL) };
    if flags < 0 || unsafe { libc::fcntl(fd, libc::F_SETFL, flags | libc::O_NONBLOCK) } < 0 {
        return Err(io::Error::last_os_error());
    }
    Ok(())
}

#[cfg(not(unix))]
fn nonblocking<T>(_pipe: &T) -> io::Result<()> {
    Ok(())
}

fn read_pipe(
    mut pipe: impl Read,
    capture: Arc<Mutex<Capture>>,
    stop: Arc<AtomicBool>,
) -> io::Result<()> {
    let mut bytes = [0; 8192];
    loop {
        if stop.load(Ordering::Relaxed) {
            return Err(io::Error::new(
                io::ErrorKind::TimedOut,
                "Output drain deadline exceeded.",
            ));
        }
        match pipe.read(&mut bytes) {
            Ok(0) => return Ok(()),
            Ok(n) => capture
                .lock()
                .unwrap_or_else(|e| e.into_inner())
                .append(&bytes[..n]),
            Err(e) if e.kind() == io::ErrorKind::Interrupted => continue,
            Err(e) if e.kind() == io::ErrorKind::WouldBlock => thread::sleep(POLL),
            Err(e) => return Err(e),
        }
    }
}

fn write_input(mut pipe: impl Write, input: Vec<u8>, stop: Arc<AtomicBool>) -> io::Result<()> {
    let mut offset = 0;
    while offset < input.len() {
        if stop.load(Ordering::Relaxed) {
            return Err(io::Error::new(
                io::ErrorKind::Interrupted,
                "Input delivery interrupted.",
            ));
        }
        match pipe.write(&input[offset..]) {
            Ok(0) => {
                return Err(io::Error::new(
                    io::ErrorKind::WriteZero,
                    "Provider closed input.",
                ))
            }
            Ok(n) => offset += n,
            Err(e) if e.kind() == io::ErrorKind::Interrupted => continue,
            Err(e) if e.kind() == io::ErrorKind::WouldBlock => thread::sleep(POLL),
            Err(e) => return Err(e),
        }
    }
    Ok(()) // dropping stdin sends EOF
}

pub struct Outcome {
    pub status: ExitStatus,
    pub stdout: String,
    pub stderr: String,
    pub reason: &'static str,
    pub truncated: bool,
    pub io_errors: Vec<String>,
}

pub fn run(
    command: &mut Command,
    input: Option<Vec<u8>>,
    timeout: Duration,
    limit: usize,
    scope: &str,
) -> io::Result<Outcome> {
    let cancelled = SCOPES
        .get_or_init(Mutex::default)
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .get(scope)
        .cloned()
        .unwrap_or_else(|| Arc::new(AtomicBool::new(false)));
    if cancelled.load(Ordering::Relaxed) {
        return Err(io::Error::new(
            io::ErrorKind::Interrupted,
            "Execution cancelled before process start.",
        ));
    }
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        command.process_group(0);
    }
    command.stdout(Stdio::piped()).stderr(Stdio::piped());
    command.stdin(if input.is_some() {
        Stdio::piped()
    } else {
        Stdio::null()
    });
    let mut child = OwnedChild(command.spawn()?, false);
    let out = child
        .0
        .stdout
        .take()
        .ok_or_else(|| io::Error::other("Missing stdout pipe."))?;
    let err = child
        .0
        .stderr
        .take()
        .ok_or_else(|| io::Error::other("Missing stderr pipe."))?;
    nonblocking(&out)?;
    nonblocking(&err)?;
    let stdin = child.0.stdin.take();
    if let Some(ref pipe) = stdin {
        nonblocking(pipe)?;
    }
    let stdout = Arc::new(Mutex::new(Capture::new(limit)));
    let stderr = Arc::new(Mutex::new(Capture::new(limit)));
    let stop_io = Arc::new(AtomicBool::new(false));
    let id = format!(
        "process-{}-{}",
        child.0.id(),
        NEXT_ID.fetch_add(1, Ordering::Relaxed)
    );
    let started = Instant::now();
    let label = std::path::Path::new(command.get_program())
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .chars()
        .filter(|c| !c.is_control())
        .take(80)
        .collect();
    active().lock().unwrap_or_else(|e| e.into_inner()).insert(
        id.clone(),
        Active {
            scope: scope.into(),
            label,
            started,
            cancelled: cancelled.clone(),
            stdout: stdout.clone(),
            stderr: stderr.clone(),
        },
    );
    let _registration = Registration(id);
    let (tx, rx) = mpsc::channel();
    let mut workers = Vec::new();
    for (name, pipe) in [
        ("stdout", Box::new(out) as Box<dyn Read + Send>),
        ("stderr", Box::new(err) as Box<dyn Read + Send>),
    ] {
        let capture = if name == "stdout" {
            stdout.clone()
        } else {
            stderr.clone()
        };
        let stop = stop_io.clone();
        let sender = tx.clone();
        workers.push(thread::spawn(move || {
            let result = read_pipe(pipe, capture, stop);
            let _ = sender.send((name, result));
        }));
    }
    if let (Some(pipe), Some(input)) = (stdin, input) {
        let stop = stop_io.clone();
        let sender = tx.clone();
        workers.push(thread::spawn(move || {
            let result = write_input(pipe, input, stop);
            let _ = sender.send(("stdin", result));
        }));
    }
    drop(tx);
    let mut reason = "exited";
    let mut wait_error = None;
    let status = loop {
        if cancelled.load(Ordering::Relaxed) {
            reason = "cancelled";
            child.terminate();
        } else if started.elapsed() >= timeout {
            reason = "timeout";
            child.terminate();
        }
        match child.0.try_wait() {
            Ok(Some(status)) => break Some(status),
            Ok(None) => thread::sleep(POLL),
            Err(e) => {
                wait_error = Some(e);
                break None;
            }
        }
    };
    // Bounded jobs may not leave background descendants holding their pipes open.
    child.terminate();
    let _ = child.0.wait();
    let drain_deadline = Instant::now() + Duration::from_millis(500);
    let mut io_errors = Vec::new();
    for _ in 0..workers.len() {
        match rx.recv_timeout(drain_deadline.saturating_duration_since(Instant::now())) {
            Ok((name, Err(e))) => io_errors.push(format!("{name}: {e}")),
            Ok((_, Ok(()))) => (),
            Err(_) => {
                io_errors.push("Pipe drain did not finish within 500 ms.".into());
                break;
            }
        }
    }
    stop_io.store(true, Ordering::Relaxed);
    for worker in workers {
        // Unix pipes are nonblocking; on other platforms never let a blocked pipe
        // prevent handoff. Full descendant cancellation is only guaranteed on Unix.
        if cfg!(unix) || worker.is_finished() {
            let _ = worker.join();
        }
    }
    if let Some(e) = wait_error {
        return Err(e);
    }
    let stdout = stdout.lock().unwrap_or_else(|e| e.into_inner());
    let stderr = stderr.lock().unwrap_or_else(|e| e.into_inner());
    Ok(Outcome {
        status: status.ok_or_else(|| io::Error::other("Missing exit status."))?,
        stdout: stdout.text(),
        stderr: stderr.text(),
        reason,
        truncated: stdout.truncated() || stderr.truncated(),
        io_errors,
    })
}

/// Metadata probes are bounded too; a hanging --help must not freeze Settings.
pub fn probe(command: &mut Command) -> io::Result<std::process::Output> {
    let result = run(
        command,
        None,
        Duration::from_secs(5),
        128 * 1024,
        "provider-check",
    )?;
    if result.reason != "exited" || result.truncated || !result.io_errors.is_empty() {
        return Err(io::Error::other(format!(
            "Incomplete CLI probe ({}, truncated={}).",
            result.reason, result.truncated
        )));
    }
    Ok(std::process::Output {
        status: result.status,
        stdout: result.stdout.into_bytes(),
        stderr: result.stderr.into_bytes(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn capture_retains_head_tail_and_bounds_memory() {
        let mut capture = Capture::new(256);
        capture.append(&vec![b'a'; 600]);
        capture.append(b"FINAL");
        assert_eq!(capture.total, 605);
        assert!(capture.truncated());
        assert_eq!(capture.head.len() + capture.tail.len(), 256);
        assert!(capture.text().ends_with("FINAL"));
    }

    #[test]
    fn scope_guard_rejects_overlap_and_releases() {
        let guard = ScopeGuard::acquire("unit-scope").unwrap();
        assert!(ScopeGuard::acquire("unit-scope").is_err());
        drop(guard);
        assert!(ScopeGuard::acquire("unit-scope").is_ok());
    }

    #[test]
    fn cancellation_during_preparation_prevents_spawn() {
        let guard = ScopeGuard::acquire("cancel-before-spawn").unwrap();
        assert_eq!(cancel_scope("cancel-before-spawn"), 0);
        let error = run(
            &mut Command::new("nonexistent-dbc-test-command"),
            None,
            Duration::from_secs(1),
            256,
            "cancel-before-spawn",
        )
        .err()
        .expect("cancelled before command resolution");
        assert_eq!(error.kind(), io::ErrorKind::Interrupted);
        drop(guard);
        let error = run(
            &mut Command::new("nonexistent-dbc-test-command"),
            None,
            Duration::from_secs(1),
            256,
            "cancel-before-spawn",
        )
        .err()
        .expect("new operation must not inherit cancellation");
        assert_eq!(error.kind(), io::ErrorKind::NotFound);
    }

    #[cfg(unix)]
    fn shell(script: &str) -> Command {
        let mut cmd = Command::new("/bin/sh");
        cmd.args(["-c", script]);
        cmd
    }

    #[test]
    #[cfg(unix)]
    fn drains_both_pipes_beyond_capacity_without_deadlock() {
        let result = run(
            &mut shell("head -c 262144 /dev/zero; head -c 262144 /dev/zero >&2; printf FINAL"),
            None,
            Duration::from_secs(5),
            1024,
            "large-output",
        )
        .unwrap();
        assert!(result.status.success());
        assert_eq!(result.reason, "exited");
        assert!(result.truncated);
        assert!(result.stdout.ends_with("FINAL"));
        assert!(result.stdout.len() < 1200 && result.stderr.len() < 1200);
        assert!(result.io_errors.is_empty(), "{:?}", result.io_errors);
    }

    #[test]
    #[cfg(unix)]
    fn stdin_delivery_and_eof_are_concurrent_with_output() {
        let input = vec![b'x'; 256 * 1024];
        let result = run(
            &mut shell("head -c 262144 /dev/zero >&2; cat >/dev/null; printf DONE"),
            Some(input),
            Duration::from_secs(5),
            1024,
            "stdin-test",
        )
        .unwrap();
        assert!(result.status.success());
        assert_eq!(result.stdout, "DONE");
        assert!(result.io_errors.is_empty(), "{:?}", result.io_errors);
    }

    #[test]
    #[cfg(unix)]
    fn timeout_reaps_child_and_keeps_partial_output() {
        let start = Instant::now();
        let result = run(
            &mut shell("printf PARTIAL; sleep 30"),
            None,
            Duration::from_millis(150),
            1024,
            "timeout-test",
        )
        .unwrap();
        assert_eq!(result.reason, "timeout");
        assert!(result.stdout.contains("PARTIAL"));
        assert!(start.elapsed() < Duration::from_secs(3));
        assert!(activities().iter().all(|r| r.scope != "timeout-test"));
    }

    #[test]
    #[cfg(unix)]
    fn cancellation_keeps_evidence_and_cleans_registry() {
        let worker = thread::spawn(|| {
            run(
                &mut shell("printf STARTED; sleep 30"),
                None,
                Duration::from_secs(10),
                1024,
                "cancel-test",
            )
            .unwrap()
        });
        let deadline = Instant::now() + Duration::from_secs(3);
        loop {
            if activities()
                .iter()
                .any(|r| r.scope == "cancel-test" && r.stdout_bytes > 0)
            {
                break;
            }
            assert!(Instant::now() < deadline);
            thread::sleep(POLL);
        }
        assert_eq!(cancel_scope("cancel-test"), 1);
        let result = worker.join().unwrap();
        assert_eq!(result.reason, "cancelled");
        assert!(result.stdout.contains("STARTED"));
        assert!(!cancel("nonexistent"));
        assert!(activities().iter().all(|r| r.scope != "cancel-test"));
    }

    #[test]
    #[cfg(unix)]
    fn parent_exit_does_not_wait_for_background_pipe_holder() {
        let start = Instant::now();
        let result = run(
            &mut shell("sleep 30 & printf DONE"),
            None,
            Duration::from_secs(5),
            1024,
            "descendant-test",
        )
        .unwrap();
        assert!(result.status.success());
        assert_eq!(result.stdout, "DONE");
        assert!(start.elapsed() < Duration::from_secs(3));
        assert!(result.io_errors.is_empty(), "{:?}", result.io_errors);
    }

    #[test]
    #[cfg(unix)]
    fn blocked_stdin_does_not_disable_timeout() {
        let start = Instant::now();
        let result = run(
            &mut shell("sleep 30"),
            Some(vec![b'x'; 1024 * 1024]),
            Duration::from_millis(100),
            1024,
            "blocked-stdin",
        )
        .unwrap();
        assert_eq!(result.reason, "timeout");
        assert!(start.elapsed() < Duration::from_secs(3));
    }
}
