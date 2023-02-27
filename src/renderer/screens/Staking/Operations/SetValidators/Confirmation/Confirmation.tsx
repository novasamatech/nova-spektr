import { ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';

import { Button, HintList, Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Explorer } from '@renderer/domain/chain';
import { ChainId } from '@renderer/domain/shared-kernel';
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
  asset: Asset;
  explorers?: Explorer[];
  addressPrefix: number;
  onResult: (transactions: Transaction[]) => void;
};

const Confirmation = ({ api, chainId, validators, accounts, asset, explorers, addressPrefix, onResult }: Props) => {
  const { t } = useI18n();

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const newTransactions = accounts.map(({ accountId = '' }) => {
      return {
        chainId,
        address: formatAddress(accountId, addressPrefix),
        type: TransactionType.NOMINATE,
        args: {
          targets: validators.map((validator) => validator.address),
        },
      };
    });

    setTransactions(newTransactions);
  }, []);

  return (
    <TransactionInfo
      api={api}
      title={t('staking.confirmation.setValidatorsTitle')}
      validators={validators}
      accounts={accounts}
      asset={asset}
      explorers={explorers}
      addressPrefix={addressPrefix}
      transactions={transactions}
    >
      <HintList className="mt-2.5 mb-5 px-[15px]">
        <HintList.Item>{t('staking.confirmation.hintNewValidators')}</HintList.Item>
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
