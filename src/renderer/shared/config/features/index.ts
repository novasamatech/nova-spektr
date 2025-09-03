import { type UnitValue, combine, createEvent, createStore, sample } from 'effector';
import { persist } from 'effector-storage/local';
import { produce } from 'immer';

import { isDev } from '@/shared/lib/utils';

type Features = UnitValue<typeof $defaultFeatures>;

export const updateFeatureStatus = createEvent<[feature: string, status: boolean]>();
export const resetFeatureStatuses = createEvent();

export const $mutatedFeatures = createStore<Partial<Features>>({});
export const $defaultFeatures = createStore({
  assets: true,
  staking: true,
  governance: true,
  fellowship: true,
  importDB: isDev(),
  operations: true,
  basket: true,
  contacts: true,
  notifications: true,
  settings: true,

  multisig: true,
  flexibleMultisig: true,
  proxy: true,
  polkadotVault: true,
  walletConnect: true,
  watchOnly: true,
  ledger: true,
  extensionWallets: true,
  accountsStructure: true,
  multisigRemark: false,
  callData: true,
  hiddenWallets: true,
});

export const $features = combine($defaultFeatures, $mutatedFeatures, (base, extend) => ({ ...base, ...extend }));

persist({
  key: 'spektr_features_v1',
  store: $mutatedFeatures,
  sync: true,
});

sample({
  clock: updateFeatureStatus,
  source: { mutated: $mutatedFeatures, desired: $defaultFeatures },
  fn({ desired, mutated }, [key, value]) {
    return produce(mutated, (draft) => {
      const featureKey = key as keyof Features;

      if (key in desired) {
        if (desired[featureKey] === value) {
          delete draft[featureKey];
        } else {
          draft[featureKey] = value;
        }
      } else {
        delete draft[featureKey];
      }
    });
  },
  target: $mutatedFeatures,
});

sample({
  clock: resetFeatureStatuses,
  target: $mutatedFeatures.reinit,
});
