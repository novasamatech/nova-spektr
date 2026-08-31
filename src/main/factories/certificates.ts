import { app } from 'electron';

/**
 * Chromium's `ignore-certificate-errors` switch disables TLS validation for the
 * whole process (RPC, chain/token config, prices, address-book backend, update
 * feed, ...). The only endpoint that needs it is the local mkcert-signed Vite
 * dev server, so it is applied in the development build only. The mode check
 * must stay an inline `import.meta.env.MODE` comparison: Vite inlines the value
 * at build time, so the whole call is dead-code-eliminated from
 * staging/production bundles — `scripts/postbuild.js` verifies the switch is
 * absent from the built bundle.
 */
export function setupCertificateErrors(): void {
  if (import.meta.env.MODE !== 'development') return;

  app.commandLine.appendSwitch('ignore-certificate-errors');
}
