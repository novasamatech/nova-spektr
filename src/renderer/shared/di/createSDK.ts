import { type Feature } from '@/shared/feature';

import { type AnyIdentifier, type InferHandlerBody } from './types';

type SDK<T extends Record<string, AnyIdentifier>> = (
  feature: Feature<any>,
  integrations: { [K in keyof T]: InferHandlerBody<T[K]> },
) => void;

type Params<Required extends Record<string, AnyIdentifier>, Optional extends Record<string, AnyIdentifier>> = {
  required: Required;
  optional?: Optional;
};

export const createSDK = <
  Required extends Record<string, AnyIdentifier>,
  Optional extends Record<string, AnyIdentifier>,
>({
  required,
  optional,
}: Params<Required, Optional>): SDK<Required & Partial<Optional>> => {
  return (feature, integrations) => {
    for (const [key, body] of Object.entries(integrations)) {
      const identifier = required[key] || optional?.[key];
      if (identifier) {
        feature.inject(identifier, body);
      }
    }
  };
};
