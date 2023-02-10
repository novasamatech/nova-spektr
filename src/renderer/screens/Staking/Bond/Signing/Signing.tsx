import { ApiPromise } from '@polkadot/api';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useEffect, useState } from 'react';

import { Block, Button } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { HexString } from '@renderer/domain/shared-kernel';
import MultiframeSignatureReader from '@renderer/screens/Signing/MultiframeSignatureReader/MultiframeSignatureReader';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { DEFAULT_QR_LIFETIME } from '@renderer/shared/utils/constants';

type Props = {
  api?: ApiPromise;
  unsignedTransactions: UnsignedTransaction[];
  onResult: () => void;
};

const Signing = ({ api, unsignedTransactions, onResult }: Props) => {
  const { t } = useI18n();
  const { submitAndWatchExtrinsic, getSignedExtrinsic } = useTransaction();

  const [progress, setProgress] = useState(0);
  const [failedTxs, setFailedTxs] = useState<number[]>([]);
  const [countdown, setCountdown] = useState(DEFAULT_QR_LIFETIME);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [countdown]);

  const sign = async (signatures: HexString[]) => {
    if (!api) return;
    console.log('signatures - ', signatures);

    // setCurrentStep(Steps.EXECUTING);

    const unsignedRequests = unsignedTransactions.map((unsigned, index) => {
      return (async () => {
        const extrinsic = await getSignedExtrinsic(unsigned, signatures[index], api);

        submitAndWatchExtrinsic(extrinsic, unsigned, api, (executed) => {
          console.log('executed - ', executed);

          if (executed) {
            setProgress((p) => p + 1);
          } else {
            setFailedTxs((f) => [...f, index]);
          }

          if (progress + failedTxs.length === unsignedTransactions.length) {
            console.info('Submitting finished');

            if (failedTxs.length) {
              console.info('There are failed transactions: ', failedTxs.join(', '));
            }
          }
        });
      })();
    });

    await Promise.all(unsignedRequests);
  };

  return (
    <div className="overflow-y-auto">
      <section className="flex flex-col items-center mx-auto w-[500px] rounded-2lg bg-shade-2 p-5">
        <Block className="flex flex-col items-center gap-y-2.5">
          <div className="text-neutral-variant text-base font-semibold">{t('signing.scanQrTitle')}</div>
          <div className="h-[460px]">
            <MultiframeSignatureReader
              className="w-full rounded-2lg"
              countdown={countdown}
              size={460}
              onResult={sign}
            />
          </div>
        </Block>

        {countdown === 0 && (
          <Button variant="fill" pallet="primary" weight="lg" onClick={() => console.log('GO BACK')}>
            {t('signing.generateNewQrButton')}
          </Button>
        )}
      </section>
    </div>
  );
};

export default Signing;
