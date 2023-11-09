import { BaseModal, Button, InfoLink, SmallTitleText } from '@renderer/shared/ui';
import QrDerivationsGenerator from '@renderer/components/common/QrCode/QrGenerator/QrDerivationsGenerator';
import { useToggle } from '@renderer/shared/lib/hooks';
import { Address, ChainAccount, ChainId } from '@renderer/shared/core';
import { ShardAccount } from '@renderer/shared/core/types/account';
import { useI18n } from '@renderer/app/providers';
import { TROUBLESHOOTING_URL } from '@renderer/components/common/QrCode/common/constants';
import { SeedInfo } from '@renderer/components/common/QrCode/common/types';
import { DdKeyQrReader } from '@renderer/pages/Onboarding/Vault/DdKeyQrReader/DdKeyQrReader';
import { toAddress } from "@renderer/shared/lib/utils";

type Props = {
  address: Address;
  accounts: Omit<ShardAccount | ChainAccount, 'accountId' | 'walletId' | 'id'>[];
  isOpen: boolean;
  onClose: () => void;
};

export const DerivationsAddressModal = ({ address, accounts, onClose, isOpen }: Props) => {
  const { t } = useI18n();
  const [isScanStep, toggleIsScanStep] = useToggle(false);
  // const derivations = accounts.map((a) => ({ path: a.derivationPath, chainId: a.chainId }));
  const mockDerivations = [
    { path: '//westend//0', chainId: '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e' as ChainId },
    { path: '//westend//1', chainId: '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e' as ChainId },
  ];

  const handleScanResult = (result: SeedInfo[]) => {
    console.log('===========================');
    console.log(result);
    console.log('===========================');
  };

  return (
    <BaseModal
      isOpen
      contentClass={isScanStep ? undefined : 'px-5 py-4'}
      title={t('onboarding.paritySigner.generateAddressesModalTitle')}
      onClose={() => {}}
    >
      {!isScanStep && (
        <div className="flex flex-col items-center">
          <SmallTitleText className="mb-6">{t('signing.scanQrTitle')}</SmallTitleText>
          <QrDerivationsGenerator
            address={toAddress('0x427f8c7898a7c1ffe8ac3822d63579bf9ba263fe0d3197a1fcf3c63bb2539954')}
            derivations={mockDerivations}
            size={240}
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
      {isScanStep && <DdKeyQrReader size={[440, 524]} onResult={handleScanResult} onGoBack={toggleIsScanStep} />}
    </BaseModal>
  );
};
