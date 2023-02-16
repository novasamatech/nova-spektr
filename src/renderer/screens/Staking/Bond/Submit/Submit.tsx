import { ApiPromise } from '@polkadot/api';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useEffect, useState } from 'react';

import { useConfirmContext } from '@renderer/context/ConfirmContext';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { HintList, Icon, ProgressBadge } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Explorer } from '@renderer/domain/chain';
import { AccountID, ChainId, HexString } from '@renderer/domain/shared-kernel';
import { RewardsDestination } from '@renderer/domain/stake';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { Validator } from '@renderer/domain/validator';
import TransactionInfo from '@renderer/screens/Staking/Bond/components/TransactionInfo/TransactionInfo';
import { AccountDS } from '@renderer/services/storage';

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  unsignedTransactions: UnsignedTransaction[];
  validators: Validator[];
  accounts: AccountDS[];
  stake: string;
  destination: AccountID;
  asset: Asset;
  explorers?: Explorer[];
  addressPrefix: number;
  signatures: HexString[];
};

const Submit = ({
  api,
  chainId,
  unsignedTransactions,
  validators,
  accounts,
  stake,
  destination,
  asset,
  explorers,
  addressPrefix,
  signatures,
}: Props) => {
  const { t } = useI18n();
  const { confirm } = useConfirmContext();
  const { submitAndWatchExtrinsic, getSignedExtrinsic } = useTransaction();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [progress, setProgress] = useState(0);
  const [failedTxs, setFailedTxs] = useState<number[]>([]);

  const submitFinished = unsignedTransactions.length === progress;

  const destPayload = destination
    ? { type: RewardsDestination.TRANSFERABLE, address: destination }
    : { type: RewardsDestination.RESTAKE };

  useEffect(() => {
    const newTransactions = accounts.map(({ accountId = '' }) => {
      const commonPayload = { chainId, address: accountId };

      const bondTx = {
        ...commonPayload,
        type: TransactionType.BOND,
        args: {
          value: stake,
          controller: accountId,
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

  const confirmFailedTx = (): Promise<boolean> => {
    return confirm({
      title: t('staking.confirmation.errorModalTitle', { number: failedTxs.length }),
      message: t('staking.confirmation.errorModalSubtitle'),
      confirmText: t('staking.confirmation.errorModalEditButton'),
      cancelText: t('staking.confirmation.errorModalDiscardButton'),
    });
  };

  const submitExtrinsic = async (signatures: HexString[]) => {
    const unsignedRequests = unsignedTransactions.map((unsigned, index) => {
      return (async () => {
        const extrinsic = await getSignedExtrinsic(unsigned, signatures[index], api);

        submitAndWatchExtrinsic(extrinsic, unsigned, api, (executed) => {
          setProgress((p) => p + 1);
          if (!executed) {
            setFailedTxs((f) => f.concat(index));
          }
        });
      })();
    });

    await Promise.all(unsignedRequests);
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
  }, [submitFinished, failedTxs.length]);

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
        <HintList.Item>{t('staking.confirmation.hintOne')}</HintList.Item>
        <HintList.Item>{t('staking.confirmation.hintTwo')}</HintList.Item>
        <HintList.Item>{t('staking.confirmation.hintThree')}</HintList.Item>
        <HintList.Item>{t('staking.confirmation.hintFour')}</HintList.Item>
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
