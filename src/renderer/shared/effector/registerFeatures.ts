import { type Feature } from './createFeature';

export const registerFeatures = (features: Feature<unknown>[]) => {
  // Basically groupBy
  const domains = features.reduce<Record<string, Feature<unknown>[]>>((acc, feature) => {
    const name = feature.name.split('/').at(0) ?? 'unknown';

    if (!acc[name]) {
      acc[name] = [];
    }

    acc[name].push(feature);

    return acc;
  }, {});

  const sorted = Object.entries(domains)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([domain, features]) => {
      return [domain, features.sort((a, b) => a.name.localeCompare(b.name))] as const;
    });

  console.groupCollapsed('Registered features');
  for (const [domain, features] of sorted) {
    console.groupCollapsed(domain);
    for (const feature of features) {
      console.log(feature.name.split('/').at(1) ?? 'unknown');
    }
    console.groupEnd();
  }
  console.groupEnd();
};
