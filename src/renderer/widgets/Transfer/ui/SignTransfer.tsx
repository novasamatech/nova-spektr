import { useUnit } from 'effector-react';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';

import type { HexString } from '@shared/core';
import { Signing } from '@features/operation';
import { signModel } from '../model/sign-model';

type Props = {
  onGoBack: () => void;
};

export const SignTransfer = ({ onGoBack }: Props) => {
  const api = useUnit(signModel.$api);
  const signStore = useUnit(signModel.$signStore);
  const signerWallet = useUnit(signModel.$signerWallet);

  if (!api || !signStore || !signerWallet) return null;

  const onSignResult = (signatures: HexString[], unsignedTxs: UnsignedTransaction[]) => {
    signModel.events.dataReceived({
      signature: signatures[0],
      unsignedTx: unsignedTxs[0],
    });
  };

  return (
    <Signing
      api={api}
      chainId={signStore.chain.chainId}
      addressPrefix={signStore.chain.addressPrefix}
      signerWaller={signerWallet}
      accounts={[signStore.account]}
      signatory={signStore.signatory || undefined}
      transactions={[signStore.transaction]}
      onGoBack={onGoBack}
      onResult={onSignResult}
    />
  );
};
