import { ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';

import { Button, Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Explorer } from '@renderer/domain/chain';
import { ChainId } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import TransactionInfo from '../../components/TransactionInfo/TransactionInfo';
import { AccountWithAmount } from '../types';

type Props = {
  api?: ApiPromise;
  chainId: ChainId;
  accounts: AccountWithAmount[];
  asset: Asset;
  explorers?: Explorer[];
  addressPrefix: number;
  onResult: (transactions: Transaction[]) => void;
};

const Confirmation = ({ api, chainId, accounts, asset, explorers, addressPrefix, onResult }: Props) => {
  const { t } = useI18n();

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const newTransactions = accounts.map(({ accountId = '' }) => ({
      chainId,
      address: accountId,
      type: TransactionType.REDEEM,
      args: {
        numSlashingSpans: 1,
      },
    }));

    setTransactions(newTransactions);
  }, [accounts.length]);

  if (!api) {
    return null;
  }

  return (
    <TransactionInfo
      api={api}
      accounts={accounts}
      asset={asset}
      explorers={explorers}
      addressPrefix={addressPrefix}
      transactions={transactions}
    >
      <div className="flex flex-col items-center gap-y-2.5 mt-2.5">
        <Button
          variant="fill"
          pallet="primary"
          weight="lg"
          suffixElement={<Icon name="qrLine" size={20} />}
          onClick={() => onResult(transactions)}
        >
          {t('staking.confirmation.signButton')}
        </Button>

        {/* TODO: implement in future */}
        {/*<Button*/}
        {/*  variant="outline"*/}
        {/*  pallet="primary"*/}
        {/*  weight="lg"*/}
        {/*  suffixElement={<Icon name="addLine" size={20} />}*/}
        {/*  onClick={addToQueue}*/}
        {/*>*/}
        {/*  {t('staking.confirmation.queueButton')}*/}
        {/*</Button>*/}
      </div>
    </TransactionInfo>
  );
};

export default Confirmation;
