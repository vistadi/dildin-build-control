//! Detection evidence and display redaction are different operations.
use regex::Regex;
use std::sync::OnceLock;

const SENSITIVE: &str = "[REDACTED SENSITIVE TEXT]";
const CREDENTIAL: &str = "[REDACTED CREDENTIAL: ";

fn patterns() -> &'static Vec<(&'static str, Regex)> {
    static PATTERNS: OnceLock<Vec<(&'static str, Regex)>> = OnceLock::new();
    PATTERNS.get_or_init(|| {
        [
            ("credential-assignment", r#"(?i)(?:^|[\s{,\"'])(?:[a-z0-9_]*api[_-]?key|aws_secret_access_key|access_token|refresh_token|api_token|auth_token|token|password|private_key)[\"']?\s*[:=]\s*[\"']?([^\s\"',;}]+)"#),
            ("authorization-bearer", r#"(?i)authorization[\"']?\s*:\s*[\"']?bearer\s+([^\s\"',;}]+)"#),
            ("provider-token", r"\b(?:sk-|ghp_|github_pat_|xoxb-)[A-Za-z0-9_-]{16,}"),
            ("pem-private-key", r"-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----"),
        ].into_iter().map(|(kind, expression)| (kind, Regex::new(expression).expect("static detector"))).collect()
    })
}

fn placeholder(value: &str) -> bool {
    let value = value.to_ascii_lowercase();
    value.starts_with('$')
        || value.starts_with("process.env")
        || value.starts_with("os.environ")
        || [
            "[redacted]",
            "[redacted",
            "<redacted>",
            "<api_key>",
            "<token>",
            "<password>",
            "<secret>",
            "<placeholder>",
            "<reference>",
            "redacted",
            "example",
            "placeholder",
            "null",
            "none",
            "undefined",
        ]
        .contains(&value.as_str())
}

pub fn kinds(line: &str) -> Vec<String> {
    let mut found = Vec::new();
    for (kind, pattern) in patterns() {
        let detected = pattern.captures_iter(line).any(|capture| {
            capture
                .get(1)
                .is_none_or(|value| !placeholder(value.as_str()))
        });
        // Typed markers retain detector evidence after values are removed. Legacy
        // and broad masking markers never imply a credential was detected.
        if detected || line.contains(&format!("{CREDENTIAL}{kind}]")) {
            found.push((*kind).to_string());
        }
    }
    found
}

pub fn redact(text: &str) -> String {
    text.lines()
        .map(|line| {
            let found = kinds(line);
            if !found.is_empty() {
                return found
                    .iter()
                    .map(|kind| format!("{CREDENTIAL}{kind}]"))
                    .collect::<Vec<_>>()
                    .join(" ");
            }
            let lower = line.to_ascii_lowercase();
            if [
                "api_key",
                "apikey",
                "authorization:",
                "bearer ",
                "password",
                "private key",
                "secret",
                "api_token",
                "access_token",
                "refresh_token",
                "auth token",
                "token:",
                "token=",
            ]
            .iter()
            .any(|term| lower.contains(term))
            {
                SENSITIVE.to_string()
            } else {
                line.to_string()
            }
        })
        .collect::<Vec<_>>()
        .join("\n")
}

pub fn redact_value(value: &mut serde_json::Value) {
    match value {
        serde_json::Value::String(text) => {
            if let Ok(mut nested) = serde_json::from_str::<serde_json::Value>(text) {
                if nested.is_object() || nested.is_array() {
                    redact_value(&mut nested);
                    *text = nested.to_string();
                    return;
                }
            }
            *text = redact(text);
        }
        serde_json::Value::Array(items) => items.iter_mut().for_each(redact_value),
        serde_json::Value::Object(items) => {
            for (key, value) in items {
                let indicators = kinds(&format!("{key}={}", value.as_str().unwrap_or("")));
                if !indicators.is_empty() {
                    *value = serde_json::Value::String(
                        indicators
                            .iter()
                            .map(|kind| format!("{CREDENTIAL}{kind}]"))
                            .collect::<Vec<_>>()
                            .join(" "),
                    );
                } else {
                    redact_value(value);
                }
            }
        }
        _ => {}
    }
}

pub fn masking_events(text: &str) -> usize {
    text.lines()
        .filter(|line| {
            line.contains(SENSITIVE)
                || line
                    .to_ascii_lowercase()
                    .contains("[redacted secret-like line]")
        })
        .count()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn prose_redaction_and_report_echoes_are_not_credentials() {
        for line in [
            "Do not access secrets or passwords.",
            "No secret leakage detected.",
            "[REDACTED SECRET-LIKE LINE]",
            "task-name and risk-key are ordinary words",
        ] {
            let once = redact(line);
            assert!(kinds(&once).is_empty());
            assert!(kinds(&redact(&once)).is_empty());
        }
        assert_eq!(masking_events(&redact("No secrets here.")), 1);
        assert!(kinds("password=<password>").is_empty());
        assert!(!kinds("password=[synthetic-fixture]").is_empty());
    }

    #[test]
    fn actual_indicators_remain_detectable_without_storing_values() {
        let synthetic = "synthetic-only-credential-fixture";
        for line in [
            format!("password = {synthetic}"),
            format!(r#"{{"api_key": "{synthetic}"}}"#),
            format!("Authorization: Bearer {synthetic}"),
            format!("{}{}", "ghp_", synthetic.replace('-', "")),
            format!("-----BEGIN {}PRIVATE KEY-----", "RSA "),
        ] {
            assert!(!kinds(&line).is_empty());
            let masked = redact(&line);
            assert!(!masked.contains(synthetic));
            assert!(!kinds(&masked).is_empty());
            assert_eq!(masked, redact(&masked));
        }
        for line in [
            "api_key",
            "api_key=${REFERENCE}",
            r#"{"password":"<reference>"}"#,
        ] {
            assert!(kinds(line).is_empty());
        }
    }
}
