import { u8aToHex } from '@polkadot/util';
import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Trans } from 'react-i18next';

import { useStatusContext } from '@/app/providers';
import { chainsService } from '@/shared/api/network';
import {
  AccountType,
  type ChainId,
  CryptoType,
  type DraftAccount,
  SigningType,
  type VaultChainAccount,
  type VaultShardAccount,
  WalletType,
} from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useAltOrCtrlKeyPressed, useToggle } from '@/shared/lib/hooks';
import { IS_MAC, copyToClipboard, dictionary, toAddress } from '@/shared/lib/utils';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
import {
  Accordion,
  Button,
  ContextMenu,
  FootnoteText,
  HeaderTitleText,
  HelpText,
  Icon,
  IconButton,
  InputHint,
  SmallTitleText,
} from '@/shared/ui';
import { Animation } from '@/shared/ui/Animation/Animation';
import { Field, Input } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { type SeedInfo } from '@/entities/transaction';
import { DerivedAccount, RootAccountLg, accountUtils } from '@/entities/wallet';
import { DerivationsAddressModal, ImportKeysModal, KeyConstructor } from '@/features/wallets';

import { VaultInfoPopover } from './VaultInfoPopover';
import { manageVaultModel } from './model/manage-vault-model';

const STATUS_DELAY = 1500;

type Props = {
  seedInfo: SeedInfo[];
  onBack: () => void;
  onClose: () => void;
  onComplete: () => void;
};

export const ManageVault = ({ seedInfo, onBack, onClose, onComplete }: Props) => {
  const { t } = useI18n();
  const { showStatus } = useStatusContext();
  const isAltPressed = useAltOrCtrlKeyPressed();

  const accordions = useRef<Record<string, { el: null | HTMLButtonElement; isOpen: boolean }>>({});

  const keys = useUnit(manageVaultModel.$keys);
  const keysGroups = useUnit(manageVaultModel.$keysGroups);
  const hasKeys = useUnit(manageVaultModel.$hasKeys);

  const [isAddressModalOpen, toggleIsAddressModalOpen] = useToggle();
  const [isImportModalOpen, toggleIsImportModalOpen] = useToggle();
  const [isConstructorModalOpen, toggleConstructorModal] = useToggle();
  const [chainElements, setChainElements] = useState<[string, (VaultChainAccount | VaultShardAccount[])[]][]>([]);

  const {
    submit,
    isValid,
    fields: { name },
  } = useForm(manageVaultModel.$walletForm);

  const publicKey = pjsSchema.helpers.toAccountId(u8aToHex(seedInfo[0].multiSigner.public));
  const publicKeyAddress = toAddress(publicKey, { prefix: 1 });
  const walletName = isAltPressed || !name?.value ? publicKeyAddress : name?.value;

  useEffect(() => {
    manageVaultModel.events.formInitiated(seedInfo);
  }, [seedInfo]);

  useEffect(() => {
    manageVaultModel.events.callbacksChanged({ onSubmit: onComplete });
  }, [onComplete]);

  useEffect(() => {
    const chains = chainsService.getChainsData({ sort: true });
    const chainsMap = dictionary(chains, 'chainId', () => [] as (VaultChainAccount | VaultShardAccount[])[]);

    for (const account of keysGroups) {
      const chainId = accountUtils.isAccountWithShards(account) ? account[0].chainId : account.chainId;
      chainsMap[chainId].push(account);
    }

    setChainElements(Object.entries(chainsMap));
  }, [keysGroups]);

  useEffect(() => {
    for (const item of Object.values(accordions.current)) {
      const toOpen = isAltPressed && !item.isOpen;
      const toClose = !isAltPressed && item.isOpen;

      if (toOpen || toClose) {
        item.el?.click();
      }
    }
  }, [isAltPressed]);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();

    submit();
    toggleIsAddressModalOpen();
  };

  const handleCreateVault = (
    accounts: (Omit<VaultChainAccount, 'id' | 'walletId'> | Omit<VaultShardAccount, 'id' | 'walletId'>)[],
  ) => {
    manageVaultModel.events.vaultCreated({
      wallet: {
        name: walletName.trim(),
        type: WalletType.POLKADOT_VAULT,
        signingType: SigningType.POLKADOT_VAULT,
      },
      root: {
        name: '',
        accountId: publicKey,
        cryptoType: CryptoType.SR25519,
        signingType: SigningType.POLKADOT_VAULT,
        accountType: AccountType.BASE,
        type: 'universal',
      },
      accounts,
    });
    toggleIsAddressModalOpen();

    showStatus({
      title: name?.value.trim(),
      description: t('createMultisigAccount.successMessage'),
      content: <Animation variant="success" />,
      closeTimer: STATUS_DELAY,
    });
  };

  const handleImportKeys = (keys: (DraftAccount<VaultChainAccount> | DraftAccount<VaultShardAccount>)[]) => {
    manageVaultModel.events.derivationsImported(keys);
    toggleIsImportModalOpen();
  };

  const handleConstructorKeys = (
    keysToAdd: (VaultChainAccount | VaultShardAccount[])[],
    keysToRemove: (VaultChainAccount | VaultShardAccount[])[],
  ) => {
    manageVaultModel.events.keysRemoved(keysToRemove.flat());
    manageVaultModel.events.keysAdded(keysToAdd.flat());
    toggleConstructorModal();
  };

  const button = IS_MAC ? (
    <>
      <HelpText as="span" className="text-text-tertiary">
        {t('onboarding.vault.hotkeyOption')}
      </HelpText>
      <Icon name="hotkeyOption" />
    </>
  ) : (
    <>
      <HelpText as="span" className="text-text-tertiary">
        {t('onboarding.vault.hotkeyCtrl')}
      </HelpText>
      <Icon name="hotkeyCtrl" />
    </>
  );

  return (
    <>
      <div className="flex w-[472px] flex-col rounded-l-lg bg-white px-5 py-4">
        <HeaderTitleText className="mb-10">{t('onboarding.vault.title')}</HeaderTitleText>
        <SmallTitleText className="mb-6">{t('onboarding.vault.manageTitle')}</SmallTitleText>

        <form className="flex h-full flex-col" onSubmit={submitForm}>
          <Field text={t('onboarding.walletNameLabel')}>
            <Input
              placeholder={t('onboarding.walletNamePlaceholder')}
              invalid={name?.hasError()}
              value={name?.value}
              onChange={name?.onChange}
            />
            <InputHint variant="error" active={name?.hasError()}>
              {t(name.errorText())}
            </InputHint>
          </Field>

          <div className="flex flex-1 items-end justify-between">
            <Button variant="text" onClick={onBack}>
              {t('onboarding.backButton')}
            </Button>

            <Button type="submit" disabled={!isValid}>
              {t('onboarding.continueButton')}
            </Button>
          </div>
        </form>
      </div>

      <div className="relative flex w-[472px] flex-col rounded-r-lg border-l border-divider pt-4">
        <IconButton name="close" size={20} className="absolute right-3 top-3 m-1" onClick={() => onClose()} />

        <div className="mb-6 mt-[52px] flex items-center justify-between px-5">
          <div className="flex items-center gap-x-1.5">
            <SmallTitleText>{t('onboarding.vault.vaultTitle')}</SmallTitleText>
            <VaultInfoPopover />
          </div>
          <div className="flex items-center gap-4">
            <Button size="sm" pallet="secondary" onClick={toggleConstructorModal}>
              {hasKeys ? t('onboarding.vault.editKeysButton') : t('onboarding.vault.addMoreKeysButton')}
            </Button>
            <Button size="sm" pallet="secondary" onClick={toggleIsImportModalOpen}>
              {t('onboarding.vault.importButton')}
            </Button>
          </div>
        </div>

        <div className="mb-6 pl-5">
          <HelpText className="flex items-center gap-1 text-text-tertiary">
            <Trans t={t} i18nKey="onboarding.vault.altHint" components={{ button }} />
          </HelpText>
        </div>

        <div className="h-[470px] overflow-y-auto pl-3 pr-3.5">
          <div className="flex w-full items-center justify-between gap-2 pb-4">
            <ContextMenu button={<RootAccountLg name={walletName} accountId={publicKey} />}>
              <ContextMenu.Group title={t('general.explorers.publicKeyTitle')}>
                <div className="flex items-center gap-x-2">
                  <HelpText className="break-all text-text-secondary">{publicKeyAddress}</HelpText>
                  <IconButton
                    className="shrink-0"
                    name="copy"
                    size={20}
                    onClick={() => copyToClipboard(publicKeyAddress)}
                  />
                </div>
              </ContextMenu.Group>
            </ContextMenu>
          </div>

          <FootnoteText className="ml-9 pl-2 text-text-tertiary">{t('onboarding.vault.accountTitle')}</FootnoteText>

          <div className="ml-9 flex flex-col gap-2 divide-y">
            {chainElements.map(([chainId, chainAccounts]) => {
              if (chainAccounts.length === 0) return;

              return (
                <Accordion key={chainId} className="pt-2">
                  <Accordion.Button
                    ref={(el) => (accordions.current[chainId] = { el, isOpen: false })}
                    buttonClass="mb-2 p-2"
                    onClick={() => (accordions.current[chainId].isOpen = !accordions.current[chainId].isOpen)}
                  >
                    <div className="flex gap-x-2">
                      <ChainTitle fontClass="text-text-primary" chainId={chainId as ChainId} />
                      <FootnoteText className="text-text-tertiary">{chainAccounts.length}</FootnoteText>
                    </div>
                  </Accordion.Button>
                  <Accordion.Content as="ul">
                    {chainAccounts.map((account) => (
                      <li className="mb-2 last:mb-0" key={accountUtils.getDerivationPath(account)}>
                        <ContextMenu
                          button={
                            <DerivedAccount
                              key={accountUtils.getDerivationPath(account)}
                              account={account}
                              showInfoButton={false}
                              showSuffix={isAltPressed}
                            />
                          }
                        >
                          <ContextMenu.Group title={t('general.explorers.derivationTitle')}>
                            <HelpText className="break-all text-text-secondary">
                              {accountUtils.getDerivationPath(account)}
                            </HelpText>
                          </ContextMenu.Group>
                        </ContextMenu>
                      </li>
                    ))}
                  </Accordion.Content>
                </Accordion>
              );
            })}
          </div>
        </div>
      </div>

      <KeyConstructor
        isOpen={isConstructorModalOpen}
        title={name?.value}
        existingKeys={keys}
        onClose={toggleConstructorModal}
        onConfirm={handleConstructorKeys}
      />

      <ImportKeysModal
        isOpen={isImportModalOpen}
        rootAccountId={publicKey}
        existingKeys={keys}
        onClose={toggleIsImportModalOpen}
        onConfirm={handleImportKeys}
      />

      <DerivationsAddressModal
        isOpen={isAddressModalOpen}
        rootAccountId={publicKey}
        keys={keys as (VaultShardAccount | VaultChainAccount)[]}
        onClose={toggleIsAddressModalOpen}
        onComplete={handleCreateVault}
      />
    </>
  );
};
