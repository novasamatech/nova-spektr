import { type ExtrinsicConfirmInfo, createExtrinsicConfirmStore } from '@/shared/transactions';
import { type Extrinsic } from '@/domains/network';
import { walletModel } from '@/entities/wallet';

export type ConfirmInput = ExtrinsicConfirmInfo & {
  extrinsic: Extrinsic;
  args: object;
};

const store = createExtrinsicConfirmStore<ConfirmInput>({
  wallets: walletModel.$wallets,
});

export const confirmModel = {
  $confirms: store.$confirms,
  init: store.init,
  startSigning: store.startSigning,
};
