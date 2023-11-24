import cn from 'classnames';
import { FormEvent, useEffect, useState, useRef } from 'react';
import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { Trans } from 'react-i18next';
import { u8aToHex } from '@polkadot/util';

import { useI18n, useStatusContext } from '@app/providers';
import { SeedInfo } from '@renderer/components/common/QrCode/common/types';
import { IS_WINDOWS, toAddress } from '@shared/lib/utils';
import type { ChainAccount, ChainId, ShardAccount } from '@shared/core';
import { VaultInfoPopover } from './VaultInfoPopover';
import { useAltKeyPressed, useToggle } from '@shared/lib/hooks';
import { manageDynamicDerivationsModel } from './model/manage-dynamic-derivations-model';
import { chainsService } from '@entities/network';
import { RootAccount, accountUtils } from '@entities/wallet';
import { KeyConstructor } from '@features/wallets';
import { ChainTitle } from '@entities/chain';
import { DerivedAccount } from './DerivedAccount';
import {
  Animation,
  Button,
  Input,
  InputHint,
  HeaderTitleText,
  SmallTitleText,
  HelpText,
  FootnoteText,
  Icon,
  Accordion,
} from '@shared/ui';

type Props = {
  seedInfo: SeedInfo[];
  onBack: () => void;
  onComplete: () => void;
};

export const ManageDynamicDerivations = ({ seedInfo, onBack, onComplete }: Props) => {
  const { t } = useI18n();
  const { showStatus } = useStatusContext();
  const isAltPressed = useAltKeyPressed();

  const accordions = useRef<Record<string, { el: null | HTMLButtonElement; isOpen: boolean }>>({});

  const accounts = useUnit(manageDynamicDerivationsModel.$accounts);
  const isPending = useUnit(manageDynamicDerivationsModel.$submitPending);

  const [isConstructorModalOpen, toggleConstructorModal] = useToggle();
  const [chainsIds, setChainsIds] = useState<ChainId[]>([]);
  const [chainElements, setChainElements] = useState<[string, Array<ChainAccount | ShardAccount[]>][]>([]);

  const {
    submit,
    isValid,
    fields: { name },
  } = useForm(manageDynamicDerivationsModel.$walletForm);

  useEffect(() => {
    manageDynamicDerivationsModel.events.formInitiated(seedInfo);
  }, [seedInfo]);

  useEffect(() => {
    manageDynamicDerivationsModel.events.callbacksChanged({ onSubmit: onComplete });
  }, [onComplete]);

  useEffect(() => {
    const chainIds = chainsService.getChainsData({ sort: true }).map((chain) => chain.chainId);
    setChainsIds(chainIds);
  }, []);

  useEffect(() => {
    if (chainsIds.length === 0) return;

    const chainsMap = chainsIds.reduce<Record<ChainId, Array<ChainAccount | ShardAccount[]>>>((acc, chainId) => {
      return { ...acc, [chainId]: [] };
    }, {});

    accounts.forEach((account) => {
      const chainId = Array.isArray(account) ? account[0].chainId : account.chainId;

      chainsMap[chainId].push(account);
    });

    setChainElements(Object.entries(chainsMap));
  }, [accounts, chainsIds.length]);

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

    showStatus({
      title: name?.value.trim(),
      description: t('createMultisigAccount.successMessage'),
      content: <Animation variant="success" />,
    });

    submit();
  };

  const handleConstructorKeys = (keys: Array<ChainAccount | ShardAccount[]>) => {
    manageDynamicDerivationsModel.events.keysAdded(keys);
    toggleConstructorModal();
  };

  const goBack = () => {
    // reset();
    onBack();
  };

  const button = IS_WINDOWS ? (
    <>
      <HelpText as="span" className="text-text-tertiary">
        {t('onboarding.vault.hotkeyAlt')}
      </HelpText>
      <Icon name="hotkeyAlt" />
    </>
  ) : (
    <>
      <HelpText as="span" className="text-text-tertiary">
        {t('onboarding.vault.hotkeyOption')}
      </HelpText>
      <Icon name="hotkeyOption" />
    </>
  );

  const publicKey = u8aToHex(seedInfo[0]?.multiSigner.public);
  const publicKeyAddress = toAddress(publicKey, { prefix: 1 });
  const walletName = isAltPressed || !name?.value ? publicKeyAddress : name?.value;

  return (
    <>
      <div className="w-[472px] flex flex-col px-5 py-4 bg-white rounded-l-lg">
        <HeaderTitleText className="mb-10">{t('onboarding.vault.title')}</HeaderTitleText>
        <SmallTitleText className="mb-6">{t('onboarding.vault.manageTitle')}</SmallTitleText>

        <form className="flex flex-col h-full" onSubmit={submitForm}>
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

          <div className="flex flex-1 justify-between items-end">
            <Button variant="text" onClick={goBack}>
              {t('onboarding.backButton')}
            </Button>

            <Button type="submit" disabled={!isValid || isPending}>
              {t('onboarding.continueButton')}
            </Button>
          </div>
        </form>
      </div>

      <div className="w-[472px] flex flex-col bg-input-background-disabled pt-4 rounded-r-lg">
        <div className="flex items-center justify-between px-5 mt-[52px] mb-6">
          <div className="flex items-center gap-x-1.5">
            <SmallTitleText>{t('onboarding.vault.vaultTitle')}</SmallTitleText>
            <VaultInfoPopover />
          </div>
          <div className="flex items-center gap-4">
            <Button size="sm" pallet="secondary" onClick={toggleConstructorModal}>
              {t('onboarding.vault.addMoreKeysButton')}
            </Button>
            <Button size="sm" pallet="secondary" onClick={() => {}}>
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
            <RootAccount name={walletName} accountId={publicKey} />
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
                    <div className="flex gap-2">
                      <ChainTitle fontClass="text-text-primary" chainId={chainId as ChainId} />
                      <FootnoteText className="text-text-tertiary">{chainAccounts.length}</FootnoteText>
                    </div>
                  </Accordion.Button>
                  <Accordion.Content className="flex flex-col gap-2">
                    {chainAccounts.map((account, index) => (
                      <DerivedAccount
                        key={accountUtils.getDerivationPath(account)}
                        showDerivationPath={isAltPressed}
                        account={account}
                      />
                    ))}
                  </Accordion.Content>
                </Accordion>
              );
            })}
          </div>
        </div>
      </div>

      <KeyConstructor
        existingKeys={accounts}
        isOpen={isConstructorModalOpen}
        onClose={toggleConstructorModal}
        onConfirm={handleConstructorKeys}
      />
    </>
  );
};
