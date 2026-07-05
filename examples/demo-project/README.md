# DBC Demo Project

This tiny project exists so new users can try DBC against a harmless workspace.

## Suggested Demo Flow

1. Copy the example `.dbc` workspace into this directory:

   ```bash
   cp -R ../dbc-workspace/.dbc .
   ```

2. Open DBC and choose this `examples/demo-project` folder as the active project.
3. Load `.dbc` config from Settings.
4. Open Tasks and inspect `README-SMOKE`.
5. Run a mock or controlled smoke loop.
6. Inspect Loop History, Evidence Dashboard, and generated reports.

## Safety

This demo is designed for mock/local mode. Do not add real provider credentials, `.env` files, or production project paths.
