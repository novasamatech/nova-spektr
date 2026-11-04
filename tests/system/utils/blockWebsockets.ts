import { type Page } from '@playwright/test';

import { renderer } from '../../../config/index.js';

/**
 * The renderer is served by the Vite dev server, whose HMR client keeps a
 * websocket to the same origin. Closing it leaves the client without a socket
 * to write to, and Vite 8 then throws `Cannot read properties of undefined
 * (reading 'send')` on every message — tens of thousands of errors per page
 * load. Chain RPC never lives on the dev server host, so the host of the page
 * itself tells the two apart; before the first navigation (`about:blank`) the
 * configured renderer origin stands in for it.
 */
const getDevServerHost = (page: Page): string => {
  const pageUrl = page.url();

  return pageUrl === 'about:blank' ? new URL(renderer.server.origin).host : new URL(pageUrl).host;
};

/**
 * Closes every RPC websocket the app opens, keeping the dev server's own (Vite
 * HMR) alive. `isAllowed` lets a scenario keep selected chains connected, e.g.
 * only the Asset Hub nodes a draft is decoded on.
 */
export async function blockRpcWebsockets(page: Page, isAllowed: (url: URL) => boolean = () => false): Promise<void> {
  const devHost = getDevServerHost(page);

  await page.routeWebSocket(
    (url) => url.host !== devHost && !isAllowed(url),
    (ws) => ws.close(),
  );
}
