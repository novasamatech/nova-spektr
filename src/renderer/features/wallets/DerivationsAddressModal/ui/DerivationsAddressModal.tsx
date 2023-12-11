import keyBy from 'lodash/keyBy';
import { Dictionary } from 'lodash';

import { BaseModal, Button, InfoLink, SmallTitleText } from '@renderer/shared/ui';
import { useToggle } from '@renderer/shared/lib/hooks';
import { AccountId, AccountType, ChainType, CryptoType, SigningType, WalletType } from '@renderer/shared/core';
import { useI18n } from '@renderer/app/providers';
import { TROUBLESHOOTING_URL } from '@renderer/components/common/QrCode/common/constants';
import { toAddress } from '@shared/lib/utils';
import { walletModel } from '@entities/wallet';
import { DdAddressInfoDecoded } from '@renderer/components/common/QrCode/common/types';
import { derivationAddressUtils, DerivationsAccounts } from '../lib/utils';
import { QrDerivationsGenerator } from '@renderer/components/common/QrCode/QrGenerator/QrDerivationsGenerator';
import { DdKeyQrReader } from './DdKeyQrReader/DdKeyQrReader';

type Props = {
  walletName: string;
  rootKey: AccountId;
  keys: DerivationsAccounts[];
  isOpen: boolean;
  onComplete: () => void;
  onClose: () => void;
};

export const DerivationsAddressModal = ({ rootKey, keys, onClose, isOpen, walletName, onComplete }: Props) => {
  const { t } = useI18n();

  const [isScanStep, toggleIsScanStep] = useToggle(false);

  const handleScanResult = (result: DdAddressInfoDecoded[]) => {
    const derivationsByPath = keyBy(result, (d) => `${d.derivationPath}${d.encryption}`);
    createWallet(derivationsByPath);
  };

  const createWallet = (derivedKeys: Dictionary<DdAddressInfoDecoded>) => {
    const accountsToSave = derivationAddressUtils.createDerivedAccounts(derivedKeys, keys);

    walletModel.events.polkadotVaultCreated({
      wallet: {
        name: walletName.trim(),
        type: WalletType.POLKADOT_VAULT,
        signingType: SigningType.POLKADOT_VAULT,
      },
      accounts: accountsToSave,
      root: {
        name: '',
        accountId: rootKey,
        cryptoType: CryptoType.SR25519,
        chainType: ChainType.SUBSTRATE,
        type: AccountType.BASE,
      },
    });
  };

  return (
    <BaseModal
      isOpen={isOpen}
      contentClass={isScanStep ? 'p-0' : 'px-5 py-4'}
      title={t('onboarding.paritySigner.generateAddressesModalTitle')}
      onClose={onClose}
    >
      {isScanStep ? (
        <DdKeyQrReader size={[440, 524]} onResult={handleScanResult} onGoBack={toggleIsScanStep} />
      ) : (
        <div className="flex flex-col items-center">
          <SmallTitleText className="mb-6">{t('signing.scanQrTitle')}</SmallTitleText>
          <QrDerivationsGenerator
            size={240}
            address={toAddress(rootKey, { prefix: 1 })}
            derivations={derivationAddressUtils.createDerivationsRequest(keys)}
          />
          <InfoLink url={TROUBLESHOOTING_URL} className="mt-10.5 mb-8.5">
            {t('signing.troubleshootingLink')}
          </InfoLink>
          <div className="flex w-full justify-between mt-3 pl-2">
            <Button variant="text" onClick={onClose}>
              {t('operation.goBackButton')}
            </Button>

            <Button onClick={toggleIsScanStep}>{t('signing.continueButton')}</Button>
          </div>
        </div>
      )}
    </BaseModal>
  );
};
