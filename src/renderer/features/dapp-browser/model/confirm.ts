import { type ExtrinsicConfirmInfo, createExtrinsicConfirmStore } from '@/shared/transactions';
import { walletModel } from '@/entities/wallet';

export type ConfirmInput = ExtrinsicConfirmInfo & {
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
