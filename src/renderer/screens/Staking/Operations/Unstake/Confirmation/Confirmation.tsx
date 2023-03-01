import { ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';

import { Button, HintList, Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Explorer } from '@renderer/domain/chain';
import { ChainId } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { AccountDS } from '@renderer/services/storage';
import TransactionInfo from '../../components/TransactionInfo/TransactionInfo';
import { UnstakingDuration } from '@renderer/screens/Staking/Overview/components';
import { formatAddress } from '@renderer/shared/utils/address';
import { StakingMap } from '@renderer/services/staking/common/types';

type Props = {
  api?: ApiPromise;
  chainId: ChainId;
  staking: StakingMap;
  accounts: AccountDS[];
  unstake: string;
  asset: Asset;
  explorers?: Explorer[];
  addressPrefix: number;
  onResult: (transactions: Transaction[]) => void;
};

const Confirmation = ({
  api,
  chainId,
  accounts,
  unstake,
  staking,
  asset,
  explorers,
  addressPrefix,
  onResult,
}: Props) => {
  const { t } = useI18n();

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const newTransactions = accounts.map(({ accountId = '' }) => {
      const address = formatAddress(accountId, addressPrefix);
      const commonPayload = { chainId, address };

      const chillTx = {
        ...commonPayload,
        type: TransactionType.CHILL,
        args: {},
      };

      const unstakeTx = {
        ...commonPayload,
        type: TransactionType.UNSTAKE,
        args: {
          value: unstake,
        },
      };

      const isFullUnstake = staking[accountId]?.active === unstake;

      return isFullUnstake
        ? {
            ...commonPayload,
            type: TransactionType.BATCH_ALL,
            args: { transactions: [chillTx, unstakeTx] },
          }
        : unstakeTx;
    });

    setTransactions(newTransactions);
  }, []);

  if (!api) {
    return null;
  }

  return (
    <TransactionInfo
      api={api}
      accounts={accounts}
      amount={unstake}
      asset={asset}
      explorers={explorers}
      addressPrefix={addressPrefix}
      transactions={transactions}
    >
      <HintList className="mt-2.5 mb-5 px-[15px]">
        <HintList.Item>
          {t('staking.unstake.durationHint')} {'('}
          <UnstakingDuration className="ml-1" api={api} />
          {')'}
        </HintList.Item>
        <HintList.Item>{t('staking.unstake.noRewardsHint')}</HintList.Item>
        <HintList.Item>{t('staking.unstake.redeemHint')}</HintList.Item>
      </HintList>

      <div className="flex flex-col items-center gap-y-2.5">
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
