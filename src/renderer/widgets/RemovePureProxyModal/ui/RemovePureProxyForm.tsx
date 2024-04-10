import { useForm } from 'effector-forms';
import { FormEvent } from 'react';
import { useUnit } from 'effector-react';

import { Button, Input, InputHint, Alert } from '@shared/ui';
import { useI18n } from '@app/providers';
import { MultisigDepositWithLabel, FeeWithLabel, DESCRIPTION_LENGTH } from '@entities/transaction';
import { MultisigAccount } from '@shared/core';
import { SignatorySelector } from '@entities/operations';
import { formModel } from '../model/form-model';
import { removePureProxyModel } from '../model/remove-pure-proxy-model';

type Props = {
  onGoBack: () => void;
};
export const RemovePureProxyForm = ({ onGoBack }: Props) => {
  const { submit } = useForm(formModel.$proxyForm);

  const submitProxy = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <div className="pb-4 px-5">
      <form id="add-proxy-form" className="flex flex-col gap-y-4 mt-4" onSubmit={submitProxy}>
        <Signatories />
        <DescriptionInput />
      </form>
      <div className="flex flex-col gap-y-6 pt-6 pb-4">
        <FeeSection />
        <FeeError />
      </div>
      <ActionSection onGoBack={onGoBack} />
    </div>
  );
};

const Signatories = () => {
  const { t } = useI18n();

  const {
    fields: { signatory },
  } = useForm(formModel.$proxyForm);

  const signatories = useUnit(formModel.$signatories);
  const chain = useUnit(removePureProxyModel.$chain);
  const isMultisig = useUnit(formModel.$isMultisig);

  if (!isMultisig || !chain) return null;

  return (
    <SignatorySelector
      signatory={signatory.value}
      signatories={signatories}
      asset={chain.assets[0]}
      addressPrefix={chain.addressPrefix}
      hasError={signatory.hasError()}
      errorText={t(signatory.errorText())}
      onChange={signatory.onChange}
    />
  );
};

const DescriptionInput = () => {
  const { t } = useI18n();

  const {
    fields: { description },
  } = useForm(formModel.$proxyForm);
  const isMultisig = useUnit(formModel.$isMultisig);

  if (!isMultisig) return null;

  return (
    <div className="flex flex-col gap-y-2">
      <Input
        spellCheck
        label={t('general.input.descriptionLabel')}
        className="w-full"
        placeholder={t('general.input.descriptionPlaceholder')}
        invalid={description.hasError()}
        value={description.value}
        onChange={description.onChange}
      />
      <InputHint variant="error" active={description.hasError()}>
        {description.errorText({
          maxLength: t('proxy.addProxy.maxLengthDescriptionError', { maxLength: DESCRIPTION_LENGTH }),
        })}
      </InputHint>
    </div>
  );
};

const FeeSection = () => {
  const api = useUnit(formModel.$api);
  const fakeTx = useUnit(formModel.$fakeTx);
  const isMultisig = useUnit(formModel.$isMultisig);
  const chain = useUnit(removePureProxyModel.$chain);
  const account = useUnit(removePureProxyModel.$account);

  if (!chain) return null;

  return (
    <div className="flex flex-col gap-y-2">
      {isMultisig && (
        <MultisigDepositWithLabel
          api={api}
          asset={chain.assets[0]}
          threshold={(account as MultisigAccount).threshold}
          onDepositChange={formModel.events.multisigDepositChanged}
        />
      )}

      <FeeWithLabel
        api={api}
        asset={chain.assets[0]}
        transaction={fakeTx}
        onFeeChange={formModel.events.feeChanged}
        onFeeLoading={formModel.events.isFeeLoadingChanged}
      />
    </div>
  );
};

const FeeError = () => {
  const { t } = useI18n();

  const {
    fields: { signatory },
  } = useForm(formModel.$proxyForm);

  const isMultisig = useUnit(formModel.$isMultisig);

  return (
    <Alert title={t('proxy.addProxy.balanceAlertTitle')} active={signatory.hasError()} variant="error">
      <Alert.Item withDot={false}>
        {isMultisig ? t('proxy.addProxy.balanceAlertMultisig') : t('proxy.addProxy.balanceAlertRegular')}
      </Alert.Item>
    </Alert>
  );
};

const ActionSection = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  const canSubmit = useUnit(formModel.$canSubmit);

  return (
    <div className="flex justify-between items-center mt-4">
      <Button variant="text" onClick={onGoBack}>
        {t('operation.goBackButton')}
      </Button>
      <Button form="add-proxy-form" type="submit" disabled={!canSubmit}>
        {t('operation.continueButton')}
      </Button>
    </div>
  );
};
