import { type Page } from '@playwright/test';

/**
 * The renderer is served by the Vite dev server, whose HMR client keeps a
 * websocket to the same origin. Closing it leaves the client without a socket
 * to write to, and Vite 8 then throws `Cannot read properties of undefined
 * (reading 'send')` on every message — tens of thousands of errors per page
 * load. Chain RPC never lives on the dev server host.
 */
const DEV_SERVER_HOSTNAMES = new Set(['localhost', '127.0.0.1']);

const isDevServerSocket = (url: URL): boolean => DEV_SERVER_HOSTNAMES.has(url.hostname);

/**
 * Closes every RPC websocket the app opens, keeping the dev server's own (Vite
 * HMR) alive. `isAllowed` lets a scenario keep selected chains connected, e.g.
 * only the Asset Hub nodes a draft is decoded on.
 */
export async function blockRpcWebsockets(page: Page, isAllowed: (url: URL) => boolean = () => false): Promise<void> {
  await page.routeWebSocket(
    (url) => !isDevServerSocket(url) && !isAllowed(url),
    (ws) => ws.close(),
  );
}
