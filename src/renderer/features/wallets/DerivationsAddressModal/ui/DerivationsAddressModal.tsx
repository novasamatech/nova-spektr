import { encodeAddress } from '@polkadot/util-crypto';
import keyBy from 'lodash/keyBy';
import { useEffect, useMemo, useState } from 'react';

import { type Address, type DraftAccount, type VaultChainAccount, type VaultShardAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Button, InfoLink, SmallTitleText } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import {
  type DdAddressInfoDecoded,
  QrTxGenerator,
  TROUBLESHOOTING_URL,
  createDynamicDerivationPayload,
} from '@/entities/transaction';
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

  const qrPayload = useMemo(() => {
    const derivations = derivationAddressUtils.createDerivationsRequest(keys);
    const address = encodeAddress(rootAccountId) as Address;
    return createDynamicDerivationPayload(address, derivations);
  }, [rootAccountId, keys]);

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
    <Modal
      isOpen={isOpen}
      size="md"
      onToggle={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <Modal.Title>{t('onboarding.paritySigner.generateAddressesModalTitle')}</Modal.Title>
      <Modal.Content>
        {step === Step.GENERATE_QR && (
          <div className="flex flex-col items-center px-5 py-4">
            <SmallTitleText className="mb-6">{t('signing.scanQrTitle')}</SmallTitleText>
            <QrTxGenerator payload={qrPayload} />
            <InfoLink url={TROUBLESHOOTING_URL} className="mt-10.5 mb-8.5">
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
      </Modal.Content>
    </Modal>
  );
};
