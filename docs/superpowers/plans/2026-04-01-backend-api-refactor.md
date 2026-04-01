# Backend API Layer Refactoring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the backend API layer into clean `domains/backend/` + `aggregates/backend/` with proper `createQueryResource` for operation descriptions.

**Architecture:** Three-layer split: `shared/api/backend-fetch` (transport, unchanged) → `domains/backend/` (API services + query resource + hooks) → `aggregates/backend/` (auth orchestration + URL config). Contacts API moves from features to domain. Operation descriptions use `createQueryResource` + `useResource`.

**Tech Stack:** Effector, effector-react, Zod, createQueryResource/useResource from `@/shared/query`

**Spec:** `docs/superpowers/specs/2026-04-01-backend-api-refactor-design.md`

**Intentional behavioral changes:**
- **Persistence removed.** The old `operation-descriptions-model` used `persist()` for `$descriptions`. The new query resource does NOT persist the cache. Descriptions are re-fetched from the backend on each app start while authenticated. This is intentional per the spec.
- **Submit.tsx unchanged.** The spec mentions `Submit.tsx` calling `operationsService.createDescription` directly, but the plan keeps `Submit.tsx` calling `approveModel.postDescription()` — the optimistic cache update is wired in `approve-model.ts` instead. This keeps the UI component thin.

---

## Task 1: Create `domains/backend/auth/service.ts`

**Files:**
- Create: `src/renderer/domains/backend/auth/service.ts`

Move auth API functions from `domains/api/auth.ts` to new location with service-object export pattern.

- [ ] **Step 1: Create the service file**

```typescript
// src/renderer/domains/backend/auth/service.ts
import { z } from 'zod';

import { authFetch, clearCsrfToken, parseResponse } from '@/shared/api/backend-fetch';

const challengeResponseSchema = z.object({
  challengeId: z.string(),
  nonce: z.string(),
  expiresAt: z.number(),
});

const verifyResponseSchema = z.object({
  permissions: z.array(z.string()),
});

const sessionResponseSchema = z.object({
  accountId: z.string(),
  permissions: z.array(z.string()),
});

export type ChallengeResponse = z.infer<typeof challengeResponseSchema>;
export type VerifyResponse = z.infer<typeof verifyResponseSchema>;
export type SessionResponse = z.infer<typeof sessionResponseSchema>;

async function requestChallenge(baseUrl: string, accountId: string): Promise<ChallengeResponse> {
  const result = await authFetch(`${baseUrl}/auth/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountId }),
  });

  return parseResponse(result, challengeResponseSchema);
}

async function verifySignature(
  baseUrl: string,
  params: { accountId: string; challengeId: string; signature: string },
): Promise<VerifyResponse> {
  const result = await authFetch(`${baseUrl}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  return parseResponse(result, verifyResponseSchema);
}

async function checkSession(baseUrl: string): Promise<SessionResponse | null> {
  const result = await authFetch(`${baseUrl}/auth/me`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!result.ok) {
    return null;
  }

  try {
    return parseResponse(result, sessionResponseSchema);
  } catch {
    return null;
  }
}

async function logout(baseUrl: string): Promise<void> {
  const result = await authFetch(`${baseUrl}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  clearCsrfToken();

  if (!result.ok) {
    throw new Error(`Logout failed with status ${result.status}`);
  }
}

export const backendAuthService = { requestChallenge, verifySignature, checkSession, logout };
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm types:go`
Expected: No errors related to the new file.

---

## Task 2: Create `domains/backend/operations/service.ts`

**Files:**
- Create: `src/renderer/domains/backend/operations/service.ts`

Move operations API functions from `domains/api/operations.ts`, removing dead code (`fetchOperations`, `fetchOperationsPage`).

- [ ] **Step 1: Create the service file**

```typescript
// src/renderer/domains/backend/operations/service.ts
import { z } from 'zod';

import { authFetch } from '@/shared/api/backend-fetch';

const backendOperationSchema = z.object({
  id: z.string(),
  description: z.string().nullable(),
});

type BackendOperation = z.infer<typeof backendOperationSchema>;

async function createDescription(
  baseUrl: string,
  params: {
    multisigAccountId: string;
    chainId: string;
    callHash: string;
    blockNumber: number;
    extrinsicIndex: number;
    description: string;
  },
): Promise<void> {
  const result = await authFetch(`${baseUrl}/operations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!result.ok) {
    let message = `Request failed with status ${result.status}`;
    try {
      const body: unknown = JSON.parse(result.body);
      if (
        body &&
        typeof body === 'object' &&
        'message' in body &&
        typeof (body as { message: unknown }).message === 'string'
      ) {
        message = (body as { message: string }).message;
      }
    } catch {
      // use default message
    }
    throw new Error(message);
  }
}

async function fetchDescriptionsByIds(
  baseUrl: string,
  ids: string[],
): Promise<BackendOperation[]> {
  if (ids.length === 0) return [];

  const result = await authFetch(`${baseUrl}/operations/by-ids`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });

  if (!result.ok) {
    throw new Error(`Failed to fetch operations by ids: ${result.status}`);
  }

  const body: unknown = JSON.parse(result.body);
  const items = Array.isArray(body) ? body : [];
  const operations: BackendOperation[] = [];
  for (const item of items) {
    const parsed = backendOperationSchema.safeParse(item);
    if (parsed.success) {
      operations.push(parsed.data);
    }
  }

  return operations;
}

export const operationsService = { createDescription, fetchDescriptionsByIds };
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm types:go`

---

## Task 3: Create `domains/backend/operations/resource.ts` and `hooks.ts`

**Files:**
- Create: `src/renderer/domains/backend/operations/resource.ts`
- Create: `src/renderer/domains/backend/operations/hooks.ts`

The query resource for operation descriptions + consumer hooks.

- [ ] **Step 1: Create the resource**

```typescript
// src/renderer/domains/backend/operations/resource.ts
import { createEvent, createStore } from 'effector';
import { readonly } from 'patronum';

import { createQueryResource } from '@/shared/query';

import { operationsService } from './service';

type DescriptionsParams = {
  baseUrl: string;
  ids: string[];
};

const $cache = createStore<Record<string, string>>({});

const resource = createQueryResource<DescriptionsParams>({
  key: ({ baseUrl, ids }) => [baseUrl, ids.toSorted().join(',')],
})
  .name('operation-descriptions')
  .request(async ({ baseUrl, ids }, _signal) => operationsService.fetchDescriptionsByIds(baseUrl, ids))
  .cache({
    store: $cache,
    staleAfter: 5 * 60 * 1000,
    map: (state, results, _params) => {
      const next = { ...state };
      for (const op of results) {
        if (op.description) {
          next[op.id] = op.description;
        }
      }

      return next;
    },
  })
  .build();

const descriptionCreated = createEvent<{ id: string; description: string }>();
$cache.on(descriptionCreated, (state, { id, description }) => ({ ...state, [id]: description }));

const resetDescriptions = createEvent();
$cache.on(resetDescriptions, () => ({}));

export const operationDescriptionsResource = {
  ...resource,
  descriptionCreated,
  resetDescriptions,
  $cache: readonly($cache),
};
```

- [ ] **Step 2: Create the hooks**

```typescript
// src/renderer/domains/backend/operations/hooks.ts
import { useStoreMap } from 'effector-react';

import { useResource } from '@/shared/query';

import { operationDescriptionsResource } from './resource';

export const useOperationDescriptionsFetch = (baseUrl: string | null, ids: string[]) => {
  return useResource(operationDescriptionsResource, {
    params: baseUrl && ids.length > 0 ? { baseUrl, ids } : null,
    defaultValue: {},
    map: (cache) => cache,
  });
};

export const useOperationDescription = (operationId: string): string | null => {
  return useStoreMap({
    store: operationDescriptionsResource.$cache,
    keys: [operationId],
    fn: (cache, [id]) => cache[id] ?? null,
  });
};
```

- [ ] **Step 3: Verify types compile**

Run: `pnpm types:go`

---

## Task 4: Create `domains/backend/contacts/service.ts`

**Files:**
- Create: `src/renderer/domains/backend/contacts/service.ts`

Move from `features/contacts/BackendContacts/api/backend-contacts-api.ts`. Only change: import path for `authFetch`.

- [ ] **Step 1: Copy the file and fix imports**

Copy `src/renderer/features/contacts/BackendContacts/api/backend-contacts-api.ts` to `src/renderer/domains/backend/contacts/service.ts`.

Change import:
```typescript
// OLD
import { authFetch } from '@/aggregates/backend-auth';
// NEW
import { authFetch } from '@/shared/api/backend-fetch';
```

Add service export at the bottom of the file:
```typescript
export const backendContactsService = { fetchAllContacts };
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm types:go`

---

## Task 5: Create `domains/backend/index.ts` barrel

**Files:**
- Create: `src/renderer/domains/backend/index.ts`

- [ ] **Step 1: Create the barrel**

```typescript
// src/renderer/domains/backend/index.ts
export { backendAuthService } from './auth/service';
export { type ChallengeResponse, type SessionResponse, type VerifyResponse } from './auth/service';

export { operationsService } from './operations/service';
export { operationDescriptionsResource } from './operations/resource';
export { useOperationDescriptionsFetch, useOperationDescription } from './operations/hooks';

export { backendContactsService, HttpError } from './contacts/service';
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm types:go`

- [ ] **Step 3: Commit domain layer**

```bash
git add src/renderer/domains/backend/
git commit -m "feat: create domains/backend/ with auth, operations, and contacts services"
```

---

## Task 6: Create `aggregates/backend/` (rename from `backend-auth/`)

**Files:**
- Create: `src/renderer/aggregates/backend/index.ts`
- Create: `src/renderer/aggregates/backend/init.ts`
- Create: `src/renderer/aggregates/backend/model/auth-model.ts`
- Create: `src/renderer/aggregates/backend/model/backend-configuration-model.ts`
- Create: `src/renderer/aggregates/backend/lib/sign-message.ts`

This task creates the new aggregate directory with updated imports. The old `aggregates/backend-auth/` is deleted in a later task.

- [ ] **Step 1: Copy and update `auth-model.ts`**

Copy `src/renderer/aggregates/backend-auth/model/auth-model.ts` to `src/renderer/aggregates/backend/model/auth-model.ts`.

Apply these changes:

Replace:
```typescript
import * as authApi from '@/domains/api';
```
With:
```typescript
import { backendAuthService } from '@/domains/backend';
```

Replace all `authApi.` calls with `backendAuthService.`:
- `authApi.requestChallenge(` → `backendAuthService.requestChallenge(`
- `authApi.verifySignature(` → `backendAuthService.verifySignature(`
- `authApi.checkSession(` → `backendAuthService.checkSession(`
- `authApi.logout(` → `backendAuthService.logout(`

Replace:
```typescript
import { buildSignMessage } from '../lib/backend-auth-sign';
```
With:
```typescript
import { buildSignMessage } from '../lib/sign-message';
```

- [ ] **Step 2: Copy `backend-configuration-model.ts` unchanged**

Copy `src/renderer/aggregates/backend-auth/model/backend-configuration-model.ts` to `src/renderer/aggregates/backend/model/backend-configuration-model.ts`.

No changes needed — it already imports `authFetch` from `@/shared/api/backend-fetch`.

- [ ] **Step 3: Copy and rename sign-message utility**

Copy `src/renderer/aggregates/backend-auth/lib/backend-auth-sign.ts` to `src/renderer/aggregates/backend/lib/sign-message.ts`.

No content changes needed.

- [ ] **Step 4: Create `init.ts` for cache wiring**

```typescript
// src/renderer/aggregates/backend/init.ts
import { sample } from 'effector';

import { operationDescriptionsResource } from '@/domains/backend';

import { backendConfigurationModel } from './model/backend-configuration-model';

sample({
  clock: backendConfigurationModel.events.urlCleared,
  target: operationDescriptionsResource.resetDescriptions,
});
```

- [ ] **Step 5: Create `index.ts` barrel**

```typescript
// src/renderer/aggregates/backend/index.ts
import './init';

export { type SignableAccount, authModel } from './model/auth-model';
export { backendConfigurationModel } from './model/backend-configuration-model';
```

- [ ] **Step 6: Verify types compile**

Run: `pnpm types:go`

- [ ] **Step 7: Commit aggregate layer**

```bash
git add src/renderer/aggregates/backend/
git commit -m "feat: create aggregates/backend/ with cleaned-up auth model and cache wiring"
```

---

## Task 7: Update all consumers — import path migration

**Files to modify (16 files):**

Note: `operation-descriptions-model.ts`, its test, `backend-contacts-api.ts`, and old `auth-model.ts` are handled separately (rewrite/delete in later tasks). Pages that import through `features/contacts/BackendConfiguration/index.ts` re-exports don't need changes — the transitive chain handles them.

Contacts feature:
- `src/renderer/features/contacts/BackendConfiguration/index.ts`
- `src/renderer/features/contacts/BackendConfiguration/ui/AuthStatus.tsx`
- `src/renderer/features/contacts/BackendConfiguration/ui/AuthStatus.stories.tsx`
- `src/renderer/features/contacts/BackendConfiguration/ui/BackendConfigurationButton.tsx`
- `src/renderer/features/contacts/BackendConfiguration/ui/BackendConfigurationModal.tsx`
- `src/renderer/features/contacts/BackendConfiguration/ui/BackendConfigurationModal.stories.tsx`
- `src/renderer/features/contacts/BackendConfiguration/ui/BackendConnectionCard.tsx`
- `src/renderer/features/contacts/BackendConfiguration/ui/BackendConnectionCard.stories.tsx`
- `src/renderer/features/contacts/BackendContacts/model/backend-contacts-model.ts`
- `src/renderer/features/contacts/BackendContacts/model/__tests__/backend-contacts-model.test.ts`
- `src/renderer/features/contacts/ContactFilter/model/contact-source-model.ts`
- `src/renderer/features/contacts/ContactFilter/model/__tests__/contact-source-model.test.ts`

Multisig operations:
- `src/renderer/features/multisig-operations/components/ApproveForm.tsx`
- `src/renderer/features/multisig-operations/model/approve-model.ts`

Transfer:
- `src/renderer/features/transfer/model/transfer-model.ts`
- `src/renderer/features/transfer/ui/TransferForm.tsx`

This is a bulk find-and-replace task. All changes are the same pattern.

- [ ] **Step 1: Replace `@/aggregates/backend-auth` → `@/aggregates/backend` in all 16 files**

In every file listed above, replace:
```typescript
from '@/aggregates/backend-auth'
```
With:
```typescript
from '@/aggregates/backend'
```

- [ ] **Step 2: Update contacts API import**

In `src/renderer/features/contacts/BackendContacts/model/backend-contacts-model.ts`, replace:
```typescript
import { HttpError, fetchAllContacts } from '../api/backend-contacts-api';
```
With:
```typescript
import { HttpError, backendContactsService } from '@/domains/backend';
```

Then replace all `fetchAllContacts(` calls with `backendContactsService.fetchAllContacts(`.

- [ ] **Step 3: Verify types compile**

Run: `pnpm types:go`

- [ ] **Step 4: Commit import migration**

```bash
git add -A
git commit -m "refactor: migrate all imports from backend-auth to backend"
```

---

## Task 8: Update `approve-model.ts` — use domain services

**Files:**
- Modify: `src/renderer/features/multisig-operations/model/approve-model.ts`

Replace `createOperationDescription` from old `@/domains/api` with `operationsService` from `@/domains/backend`. Fire `descriptionCreated` on success for optimistic cache update.

- [ ] **Step 1: Update imports**

Replace:
```typescript
import { createOperationDescription } from '@/domains/api';
```
With:
```typescript
import { operationDescriptionsResource, operationsService } from '@/domains/backend';
```

- [ ] **Step 2: Update `postDescriptionFx`**

Replace:
```typescript
const postDescriptionFx = createEffect(
  async (params: {
    baseUrl: string;
    multisigAccountId: string;
    chainId: string;
    callHash: string;
    blockNumber: number;
    extrinsicIndex: number;
    description: string;
  }) => {
    const { baseUrl, ...body } = params;
    await createOperationDescription(baseUrl, body);
  },
);
```
With:
```typescript
const postDescriptionFx = createEffect(
  async (params: {
    baseUrl: string;
    multisigAccountId: string;
    chainId: string;
    callHash: string;
    blockNumber: number;
    extrinsicIndex: number;
    description: string;
  }) => {
    const { baseUrl, ...body } = params;
    await operationsService.createDescription(baseUrl, body);
  },
);
```

- [ ] **Step 3: Add optimistic cache update on success**

After the existing `sample({ clock: postDescriptionFx.failData, ... })` block, add:

```typescript
sample({
  clock: postDescriptionFx.done,
  source: $operation,
  filter: (operation): operation is MultisigOperation => nonNullable(operation),
  fn: (operation, { params }) => ({
    id: operation.id,
    description: params.description,
  }),
  target: operationDescriptionsResource.descriptionCreated,
});
```

- [ ] **Step 4: Verify types compile**

Run: `pnpm types:go`

---

## Task 9: Update `transfer-model.ts` — use domain services

**Files:**
- Modify: `src/renderer/features/transfer/model/transfer-model.ts`

- [ ] **Step 1: Update imports**

Replace:
```typescript
import { createOperationDescription } from '@/domains/api';
```
With:
```typescript
import { operationDescriptionsResource, operationsService } from '@/domains/backend';
```

- [ ] **Step 2: Update `postDescriptionFx`**

Replace:
```typescript
    await createOperationDescription(baseUrl, body);
```
With:
```typescript
    await operationsService.createDescription(baseUrl, body);
```

- [ ] **Step 3: Add optimistic cache update on success**

After the existing `sample({ clock: postDescriptionFx.failData, ... })` block, add:

```typescript
sample({
  clock: postDescriptionFx.done,
  source: {
    coreTx: $coreTx,
    wrappedTx: $tx,
    multisigAccount: formModel.$multisigAccount,
    description: formModel.$description,
  },
  filter: ({ multisigAccount, description }) => nonNullable(multisigAccount) && description.length > 0,
  fn: ({ coreTx, wrappedTx, multisigAccount, description }, { params: { blockNumber, extrinsicIndex } }) => {
    const multisigAccountId = multisigService.getMultisigAccountId(multisigAccount!);
    // Must match multisigOperationService.getOperationId format:
    // `${chainId}-${callHash}-${accountId}-${block}-${index}`
    const id = `${coreTx!.chainId}-${wrappedTx!.args.callHash}-${multisigAccountId}-${blockNumber}-${extrinsicIndex}`;

    return { id, description };
  },
  target: operationDescriptionsResource.descriptionCreated,
});
```

Note: The operation ID format matches `multisigOperationService.getOperationId()`: `${chainId}-${callHash}-${accountId}-${block}-${index}`. The optimistic update is best-effort — the next batch fetch will reconcile if the ID doesn't match.

- [ ] **Step 4: Verify types compile**

Run: `pnpm types:go`

- [ ] **Step 5: Commit model updates**

```bash
git add src/renderer/features/multisig-operations/model/approve-model.ts src/renderer/features/transfer/model/transfer-model.ts
git commit -m "refactor: use operationsService from domains/backend in approve and transfer models"
```

---

## Task 10: Update `OperationDetails.tsx` and `Operations.tsx` — use hooks

**Files:**
- Modify: `src/renderer/features/multisig-operations/components/OperationDetails.tsx`
- Modify: `src/renderer/features/multisig-operations/components/Operations.tsx`

- [ ] **Step 1: Update `OperationDetails.tsx`**

Replace:
```typescript
import { operationDescriptionsModel } from '../model/operation-descriptions-model';
```
With:
```typescript
import { useOperationDescription } from '@/domains/backend';
```

Replace the `useStoreMap` block:
```typescript
  const description = useStoreMap({
    store: operationDescriptionsModel.$descriptions,
    keys: [operation.id],
    fn: (descriptions, [id]) => descriptions[id] ?? null,
  });
```
With:
```typescript
  const description = useOperationDescription(operation.id);
```

Also remove `useStoreMap` from the effector-react import if it's no longer used:
```typescript
import { useUnit } from 'effector-react';
```

- [ ] **Step 2: Update `Operations.tsx` — add batch fetch hook**

Add imports:
```typescript
import { useOperationDescriptionsFetch } from '@/domains/backend';
import { authModel, backendConfigurationModel } from '@/aggregates/backend';
```

Inside the `Operations` component, after the existing `useUnit` calls, add:
```typescript
  const baseUrl = useUnit(backendConfigurationModel.$backendUrl);
  const isAuthenticated = useUnit(authModel.$isAuthenticated);

  const operationIds = useMemo(
    () => filteredOps.map(({ operation }) => operation.id),
    [filteredOps],
  );

  useOperationDescriptionsFetch(isAuthenticated ? baseUrl : null, operationIds);
```

- [ ] **Step 3: Verify types compile**

Run: `pnpm types:go`

- [ ] **Step 4: Commit component updates**

```bash
git add src/renderer/features/multisig-operations/components/OperationDetails.tsx src/renderer/features/multisig-operations/components/Operations.tsx
git commit -m "refactor: use operation description hooks from domains/backend"
```

---

## Task 11: Rewrite tests (before deletions)

Test rewrite must happen BEFORE deleting old files, because the old test file imports from paths that will be removed.

**Files:**
- Modify: `src/renderer/features/multisig-operations/model/operation-descriptions-model.test.ts`

- [ ] **Step 1: Rewrite `operation-descriptions-model.test.ts`**

The old test tested the hand-rolled Effector model. The new test tests the `createQueryResource`. Replace the file contents with:

```typescript
import { allSettled, fork } from 'effector';
import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { backendConfigurationModel } from '@/aggregates/backend';
import * as backendDomain from '@/domains/backend';
import { operationDescriptionsResource } from '@/domains/backend';

describe('operationDescriptionsResource', () => {
  let fetchSpy: MockInstance;

  beforeEach(() => {
    fetchSpy = vi.spyOn(backendDomain.operationsService, 'fetchDescriptionsByIds').mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should store descriptions from fetch results', async () => {
    fetchSpy.mockResolvedValue([
      { id: 'op-1', description: 'Test description' },
      { id: 'op-2', description: null },
    ]);

    const scope = fork();

    await allSettled(operationDescriptionsResource.start, {
      scope,
      params: { baseUrl: 'https://backend.test', ids: ['op-1', 'op-2'] },
    });

    expect(scope.getState(operationDescriptionsResource.$cache)).toEqual({
      'op-1': 'Test description',
    });
  });

  it('should merge descriptions from multiple fetches', async () => {
    fetchSpy.mockResolvedValueOnce([{ id: 'op-1', description: 'First' }]);

    const scope = fork();

    await allSettled(operationDescriptionsResource.start, {
      scope,
      params: { baseUrl: 'https://backend.test', ids: ['op-1'] },
    });

    fetchSpy.mockResolvedValueOnce([{ id: 'op-2', description: 'Second' }]);

    await allSettled(operationDescriptionsResource.start, {
      scope,
      params: { baseUrl: 'https://backend.test', ids: ['op-2'] },
    });

    expect(scope.getState(operationDescriptionsResource.$cache)).toEqual({
      'op-1': 'First',
      'op-2': 'Second',
    });
  });

  it('should optimistically update cache on descriptionCreated', async () => {
    const scope = fork();

    await allSettled(operationDescriptionsResource.descriptionCreated, {
      scope,
      params: { id: 'op-new', description: 'Optimistic' },
    });

    expect(scope.getState(operationDescriptionsResource.$cache)).toEqual({
      'op-new': 'Optimistic',
    });
  });

  it('should clear cache on resetDescriptions', async () => {
    const scope = fork({
      values: new Map().set(operationDescriptionsResource.$cache, { 'op-1': 'desc' }),
    });

    await allSettled(operationDescriptionsResource.resetDescriptions, { scope });

    expect(scope.getState(operationDescriptionsResource.$cache)).toEqual({});
  });

  it('should clear cache when urlCleared fires', async () => {
    const scope = fork({
      values: new Map().set(operationDescriptionsResource.$cache, { 'op-1': 'desc' }),
    });

    await allSettled(backendConfigurationModel.events.urlCleared, { scope });

    expect(scope.getState(operationDescriptionsResource.$cache)).toEqual({});
  });
});
```

- [ ] **Step 2: Run all tests**

Run: `pnpm test`
Expected: All tests pass.

- [ ] **Step 3: Run linter and type check**

Run: `pnpm lint && pnpm types:go`
Expected: No errors.

- [ ] **Step 4: Run lint:fix for import order**

Run: `pnpm lint:fix`
Expected: Auto-fixes any import ordering issues.

- [ ] **Step 5: Commit tests**

```bash
git add -A
git commit -m "test: rewrite operation descriptions tests for createQueryResource"
```

---

## Task 12: Delete old files

**Files to delete:**
- `src/renderer/domains/api/` (entire directory)
- `src/renderer/aggregates/backend-auth/` (entire directory)
- `src/renderer/features/contacts/BackendContacts/api/backend-contacts-api.ts`
- `src/renderer/features/multisig-operations/model/operation-descriptions-model.ts`

- [ ] **Step 1: Delete old domains/api**

```bash
rm -rf src/renderer/domains/api/
```

- [ ] **Step 2: Delete old aggregates/backend-auth**

```bash
rm -rf src/renderer/aggregates/backend-auth/
```

- [ ] **Step 3: Delete old contacts API file**

```bash
rm src/renderer/features/contacts/BackendContacts/api/backend-contacts-api.ts
```

- [ ] **Step 4: Delete old operation-descriptions-model**

```bash
rm src/renderer/features/multisig-operations/model/operation-descriptions-model.ts
```

- [ ] **Step 5: Verify types compile**

Run: `pnpm types:go`
Expected: No errors. All imports now point to new locations.

- [ ] **Step 6: Run linter**

Run: `pnpm lint`
Expected: No new errors.

- [ ] **Step 7: Commit deletions**

```bash
git add -A
git commit -m "refactor: delete old domains/api, aggregates/backend-auth, and moved files"
```

---

## Task 13: Final verification

- [ ] **Step 1: Full test suite**

Run: `pnpm test`
Expected: All tests pass.

- [ ] **Step 2: Type check**

Run: `pnpm types:go`
Expected: No errors.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: No errors.

- [ ] **Step 4: Verify no dangling imports**

Run: `grep -r "domains/api" src/renderer/ --include="*.ts" --include="*.tsx"` — should return nothing.
Run: `grep -r "aggregates/backend-auth" src/renderer/ --include="*.ts" --include="*.tsx"` — should return nothing.
Run: `grep -r "backend-contacts-api" src/renderer/ --include="*.ts" --include="*.tsx"` — should return nothing.
Run: `grep -r "operation-descriptions-model" src/renderer/ --include="*.ts" --include="*.tsx"` — should return nothing (the test file was rewritten, not importing the old model).

- [ ] **Step 5: Verify app starts**

Run: `pnpm start`
Expected: App starts without errors. Check browser console for any runtime import failures.
