import { type Event, createEffect, createEvent, createStore, sample } from 'effector';
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
  callback?: (takenKeys: string[]) => void;
}

export interface UrlState {
  params: Record<string, unknown>;
}

export interface HandlerResult<T = unknown> {
  matched: boolean;
  data?: T;
  remainingParams: Record<string, unknown>;
}

const setDeepLink = createEvent<DeepLink>();

// Store for URL update callback
const $urlUpdateCallback = createStore<((takenKeys: string[]) => void) | null>(null);

const $deepLink = createStore<UrlState | null>(null).on(setDeepLink, (_, { searchParams }) => {
  const params: Record<string, string> = {};
  // eslint-disable-next-line no-restricted-syntax
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return { params };
});

$urlUpdateCallback.on(setDeepLink, (_, { callback }) => callback || null);

interface HandlerEntry {
  id: string;
  schema: z.ZodType;
  trigger: (data: unknown) => void;
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
  takenKeys: string[];
}>();

const callUrlUpdateCallbackFx = createEffect(
  (params: { takenKeys: string[]; callback: ((takenKeys: string[]) => void) | null }) => {
    if (params.callback) {
      params.callback(params.takenKeys);
    }
  },
);

// Store for registered handlers chain
const $handlers = createStore<HandlerEntry[]>([])
  .on(handlerRegistered, (handlers, handler) => [...handlers, handler])
  .on(handlersCleared, (handlers, idsToRemove) => handlers.filter((h) => !idsToRemove.includes(h.id)));

const $pendingDeepLink = createStore<UrlState | null>(null)
  .on($deepLink, (_, deepLink) => deepLink)
  .reset(pendingDeepLinkProcessed);

sample({
  clock: setDeepLink,
  source: { deepLink: $deepLink, handlers: $handlers },
  filter: ({ deepLink, handlers }) => nonNullable(deepLink) && handlers.length > 0,
  fn: ({ deepLink }) => deepLink!,
  target: deepLinkReceived,
});

const pendingDeepLinkFound = sample({
  clock: handlerRegistered,
  source: $pendingDeepLink,
  filter: (pending): pending is UrlState => pending !== null,
});

sample({
  clock: pendingDeepLinkFound,
  target: [deepLinkReceived, pendingDeepLinkProcessed],
});

sample({
  clock: deepLinkReceived,
  source: $handlers,
  fn: (handlers, urlState) => {
    const originalKeys = Object.keys(urlState.params);
    let remainingParams = { ...urlState.params };
    const matchedHandlers: MatchedHandler[] = [];

    for (const handler of handlers) {
      const result = extractParams(remainingParams, handler.schema);
      if (result.matched && result.data) {
        matchedHandlers.push({ id: handler.id, data: result.data });
        remainingParams = result.remainingParams;
      }
    }

    const remainingKeys = Object.keys(remainingParams);
    const takenKeys = originalKeys.filter((key) => !remainingKeys.includes(key));

    return { remainingParams, matchedHandlers, takenKeys };
  },
  target: paramsProcessed,
});

const triggerHandlersFx = createEffect<{ handler: HandlerEntry; data: unknown }[], string[]>((items) => {
  const triggeredIds: string[] = [];
  for (const item of items) {
    item.handler.trigger(item.data);
    triggeredIds.push(item.handler.id);
  }
  return triggeredIds;
});

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
  target: triggerHandlersFx,
});

sample({
  clock: triggerHandlersFx.doneData,
  target: handlersCleared,
});

sample({
  clock: paramsProcessed,
  source: $urlUpdateCallback,
  fn: (callback, { takenKeys }) => ({ takenKeys, callback }),
  target: callUrlUpdateCallbackFx,
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
    validate: (data: unknown) => schema.parse(data),
    triggered,
  };
}

export function extractParams<T extends z.ZodType>(
  params: Record<string, unknown>,
  schema: T,
): HandlerResult<z.infer<T>> {
  try {
    const parsed = schema.parse(params);
    const parsedKeys = Object.keys(parsed as Record<string, unknown>);
    const remainingParams = { ...params };

    for (const key of parsedKeys) {
      delete remainingParams[key];
    }

    return {
      matched: true,
      data: parsed,
      remainingParams,
    };
  } catch {
    return {
      matched: false,
      remainingParams: params,
    };
  }
}

export function processDeepLinkChain<T extends z.ZodType>(
  params: Record<string, unknown>,
  handlers: { schema: T; onMatch: (data: z.infer<T>) => void }[],
): Record<string, unknown> {
  let remainingParams = { ...params };

  for (const { schema, onMatch } of handlers) {
    const result = extractParams(remainingParams, schema);
    if (result.matched && result.data) {
      onMatch(result.data);
      remainingParams = result.remainingParams;
    }
  }

  return remainingParams;
}

type EventTrigger = (payload: unknown) => void;

export const deepLinkService = {
  handleDeepLink: setDeepLink,
  registerHandler: <T>(handler: DeepLinkHandler<T>) => {
    const { triggered } = handler;
    handlerRegistered({
      id: handler.id,
      schema: handler.schema,
      trigger: ((data: unknown) => {
        // ToDo: resolve types
        (triggered as EventTrigger)(data);
      }) satisfies (data: unknown) => void,
    });
  },
};
