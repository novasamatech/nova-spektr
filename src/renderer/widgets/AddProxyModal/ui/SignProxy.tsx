import { useUnit } from 'effector-react';

import { Signing } from '@features/operation';
import { addProxyModel } from '../model/add-proxy-model';
import { useNetworkData } from '@entities/network';

type Props = {
  onGoBack: () => void;
  onSubmit: () => void;
};

export const SignProxy = ({ onGoBack, onSubmit }: Props) => {
  const account = useUnit(addProxyModel.$account);
  const signatory = useUnit(addProxyModel.$signatory);
  const transaction = useUnit(addProxyModel.$transaction);

  const { api, chain } = useNetworkData(transaction!.chainId);

  if (!account || !transaction) return null;

  return (
    <Signing
      api={api}
      chainId={chain.chainId}
      addressPrefix={chain.addressPrefix}
      accounts={[account]}
      signatory={signatory || undefined}
      transactions={[transaction]}
      onGoBack={onGoBack}
      onResult={onSubmit}
    />
  );
};
