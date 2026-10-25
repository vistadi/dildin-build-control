// A target workspace is not required to package DBC (or any desktop app).
// Distribution evidence stays visible, but is not a task-execution prerequisite.
export function distributionEvidence(report) {
  const checklist = report?.checklist;
  const complete = checklist && Object.keys(checklist).length > 0 && Object.values(checklist).every(value => value === true);
  return {
    level: "info",
    subject: "distribution (informational)",
    detail: complete
      ? "Local distribution artifacts are recorded; this is not a task execution or signing approval."
      : "No complete local distribution package. Not required for project tasks; publishing/signing remain separately gated.",
  };
}
