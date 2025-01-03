import keyBy from 'lodash/keyBy';
import { useEffect, useState } from 'react';

import { type DraftAccount, type VaultChainAccount, type VaultShardAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { BaseModal, Button, InfoLink, SmallTitleText } from '@/shared/ui';
import { type DdAddressInfoDecoded, QrDerivationsGenerator, TROUBLESHOOTING_URL } from '@/entities/transaction';
import { derivationAddressUtils } from '../lib/utils';

import { DdKeyQrReader } from './DdKeyQrReader';

const enum Step {
  GENERATE_QR,
  READ_QR,
}

type Props = {
  isOpen: boolean;
  rootAccountId: AccountId;
  keys: (DraftAccount<VaultShardAccount> | DraftAccount<VaultChainAccount>)[];
  onComplete: (
    accounts: (Omit<VaultChainAccount, 'id' | 'walletId'> | Omit<VaultShardAccount, 'id' | 'walletId'>)[],
  ) => void;
  onClose: () => void;
};
export const DerivationsAddressModal = ({ isOpen, rootAccountId, keys, onClose, onComplete }: Props) => {
  const { t } = useI18n();

  const [step, setStep] = useState<Step>(Step.GENERATE_QR);

  useEffect(() => {
    if (isOpen) {
      setStep(Step.GENERATE_QR);
    }
  }, [isOpen]);

  const handleScanResult = (result: DdAddressInfoDecoded[]) => {
    const derivedKeys = keyBy(result, (d) => `${d.derivationPath}${d.encryption}`);
    const accounts = derivationAddressUtils.createDerivedAccounts(derivedKeys, keys);
    // TODO fix in lol
    const newAccounts = accounts.filter((account) => !(account as VaultShardAccount | VaultChainAccount).id);

    onComplete(newAccounts);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      contentClass={step === Step.GENERATE_QR ? 'px-5 py-4' : 'p-0'}
      title={t('onboarding.paritySigner.generateAddressesModalTitle')}
      onClose={onClose}
    >
      {step === Step.GENERATE_QR && (
        <div className="flex flex-col items-center">
          <SmallTitleText className="mb-6">{t('signing.scanQrTitle')}</SmallTitleText>
          <QrDerivationsGenerator
            size={240}
            address={toAddress(rootAccountId, { prefix: 1 })}
            derivations={derivationAddressUtils.createDerivationsRequest(keys)}
          />
          <InfoLink url={TROUBLESHOOTING_URL} className="mb-8.5 mt-10.5">
            {t('signing.troubleshootingLink')}
          </InfoLink>
          <div className="mt-3 flex w-full justify-between pl-2">
            <Button variant="text" onClick={onClose}>
              {t('operation.goBackButton')}
            </Button>

            <Button onClick={() => setStep(Step.READ_QR)}>{t('signing.continueButton')}</Button>
          </div>
        </div>
      )}

      {step === Step.READ_QR && (
        <DdKeyQrReader size={[440, 524]} onResult={handleScanResult} onGoBack={() => setStep(Step.GENERATE_QR)} />
      )}
    </BaseModal>
  );
};
