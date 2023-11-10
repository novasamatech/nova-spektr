import cn from 'classnames';
import { FormEvent, useEffect, useState } from 'react';
import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import keyBy from 'lodash/keyBy';
import { Trans } from 'react-i18next';

import { useI18n } from '@renderer/app/providers';
import { ChainTitle } from '@renderer/entities/chain';
import { SeedInfo } from '@renderer/components/common/QrCode/common/types';
import { isWindows, toAccountId } from '@renderer/shared/lib/utils';
import {
  Button,
  Input,
  InputHint,
  HeaderTitleText,
  SmallTitleText,
  HelpText,
  Accordion,
  FootnoteText,
  Icon,
} from '@renderer/shared/ui';
import type { Chain, ChainAccount, ChainId } from '@renderer/shared/core';
import { VaultInfoPopover } from './VaultInfoPopover';
import { useAltKeyPressed } from '@renderer/shared/lib/hooks';
import { manageDynamicDerivationsModel } from './model/manage-dynamic-derivations-model';
import { chainsService } from '@renderer/entities/network';
import { DerivedAccount, RootAccount } from '@renderer/entities/wallet';

type Props = {
  seedInfo: SeedInfo[];
  onBack: () => void;
  onComplete: () => void;
};

export const ManageDynamicDerivations = ({ seedInfo, onBack, onComplete }: Props) => {
  const { t } = useI18n();

  const accounts = useUnit(manageDynamicDerivationsModel.$accounts);
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

  const isAltPressed = useAltKeyPressed();

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const goBack = () => {
    // reset();
    onBack();
  };

  const button = isWindows ? (
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

            <Button type="submit" disabled={!isValid}>
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

        <div className="overflow-y-auto pl-3 pr-3.5">
          <div className="flex items-center justify-between w-full gap-2">
            <RootAccount
              name={name?.value || seedInfo[0]?.derivedKeys?.[0]?.address}
              accountId={toAccountId(seedInfo[0]?.derivedKeys?.[0]?.address)}
            />
          </div>

          <div className="flex flex-col gap-2 ml-8">
            {Object.entries(chainsObject).map(([chainId]) => {
              const chainAccounts = accounts.filter(
                (account) => (account as ChainAccount).chainId === chainId,
              ) as ChainAccount[];

              if (!chainAccounts.length) return;

              return (
                <Accordion key={chainId} isDefaultOpen>
                  <Accordion.Button buttonClass="mb-2 p-2">
                    <div className="flex gap-2">
                      <ChainTitle fontClass="text-text-primary" chainId={chainId as ChainId} />
                      <FootnoteText className="text-text-tertiary">{chainAccounts.length}</FootnoteText>
                    </div>
                  </Accordion.Button>
                  <Accordion.Content className="flex flex-col gap-2">
                    {chainAccounts.map((account) => (
                      <DerivedAccount
                        key={account.accountId}
                        keyType={account.keyType}
                        derivationPath={account.derivationPath}
                        showDerivationPath={isAltPressed}
                      />
                    ))}
                  </Accordion.Content>
                </Accordion>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};
