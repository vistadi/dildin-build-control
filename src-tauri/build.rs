use std::{
    env,
    path::PathBuf,
    process::Command,
    time::{SystemTime, UNIX_EPOCH},
};

fn git(args: &[&str]) -> Option<String> {
    let result = Command::new("git").args(args).output().ok()?;
    result
        .status
        .success()
        .then(|| String::from_utf8_lossy(&result.stdout).trim().to_string())
}

fn main() {
    for path in [
        "build.rs",
        "Cargo.toml",
        "Cargo.lock",
        "tauri.conf.json",
        "src",
        "../src",
        "../package.json",
    ] {
        println!("cargo:rerun-if-changed={path}");
    }
    for name in ["DBC_BUILD_LABEL", "SOURCE_DATE_EPOCH"] {
        println!("cargo:rerun-if-env-changed={name}");
    }
    if let Some(dir) = git(&["rev-parse", "--absolute-git-dir"]) {
        let root = PathBuf::from(dir);
        println!("cargo:rerun-if-changed={}", root.join("HEAD").display());
        println!("cargo:rerun-if-changed={}", root.join("index").display());
        println!(
            "cargo:rerun-if-changed={}",
            root.join("packed-refs").display()
        );
        if let Some(reference) = git(&["symbolic-ref", "-q", "HEAD"]) {
            println!("cargo:rerun-if-changed={}", root.join(reference).display());
        }
    }
    let commit = git(&["rev-parse", "HEAD"])
        .filter(|s| s.len() == 40 && s.chars().all(|c| c.is_ascii_hexdigit()))
        .unwrap_or_else(|| "unknown".into());
    let dirty = git(&["status", "--porcelain", "--untracked-files=normal"])
        .map(|s| if s.is_empty() { "clean" } else { "dirty" })
        .unwrap_or("unknown");
    let label = env::var("DBC_BUILD_LABEL")
        .ok()
        .filter(|s| {
            !s.is_empty()
                && s.len() <= 100
                && s.chars()
                    .all(|c| c.is_ascii_alphanumeric() || "._-/".contains(c))
        })
        .unwrap_or_else(|| "local".into());
    let epoch = env::var("SOURCE_DATE_EPOCH")
        .ok()
        .and_then(|s| s.parse::<u64>().ok())
        .unwrap_or_else(|| {
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs()
        });
    println!("cargo:rustc-env=DBC_BUILD_COMMIT={commit}");
    println!("cargo:rustc-env=DBC_BUILD_SOURCE_STATE={dirty}");
    println!("cargo:rustc-env=DBC_BUILD_LABEL={label}");
    println!("cargo:rustc-env=DBC_BUILD_EPOCH={epoch}");
    println!(
        "cargo:rustc-env=DBC_BUILD_TARGET={}",
        env::var("TARGET").unwrap_or_else(|_| "unknown".into())
    );
    println!(
        "cargo:rustc-env=DBC_BUILD_PROFILE={}",
        env::var("PROFILE").unwrap_or_else(|_| "unknown".into())
    );
    tauri_build::build()
}
