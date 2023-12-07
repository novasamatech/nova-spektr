import cn from 'classnames';
import { FormEvent, useEffect, useState, useRef } from 'react';
import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { Trans } from 'react-i18next';
import { u8aToHex } from '@polkadot/util';

import { useI18n, useStatusContext } from '@app/providers';
import { SeedInfo } from '@renderer/components/common/QrCode/common/types';
import { toAddress, dictionary, IS_MAC, copyToClipboard } from '@shared/lib/utils';
import type { ChainAccount, ChainId, ShardAccount, DraftAccount } from '@shared/core';
import { VaultInfoPopover } from './VaultInfoPopover';
import { useAltOrCtrlKeyPressed, useToggle } from '@shared/lib/hooks';
import { manageVaultModel } from './model/manage-vault-model';
import { chainsService } from '@entities/network';
import { RootAccountLg, accountUtils, DerivedAccount } from '@entities/wallet';
import { KeyConstructor, DerivationsAddressModal, ImportKeysModal } from '@features/wallets';
import { Animation } from '@shared/ui/Animation/Animation';
import { ChainTitle } from '@entities/chain';
import {
  Button,
  Input,
  InputHint,
  HeaderTitleText,
  SmallTitleText,
  HelpText,
  FootnoteText,
  Icon,
  ContextMenu,
  IconButton,
  Accordion,
} from '@shared/ui';

type Props = {
  seedInfo: SeedInfo[];
  onBack: () => void;
  onComplete: () => void;
};

export const ManageVault = ({ seedInfo, onBack, onComplete }: Props) => {
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
  const [chainElements, setChainElements] = useState<[string, Array<ChainAccount | ShardAccount[]>][]>([]);

  const {
    submit,
    isValid,
    fields: { name },
  } = useForm(manageVaultModel.$walletForm);

  useEffect(() => {
    manageVaultModel.events.formInitiated(seedInfo);
  }, [seedInfo]);

  useEffect(() => {
    manageVaultModel.events.callbacksChanged({ onSubmit: onComplete });
  }, [onComplete]);

  useEffect(() => {
    const chains = chainsService.getChainsData({ sort: true });
    const chainsMap = dictionary(chains, 'chainId', () => []);

    keysGroups.forEach((account) => {
      const chainId = Array.isArray(account) ? account[0].chainId : account.chainId;

      chainsMap[chainId].push(account);
    });

    setChainElements(Object.entries(chainsMap));
  }, [keysGroups]);

  useEffect(() => {
    Object.values(accordions.current).forEach((item) => {
      const toOpen = isAltPressed && !item.isOpen;
      const toClose = !isAltPressed && item.isOpen;

      if (toOpen || toClose) {
        item.el?.click();
      }
    });
  }, [isAltPressed]);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();

    submit();
    toggleIsAddressModalOpen();
  };

  const handleSuccess = () => {
    onComplete();
    showStatus({
      title: name?.value.trim(),
      description: t('createMultisigAccount.successMessage'),
      content: <Animation variant="success" />,
    });
  };

  const handleImportKeys = (mergedKeys: DraftAccount<ShardAccount | ChainAccount>[]) => {
    manageVaultModel.events.derivationsImported(mergedKeys);
    toggleIsImportModalOpen();
  };

  const handleConstructorKeys = (keys: DraftAccount<ChainAccount | ShardAccount>[]) => {
    manageVaultModel.events.keysAdded(keys);
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

  const publicKey = u8aToHex(seedInfo[0].multiSigner.public);
  const publicKeyAddress = toAddress(publicKey, { prefix: 1 });
  const walletName = isAltPressed || !name?.value ? publicKeyAddress : name?.value;

  return (
    <>
      <div className="w-[472px] flex flex-col px-5 py-4 bg-white rounded-l-lg">
        <HeaderTitleText className="mb-10">{t('onboarding.vault.title')}</HeaderTitleText>
        <SmallTitleText className="mb-6">{t('onboarding.vault.manageTitle')}</SmallTitleText>

        <form className="flex flex-col h-full" onSubmit={submitForm}>
          <div className="flex flex-col gap-y-2">
            <Input
              wrapperClass={cn('flex items-center')}
              label={t('onboarding.walletNameLabel')}
              placeholder={t('onboarding.walletNamePlaceholder')}
              invalid={name?.hasError()}
              value={name?.value}
              onChange={name?.onChange}
            />
            <InputHint variant="error" active={name?.hasError()}>
              {t(name?.errorText())}
            </InputHint>
          </div>

          <div className="flex flex-1 justify-between items-end">
            <Button variant="text" onClick={onBack}>
              {t('onboarding.backButton')}
            </Button>

            <Button type="submit" disabled={!isValid}>
              {t('onboarding.continueButton')}
            </Button>
          </div>
        </form>
      </div>

      <div className="w-[472px] flex flex-col pt-4 rounded-r-lg border-l border-divider">
        <div className="flex items-center justify-between px-5 mt-[52px] mb-6">
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

        <div className="pl-5 mb-6">
          <HelpText className="flex items-center gap-1 text-text-tertiary">
            <Trans t={t} i18nKey="onboarding.vault.altHint" components={{ button }} />
          </HelpText>
        </div>

        <div className="overflow-y-auto h-[470px] pl-3 pr-3.5">
          <div className="flex items-center justify-between w-full gap-2 pb-4">
            <ContextMenu button={<RootAccountLg name={walletName} accountId={publicKey} />}>
              <ContextMenu.Group title="Public key">
                <div className="flex items-center gap-x-2">
                  <HelpText className="text-text-secondary break-all">{publicKeyAddress}</HelpText>
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

          <FootnoteText className="text-text-tertiary ml-9 pl-2">{t('onboarding.vault.accountTitle')}</FootnoteText>

          <div className="flex flex-col gap-2 divide-y ml-9">
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
                          <ContextMenu.Group title={t('onboarding.vault.derivationPath')}>
                            <HelpText className="text-text-secondary break-all">
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
        title={name?.value}
        existingKeys={keys}
        isOpen={isConstructorModalOpen}
        onClose={toggleConstructorModal}
        onConfirm={handleConstructorKeys}
      />

      <DerivationsAddressModal
        isOpen={isAddressModalOpen}
        walletName={walletName}
        rootKey={publicKey}
        keys={keys}
        onComplete={handleSuccess}
        onClose={toggleIsAddressModalOpen}
      />

      <ImportKeysModal
        isOpen={isImportModalOpen}
        rootAccountId={publicKey}
        existingKeys={keys}
        onClose={toggleIsImportModalOpen}
        onConfirm={handleImportKeys}
      />
    </>
  );
};
