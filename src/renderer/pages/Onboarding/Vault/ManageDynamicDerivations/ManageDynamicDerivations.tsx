import cn from 'classnames';
import { FormEvent, Fragment, useEffect, useState } from 'react';
import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import keyBy from 'lodash/keyBy';
import { Trans } from 'react-i18next';
import { u8aToHex } from '@polkadot/util';
import { Transition } from '@headlessui/react';

import { useI18n, useStatusContext } from '@app/providers';
import { ChainTitle } from '@entities/chain';
import { SeedInfo } from '@renderer/components/common/QrCode/common/types';
import { IS_WINDOWS, toAddress } from '@shared/lib/utils';
import {
  Animation,
  Button,
  Input,
  InputHint,
  HeaderTitleText,
  SmallTitleText,
  HelpText,
  Accordion,
  FootnoteText,
  Icon,
} from '@shared/ui';
import type { Chain, ChainAccount, ChainId } from '@shared/core';
import { VaultInfoPopover } from './VaultInfoPopover';
import { useAltKeyPressed } from '@shared/lib/hooks';
import { manageDynamicDerivationsModel } from './model/manage-dynamic-derivations-model';
import { chainsService } from '@entities/network';
import { DerivedAccount, RootAccount } from '@entities/wallet';

type Props = {
  seedInfo: SeedInfo[];
  onBack: () => void;
  onComplete: () => void;
};

export const ManageDynamicDerivations = ({ seedInfo, onBack, onComplete }: Props) => {
  const { t } = useI18n();
  const isAltPressed = useAltKeyPressed();
  const { showStatus } = useStatusContext();

  const accounts = useUnit(manageDynamicDerivationsModel.$accounts);
  const isPending = useUnit(manageDynamicDerivationsModel.$submitPending);
  const [chainsObject, setChainsObject] = useState<Record<ChainId, Chain>>({});

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
    const chains = chainsService.getChainsData();
    const chainsMap = keyBy(chainsService.sortChains(chains), 'chainId');
    setChainsObject(chainsMap);
  }, []);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();

    showStatus({
      title: name?.value.trim(),
      description: t('createMultisigAccount.successMessage'),
      content: <Animation variant="success" />,
    });

    submit();
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

      <div className="w-[472px] flex flex-col bg-input-background-disabled py-4 rounded-r-lg">
        <div className="flex items-center justify-between px-5 mt-[52px] mb-6">
          <div className="flex items-center gap-x-1.5">
            <SmallTitleText>{t('onboarding.vault.vaultTitle')}</SmallTitleText>
            <VaultInfoPopover />
          </div>
          <div className="flex items-center gap-4">
            <Button size="sm" pallet="secondary" onClick={() => {}}>
              {t('onboarding.vault.addMoreKeysButton')}
            </Button>
            <Button size="sm" pallet="secondary" onClick={() => {}}>
              {t('onboarding.vault.importButton')}
            </Button>
          </div>
        </div>

        <div className="pl-5 mb-6 ">
          <HelpText className="flex items-center gap-1 text-text-tertiary">
            <Trans
              t={t}
              i18nKey="onboarding.vault.altHint"
              components={{
                button,
              }}
            />
          </HelpText>
        </div>

        <div className="overflow-y-auto h-[470px] pl-3 pr-3.5">
          <div className="flex items-center justify-between w-full gap-2 pb-4">
            <RootAccount name={walletName} accountId={publicKey} />
          </div>

          <FootnoteText className="text-text-tertiary ml-9 pl-2">{t('onboarding.vault.accountTitle')}</FootnoteText>

          <div className="flex flex-col gap-2 divide-y ml-9">
            {Object.entries(chainsObject).map(([chainId]) => {
              const chainAccounts = accounts.filter(
                (account) => (account as ChainAccount).chainId === chainId,
              ) as ChainAccount[];

              if (!chainAccounts.length) return;

              const accordionButton = (
                <div className="flex gap-2">
                  <ChainTitle fontClass="text-text-primary" chainId={chainId as ChainId} />
                  <FootnoteText className="text-text-tertiary">{chainAccounts.length}</FootnoteText>
                </div>
              );

              const accordionContent = chainAccounts.map((account) => (
                <DerivedAccount
                  key={account.accountId}
                  keyType={account.keyType}
                  derivationPath={account.derivationPath}
                  showDerivationPath={isAltPressed}
                />
              ));

              return (
                <Accordion key={chainId} className="pt-2">
                  <Accordion.Button buttonClass="mb-2 p-2">{accordionButton}</Accordion.Button>

                  <Transition
                    appear
                    show={isAltPressed}
                    as={Fragment}
                    enter="transition-opacity duration-50"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="transition-opacity duration-50"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <div className="flex flex-col gap-2">{accordionContent}</div>
                  </Transition>

                  {!isAltPressed && (
                    <Accordion.Content className="flex flex-col gap-2">{accordionContent}</Accordion.Content>
                  )}
                </Accordion>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};
