import { type Page } from '@playwright/test';

interface InterceptOptions {
  routePattern: string;
  mockData: unknown;
  logRequests?: boolean;
}

export async function interceptRoute({
  page,
  routePattern,
  mockData,
  logRequests = true,
}: InterceptOptions & { page: Page }) {
  await page.route(routePattern, async (route) => {
    if (logRequests) {
      const request = route.request();
      const postData = request.postData();
      console.log('Intercepted request:', {
        url: request.url(),
        postData: JSON.parse(postData || '{}'),
      });
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockData),
    });
  });
}

export async function interceptGovernanceSubquery(page: Page, mockData: unknown) {
  return interceptRoute({
    page,
    routePattern: '**/subquery-governance-polkadot-prod.novasama-tech.org/**',
    mockData,
  });
}

/**
 * Intercepts the chains config request (chains_dev.json / chains.json) and
 * replaces the node URLs for the "Polkadot Collectives" chain with a custom
 * URL.
 *
 * Usage: await interceptChainsWithCollectivesOverride(page,
 * 'wss://my-custom-node.example.com');
 */
export async function interceptChainsWithCollectivesOverride(page: Page, customNodeUrl: string) {
  await page.route('**/nova-spektr-utils/main/chains/**/*.json', async (route) => {
    const response = await route.fetch();
    const responseJson: unknown = await response.json();
    if (!Array.isArray(responseJson)) {
      throw new Error('Expected chains config to be a JSON array');
    }

    const modified = responseJson.map((item: unknown) => {
      if (typeof item !== 'object' || item === null) {
        return item;
      }
      if ('name' in item && item.name === 'Polkadot Collectives') {
        return {
          ...item,
          nodes: [{ url: customNodeUrl, name: 'Custom Test Node' }],
        };
      }

      return item;
    });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(modified),
    });
  });
}
