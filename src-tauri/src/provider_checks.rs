//! Help-text compatibility is setup evidence, never a live model certification.
pub fn missing_capabilities(kind: &str, help: &str) -> Vec<String> {
    let required: &[&str] = match kind {
        "kimi" => &["--prompt", "--output-format", "--plan"],
        "qwen" => &[
            "--prompt",
            "--output-format",
            "--approval-mode",
            "--safe-mode",
            "--max-tool-calls",
            "--max-session-turns",
            "--max-wall-time",
        ],
        _ => &[],
    };
    let tokens = help
        .split(|c: char| !c.is_ascii_alphanumeric() && c != '-')
        .collect::<Vec<_>>();
    let mut missing = required
        .iter()
        .filter(|flag| !tokens.contains(flag))
        .map(|flag| (*flag).to_string())
        .collect::<Vec<_>>();
    if kind == "qwen" {
        for (flag, value) in [
            ("--approval-mode", "plan"),
            ("--output-format", "stream-json"),
        ] {
            if !option_declares_value(help, flag, value) {
                missing.push(format!("{flag} value {value}"));
            }
        }
    }
    missing
}

fn option_declares_value(help: &str, flag: &str, value: &str) -> bool {
    let lines = help.lines().collect::<Vec<_>>();
    lines.iter().enumerate().any(|(index, line)| {
        if !line
            .split_whitespace()
            .any(|token| token.trim_matches(',') == flag)
        {
            return false;
        }
        lines[index..]
            .iter()
            .take(6)
            .enumerate()
            .take_while(|(offset, line)| *offset == 0 || !line.contains("--"))
            .any(|(_, line)| {
                line.split(|c: char| !c.is_ascii_alphanumeric() && c != '-')
                    .any(|token| token == value)
            })
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    const HELP: &str = "--prompt\n--output-format [choices: text, json, stream-json]\n--approval-mode\n  [choices: plan, default, auto-edit, yolo]\n--safe-mode\n--max-tool-calls\n--max-session-turns\n--max-wall-time";
    #[test]
    fn accepts_declared_safe_contract() {
        assert!(missing_capabilities("qwen", HELP).is_empty());
    }
    #[test]
    fn rejects_missing_budget_even_when_other_flags_exist() {
        assert!(missing_capabilities(
            "qwen",
            &HELP.replace("--max-wall-time", "--max-wall-time-extra")
        )
        .contains(&"--max-wall-time".into()));
    }
    #[test]
    fn plan_word_elsewhere_is_not_an_approval_mode() {
        let changed = HELP.replace("choices: plan, default", "choices: default")
            + "\n--plan separate planning switch";
        assert!(
            missing_capabilities("qwen", &changed).contains(&"--approval-mode value plan".into())
        );
    }
    #[test]
    fn missing_stream_format_fails_closed() {
        assert!(
            missing_capabilities("qwen", &HELP.replace("stream-json", "jsonl"))
                .contains(&"--output-format value stream-json".into())
        );
    }
}
