import { ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';

import { Button, HintList, Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Explorer } from '@renderer/domain/chain';
import { AccountID, ChainId } from '@renderer/domain/shared-kernel';
import { RewardsDestination } from '@renderer/domain/stake';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { Validator } from '@renderer/domain/validator';
import { AccountDS } from '@renderer/services/storage';
import { formatAddress } from '@renderer/shared/utils/address';
import TransactionInfo from '../../components/TransactionInfo/TransactionInfo';

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  validators: Validator[];
  accounts: AccountDS[];
  stake: string;
  destination: AccountID;
  asset: Asset;
  explorers?: Explorer[];
  addressPrefix: number;
  onResult: (transactions: Transaction[]) => void;
};

const Confirmation = ({
  api,
  chainId,
  validators,
  accounts,
  stake,
  destination,
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

      const bondTx = {
        ...commonPayload,
        type: TransactionType.BOND,
        args: {
          value: stake,
          controller: address,
          payee: destination ? { Account: destination } : 'Staked',
        },
      };

      const nominateTx = {
        ...commonPayload,
        type: TransactionType.NOMINATE,
        args: {
          targets: validators.map((validator) => validator.address),
        },
      };

      return {
        ...commonPayload,
        type: TransactionType.BATCH_ALL,
        args: { transactions: [bondTx, nominateTx] },
      };
    });

    setTransactions(newTransactions);
  }, []);

  const destPayload = destination
    ? { type: RewardsDestination.TRANSFERABLE, address: destination }
    : { type: RewardsDestination.RESTAKE };

  return (
    <TransactionInfo
      api={api}
      validators={validators}
      accounts={accounts}
      stake={stake}
      destination={destPayload}
      asset={asset}
      explorers={explorers}
      addressPrefix={addressPrefix}
      transactions={transactions}
    >
      <HintList className="mt-2.5 mb-5 px-[15px]">
        <HintList.Item>{t('staking.confirmation.hintRewards')}</HintList.Item>
        <HintList.Item>{t('staking.confirmation.hintUnstakePeriod')}</HintList.Item>
        <HintList.Item>{t('staking.confirmation.hintNoRewards')}</HintList.Item>
        <HintList.Item>{t('staking.confirmation.hintRedeem')}</HintList.Item>
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
