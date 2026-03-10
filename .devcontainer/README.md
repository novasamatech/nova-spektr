# Dev Containers Setup Guide

## 🚀 Quick Start

### 1. Install Docker Runtime

- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [OrbStack](https://orbstack.dev) (macOS only - faster & lighter)

### 2. Install "Dev Containers" Extension/Plugin

- **VS Code/Cursor**: Search for "Dev Containers" by Microsoft in Extensions
- **WebStorm**: Usually pre-installed. Check Plugins if not available.

### 3. Open Project in Container

- **VS Code/Cursor**: `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) → "Dev Containers: Reopen Folder in Container"
- **WebStorm**: Click Dev Container icon in status bar → "Create Dev Container"

The first build takes a few minutes. Subsequent starts are much faster.

---

## 🔒 First Run: HTTPS Certificate Setup

The dev server uses HTTPS via `vite-plugin-mkcert`. The container is configured to reuse
your host's `mkcert` root CA so the browser trusts the certificates without extra steps.

### macOS

```sh
# 1. Install mkcert on the host
brew install mkcert

# 2. Create root CA and add it to macOS keychain + browser trust stores
mkcert -install
```

Then rebuild the dev container. The `devcontainer.json` mounts your host's mkcert root CA
(`~/Library/Application Support/mkcert/`) into the container and sets `CAROOT` so the
vite plugin signs leaf certificates with the already-trusted root CA.

### Linux

```sh
# 1. Install mkcert (see https://github.com/FiloSottile/mkcert#installation)
# 2. Create root CA and add it to system trust store
mkcert -install
```

The default `devcontainer.json` mount path is macOS-specific. Linux users need to update
the `mounts` source path in `devcontainer.json` to their `CAROOT` (find it with `mkcert -CAROOT`,
usually `~/.local/share/mkcert`).

### Verify

After rebuilding the container, run:

```sh
pnpm start:renderer
```

Chrome should show a trusted HTTPS connection with no warnings.
