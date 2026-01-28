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

After the container builds, run the app to generate certificates:

```sh
pnpm start:renderer
```

Then install the HTTPS certificate to the system trust store.

For macOS keychain:

```sh
# 1. Copy cert from container to host
docker cp nova-spektr-dev:/home/node/.vite-plugin-mkcert/rootCA.pem ~/Downloads/nova-spektr-rootCA.pem

# 2. Install to macOS keychain
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ~/Downloads/nova-spektr-rootCA.pem

# 3. Clean up (optional)
rm ~/Downloads/nova-spektr-rootCA.pem
```

✅ Done! You can now develop with HTTPS locally.
