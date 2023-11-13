import { createStore, forward } from 'effector';
import { createGate } from 'effector-react';

import type { Account } from '@shared/core';

const SignerGate = createGate<Account>('signer');

const $signer = createStore<Account | null>(null);

forward({
  from: SignerGate.state,
  to: $signer,
});

export const signModel = {
  SignerGate,
  $signer,
};
