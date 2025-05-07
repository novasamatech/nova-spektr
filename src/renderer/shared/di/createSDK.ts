import { type Feature } from '@/shared/feature';

import { type AnyIdentifier, type InferHandlerBody } from './types';

type SDK<Required extends Record<string, AnyIdentifier>, Optional extends Record<string, AnyIdentifier>> = (
  feature: Feature<any>,
  integrations: { [K in keyof Required]: InferHandlerBody<Required[K]> } & Partial<{
    [K in keyof Optional]: InferHandlerBody<Optional[K]>;
  }>,
) => void;

export const createSDK = <
  Required extends Record<string, AnyIdentifier>,
  Optional extends Record<string, AnyIdentifier>,
>({
  required,
  optional,
}: {
  required: Required;
  optional?: Optional;
}): SDK<Required, Optional> => {
  const requiredEntries = Object.entries(required);
  const optionalEntries = Object.entries(optional ?? {});

  return (feature, integrations) => {
    for (const [key, body] of Object.entries(integrations)) {
      for (const [identifierName, identifier] of requiredEntries) {
        if (key === identifierName) {
          feature.inject(identifier, body);
        }
      }
      for (const [identifierName, identifier] of optionalEntries) {
        if (key === identifierName) {
          feature.inject(identifier, body);
        }
      }
    }
  };
};
