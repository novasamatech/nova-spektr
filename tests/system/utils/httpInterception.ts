import { type Page } from '@playwright/test';

interface InterceptOptions {
  routePattern: string;
  mockData: any;
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

export async function interceptGovernanceSubquery(page: Page, mockData: any) {
  return interceptRoute({
    page,
    // The governance-delegations endpoint differs per environment: the dev chains config
    // (chains_dev.json) points Polkadot to "-stg", while production uses "-prod". Match any
    // env suffix so the mock intercepts regardless of which chains file the suite runs with.
    routePattern: '**/subquery-governance-polkadot-*.novasama-tech.org/**',
    mockData,
  });
}
