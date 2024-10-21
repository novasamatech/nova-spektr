import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type FormEvent, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { Alert, Button, InputHint, Select, SmallTitleText } from '@/shared/ui';
import { type DropdownOption } from '@/shared/ui/types';
import { MultisigCreationFees } from '@/widgets/CreateWallet/ui/MultisigWallet/components';
import { Step } from '../../lib/types';
import { flowModel } from '../../model/flow-model';
import { formModel } from '../../model/form-model';
import { signatoryModel } from '../../model/signatory-model';

import { SelectSignatories } from './components/SelectSignatories';

const MIN_THRESHOLD = 2;
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

export const SelectSignatoriesThreshold = () => {
  const { t } = useI18n();

  const [hasClickedNext, setHasClickedNext] = useState(false);
  const signatoriesMap = useUnit(signatoryModel.$signatories);
  const signatories = Array.from(signatoriesMap.values());
  const fakeTx = useUnit(flowModel.$fakeTx);
  const {
    fields: { threshold, chain },
    submit,
  } = useForm(formModel.$createMultisigForm);
  const multisigAlreadyExists = useUnit(formModel.$multisigAlreadyExists);
  const ownedSignatoriesWallets = useUnit(signatoryModel.$ownedSignatoriesWallets);

  const thresholdOptions = getThresholdOptions(signatories.length - 1);

  const hasOwnedSignatory = !!ownedSignatoriesWallets && ownedSignatoriesWallets?.length > 0;
  const hasEnoughSignatories = signatories.length >= MIN_THRESHOLD;
  const hasEmptySignatory = signatories.map(({ address }) => address).includes('');
  const isThresholdValid = threshold.value >= MIN_THRESHOLD && threshold.value <= signatories.length;
  const canSubmit =
    hasOwnedSignatory && hasEnoughSignatories && !multisigAlreadyExists && !hasEmptySignatory && isThresholdValid;

  const api = useUnit(flowModel.$api);

  const onSubmit = (event: FormEvent) => {
    if (!hasClickedNext) {
      setHasClickedNext(true);
    }

    if (!canSubmit) return;

    if ((ownedSignatoriesWallets || []).length > 1) {
      flowModel.events.stepChanged(Step.SIGNER_SELECTION);

      return;
    } else {
      flowModel.events.signerSelected(ownedSignatoriesWallets[0].accounts[0].accountId);
      event.preventDefault();
      submit();
    }
  };

  return (
    <section className="flex h-full flex-1 flex-col">
      <SmallTitleText className="px-5 text-text-secondary">
        {t('createMultisigAccount.multisigStep', { step: 2 })}
      </SmallTitleText>
      <SmallTitleText className="mb-6 border-b border-container-border px-5 pb-6 font-medium text-text-tertiary">
        {t('createMultisigAccount.signatoryThresholdDescription')}
      </SmallTitleText>
      <div className="flex flex-col gap-y-4 px-5 py-4">
        <SelectSignatories />
        <div className="flex items-end gap-x-4">
          <Alert
            active={hasClickedNext && !hasOwnedSignatory && signatories.length > 0}
            title={t('createMultisigAccount.noOwnSignatoryTitle')}
            variant="error"
          >
            <Alert.Item withDot={false}>{t('createMultisigAccount.noOwnSignatory')}</Alert.Item>
          </Alert>
          <Alert
            active={hasClickedNext && hasOwnedSignatory && !hasEnoughSignatories}
            title={t('createMultisigAccount.notEnoughSignatoriesTitle')}
            variant="error"
          >
            <Alert.Item withDot={false}>{t('createMultisigAccount.notEnoughSignatories')}</Alert.Item>
          </Alert>
          <Alert
            active={hasClickedNext && hasEmptySignatory}
            title={t('createMultisigAccount.notEmptySignatoryTitle')}
            variant="error"
          >
            <Alert.Item withDot={false}>{t('createMultisigAccount.notEmptySignatory')}</Alert.Item>
          </Alert>
        </div>
        <div className="flex items-end gap-x-4">
          <Select
            placeholder={t('createMultisigAccount.thresholdPlaceholder')}
            label={t('createMultisigAccount.thresholdName')}
            className="w-[368px]"
            selectedId={threshold.value.toString()}
            options={thresholdOptions}
            invalid={threshold.hasError()}
            position={thresholdOptions.length > 2 ? 'up' : 'down'}
            onChange={({ value }) => threshold.onChange(value)}
          />
          <InputHint className="flex-1" active>
            {t('createMultisigAccount.thresholdHint')}
          </InputHint>
        </div>
        <div className="flex items-end gap-x-4">
          <Alert
            active={Boolean(multisigAlreadyExists)}
            title={t('createMultisigAccount.multisigExistTitle')}
            variant="error"
          >
            <Alert.Item withDot={false}>{t('createMultisigAccount.multisigExistText')}</Alert.Item>
          </Alert>
          <Alert
            active={!isThresholdValid && hasClickedNext}
            title={t('createMultisigAccount.thresholdErrorTitle')}
            variant="error"
          >
            <Alert.Item withDot={false}>
              {t('createMultisigAccount.thresholdErrorDescription', { minThreshold: MIN_THRESHOLD })}
            </Alert.Item>
          </Alert>
        </div>
        <div className="mt-auto flex items-center justify-between">
          <Button
            variant="text"
            onClick={() => {
              flowModel.events.stepChanged(Step.NAME_NETWORK);
            }}
          >
            {t('createMultisigAccount.backButton')}
          </Button>
          <div className="mt-auto flex items-center justify-end">
            <MultisigCreationFees
              api={api}
              asset={chain.value.assets[0]}
              threshold={threshold.value}
              transaction={fakeTx}
            />
            <Button key="create" type="submit" disabled={hasClickedNext && !canSubmit} onClick={onSubmit}>
              {t('createMultisigAccount.continueButton')}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
