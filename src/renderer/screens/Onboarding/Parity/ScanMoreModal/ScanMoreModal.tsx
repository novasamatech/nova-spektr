import { hexToU8a, u8aToHex } from '@polkadot/util';
import { HexString } from '@polkadot/util/types';
import { useState } from 'react';

import { SeedInfo, SimpleSeedInfo } from '@renderer/components/common/QrCode/QrReader/common/types';
import { BaseModal, Button, Icon, Identicon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { AccountID, PublicKey } from '@renderer/domain/shared-kernel';
import { toAddress } from '@renderer/services/balance/common/utils';
import { toPublicKey } from '@renderer/utils/address';
import { getShortAddress } from '@renderer/utils/strings';
import ParitySignerQrReader from '../ParitySignerQrReader/ParitySignerQrReader';

const CLOSE_DURATION = 200;

const enum CameraState {
  ACTIVE,
  ACCOUNT_EXISTS,
  NO_NEW_ACCOUNTS,
  SOME_ACCOUNTS_EXIST,
}

type RootAndDerived = {
  allRoot: PublicKey[];
  allDerived: PublicKey[];
};

type GroupedAccounts = {
  newAccs: SeedInfo[];
  oldAccs: SeedInfo[];
};

type Props = {
  isOpen: boolean;
  accounts: SimpleSeedInfo[];
  onResult: (accounts: SeedInfo[]) => void;
  onClose: () => void;
};

const ScanMoreModal = ({ isOpen, accounts, onResult, onClose }: Props) => {
  const { t } = useI18n();

  const [cameraState, setCameraState] = useState<CameraState>(CameraState.ACTIVE);
  const [existingAccounts, setExistingAccounts] = useState<AccountID[]>([]);

  const allRootAndDerivedKeys = (): RootAndDerived => {
    return accounts.reduce(
      (acc, account) => {
        acc.allRoot.push(toPublicKey(account.address) as PublicKey);

        const derivedKeys = Object.values(account.derivedKeys).flat();
        if (derivedKeys.length > 0) {
          const derivedPublicKeys = derivedKeys.map((key) => toPublicKey(key.address));
          acc.allDerived.push(...(derivedPublicKeys as PublicKey[]));
        }

        return acc;
      },
      { allRoot: [], allDerived: [] } as RootAndDerived,
    );
  };

  const groupSingleAccount = (newAccounts: SeedInfo[], keys: RootAndDerived): GroupedAccounts => {
    const addressHex = u8aToHex(newAccounts[0].multiSigner?.public);
    const publicKey = toPublicKey(addressHex);

    const isSameAccount =
      keys.allRoot.some((key) => key === addressHex) || keys.allDerived.some((id) => id === publicKey);

    return {
      newAccs: isSameAccount ? [] : newAccounts,
      oldAccs: isSameAccount ? newAccounts : [],
    };
  };

  const groupRootAccounts = (newAccounts: SeedInfo[], allRoot: HexString[]): GroupedAccounts => {
    return newAccounts.reduce(
      (acc, newAccount) => {
        const addressHex = u8aToHex(newAccount.multiSigner?.public);
        const rootAccountIndex = allRoot.findIndex((key) => key === addressHex);

        const rootWithoutDerives = rootAccountIndex >= 0 && newAccount.derivedKeys.length === 0;
        if (rootWithoutDerives) {
          return { newAccs: acc.newAccs, oldAccs: acc.oldAccs.concat(newAccount) };
        }

        let rootWithDerives =
          rootAccountIndex >= 0 ? Object.values(accounts[rootAccountIndex].derivedKeys).flat().length > 0 : false;
        if (rootWithDerives) {
          return { newAccs: acc.newAccs, oldAccs: acc.oldAccs.concat(newAccount) };
        }

        const partialDerives = newAccount.derivedKeys.filter((key) => {
          const deriveIndex = allRoot.findIndex((address) => address === toPublicKey(key.address));
          // If we don't need oldAccs on the screen this can be removed
          if (deriveIndex >= 0) {
            acc.oldAccs.push({
              name: '',
              derivedKeys: [],
              multiSigner: {
                MultiSigner: ['SR25519', 'ED25519', 'ECDSA'][key.encryption] as any,
                public: hexToU8a(allRoot[deriveIndex]),
              },
            });
          }

          return deriveIndex === -1;
        });

        return {
          oldAccs: acc.oldAccs,
          newAccs: acc.newAccs.concat({ ...newAccount, derivedKeys: partialDerives }),
        };
      },
      { oldAccs: [], newAccs: [] } as GroupedAccounts,
    );
  };

  const groupNewAccounts = (newAccounts: SeedInfo[]): GroupedAccounts => {
    const keys = allRootAndDerivedKeys();

    if (newAccounts.length === 1 && newAccounts[0].derivedKeys.length === 0) {
      return groupSingleAccount(newAccounts, keys);
    }

    return groupRootAccounts(newAccounts, keys.allRoot);
  };

  const resetAndClose = () => {
    onClose();
    setTimeout(() => {
      setCameraState(CameraState.ACTIVE);
      setExistingAccounts([]);
    }, CLOSE_DURATION);
  };

  const onScanResult = (qrPayload: SeedInfo[]) => {
    const { newAccs, oldAccs } = groupNewAccounts(qrPayload);
    console.log('newAccs ==> ', newAccs);
    console.log('oldAccs ==> ', oldAccs);

    if (newAccs.length > 0) {
      if (oldAccs.length === 0) {
        onResult(newAccs);
        resetAndClose();
      } else {
        onResult(newAccs);
        setCameraState(CameraState.SOME_ACCOUNTS_EXIST);
      }
    } else {
      if (oldAccs.length > 1 || oldAccs[0].derivedKeys.length > 1) {
        setCameraState(CameraState.NO_NEW_ACCOUNTS);
        const oldAddresses = oldAccs.map(({ multiSigner }) => toAddress(u8aToHex(multiSigner?.public), 0));
        setExistingAccounts(oldAddresses);
      } else {
        setCameraState(CameraState.ACCOUNT_EXISTS);
        setExistingAccounts([toAddress(u8aToHex(oldAccs[0].multiSigner?.public), 0)]);
      }
    }
  };

  return (
    <BaseModal
      closeButton
      contentClass="p-0 mt-7 w-[500px] h-[500px]"
      title={t('onboarding.paritySigner.qrModalTitle')}
      isOpen={isOpen}
      onClose={onClose}
    >
      {cameraState === CameraState.ACTIVE && (
        <ParitySignerQrReader size={500} className="rounded-2lg" onResult={onScanResult} />
      )}
      {cameraState === CameraState.ACCOUNT_EXISTS && (
        <div className="flex flex-col justify-center items-center w-full h-full">
          <div className="flex flex-col items-center justify-center w-full h-full">
            <Identicon address={existingAccounts[0]} size={60} background={false} />
            <p className="text-neutral font-semibold text-xl">{getShortAddress(existingAccounts[0], 16)}</p>
            <p className="text-neutral-variant text-sm">{t('onboarding.paritySigner.existingAccountDescription')}</p>
          </div>
          <Button
            className="w-max mb-5"
            weight="lg"
            variant="fill"
            pallet="primary"
            onClick={() => setCameraState(CameraState.ACTIVE)}
          >
            {t('onboarding.paritySigner.tryAgainButton')}
          </Button>
        </div>
      )}
      {cameraState === CameraState.SOME_ACCOUNTS_EXIST && (
        <div className="flex flex-col justify-center items-center w-full h-full">
          <div className="flex flex-col items-center justify-center text-center w-full h-full">
            <Icon className="text-shade-40" name="warnCutout" size={70} />
            <p className="text-neutral text-xl leading-6 font-semibold mt-5">
              {t('onboarding.paritySigner.someOldAccountLabel')}
            </p>
            <p className="text-neutral-variant text-sm">{t('onboarding.paritySigner.someOldAccountDescription')}</p>
          </div>
          <Button className="w-max mb-5" weight="lg" variant="fill" pallet="primary" onClick={resetAndClose}>
            {t('onboarding.paritySigner.continueButton')}
          </Button>
        </div>
      )}
      {cameraState === CameraState.NO_NEW_ACCOUNTS && (
        <div className="flex flex-col justify-center items-center w-full h-full">
          <div className="flex flex-col items-center justify-center text-center w-full h-full">
            <Icon className="text-alert" name="warnCutout" size={70} />
            <p className="text-neutral text-xl leading-6 font-semibold mt-5">
              {t('onboarding.paritySigner.noNewAccountLabel')}
            </p>
            <p className="text-neutral-variant text-sm">{t('onboarding.paritySigner.noNewAccountDescription')}</p>
          </div>
          <Button
            className="w-max mb-5"
            weight="lg"
            variant="fill"
            pallet="primary"
            onClick={() => setCameraState(CameraState.ACTIVE)}
          >
            {t('onboarding.paritySigner.scanAgainButton')}
          </Button>
        </div>
      )}
    </BaseModal>
  );
};

export default ScanMoreModal;
