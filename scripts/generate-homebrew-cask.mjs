const args = new Map();

for (let index = 2; index < process.argv.length; index += 1) {
  const key = process.argv[index];
  if (key === "--") continue;
  const value = process.argv[index + 1];
  if (!key.startsWith("--") || !value || value.startsWith("--")) {
    console.error(`Expected --name value, received: ${key}`);
    process.exit(1);
  }
  args.set(key.slice(2), value);
  index += 1;
}

const version = args.get("version")?.trim();
const arm64Sha = args.get("arm64-sha")?.trim().toLowerCase();
const x64Sha = args.get("x64-sha")?.trim().toLowerCase();
const tag = args.get("tag")?.trim() || (version ? `v${version}` : "");

function validVersion(value) {
  return Boolean(value && /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(value));
}

function validSha(value) {
  return Boolean(value && /^[a-f0-9]{64}$/.test(value) && !/^0+$/.test(value));
}

if (!validVersion(version) || !validSha(arm64Sha) || !validSha(x64Sha) || !tag) {
  console.error(
    [
      "Usage:",
      "  pnpm homebrew-cask -- --version 0.1.1 --arm64-sha <64 hex chars> --x64-sha <64 hex chars> [--tag v0.1.1]",
      "",
      "Real published SHA-256 values are required; placeholders are rejected.",
    ].join("\n"),
  );
  process.exit(1);
}

const cask = `cask "dildin-build-control" do
  arch arm: "aarch64", intel: "x64"

  version "${version}"
  sha256 arm: "${arm64Sha}",
         intel: "${x64Sha}"

  url "https://github.com/vistadi/dildin-build-control/releases/download/${tag}/Dildin.Build.Control_#{version}_darwin_#{arch}.dmg"
  name "Dildin Build Control"
  desc "Evidence and acceptance layer for AI-assisted software delivery"
  homepage "https://github.com/vistadi/dildin-build-control"

  app "Dildin Build Control.app"

  zap trash: [
    "~/Library/Application Support/com.dildin.build-control",
    "~/Library/Preferences/com.dildin.build-control.plist",
  ]
end
`;

process.stdout.write(cask);
