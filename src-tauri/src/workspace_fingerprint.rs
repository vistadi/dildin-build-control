//! Bounded, local comparison evidence. Not an OS sandbox or a write journal.
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};
use std::fs::{self, OpenOptions};
use std::io::Read;
use std::path::{Component, Path};
use std::time::{Instant, SystemTime, UNIX_EPOCH};

const MAX_FILES: usize = 10_000;
const MAX_FILE_BYTES: u64 = 16 * 1024 * 1024;
const MAX_TOTAL_BYTES: u64 = 128 * 1024 * 1024;
const GENERATED: &[&str] = &[
    ".dbc/artifacts",
    ".dbc/evidence",
    ".dbc/git",
    ".dbc/loops",
    ".dbc/reports",
    ".dbc/security",
    ".dbc/approvals",
];

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Entry {
    method: String,
    digest: String,
    size: u64,
    modified: String,
    identity: String,
}

#[derive(Clone, Default, Serialize, Deserialize)]
pub struct Snapshot {
    pub version: u8,
    pub root: String,
    pub complete: bool,
    pub entries: BTreeMap<String, Entry>,
    pub errors: Vec<String>,
    pub exclusions: Vec<String>,
}

pub fn digest(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

pub fn safe_parent(root: &Path, relative: &Path) -> Result<(), String> {
    if relative
        .components()
        .any(|p| !matches!(p, Component::Normal(_)))
    {
        return Err("Invalid artifact path".into());
    }
    let mut path = root
        .canonicalize()
        .map_err(|_| "Workspace root is unavailable")?;
    let parent = relative.parent().ok_or("Artifact parent is unavailable")?;
    for part in parent.components() {
        path.push(part);
        if !path.exists() {
            fs::create_dir(&path).map_err(|_| "Cannot create artifact directory")?;
        }
        let metadata = fs::symlink_metadata(&path).map_err(|_| "Artifact parent is unavailable")?;
        if metadata.file_type().is_symlink() || !metadata.is_dir() {
            return Err("Artifact parent must not be a symlink".into());
        }
    }
    Ok(())
}

/// Reject unsafe components and static symlink traversal before opening a file.
pub fn read_bounded(root: &Path, relative: &Path, limit: u64) -> Result<Vec<u8>, String> {
    if relative.as_os_str().is_empty()
        || relative
            .components()
            .any(|p| !matches!(p, Component::Normal(_)))
    {
        return Err("Invalid relative evidence path".into());
    }
    let canonical = root
        .canonicalize()
        .map_err(|_| "Workspace root is unavailable")?;
    let mut path = canonical.clone();
    for component in relative.components() {
        path.push(component);
        if fs::symlink_metadata(&path)
            .map_err(|_| "Evidence path is unavailable")?
            .file_type()
            .is_symlink()
        {
            return Err("Symlink evidence paths are not supported".into());
        }
    }
    if !path
        .canonicalize()
        .map_err(|_| "Evidence path is unavailable")?
        .starts_with(&canonical)
    {
        return Err("Evidence path leaves the workspace".into());
    }
    let mut options = OpenOptions::new();
    options.read(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK);
    }
    let file = options
        .open(&path)
        .map_err(|_| "Cannot open evidence file")?;
    let before = file
        .metadata()
        .map_err(|_| "Cannot inspect evidence file")?;
    if !before.is_file() || before.len() > limit {
        return Err("Evidence file is unsupported or oversized".into());
    }
    let mut bytes = Vec::new();
    (&file)
        .take(limit + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| "Cannot read evidence file")?;
    let after = file
        .metadata()
        .map_err(|_| "Cannot inspect evidence file")?;
    let path_after =
        fs::symlink_metadata(&path).map_err(|_| "Evidence file changed during read")?;
    if bytes.len() as u64 > limit
        || fingerprint_metadata(&before) != fingerprint_metadata(&after)
        || path_after.file_type().is_symlink()
        || fingerprint_metadata(&after) != fingerprint_metadata(&path_after)
    {
        return Err("Evidence file changed during read".into());
    }
    Ok(bytes)
}

fn timestamp(value: Result<SystemTime, std::io::Error>) -> String {
    value
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|v| v.as_nanos().to_string())
        .unwrap_or_default()
}

fn fingerprint_metadata(meta: &fs::Metadata) -> Entry {
    #[cfg(unix)]
    let identity = {
        use std::os::unix::fs::MetadataExt;
        format!(
            "{}:{}:{}:{}:{}",
            meta.dev(),
            meta.ino(),
            meta.mode(),
            meta.ctime(),
            meta.ctime_nsec()
        )
    };
    #[cfg(not(unix))]
    let identity = format!("{:?}:{}", meta.file_type(), meta.permissions().readonly());
    Entry {
        method: "metadata-only".into(),
        digest: String::new(),
        size: meta.len(),
        modified: timestamp(meta.modified()),
        identity,
    }
}

fn sensitive(path: &str, denied: &[String]) -> bool {
    path.split('/').any(|p| {
        p == ".env"
            || p.starts_with(".env.")
            || [".ssh", ".aws", ".gnupg", ".credentials"].contains(&p)
            || p.ends_with(".pem")
            || p.ends_with(".key")
    }) || denied
        .iter()
        .any(|p| path == p || path.starts_with(&format!("{p}/")))
}

pub fn capture(root: &Path, denied: &[String]) -> Snapshot {
    let mut result = Snapshot {
        version: 1,
        exclusions: GENERATED.iter().map(|s| s.to_string()).collect(),
        ..Default::default()
    };
    match root.canonicalize() {
        Ok(canonical) => result.root = canonical.display().to_string(),
        Err(_) => {
            result.errors.push("Workspace root unavailable".into());
            return result;
        }
    }
    let mut count = 0;
    let mut bytes = 0;
    walk(
        Path::new(&result.root.clone()),
        Path::new(""),
        denied,
        &mut result,
        &mut count,
        &mut bytes,
        Instant::now(),
        0,
    );
    result.complete = result.errors.is_empty();
    result
}

#[allow(clippy::too_many_arguments)]
fn walk(
    root: &Path,
    relative: &Path,
    denied: &[String],
    result: &mut Snapshot,
    count: &mut usize,
    bytes: &mut u64,
    started: Instant,
    depth: usize,
) {
    if *count >= MAX_FILES
        || *bytes > MAX_TOTAL_BYTES
        || depth > 64
        || started.elapsed().as_secs() >= 5
    {
        result
            .errors
            .push("Workspace snapshot exceeded its bounded scan limits".into());
        return;
    }
    let entries = match fs::read_dir(root.join(relative)) {
        Ok(v) => v,
        Err(_) => {
            result.errors.push("Unreadable workspace directory".into());
            return;
        }
    };
    for item in entries {
        if *count >= MAX_FILES || *bytes > MAX_TOTAL_BYTES || started.elapsed().as_secs() >= 5 {
            result
                .errors
                .push("Workspace snapshot exceeded its bounded scan limits".into());
            break;
        }
        let Ok(item) = item else {
            result.errors.push("Unreadable workspace entry".into());
            continue;
        };
        let rel = relative.join(item.file_name());
        let Some(name) = rel.to_str() else {
            result.errors.push("Non-UTF8 workspace path".into());
            continue;
        };
        if name.contains('\\') {
            result
                .errors
                .push("Ambiguous workspace path separator".into());
            continue;
        }
        let name = name.to_string();
        *count += 1;
        let Ok(meta) = fs::symlink_metadata(item.path()) else {
            result.errors.push("Unreadable workspace metadata".into());
            continue;
        };
        if meta.file_type().is_symlink() || (!meta.is_dir() && !meta.is_file()) {
            result
                .errors
                .push(format!("Unsupported workspace entry: {name}"));
            continue;
        }
        if GENERATED.iter().any(|p| name == *p) {
            if !meta.is_dir() {
                result
                    .errors
                    .push("Generated namespace is not a directory".into());
            }
            continue;
        }
        if meta.is_dir() {
            // Directory mtimes change when DBC writes its own excluded artifacts.
            result.entries.insert(
                name,
                Entry {
                    method: "directory".into(),
                    ..Default::default()
                },
            );
            walk(root, &rel, denied, result, count, bytes, started, depth + 1);
        } else {
            let mut entry = fingerprint_metadata(&meta);
            if !sensitive(&name, denied) {
                let remaining = MAX_TOTAL_BYTES.saturating_sub(*bytes);
                match read_bounded(root, &rel, MAX_FILE_BYTES.min(remaining)) {
                    Ok(contents) => {
                        *bytes += contents.len() as u64;
                        entry.digest = digest(&contents);
                        entry.method = "sha256+metadata".into();
                    }
                    Err(error) => result.errors.push(format!("{name}: {error}")),
                }
            }
            result.entries.insert(name, entry);
        }
    }
}

pub fn changed(before: &Snapshot, after: &Snapshot) -> Result<Vec<String>, String> {
    if before.version != 1
        || after.version != 1
        || !before.complete
        || !after.complete
        || before.root != after.root
        || before.exclusions != after.exclusions
    {
        return Err("Missing, incomplete or incompatible workspace snapshot".into());
    }
    let paths: BTreeSet<_> = before.entries.keys().chain(after.entries.keys()).collect();
    Ok(paths
        .into_iter()
        .filter(|key| before.entries.get(*key) != after.entries.get(*key))
        .cloned()
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn sha256_is_standard() {
        assert_eq!(
            digest(b"abc"),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
    }
    #[test]
    fn file_changes_and_metadata_only_paths_are_detected() {
        let root = crate::tests::temp_project_dir();
        fs::write(root.join("README.md"), "pending").unwrap();
        fs::write(root.join("delete.txt"), "old").unwrap();
        fs::write(root.join(".env"), "synthetic fixture only").unwrap();
        let before = capture(&root, &[".env".into()]);
        assert!(before.complete);
        assert!(before.entries[".env"].digest.is_empty());
        fs::write(root.join("README.md"), "verified").unwrap();
        fs::remove_file(root.join("delete.txt")).unwrap();
        fs::write(root.join("new.txt"), "new").unwrap();
        fs::write(root.join(".env"), "changed synthetic fixture").unwrap();
        fs::create_dir_all(root.join(".dbc/evidence/run")).unwrap();
        fs::write(root.join(".dbc/evidence/run/step.json"), "generated").unwrap();
        let after = capture(&root, &[".env".into()]);
        let differences = changed(&before, &after).unwrap();
        for expected in ["README.md", "delete.txt", "new.txt", ".env"] {
            assert!(differences.contains(&expected.to_string()));
        }
        assert!(!differences.iter().any(|p| p.starts_with(".dbc/evidence")));
        fs::remove_dir_all(root).unwrap();
    }
    #[cfg(unix)]
    #[test]
    fn links_and_oversized_files_fail_closed() {
        let root = crate::tests::temp_project_dir();
        std::os::unix::fs::symlink("/outside-not-read", root.join("link")).unwrap();
        assert!(!capture(&root, &[]).complete);
        assert!(read_bounded(&root, Path::new("link"), 100).is_err());
        assert!(read_bounded(&root, Path::new("../escape"), 100).is_err());
        fs::remove_file(root.join("link")).unwrap();
        fs::File::create(root.join("large"))
            .unwrap()
            .set_len(MAX_FILE_BYTES + 1)
            .unwrap();
        let large = capture(&root, &[]);
        assert!(!large.complete);
        assert!(changed(&large, &large).is_err());
        fs::remove_dir_all(root).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn generated_symlinks_unreadable_paths_and_limits_fail_closed() {
        use std::os::unix::fs::{symlink, PermissionsExt};
        let root = crate::tests::temp_project_dir();
        let outside = crate::tests::temp_project_dir();
        fs::create_dir(root.join(".dbc")).unwrap();
        symlink(&outside, root.join(".dbc/evidence")).unwrap();
        assert!(!capture(&root, &[]).complete);
        assert!(safe_parent(&root, Path::new(".dbc/evidence/run/input.json")).is_err());
        assert!(!outside.join("run").exists());
        fs::remove_file(root.join(".dbc/evidence")).unwrap();
        let unreadable = root.join("unreadable");
        fs::write(&unreadable, "fixture").unwrap();
        fs::set_permissions(&unreadable, fs::Permissions::from_mode(0)).unwrap();
        // Root can read mode-000 files; ordinary desktop users cannot.
        if unsafe { libc::geteuid() } != 0 {
            assert!(!capture(&root, &[]).complete);
        }
        fs::set_permissions(&unreadable, fs::Permissions::from_mode(0o600)).unwrap();
        let mut result = Snapshot::default();
        let mut count = 0;
        let mut bytes = MAX_TOTAL_BYTES;
        walk(
            &root,
            Path::new(""),
            &[],
            &mut result,
            &mut count,
            &mut bytes,
            Instant::now(),
            0,
        );
        assert!(!result.errors.is_empty());
        fs::remove_dir_all(root).unwrap();
        fs::remove_dir_all(outside).unwrap();
    }
}
