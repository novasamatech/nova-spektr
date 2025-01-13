import { type Feature } from './createFeature';

export const registerFeatures = (features: Feature<unknown>[]) => {
  for (const feature of features) {
    feature.startIfNecessary();
  }

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
      // eslint-disable-next-line effector/no-getState
      const message = `${feature.name.split('/').at(1) ?? 'unknown'}${feature.status.getState() !== 'idle' ? ' | started' : ''}`;

      console.log(message);
    }
    console.groupEnd();
  }
  console.groupEnd();
};
