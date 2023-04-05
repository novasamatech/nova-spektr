import { ApiPromise } from '@polkadot/api';
import cn from 'classnames';
import { useEffect, useState } from 'react';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';

import { Block, InfoLink, Button, Plate } from '@renderer/components/ui';
import { QrTxGenerator } from '@renderer/components/common';
import { secondsToMinutes } from '@renderer/shared/utils/time';
import { TROUBLESHOOTING_URL, getMetadataPortalUrl } from '@renderer/screens/Signing/common/consts';
import { useI18n } from '@renderer/context/I18nContext';
import { Transaction } from '@renderer/domain/transaction';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { ChainId } from '@renderer/domain/shared-kernel';
import { ActiveAddress } from '@renderer/screens/Transfer/components';
import { Explorer } from '@renderer/domain/chain';
import { Account, MultisigAccount, isMultisig } from '@renderer/domain/account';

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  transaction: Transaction;
  account: Account | MultisigAccount;
  explorers?: Explorer[];
  addressPrefix: number;
  countdown: number;
  onResetCountdown: () => void;
  onResult: (unsignedTx: UnsignedTransaction) => void;
};

export const Scanning = ({
  api,
  chainId,
  transaction,
  account,
  explorers,
  addressPrefix,
  countdown,
  onResetCountdown,
  onResult,
}: Props) => {
  const { t } = useI18n();
  const { createPayload } = useTransaction();

  const [txPayload, setTxPayload] = useState<Uint8Array>();
  const [unsignedTx, setUnsignedTx] = useState<UnsignedTransaction>();

  const setupTransaction = async (): Promise<void> => {
    try {
      const { payload, unsigned } = await createPayload(transaction, api);
      setTxPayload(payload);
      setUnsignedTx(unsigned);
    } catch (error) {
      console.warn(error);
    }
  };

  useEffect(() => {
    setupTransaction();
  }, []);

  useEffect(onResetCountdown, [txPayload]);

  const address = transaction.address;
  const activeAddress = isMultisig(account) ? account.accountId : transaction.address;

  return (
    <Plate as="section" className="w-[500px] flex flex-col items-center mx-auto gap-y-2.5">
      <Block>
        <ActiveAddress
          address={activeAddress}
          accountName={account.name}
          signingType={account.signingType}
          explorers={explorers}
          addressPrefix={addressPrefix}
        />
      </Block>

      <div className="flex flex-col w-full">
        <Block className="flex flex-col items-center gap-y-2.5 p-5">
          <div className="text-neutral-variant text-base font-semibold">{t('signing.scanQrTitle')}</div>
          {txPayload ? (
            <div className="w-[220px] h-[220px]">
              <QrTxGenerator cmd={0} payload={txPayload} address={address} genesisHash={chainId} />
            </div>
          ) : (
            <div className="w-[220px] h-[220px] rounded-2lg bg-shade-20 animate-pulse" />
          )}
          {txPayload && (
            <div className="flex items-center uppercase font-normal text-xs gap-1.25">
              {t('signing.qrCountdownTitle')}
              <div
                className={cn(
                  'w-10 rounded-md text-white py-0.5 text-center',
                  (!countdown && 'bg-error') || (countdown >= 60 ? 'bg-success' : 'bg-alert'),
                )}
              >
                {secondsToMinutes(countdown)}
              </div>
            </div>
          )}
        </Block>
        <div className="flex flex-col items-center gap-y-1 text-xs font-semibold text-primary mt-2.5 mb-5">
          <InfoLink url={TROUBLESHOOTING_URL}>{t('signing.troubleshootingLink')}</InfoLink>
          <InfoLink url={getMetadataPortalUrl(chainId)}>{t('signing.metadataPortalLink')}</InfoLink>
        </div>
        {unsignedTx && countdown > 0 ? (
          <Button
            className="w-max mx-auto"
            variant="fill"
            pallet="primary"
            weight="lg"
            onClick={() => onResult(unsignedTx)}
          >
            {t('signing.continueButton')}
          </Button>
        ) : (
          <Button className="w-max mx-auto" variant="fill" pallet="primary" weight="lg" onClick={setupTransaction}>
            {t('signing.generateNewQrButton')}
          </Button>
        )}
      </div>
    </Plate>
  );
};
