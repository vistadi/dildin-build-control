use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BuildInfo {
    version: &'static str,
    label: &'static str,
    commit: &'static str,
    source_state: &'static str,
    built_at_unix: &'static str,
    target: &'static str,
    profile: &'static str,
    executable_path: String,
    signing_status: &'static str,
}

pub fn current() -> BuildInfo {
    BuildInfo {
        version: env!("CARGO_PKG_VERSION"),
        label: env!("DBC_BUILD_LABEL"),
        commit: env!("DBC_BUILD_COMMIT"),
        source_state: env!("DBC_BUILD_SOURCE_STATE"),
        built_at_unix: env!("DBC_BUILD_EPOCH"),
        target: env!("DBC_BUILD_TARGET"),
        profile: env!("DBC_BUILD_PROFILE"),
        executable_path: std::env::current_exe()
            .map(|p| p.display().to_string())
            .unwrap_or_else(|_| "Unavailable".into()),
        // Compilation cannot establish signing/notarization of the installed artifact.
        signing_status: "Not verified by this app",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn identity_is_embedded_and_does_not_claim_signing() {
        let info = current();
        assert_eq!(info.version, env!("CARGO_PKG_VERSION"));
        assert!(!info.commit.is_empty());
        assert!(info.built_at_unix.parse::<u64>().is_ok());
        assert!(matches!(info.source_state, "clean" | "dirty" | "unknown"));
        assert_eq!(info.signing_status, "Not verified by this app");
    }
}
