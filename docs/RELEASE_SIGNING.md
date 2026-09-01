# macOS Signing and Notarization

DBC release builds can be signed and notarized by Tauri’s macOS bundling flow
when the repository secrets below are configured. Do not commit certificates,
passwords, private keys, or notarization credentials.

## Required GitHub Secrets

- `APPLE_CERTIFICATE`: base64-encoded `.p12` distribution certificate.
- `APPLE_CERTIFICATE_PASSWORD`: password for the `.p12` certificate.
- `APPLE_SIGNING_IDENTITY`: Developer ID Application identity.
- `APPLE_ID`: Apple account used for notarization.
- `APPLE_PASSWORD`: app-specific password for that account.
- `APPLE_TEAM_ID`: Apple Developer team identifier.

The release workflow passes these names to `tauri-apps/tauri-action`. Empty
secrets keep the current unsigned-alpha behavior; a release must not be described
as signed until the verification commands below pass on the published artifact.

## Local Secret Preparation

Create a password-protected `.p12` containing the Developer ID Application
certificate and private key. Encode it without line wrapping:

```bash
base64 -i DeveloperIDApplication.p12 | pbcopy
```

Store the encoded value only in the GitHub Actions secret. Remove local exported
certificate copies when they are no longer required according to the team’s key
management policy.

## Verification

After downloading the published DMG:

```bash
codesign --verify --deep --strict --verbose=2 "/Applications/Dildin Build Control.app"
spctl --assess --type execute --verbose=4 "/Applications/Dildin Build Control.app"
xcrun stapler validate "/Applications/Dildin Build Control.app"
```

Also verify the published SHA-256 checksum according to `docs/INSTALL.md`.

## Release Acceptance

A release may be described as signed and notarized only when:

- the signature identity matches the expected Developer ID Application;
- `codesign --verify` succeeds;
- Gatekeeper assessment succeeds;
- the notarization ticket is stapled and validates;
- both Apple Silicon and Intel assets have matching published checksums;
- installation is manually tested on a clean macOS account.

## Homebrew

After a verified release, generate a Homebrew Cask with:

```bash
pnpm homebrew-cask -- \
  --version 0.2.0 \
  --arm64-sha <published-arm64-sha256> \
  --x64-sha <published-x64-sha256>
```

Review the generated output before publishing it to a tap. The generator refuses
placeholder or malformed checksums.
