import { MultisigTransaction } from '@renderer/domain/transaction';
import TokenBalance from '@renderer/components/common/TokenBalance/TokenBalance';
import { ExtendedChain } from '@renderer/services/network/common/types';

type Props = {
  tx: MultisigTransaction;
  connection?: ExtendedChain;
};

const ShortTransactionInfoNew = ({ tx, connection }: Props) => {
  const { deposit } = tx;
  const defaultAsset = connection?.assets[0];

  if (deposit && defaultAsset) {
    return <TokenBalance value={deposit} asset={defaultAsset} />;
  }

  return null;
};

export default ShortTransactionInfoNew;
