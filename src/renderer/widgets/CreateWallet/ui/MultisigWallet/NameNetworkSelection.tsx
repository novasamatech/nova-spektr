import { useUnit } from 'effector-react';
import { useForm } from 'effector-forms';
import { FormEvent } from 'react';

import { Button, FootnoteText, Input, InputHint, Select, SmallTitleText } from '@shared/ui';
import { useI18n } from '@app/providers';
import { DropdownOption } from '@shared/ui/types';
import { networkModel, networkUtils } from '@entities/network';
import { ChainTitle } from '@entities/chain';
import { type Chain } from '@shared/core';
import { formModel } from '../../model/form-model';
import { flowModel } from '../../model/flow-model';
import { Step } from '../../lib/types';

const getChainOptions = (chains: Chain[]): DropdownOption<Chain>[] => {
  return chains
    .filter((c) => networkUtils.isMultisigSupported(c.options))
    .map((chain) => ({
      id: chain.chainId.toString(),
      element: <ChainTitle chain={chain} />,
      value: chain,
    }));
};

export const NameNetworkSelection = () => {
  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);
  const {
    fields: { name, chain },
    submit,
  } = useForm(formModel.$createMultisigForm);

  const chainOptions = getChainOptions(Object.values(chains));
  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <section className="flex flex-col flex-1 h-full">
      <SmallTitleText className="px-5 mt-2 text-text-secondary">
        {t('createMultisigAccount.multisigStep', { step: 1 })}
      </SmallTitleText>
      <SmallTitleText className="px-5 pb-6 mb-6 text-text-tertiary font-medium border-b border-container-border">
        {t('createMultisigAccount.nameNetworkDescription')}
      </SmallTitleText>
      <form id="multisigForm" className="flex flex-col px-5 pb-6 gap-y-4 h-full" onSubmit={submitForm}>
        <div className="flex gap-x-4 items-end">
          <Input
            className="w-[360px]"
            placeholder={t('createMultisigAccount.namePlaceholder')}
            label={t('createMultisigAccount.walletNameLabel')}
            invalid={!!name.hasError()}
            value={name.value}
            onChange={name.onChange}
          />
          <InputHint variant="error" active={!!name.hasError()}>
            {name.errorText()}
          </InputHint>
        </div>
        <div className="flex gap-x-4 items-end">
          <Select
            placeholder={t('createMultisigAccount.chainPlaceholder')}
            label={t('createMultisigAccount.chainName')}
            className="w-[386px]"
            selectedId={chain.value.chainId.toString()}
            options={chainOptions}
            onChange={({ value }) => chain.onChange(value)}
          />
          <FootnoteText className="mt-2 text-text-tertiary">
            {t('createMultisigAccount.networkDescription')}
          </FootnoteText>
        </div>
        <div className="flex justify-end items-center mt-auto">
          <Button
            key="create"
            disabled={!name.isValid}
            onClick={() => flowModel.events.stepChanged(Step.SIGNATORIES_THRESHOLD)}
          >
            {t('createMultisigAccount.continueButton')}
          </Button>
        </div>
      </form>
    </section>
  );
};
