import { type Event, createEvent, createStore, sample } from 'effector';
import { type z } from 'zod';

import { nonNullable } from '@/shared/lib/utils';

export interface DeepLinkHandler<T = any> {
  route: string;
  validate: (data: any) => T;
  triggered: Event<T>;
}

export interface DeepLink {
  pathname: string;
  searchParams: URLSearchParams;
}

export interface UrlState {
  pathname: string;
  params: Record<string, any>;
}

const setDeepLink = createEvent<DeepLink>();
const $deepLink = createStore<UrlState | null>(null).on(setDeepLink, (_, { pathname, searchParams }) => {
  const params: Record<string, string> = {};
  // eslint-disable-next-line no-restricted-syntax
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return { pathname, params };
});

const deepLinkReceived = createEvent<UrlState>();

sample({
  clock: setDeepLink,
  source: $deepLink,
  filter: nonNullable,
  target: deepLinkReceived,
});

export function createDeepLinkHandler<T extends z.ZodType>({
  route,
  schema,
}: {
  route: string;
  schema: T;
}): DeepLinkHandler<z.infer<T>> {
  type ParsedType = z.infer<T>;
  const triggered = createEvent<ParsedType>();

  // Subscribe to deep link events and trigger when route matches
  const routeMatched = sample({
    clock: deepLinkReceived,
    filter: (urlState) => urlState.pathname === route,
  });

  sample({
    clock: routeMatched,
    filter: (urlState) => {
      try {
        schema.parse(urlState.params);
        return true;
      } catch (error) {
        console.error(`Failing matching deeplink data schema for route ${route}:`, error);
        return false;
      }
    },
    fn: (urlState) => schema.parse(urlState.params) as ParsedType,
    target: triggered,
  });

  return {
    route,
    validate: (data: unknown) => {
      const parsed = schema.parse(data) as ParsedType;
      console.log({ parsed });
      return parsed;
    },
    triggered,
  };
}

export const deepLinkService = {
  handleDeepLink: setDeepLink,
  // ToDo: rm, but now it's used for module import
  // eslint-disable-next-line unused-imports/no-unused-vars
  registerHandler: (handler: DeepLinkHandler) => {},
};
