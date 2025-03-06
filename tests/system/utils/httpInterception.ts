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
    routePattern: '**/subquery-governance-polkadot-prod.novasama-tech.org/**',
    mockData,
  });
}
