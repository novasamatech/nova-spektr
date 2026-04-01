# Backend API Layer Refactoring

## Problem

The backend API layer has three overlapping modules with unclear boundaries:

- **`domains/api/`** — meaningless name, mixes auth and operations endpoints in one flat domain.
- **`shared/api/backend-fetch/`** — HTTP transport (CSRF, Electron proxy). Correct layer, but its exports leak through the aggregate barrel.
- **`aggregates/backend-auth/`** — re-exports transport primitives (`authFetch`, `parseResponse`) alongside auth models. Consumers import low-level transport through a high-level aggregate.

Additional issues:

- Contacts API lives in `features/contacts/BackendContacts/api/` — wrong layer for an API client.
- Operation descriptions are fetched via a hand-rolled debounce/sample/effect pipeline instead of `createQueryResource`.
- `fetchOperations` (paginated list of all operations) is exported but never consumed — dead code.

## Target Architecture

```
shared/api/backend-fetch/              -- HTTP transport [UNCHANGED]
  backend-fetch.ts                        authFetch, parseResponse, CSRF token mgmt
  index.ts

domains/backend/                       -- Backend API domain (replaces domains/api/)
  index.ts                                barrel exports
  auth/
    service.ts                            backendAuthService (challenge, verify, session, logout)
  operations/
    service.ts                            operationsService (createDescription, fetchDescriptionsByIds)
    resource.ts                           createQueryResource for description reads
    hooks.ts                              useOperationDescriptionsFetch, useOperationDescription
  contacts/
    service.ts                            backendContactsService (fetchAllContacts, HttpError)

aggregates/backend/                    -- Auth orchestration + URL config (replaces backend-auth/)
  index.ts                                exports authModel, backendConfigurationModel
  model/
    auth-model.ts                         sign-in flow, session management
    backend-configuration-model.ts        URL preference, health check
  lib/
    sign-message.ts                       buildSignMessage utility
```

### Import Direction

```
shared/api/backend-fetch
       ^
domains/backend  (services import authFetch from shared)
       ^
aggregates/backend  (auth-model imports backendAuthService from domain)
       ^
features  (import models from aggregate, services/hooks from domain)
```

No circular dependencies. Transport is hidden behind domain services for all data operations. One exception: `backend-configuration-model.ts` imports `authFetch` from shared directly for the `/health` endpoint check — this is acceptable since aggregates can import from shared, and creating a domain service just for a health ping would be over-engineering.

## Domain: `domains/backend/`

### `auth/service.ts`

Moved from `domains/api/auth.ts`. Exports named service object and types:

```typescript
export const backendAuthService = { requestChallenge, verifySignature, checkSession, logout };
export type { ChallengeResponse, VerifyResponse, SessionResponse };
```

Imports `authFetch`, `parseResponse` from `@/shared/api/backend-fetch`. Zod schemas for response validation.

### `contacts/service.ts`

Moved from `features/contacts/BackendContacts/api/backend-contacts-api.ts`. Same code, only the import of `authFetch` changes from `@/aggregates/backend-auth` to `@/shared/api/backend-fetch`.

```typescript
export const backendContactsService = { fetchAllContacts };
export { HttpError };
```

Schemas, pagination, `mapToContact` helper all move with it.

### `operations/service.ts`

Moved from `domains/api/operations.ts`. Dead code (`fetchOperations`, `fetchOperationsPage`) removed.

```typescript
export const operationsService = { createDescription, fetchDescriptionsByIds };
```

- `createDescription` — POST `/operations` (write path, fire-and-forget mutation).
- `fetchDescriptionsByIds` — POST `/operations/by-ids` (read path, used by resource).

### `operations/resource.ts`

Replaces the hand-rolled `operation-descriptions-model.ts` with `createQueryResource`:

```typescript
type DescriptionsParams = { baseUrl: string; ids: string[] };

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
        if (op.description) next[op.id] = op.description;
      }
      return next;
    },
  })
  .build();

// Optimistic cache update after creating a description
const descriptionCreated = createEvent<{ id: string; description: string }>();
$cache.on(descriptionCreated, (state, { id, description }) => ({ ...state, [id]: description }));

// Reset cache (wired externally to urlCleared / sign-out)
const resetDescriptions = createEvent();
$cache.on(resetDescriptions, () => ({}));

export const operationDescriptionsResource = {
  ...resource,
  descriptionCreated,
  resetDescriptions,
  $cache: readonly($cache),
};
```

Design decisions:

- **Key includes sorted IDs as a joined string.** When new operations appear, the key changes, triggering a fresh fetch. Joining into a single string keeps the key compact. The merge cache strategy accumulates results — nothing is lost.
- **`staleAfter: 5 min`.** Same ID set won't re-fetch within 5 minutes (handles component remounts).
- **Merge, don't replace.** `map` spreads new results into existing state so each fetch adds to the cache.
- **`descriptionCreated` event.** Defined in `resource.ts`, exported on the resource object. Features fire it after a successful `createDescription` call. Type: `{ id: string; description: string }`. Wired to `$cache` with an `.on` handler that merges the new entry, so the UI reflects new descriptions without re-fetching.
- **`resetDescriptions` event.** Defined in `resource.ts`, exported on the resource object. Clears the cache store. Wired by the aggregate to `backendConfigurationModel.events.urlCleared`.
- **No persistence.** The current model uses `persist` for `$descriptions`, but descriptions are cheap to re-fetch and always available from the backend while authenticated. Dropping persistence simplifies the resource and avoids serving stale data from a previous session. This is an intentional behavioral change.
- **Hooks in domains.** `hooks.ts` uses `useResource` and `useStoreMap` from `effector-react`. This follows the established precedent at `domains/governance/tracks/hooks.ts`, which CLAUDE.md cites as the reference implementation for the query resource pattern.
- **`cache.map` arity.** The actual signature is `(cache, result, params)`. The third argument is included but unused (`_params`) for correctness.

### `operations/hooks.ts`

Two hooks for different consumers:

```typescript
// Batch fetch — called by Operations list to populate cache
export const useOperationDescriptionsFetch = (baseUrl: string | null, ids: string[]) => {
  return useResource(operationDescriptionsResource, {
    params: baseUrl && ids.length > 0 ? { baseUrl, ids } : null,
    defaultValue: {},
    map: (cache) => cache,
  });
};

// Single read — called by OperationDetails to read from cache
export const useOperationDescription = (operationId: string): string | null => {
  return useStoreMap({
    store: operationDescriptionsResource.$cache,
    keys: [operationId],
    fn: (cache, [id]) => cache[id] ?? null,
  });
};
```

The list component triggers the batch fetch. Individual detail components read from the accumulated cache via `useStoreMap`. No N+1 problem.

### Barrel: `domains/backend/index.ts`

```typescript
export { backendAuthService } from './auth/service';
export type { ChallengeResponse, SessionResponse, VerifyResponse } from './auth/service';
export { operationsService } from './operations/service';
export { operationDescriptionsResource } from './operations/resource';
export { useOperationDescriptionsFetch, useOperationDescription } from './operations/hooks';
export { backendContactsService, HttpError } from './contacts/service';
```

## Aggregate: `aggregates/backend/`

### What changes

- **Renamed** from `aggregates/backend-auth/` to `aggregates/backend/`.
- **Transport re-exports removed.** `index.ts` no longer re-exports `authFetch`, `parseResponse`, `FetchResult`, `clearCsrfToken`, `getCsrfToken`.
- **`auth-model.ts`** imports `backendAuthService` from `@/domains/backend` instead of `* as authApi` from `@/domains/api`.
- **`backend-auth-sign.ts`** renamed to **`sign-message.ts`**.
- **Cache reset wiring**: the aggregate wires `urlCleared` to the operation descriptions resource reset.

### New `index.ts`

```typescript
export { type SignableAccount, authModel } from './model/auth-model';
export { backendConfigurationModel } from './model/backend-configuration-model';
```

Two exports. No transport leakage.

### Cache wiring

```typescript
// aggregates/backend/init.ts (imported from index.ts for side-effect execution)
import { sample } from 'effector';
import { operationDescriptionsResource } from '@/domains/backend';
import { backendConfigurationModel } from './model/backend-configuration-model';

sample({
  clock: backendConfigurationModel.events.urlCleared,
  target: operationDescriptionsResource.resetDescriptions,
});
```

## Feature Changes

### `features/contacts/BackendConfiguration/`

Import path changes only. All UI files and storybook files change `@/aggregates/backend-auth` to `@/aggregates/backend`:
- `ui/AuthStatus.tsx`, `ui/AuthStatus.stories.tsx`
- `ui/BackendConfigurationButton.tsx`
- `ui/BackendConfigurationModal.tsx`, `ui/BackendConfigurationModal.stories.tsx`
- `ui/BackendConnectionCard.tsx`, `ui/BackendConnectionCard.stories.tsx`
- `index.ts` (re-export barrel)

### `features/contacts/BackendContacts/`

- `api/backend-contacts-api.ts` **deleted** (moved to domain).
- `model/backend-contacts-model.ts` imports `backendContactsService` from `@/domains/backend` and models from `@/aggregates/backend`.

### `features/contacts/ContactFilter/`

Import path change: `@/aggregates/backend-auth` to `@/aggregates/backend`.

### `features/multisig-operations/`

- `model/operation-descriptions-model.ts` **deleted** (replaced by domain resource).
- `model/operation-descriptions-model.test.ts` rewritten to test the domain resource.
- `components/Operations.tsx` calls `useOperationDescriptionsFetch(baseUrl, operationIds)` to trigger the batch fetch. Gets `baseUrl` from `useUnit(backendConfigurationModel.$backendUrl)` and `isAuthenticated` from `useUnit(authModel.$isAuthenticated)`.
- `components/OperationDetails.tsx` calls `useOperationDescription(operation.id)` instead of `useStoreMap` on the deleted model.
- `components/ActionSteps/Submit.tsx` imports `operationsService` from `@/domains/backend` (replaces import from aggregate). Fires `operationDescriptionsResource.descriptionCreated` after successful creation.
- `components/ApproveForm.tsx` import path change: `@/aggregates/backend-auth` to `@/aggregates/backend`.
- `model/approve-model.ts` import path changes for auth model.

### `features/transfer/`

- `model/transfer-model.ts` calls `operationsService.createDescription` from `@/domains/backend`. On success, fires `operationDescriptionsResource.descriptionCreated` for optimistic cache update. Replaces `postDescriptionFx` and `showDescriptionErrorFx`.
- `ui/TransferForm.tsx` import path change: `@/aggregates/backend-auth` to `@/aggregates/backend`.

## Data Flow

### Read (descriptions)

```
Operations component
  -- useOperationDescriptionsFetch(baseUrl, allIds)
  -- useResource -> resource.start()
  -- POST /operations/by-ids -> Zod validation
  -- $cache merges: { ...existing, [id]: description }

OperationDetails component
  -- useOperationDescription(id)
  -- useStoreMap on $cache -> description | null
```

### Write (new description)

```
TransferForm / ApproveForm (user types description)
  -- formModel.$description / approveModel.$description

On successful tx submit:
  -- operationsService.createDescription(baseUrl, params) -> POST /operations
  -- On success: fire descriptionCreated({ id, description })
  -- $cache updated optimistically -> UI shows immediately
  -- On failure: toast.error (non-blocking)
```

### Auth (unchanged internally)

```
shared/api/backend-fetch        <- transport
domains/backend/auth/service    <- API client
aggregates/backend/auth-model   <- orchestration
features/.../BackendConfiguration/ui <- UI
```

## Deletions

| Path | Reason |
|------|--------|
| `domains/api/` (entire dir) | Replaced by `domains/backend/` |
| `aggregates/backend-auth/` (entire dir) | Replaced by `aggregates/backend/` |
| `features/contacts/BackendContacts/api/backend-contacts-api.ts` | Moved to `domains/backend/contacts/` |
| `features/multisig-operations/model/operation-descriptions-model.ts` | Replaced by domain resource + hooks |
| `features/multisig-operations/model/operation-descriptions-model.test.ts` | Rewritten for new resource |
| `fetchOperations` / `fetchOperationsPage` in operations service | Dead code |
| Transport re-exports from aggregate barrel | Leaky abstraction |

## Testing

- Existing tests for `backend-contacts-model` and `contact-source-model` update import paths.
- `operation-descriptions-model.test.ts` rewritten to test the resource (fork scope with cache store, mock `operationsService.fetchDescriptionsByIds`).
- Auth model tests (if any) update import for `backendAuthService`.
- Run `pnpm test`, `pnpm lint`, `pnpm types:go` to verify.
