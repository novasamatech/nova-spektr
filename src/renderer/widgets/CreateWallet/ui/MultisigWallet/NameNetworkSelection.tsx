import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { type Chain } from '@shared/core';
import { Button, FootnoteText, Input, InputHint, Select, SmallTitleText } from '@shared/ui';
import { type DropdownOption } from '@shared/ui/types';
import { ChainTitle } from '@entities/chain';
import { networkModel, networkUtils } from '@entities/network';
import { Step } from '../../lib/types';
import { flowModel } from '../../model/flow-model';
import { formModel } from '../../model/form-model';

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
  } = useForm(formModel.$createMultisigForm);

  const chainOptions = getChainOptions(Object.values(chains));
  const isNameError = name.isTouched && !name.value;

  return (
    <section className="flex h-full flex-1 flex-col">
      <SmallTitleText className="mt-2 px-5 text-text-secondary">
        {t('createMultisigAccount.multisigStep', { step: 1 })}
      </SmallTitleText>
      <SmallTitleText className="mb-6 border-b border-container-border px-5 pb-6 font-medium text-text-tertiary">
        {t('createMultisigAccount.nameNetworkDescription')}
      </SmallTitleText>
      <form id="multisigForm" className="flex h-full flex-col gap-y-4 px-5 pb-6">
        <div className="flex items-end gap-x-4">
          <Input
            className="w-[360px]"
            placeholder={t('createMultisigAccount.namePlaceholder')}
            label={t('createMultisigAccount.walletNameLabel')}
            invalid={isNameError}
            value={name.value}
            onChange={name.onChange}
          />
          <InputHint variant="error" active={isNameError}>
            {t('createMultisigAccount.disabledError.emptyName')}
          </InputHint>
        </div>
        <div className="flex items-end gap-x-4">
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
        <div className="mt-auto flex items-center justify-end">
          <Button
            key="create"
            disabled={isNameError || !name.isTouched}
            onClick={() => flowModel.events.stepChanged(Step.SIGNATORIES_THRESHOLD)}
          >
            {t('createMultisigAccount.continueButton')}
          </Button>
        </div>
      </form>
    </section>
  );
};
