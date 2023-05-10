import { ApiPromise } from '@polkadot/api';
import cn from 'classnames';
import { useEffect, useState } from 'react';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';

import { Icon } from '@renderer/components/ui';
import { QrTxGenerator } from '@renderer/components/common';
import { secondsToMinutes } from '@renderer/shared/utils/time';
import { TROUBLESHOOTING_URL, getMetadataPortalUrl } from '@renderer/screens/Signing/common/consts';
import { useI18n } from '@renderer/context/I18nContext';
import { Transaction } from '@renderer/domain/transaction';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { ChainId } from '@renderer/domain/shared-kernel';
import { Explorer } from '@renderer/domain/chain';
import { Account, MultisigAccount, isMultisig } from '@renderer/domain/account';
import { Button, CaptionText, FootnoteText, SmallTitleText, InfoLink } from '@renderer/components/ui-redesign';
import AddressWithExplorers from '@renderer/components/common/AddressWithExplorers/AddressWithExplorers';

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
      onResult(unsigned);
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
    <div className="py-2 flex flex-col items-center gap-y-2 w-full">
      <div className="flex items-center gap-x-0.5">
        <FootnoteText className="text-text-secondary">{t('signing.signatory')}</FootnoteText>
        <AddressWithExplorers
          address={activeAddress}
          name={account.name}
          signType={account.signingType}
          explorers={explorers}
          addressPrefix={addressPrefix}
        />
      </div>

      <SmallTitleText>{t('signing.scanQrTitle')}</SmallTitleText>

      {txPayload && (
        <div className="flex items-center gap-x-2 mt-1 mb-2">
          <FootnoteText className="text-text-secondary">{t('signing.qrCountdownTitle')}</FootnoteText>
          <CaptionText
            className={cn(
              'py-1 px-2 w-[50px] h-5 rounded-[26px] text-button-text',
              (!countdown && 'bg-filter-border-negative') ||
                (countdown >= 60 ? 'bg-qr-valid-background' : 'bg-text-secondary'),
            )}
            align="center"
          >
            {secondsToMinutes(countdown)}
          </CaptionText>
        </div>
      )}

      {txPayload ? (
        <div className="w-[240px] h-[240px] relative flex flex-col items-center justify-center gap-y-4">
          {unsignedTx && countdown <= 0 ? (
            <>
              <Icon name="qrFrame" className="absolute w-full h-full text-icon-default" />
              <FootnoteText>{t('signing.qrNotValid')}</FootnoteText>
              <Button
                className="z-10"
                size="sm"
                prefixElement={<Icon size={16} name="refresh" />}
                onClick={setupTransaction}
              >
                {t('signing.generateNewQrButton')}
              </Button>
            </>
          ) : (
            <QrTxGenerator cmd={0} payload={txPayload} address={address} genesisHash={chainId} />
          )}
        </div>
      ) : (
        <div className="w-[240px] h-[240px] rounded-2lg bg-shade-20 animate-pulse" />
      )}

      <div className="flex flex-row items-center gap-x-2 mt-5 mb-6">
        <InfoLink url={TROUBLESHOOTING_URL}>{t('signing.troubleshootingLink')}</InfoLink>
        <span className="border border-divider h-4"></span>
        <InfoLink url={getMetadataPortalUrl(chainId)}>{t('signing.metadataPortalLink')}</InfoLink>
      </div>
    </div>
  );
};
