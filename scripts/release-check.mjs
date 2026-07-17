import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const packageJson = JSON.parse(read("package.json"));
const tauriConfig = JSON.parse(read("src-tauri/tauri.conf.json"));
const cargoToml = read("src-tauri/Cargo.toml");
const changelog = read("CHANGELOG.md");

const packageSection = cargoToml.split(/\r?\n(?=\[)/, 1)[0];
const cargoVersion = packageSection.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
const versions = {
  package: packageJson.version,
  tauri: tauriConfig.version,
  cargo: cargoVersion,
};

const uniqueVersions = new Set(Object.values(versions));
if (uniqueVersions.size !== 1 || !/^\d+\.\d+\.\d+$/.test(packageJson.version)) {
  throw new Error(`Release versions are invalid or out of sync: ${JSON.stringify(versions)}`);
}

const tagArgument = process.argv.slice(2).find((argument) => argument !== "--");
const tag = tagArgument || (process.env.GITHUB_REF_TYPE === "tag" ? process.env.GITHUB_REF_NAME : "");
if (tag) {
  const versionPrefix = `v${packageJson.version}`;
  if (tag !== versionPrefix && !tag.startsWith(`${versionPrefix}-`)) {
    throw new Error(`Tag ${tag} does not match application version ${packageJson.version}`);
  }

  const changelogHeading = `## [${tag.slice(1)}]`;
  if (!changelog.includes(changelogHeading)) {
    throw new Error(`CHANGELOG.md is missing ${changelogHeading}`);
  }
}

console.log(JSON.stringify({ status: "passed", versions, tag: tag || null }, null, 2));
