import keyBy from 'lodash/keyBy';
import { Dictionary } from 'lodash';

import { BaseModal, Button, InfoLink, SmallTitleText } from '@renderer/shared/ui';
import QrDerivationsGenerator from '@renderer/components/common/QrCode/QrGenerator/QrDerivationsGenerator';
import { useToggle } from '@renderer/shared/lib/hooks';
import { BaseAccount, ChainAccount, SigningType, WalletType } from '@renderer/shared/core';
import { ShardAccount, ShardedAccount } from '@renderer/shared/core/types/account';
import { useI18n } from '@renderer/app/providers';
import { TROUBLESHOOTING_URL } from '@renderer/components/common/QrCode/common/constants';
import { DdKeyQrReader } from '@renderer/pages/Onboarding/Vault/DdKeyQrReader/DdKeyQrReader';
import { toAccountId, toAddress } from '@renderer/shared/lib/utils';
import { walletModel } from '@renderer/entities/wallet';
import { DdAddressInfoDecoded, DynamicDerivationRequestInfo } from '@renderer/components/common/QrCode/common/types';

export type ShardedAccountWithShards = ShardedAccount & { shards: ShardAccount[] };
type DerivationsAccounts = Omit<ShardedAccountWithShards | ChainAccount, 'accountId' | 'walletId' | 'id'>;

const createDerivations = (accounts: DerivationsAccounts[]): DynamicDerivationRequestInfo[] => {
  return accounts.reduce<DynamicDerivationRequestInfo[]>((acc, account) => {
    if ('shards' in account) {
      acc.push(
        ...(account as ShardedAccountWithShards).shards.map((shard) => ({
          derivationPath: shard.derivationPath,
          genesisHash: account.chainId,
          encryption: shard.cryptoType,
        })),
      );
    } else {
      acc.push({
        derivationPath: (account as ChainAccount).derivationPath,
        genesisHash: account.chainId,
        encryption: (account as ChainAccount).cryptoType,
      });
    }

    return acc;
  }, []);
};

type Props = {
  walletName: string;
  rootKey: Omit<BaseAccount, 'walletId' | 'id'>;
  accounts: DerivationsAccounts[];
  isOpen: boolean;
  onComplete: () => void;
  onClose: () => void;
};

export const DerivationsAddressModal = ({ rootKey, accounts, onClose, isOpen, walletName, onComplete }: Props) => {
  const { t } = useI18n();
  const [isScanStep, toggleIsScanStep] = useToggle(false);
  const derivations = createDerivations(accounts);

  const handleScanResult = (result: DdAddressInfoDecoded[]) => {
    const derivationsByPath = keyBy(result, (d) => d.derivationPath + d.encryption);
    createWallet(derivationsByPath);
  };

  const createDerivedAccounts = (
    derivedKeys: Dictionary<DdAddressInfoDecoded>,
  ): Omit<ChainAccount | ShardedAccountWithShards, 'walletId' | 'id'>[] =>
    accounts.map((account) => {
      if ('shards' in account) {
        return {
          ...account,
          shards: (account as ShardedAccountWithShards).shards.map((shard) => ({
            ...shard,
          })),
        };
      } else {
        return {
          ...account,
          accountId: toAccountId(
            derivedKeys[(account as ChainAccount).derivationPath + (account as ChainAccount).cryptoType].publicKey
              .public,
          ),
        };
      }
    });

  const createWallet = (derivedKeys: Dictionary<DdAddressInfoDecoded>) => {
    const accountsToSave = createDerivedAccounts(derivedKeys);

    walletModel.events.polkadotVaultCreated({
      wallet: {
        name: walletName.trim(),
        type: WalletType.POLKADOT_VAULT,
        signingType: SigningType.POLKADOT_VAULT,
      },
      accounts: accountsToSave,
      root: rootKey,
    });

    onComplete();
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
          <QrDerivationsGenerator address={toAddress(rootKey.accountId)} derivations={derivations} size={240} />
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
