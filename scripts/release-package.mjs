import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const projectPath = process.cwd();
const configPath = path.join(projectPath, "src-tauri", "tauri.conf.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));
const productName = config.productName || "Dildin Build Control";
const version = config.version || "0.0.0";
const identifier = config.identifier || "unknown";
const icons = Array.isArray(config.bundle?.icon) ? config.bundle.icon : [];
const releaseDir = path.join(projectPath, ".dbc", "release");
mkdirSync(releaseDir, { recursive: true });

const appPath = path.join(projectPath, "src-tauri", "target", "release", "bundle", "macos", `${productName}.app`);
const dmgPath = path.join(projectPath, "src-tauri", "target", "release", "bundle", "dmg", `${productName}_${version}_aarch64.dmg`);
const binaryPath = path.join(projectPath, "src-tauri", "target", "release", "dildin-build-control");
const dmgChecksum = stableFileChecksum(dmgPath);
const binaryChecksum = stableFileChecksum(binaryPath);
const generatedAt = String(Date.now());

const report = {
  version: 1,
  kind: "release-package",
  generatedAt,
  productName,
  appVersion: version,
  identifier,
  paths: {
    app: appPath,
    dmg: dmgPath,
    binary: binaryPath,
  },
  checksums: {
    dmg: dmgChecksum,
    binary: binaryChecksum,
  },
  icons,
  checklist: {
    appExists: existsSync(appPath),
    dmgExists: existsSync(dmgPath),
    binaryExists: existsSync(binaryPath),
    iconsConfigured: icons.length > 0,
    identifierPresent: identifier !== "unknown",
    versionPresent: version !== "0.0.0",
    dmgChecksumPresent: dmgChecksum.length > 0,
  },
};

const jsonPath = path.join(releaseDir, "latest.json");
const markdownPath = path.join(releaseDir, "latest.md");
writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(markdownPath, releaseMarkdown(report));

console.log(
  JSON.stringify(
    {
      jsonPath,
      markdownPath,
      dmgPath,
      dmgChecksum,
      binaryPath,
      binaryChecksum,
      checklist: report.checklist,
    },
    null,
    2,
  ),
);

if (Object.values(report.checklist).some((value) => value !== true)) process.exitCode = 1;

function stableFileChecksum(filePath) {
  if (!existsSync(filePath)) return "";
  const bytes = readFileSync(filePath);
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = (hash * prime) & mask;
  }
  return hash.toString(16).padStart(16, "0");
}

function releaseMarkdown(report) {
  return [
    "# Release Package",
    "",
    `Product: ${report.productName}`,
    `Version: ${report.appVersion}`,
    `Identifier: ${report.identifier}`,
    `Generated: ${report.generatedAt}`,
    "",
    "## Artifacts",
    "",
    `- App: ${report.paths.app}`,
    `- DMG: ${report.paths.dmg}`,
    `- Binary: ${report.paths.binary}`,
    "",
    "## Checksums",
    "",
    `- DMG: ${report.checksums.dmg}`,
    `- Binary: ${report.checksums.binary}`,
    "",
    "## Checklist",
    "",
    `- app exists: ${report.checklist.appExists}`,
    `- dmg exists: ${report.checklist.dmgExists}`,
    `- binary exists: ${report.checklist.binaryExists}`,
    `- icons configured: ${report.checklist.iconsConfigured}`,
    `- identifier present: ${report.checklist.identifierPresent}`,
    `- version present: ${report.checklist.versionPresent}`,
    `- dmg checksum present: ${report.checklist.dmgChecksumPresent}`,
    "",
    "## Notes",
    "",
    "This package records local build artifacts only. Signing, notarization, publishing, and update distribution remain manual approval-gated steps.",
    "",
  ].join("\n");
}
