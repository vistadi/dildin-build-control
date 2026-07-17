# Install Dildin Build Control on macOS

DBC is currently distributed as an unsigned macOS alpha for Apple Silicon and Intel Macs.

## 1. Choose the correct build

Open **Apple menu -> About This Mac** and check the processor or chip:

- Apple M-series chip: download the `aarch64.dmg` asset.
- Intel processor: download the `x64.dmg` asset.

Download the matching DMG and SHA-256 file from [GitHub Releases](https://github.com/vistadi/dildin-build-control/releases).

## 2. Verify the download

Place the DMG and its `.sha256` file in the same folder. In Terminal, change to that folder and run the matching command:

```bash
shasum -a 256 -c Dildin_Build_Control_0.1.1_arm64.sha256
```

or:

```bash
shasum -a 256 -c Dildin_Build_Control_0.1.1_x64.sha256
```

Continue only when the result ends with `OK`.

## 3. Install

1. Open the DMG.
2. Drag **Dildin Build Control** to Applications.
3. Open the app from Applications.

The current alpha is not signed or notarized. If macOS blocks it, follow Apple's documented process under **System Settings -> Privacy & Security** and use **Open Anyway** only after verifying the checksum and repository source. Do not disable Gatekeeper globally.

[Apple: Open a Mac app from an unknown developer](https://support.apple.com/guide/mac-help/open-a-mac-app-from-an-unknown-developer-mh40616/mac)

## 4. Start safely

- Keep providers in mock mode for the first run.
- Do not store credentials, tokens, or private keys in `.dbc` files.
- Use the controlled smoke flow before enabling a real CLI provider.
- Review every approval, command policy result, and final EvidencePack.

For a source build, follow the [README](../README.md#try-it).
