import { createStore } from 'effector';

import { createRemoteResource, deriveFromResources } from '@/shared/resource';

type CodexRequestParams = Record<string, never>;

const CODEX_URL = 'https://raw.githubusercontent.com/novasamatech/nova-spektr-static/main/codex/codex.md';

const codexResource = createRemoteResource<CodexRequestParams, string>({
  cache: {
    key: () => 'codex-content',
    ttl: 60 * 60 * 1000, // Cache for 1 hour
  },
  async fn(): Promise<string> {
    const response = await fetch(CODEX_URL);

    if (!response.ok) {
      throw new Error(`Failed to fetch codex: ${response.status} ${response.statusText}`);
    }

    return response.text();
  },
});

const $codexContent = createStore<string>('');

deriveFromResources({
  store: $codexContent,
  resources: [codexResource],
  map(state, content) {
    return content;
  },
});

export const codex = {
  $codexContent,
  requestCodex: codexResource.request,
};
