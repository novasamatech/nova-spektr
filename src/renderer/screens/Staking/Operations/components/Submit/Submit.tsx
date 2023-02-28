import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { PropsWithChildren, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Icon, ProgressBadge } from '@renderer/components/ui';
import { useConfirmContext } from '@renderer/context/ConfirmContext';
import { useI18n } from '@renderer/context/I18nContext';
import { HexString } from '@renderer/domain/shared-kernel';
import Paths from '@renderer/routes/paths';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import TransactionInfo, { InfoProps } from '../TransactionInfo/TransactionInfo';

interface Props extends InfoProps {
  unsignedTx: UnsignedTransaction[];
  signatures: HexString[];
}

export const Submit = ({ unsignedTx, signatures, children, ...props }: PropsWithChildren<Props>) => {
  const { t } = useI18n();
  const { confirm } = useConfirmContext();
  const { submitAndWatchExtrinsic, getSignedExtrinsic } = useTransaction();
  const navigate = useNavigate();

  const [progress, setProgress] = useState(0);
  const [failedTxs, setFailedTxs] = useState<number[]>([]);

  const submitFinished = unsignedTx.length === progress;

  const confirmFailedTx = (): Promise<boolean> => {
    return confirm({
      title: t('staking.confirmation.errorModalTitle', { number: failedTxs.length }),
      message: t('staking.confirmation.errorModalSubtitle'),
      cancelText: t('staking.confirmation.errorModalDiscardButton'),
      // TODO: implement Edit flow
      // confirmText: t('staking.confirmation.errorModalEditButton'),
    });
  };

  const submitExtrinsic = async (signatures: HexString[]): Promise<void> => {
    const extrinsicRequests = unsignedTx.map((unsigned, index) => {
      return getSignedExtrinsic(unsigned, signatures[index], props.api);
    });

    const allExtrinsic = await Promise.all(extrinsicRequests);

    allExtrinsic.forEach((extrinsic, index) => {
      submitAndWatchExtrinsic(extrinsic, unsignedTx[index], props.api, (executed) => {
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
      if (!proceed) {
        navigate(Paths.STAKING, { replace: true });
      }

      // TODO: implement Edit flow
    });
  }, [submitFinished]);

  return (
    <TransactionInfo {...props}>
      {children}

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
