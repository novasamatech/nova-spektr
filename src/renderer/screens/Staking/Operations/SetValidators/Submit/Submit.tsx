import { ApiPromise } from '@polkadot/api';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useEffect, useState } from 'react';

import { HintList, Icon, ProgressBadge } from '@renderer/components/ui';
import { useConfirmContext } from '@renderer/context/ConfirmContext';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Explorer } from '@renderer/domain/chain';
import { HexString } from '@renderer/domain/shared-kernel';
import { Transaction } from '@renderer/domain/transaction';
import { Validator } from '@renderer/domain/validator';
import { AccountDS } from '@renderer/services/storage';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import TransactionInfo from '../../components/TransactionInfo/TransactionInfo';

type Props = {
  api: ApiPromise;
  transactions: Transaction[];
  unsignedTransactions: UnsignedTransaction[];
  validators: Validator[];
  accounts: AccountDS[];
  asset: Asset;
  explorers?: Explorer[];
  addressPrefix: number;
  signatures: HexString[];
};

const Submit = ({
  api,
  transactions,
  unsignedTransactions,
  validators,
  accounts,
  asset,
  explorers,
  addressPrefix,
  signatures,
}: Props) => {
  const { t } = useI18n();
  const { confirm } = useConfirmContext();
  const { submitAndWatchExtrinsic, getSignedExtrinsic } = useTransaction();

  const [progress, setProgress] = useState(0);
  const [failedTxs, setFailedTxs] = useState<number[]>([]);

  const submitFinished = unsignedTransactions.length === progress;

  const confirmFailedTx = (): Promise<boolean> => {
    return confirm({
      title: t('staking.confirmation.errorModalTitle', { number: failedTxs.length }),
      message: t('staking.confirmation.errorModalSubtitle'),
      confirmText: t('staking.confirmation.errorModalEditButton'),
      cancelText: t('staking.confirmation.errorModalDiscardButton'),
    });
  };

  const submitExtrinsic = async (signatures: HexString[]): Promise<void> => {
    const extrinsicRequests = unsignedTransactions.map((unsigned, index) => {
      return getSignedExtrinsic(unsigned, signatures[index], api);
    });

    const allExtrinsic = await Promise.all(extrinsicRequests);

    allExtrinsic.forEach((extrinsic, index) => {
      submitAndWatchExtrinsic(extrinsic, unsignedTransactions[index], api, (executed) => {
        setProgress((p) => p + 1);
        if (!executed) {
          setFailedTxs((f) => f.concat(index));
        }
      });
    });
  };

  useEffect(() => {
    submitExtrinsic(signatures);
  }, []);

  useEffect(() => {
    if (!submitFinished || failedTxs.length === 0) return;

    confirmFailedTx().then((proceed) => {
      if (!proceed) return;

      // TODO: implement Edit flow
    });
  }, [submitFinished]);

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

      {!submitFinished && (
        <div className="flex justify-center items-center gap-x-2.5 mb-2.5">
          <Icon className="text-neutral-variant animate-spin" name="loader" size={20} />
          <p className="text-neutral-variant font-semibold">{t('staking.confirmation.submittingOperation')}</p>
        </div>
      )}
      <ProgressBadge className="mx-auto" progress={progress} total={signatures.length}>
        {t('staking.confirmation.transactionProgress')}
      </ProgressBadge>
    </TransactionInfo>
  );
};

export default Submit;
