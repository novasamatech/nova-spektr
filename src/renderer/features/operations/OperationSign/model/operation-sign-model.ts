import { createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { type Account } from '@/shared/core';

const SignerGate = createGate<Account | null>({ defaultState: null });

const $signer = createStore<Account | null>(null);

sample({
  clock: SignerGate.state,
  target: $signer,
});

export const operationSignModel = {
  SignerGate,
  $signer,
};
