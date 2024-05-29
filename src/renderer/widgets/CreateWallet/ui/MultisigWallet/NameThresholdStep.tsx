import { useUnit } from 'effector-react';
import { useForm } from 'effector-forms';
import { FormEvent } from 'react';

import { Alert, Button, Input, InputHint, Select, SmallTitleText } from '@shared/ui';
import { useI18n } from '@app/providers';
import { DropdownOption } from '@shared/ui/types';
import { networkModel, networkUtils } from '@entities/network';
import { ChainTitle } from '@entities/chain';
import { Signatory, type Chain } from '@shared/core';
import { formModel } from '../../model/form-model';
import { flowModel } from '../../model/flow-model';
import { Step } from '../../lib/types';

const getThresholdOptions = (optionsAmount: number): DropdownOption<number>[] => {
  if (optionsAmount === 0) return [];

  return Array.from({ length: optionsAmount }, (_, index) => {
    const value = index + 2;

    return {
      id: value.toString(),
      element: value,
      value,
    };
  });
};

const getChainOptions = (chains: Chain[]): DropdownOption<Chain>[] => {
  return chains
    .filter((c) => networkUtils.isMultisigSupported(c.options))
    .map((chain) => ({
      id: chain.chainId.toString(),
      element: <ChainTitle chain={chain} />,
      value: chain,
    }));
};

type Props = {
  signatories: Signatory[];
};

export const NameThresholdStep = ({ signatories }: Props) => {
  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);
  const { fields, submit } = useForm(formModel.$createMultisigForm);
  const multisigAlreadyExists = useUnit(formModel.$multisigAlreadyExists);

  const thresholdOptions = getThresholdOptions(signatories.length - 1);
  const chainOptions = getChainOptions(Object.values(chains));

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <section className="flex flex-col gap-y-4 px-3 py-4 flex-1 h-full">
      <SmallTitleText className="py-2 px-2">{t('createMultisigAccount.walletFormTitle')}</SmallTitleText>

      <form id="multisigForm" className="flex flex-col px-2 gap-y-4 h-full" onSubmit={submitForm}>
        <div className="flex gap-x-4 items-end">
          <Input
            placeholder={t('createMultisigAccount.namePlaceholder')}
            label={t('createMultisigAccount.walletNameLabel')}
            invalid={!!fields.name.hasError()}
            value={fields.name.value}
            onChange={fields.name.onChange}
          />
          <InputHint variant="error" active={!!fields.name.hasError()}>
            {fields.name.errorText()}
          </InputHint>
        </div>
        <div className="flex gap-x-4 items-end">
          <Select
            placeholder={t('createMultisigAccount.chainPlaceholder')}
            label={t('createMultisigAccount.chainName')}
            className="w-[204px]"
            selectedId={fields.chain.value.chainId.toString()}
            options={chainOptions}
            onChange={({ value }) => fields.chain.onChange(value)}
          />
        </div>
        <div className="flex gap-x-4 items-end">
          <Select
            placeholder={t('createMultisigAccount.thresholdPlaceholder')}
            label={t('createMultisigAccount.thresholdName')}
            className="w-[204px]"
            selectedId={fields.threshold.value.toString()}
            options={thresholdOptions}
            invalid={fields.threshold.hasError()}
            onChange={({ value }) => fields.threshold.onChange(value)}
          />
          <InputHint className="flex-1" active>
            {t('createMultisigAccount.thresholdHint')}
          </InputHint>
        </div>

        <Alert
          active={Boolean(multisigAlreadyExists)}
          title={t('createMultisigAccount.multisigExistTitle')}
          variant="error"
        >
          <Alert.Item withDot={false}>{t('createMultisigAccount.multisigExistText')}</Alert.Item>
        </Alert>

        <div className="flex justify-between items-center mt-auto">
          <Button variant="text" onClick={() => flowModel.events.stepChanged(Step.INIT)}>
            {t('createMultisigAccount.backButton')}
          </Button>
          <Button key="create" type="submit">
            {t('createMultisigAccount.continueButton')}
          </Button>
        </div>
      </form>
    </section>
  );
};
