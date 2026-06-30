# AGENTS.md

For full development command reference see `docs/content/docs/onboarding/getting-started.mdx`
and the `scripts` block in `package.json`. Repo conventions live in `CLAUDE.md`.

## Cursor Cloud specific instructions

Nova Spektr is an Electron + React (Vite) desktop wallet. The relevant dev surface
in this VM is the **renderer** (the React UI), which can run standalone in a browser.

### Runtime / toolchain (already provisioned in the snapshot)
- Project requires **Node >=24** and **pnpm 11** (`engines` in `package.json`). The VM's
  default `/exec-daemon/node` is Node 22 and is first on `PATH`, so Node 24 (via nvm) and
  `pnpm` (via corepack) are symlinked into `/usr/local/cargo/bin` (which precedes
  `/exec-daemon` on `PATH`) so the correct versions win in every shell. Verify with
  `node --version` (expect v24.x) and `pnpm --version` (expect 11.4.0). If Node resolves
  to v22, re-create those symlinks from `~/.nvm/versions/node/v24.*/bin`.
- pnpm build-script approval is non-interactive via `allowBuilds:` in `pnpm-workspace.yaml`
  (electron, sharp, @swc/core, esbuild, etc.) — do not run `pnpm approve-builds`.

### Running the app
- **Renderer in browser (use this in the VM):** `pnpm start:renderer` serves the full UI
  at `https://localhost:3000/`. It uses a self-signed `vite-plugin-mkcert` certificate, so
  Chrome shows a "Your connection is not private" warning — click Advanced → Proceed.
  Dev mode uses test chains (`chains_dev`) and still connects to live networks for balances.
- **`pnpm start` (full Electron app) needs a display** (X server) and will not run headless
  as-is; prefer the renderer-in-browser flow above for verification.
- **First-load gotcha:** on the very first load the app often shows a "Sorry, something went
  wrong" error boundary (dev mode disables smooth error handling on purpose). Just click
  **Refresh** — onboarding then loads normally. This is expected, not an environment break.

### Lint / typecheck / test
- Lint: `pnpm lint` (passes with many non-blocking warnings; 0 errors = success).
- Types: prefer `pnpm types:go` (tsgo, ~6× faster than `pnpm types`).
- Unit tests: `pnpm test:unit` (vitest; ~5 min, writes `junit.xml`). Integration:
  `pnpm test:integration`. System e2e (`pnpm test:system`, Playwright) needs the renderer
  server + browsers and is heavier.
