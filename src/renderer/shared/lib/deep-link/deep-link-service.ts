import { type Event, createEvent, createStore, sample } from 'effector';
import { type z } from 'zod';

import { nonNullable } from '@/shared/lib/utils';

export interface DeepLinkHandler<T = unknown> {
  id: string;
  schema: z.ZodType;
  validate: (data: unknown) => T;
  triggered: Event<T>;
}

export interface DeepLink {
  searchParams: URLSearchParams;
}

export interface UrlState {
  params: Record<string, any>;
}

export interface HandlerResult<T = any> {
  matched: boolean;
  data?: T;
  remainingParams: Record<string, any>;
}

const setDeepLink = createEvent<DeepLink>();
const $deepLink = createStore<UrlState | null>(null).on(setDeepLink, (_, { searchParams }) => {
  const params: Record<string, string> = {};
  // eslint-disable-next-line no-restricted-syntax
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return { params };
});

interface HandlerEntry {
  id: string;
  schema: z.ZodType;
  triggered: Event<unknown>;
}

interface MatchedHandler {
  id: string;
  data: unknown;
}

const deepLinkReceived = createEvent<UrlState>();
const handlerRegistered = createEvent<HandlerEntry>();
const handlersCleared = createEvent<string[]>();
const pendingDeepLinkProcessed = createEvent<UrlState>();

const paramsProcessed = createEvent<{
  remainingParams: Record<string, unknown>;
  matchedHandlers: MatchedHandler[];
}>();

// Store for registered handlers chain
const $handlers = createStore<HandlerEntry[]>([])
  .on(handlerRegistered, (handlers, handler) => {
    console.log('[Deep Link] Handler registered:', handler.id);
    return [...handlers, handler];
  })
  .on(handlersCleared, (handlers, idsToRemove) => {
    console.log('[Deep Link] Clearing handlers:', idsToRemove);
    return handlers.filter((h) => !idsToRemove.includes(h.id));
  });

// Store pending deep link if handlers aren't ready yet
const $pendingDeepLink = createStore<UrlState | null>(null)
  .on(setDeepLink, (_, deepLink) => {
    if (!deepLink) return null;
    const params: Record<string, string> = {};
    deepLink.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return { params };
  })
  .reset(pendingDeepLinkProcessed);

// Process deep link immediately if handlers are available
sample({
  clock: setDeepLink,
  source: { deepLink: $deepLink, handlers: $handlers },
  filter: ({ deepLink, handlers }) => nonNullable(deepLink) && handlers.length > 0,
  fn: ({ deepLink }) => deepLink!,
  target: deepLinkReceived,
});

// When a handler is registered, check if there's a pending deep link to process
sample({
  clock: handlerRegistered,
  source: $pendingDeepLink,
  filter: (pending): pending is UrlState => pending !== null,
}).watch((pendingDeepLink) => {
  console.log('[Deep Link] Processing pending deep link after handler registration');
  deepLinkReceived(pendingDeepLink);
  pendingDeepLinkProcessed(pendingDeepLink);
});

// Process deep link through chain of handlers (pure function - no event calls)
sample({
  clock: deepLinkReceived,
  source: $handlers,
  fn: (handlers, urlState) => {
    console.log('[Deep Link] Processing URL params:', urlState.params);
    console.log('[Deep Link] Handlers available:', handlers.length);
    let remainingParams = { ...urlState.params };
    const matchedHandlers: MatchedHandler[] = [];

    // Process through each registered handler
    for (const handler of handlers) {
      const result = extractParams(remainingParams, handler.schema);
      console.log(`[Deep Link] Handler ${handler.id} matched:`, result.matched);
      if (result.matched && result.data) {
        matchedHandlers.push({ id: handler.id, data: result.data });
        remainingParams = result.remainingParams;
      }
    }

    console.log('[Deep Link] Matched handlers:', matchedHandlers.length);
    return { remainingParams, matchedHandlers };
  },
  target: paramsProcessed,
});

// Event to signal handlers have been triggered
const handlersTriggered = createEvent<string[]>();

// Trigger each matched handler
sample({
  clock: paramsProcessed,
  source: $handlers,
  fn: (handlers, { matchedHandlers }) =>
    matchedHandlers
      .map(({ id, data }) => {
        const handler = handlers.find((h) => h.id === id);
        return handler ? { handler, data } : null;
      })
      .filter((item): item is { handler: HandlerEntry; data: unknown } => item !== null),
}).watch((items) => {
  // Triggering events is allowed in .watch()
  console.log('[Deep Link] Triggering', items.length, 'handlers');
  const triggeredIds: string[] = [];
  for (const { handler, data } of items) {
    console.log('[Deep Link] Triggering handler:', handler.id, 'with data:', data);
    (handler.triggered as unknown as (data: unknown) => void)(data);
    triggeredIds.push(handler.id);
  }
  // Clear handlers after triggering them
  handlersTriggered(triggeredIds);
});

// Clear handlers after they've been triggered
sample({
  clock: handlersTriggered,
  target: handlersCleared,
});

export interface DeepLinkHandlerConfig<T extends z.ZodType> {
  schema: T;
}

let handlerIdCounter = 0;

export function createDeepLinkHandler<T extends z.ZodType>({
  schema,
}: DeepLinkHandlerConfig<T>): DeepLinkHandler<z.infer<T>> {
  type ParsedType = z.infer<T>;
  const triggered = createEvent<ParsedType>();
  const id = `handler_${handlerIdCounter++}`;

  return {
    id,
    schema,
    validate: (data: unknown) => schema.parse(data) as ParsedType,
    triggered,
  };
}

/**
 * Gets the keys from a Zod schema
 */
function getSchemaKeys(schema: z.ZodType): string[] {
  // For ZodObject
  if ('shape' in schema && schema.shape) {
    return Object.keys(schema.shape);
  }

  // For ZodEffects (transformed schemas)
  if ('_def' in schema && schema._def) {
    const def = schema._def as any;
    if (def.schema) {
      return getSchemaKeys(def.schema);
    }
    if (def.shape) {
      return typeof def.shape === 'function' ? Object.keys(def.shape()) : Object.keys(def.shape);
    }
  }

  return [];
}

/**
 * Attempts to extract params matching the schema from the given params object.
 * Returns the extracted data and remaining params.
 */
export function extractParams<T extends z.ZodType>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: Record<string, any>,
  schema: T,
): HandlerResult<z.infer<T>> {
  const schemaKeys = getSchemaKeys(schema);

  // Extract only the params that match schema keys
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paramsToValidate: Record<string, any> = {};
  for (const key of schemaKeys) {
    if (key in params) {
      paramsToValidate[key] = params[key];
    }
  }

  try {
    const parsed = schema.parse(paramsToValidate);

    // Remove extracted params from the original params
    const remainingParams = { ...params };
    for (const key of schemaKeys) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete remainingParams[key];
    }

    return {
      matched: true,
      data: parsed as z.infer<T>,
      remainingParams,
    };
  } catch {
    return {
      matched: false,
      remainingParams: params,
    };
  }
}

/**
 * Processes URL params through a chain of handlers. Each handler extracts its
 * params and passes remaining params to the next handler.
 */
export function processDeepLinkChain<T extends z.ZodType>(
  params: Record<string, any>,
  handlers: Array<{ schema: T; onMatch: (data: z.infer<T>) => void }>,
): Record<string, any> {
  let remainingParams = { ...params };

  handlers.forEach(({ schema, onMatch }) => {
    const result = extractParams(remainingParams, schema);
    if (result.matched && result.data) {
      onMatch(result.data);
      remainingParams = result.remainingParams;
    }
  });

  return remainingParams;
}

export const deepLinkService = {
  handleDeepLink: setDeepLink,
  registerHandler: <T>(handler: DeepLinkHandler<T>) => {
    handlerRegistered({
      id: handler.id,
      schema: handler.schema,
      triggered: handler.triggered as Event<unknown>,
    });
  },
};
