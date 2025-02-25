import { type Feature } from '@/shared/feature';

import { type AnyIdentifier, type InferHandlerBody } from './types';

type SDK<T extends Record<string, AnyIdentifier>> = (
  feature: Feature<any>,
  integrations: { [K in keyof T]: InferHandlerBody<T[K]> },
) => void;

export const createSDK = <T extends Record<string, AnyIdentifier>>(identifiers: T): SDK<T> => {
  return (feature, integrations) => {
    for (const [key, body] of Object.entries(integrations)) {
      feature.inject(identifiers[key], body);
    }
  };
};
