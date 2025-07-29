import { createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { type AnyAccount } from '@/domains/network';

const SignerGate = createGate<AnyAccount | null>({ defaultState: null });

const $signer = createStore<AnyAccount | null>(null);

sample({
  clock: SignerGate.state,
  target: $signer,
});

export const operationSignModel = {
  SignerGate,
  $signer,
};
