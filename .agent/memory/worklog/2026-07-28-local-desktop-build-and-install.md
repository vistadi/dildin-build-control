# Local desktop build and installation

Date: 2026-07-28

## Task objective

Build the current DBC desktop application and update the copy available in macOS
Applications.

## Approved scope

- Build the current `main` revision.
- Produce local `.app` and `.dmg` artifacts.
- Install the generated application in `/Applications`.
- Verify artifact identity, architecture, checksum, and installation.

No Apple credentials, release publication, Git push, or signed-release claim was in
scope.

## Initial repository state

- Branch: `main`.
- Commit: `6304053`.
- Working tree: clean and synchronized with `origin/main`.
- An older local target bundle from 2026-07-20 existed, but no DBC application was
  installed in `/Applications`.

## Work completed

- Ran the Tauri production build.
- Retried DMG packaging with macOS system access after the sandbox blocked the first
  `bundle_dmg.sh` invocation.
- Produced a new arm64 `.app` and `.dmg`.
- Installed the generated bundle at `/Applications/Dildin Build Control.app`.
- Compared the installed app with the generated source bundle.

## Artifacts

- Application:
  `src-tauri/target/release/bundle/macos/Dildin Build Control.app`
- DMG:
  `src-tauri/target/release/bundle/dmg/Dildin Build Control_0.1.1_aarch64.dmg`
- Installed application: `/Applications/Dildin Build Control.app`
- DMG SHA-256:
  `48ecfe85e7316b16dc6dd13bb8c794a1b66ca5ac34ad334212a3d7aa6b874aaf`

## Validation results

- Frontend production build: passed.
- Rust release compilation: passed.
- Tauri application bundling: passed.
- Tauri DMG bundling: passed after granting system packaging access.
- Bundle version: `0.1.1`.
- Bundle identifier: `com.dildin.build-control`.
- Architecture: arm64.
- Generated and installed application contents: identical.
- `hdiutil verify`: valid.
- Signing: ad-hoc only; Developer ID, notarization, and Gatekeeper acceptance remain
  unverified.

## Files modified

- `.agent/memory/PROJECT_STATE.md`
- `.agent/memory/worklog/2026-07-28-local-desktop-build-and-install.md`

Generated `src-tauri/target` artifacts are ignored build outputs and are not intended
for Git.

## Unresolved risks

- This local build is suitable for testing on the current Apple Silicon Mac but is not
  a distributable signed/notarized release.
- Intel macOS was not built or tested.

## Recommended next action

Launch `/Applications/Dildin Build Control.app` and complete the native Guided Run.
Configure Apple release credentials before distributing the DMG to other users.
