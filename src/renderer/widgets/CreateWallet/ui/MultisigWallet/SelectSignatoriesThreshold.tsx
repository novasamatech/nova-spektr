import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type FormEvent, useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { Alert, Button, InputHint, Select, SmallTitleText } from '@/shared/ui';
import { type DropdownOption } from '@/shared/ui/types';
import { walletModel } from '@/entities/wallet';
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
  const signatories = useUnit(signatoryModel.$signatories);
  const fakeTx = useUnit(flowModel.$fakeTx);
  const {
    fields: { threshold, chain },
    submit,
  } = useForm(formModel.$createMultisigForm);
  const multisigAlreadyExists = useUnit(formModel.$multisigAlreadyExists);
  const hiddenMultisig = useUnit(formModel.$hiddenMultisig);
  const ownedSignatoriesWallets = useUnit(signatoryModel.$ownedSignatoriesWallets);
  const hasDuplicateSignatories = useUnit(signatoryModel.$hasDuplicateSignatories);
  const hasEmptySignatories = useUnit(signatoryModel.$hasEmptySignatories);

  const thresholdOptions = useMemo(() => getThresholdOptions(signatories.length - 1), [signatories.length]);

  const hasOwnedSignatory = !!ownedSignatoriesWallets && ownedSignatoriesWallets?.length > 0;
  const hasEnoughSignatories = signatories.length >= MIN_THRESHOLD;
  const isThresholdValid = threshold.value >= MIN_THRESHOLD && threshold.value <= signatories.length;
  const canSubmit =
    hasOwnedSignatory &&
    hasEnoughSignatories &&
    !multisigAlreadyExists &&
    !hasEmptySignatories &&
    isThresholdValid &&
    !hasDuplicateSignatories;

  const api = useUnit(flowModel.$api);

  const onSubmit = (event: FormEvent) => {
    if (!hasClickedNext) {
      setHasClickedNext(true);
    }

    if (!canSubmit) return;
    signatoryModel.events.getSignatoriesBalance(ownedSignatoriesWallets);

    if ((ownedSignatoriesWallets || []).length > 1) {
      flowModel.events.stepChanged(Step.SIGNER_SELECTION);

      return;
    } else {
      flowModel.events.signerSelected(ownedSignatoriesWallets[0].accounts[0]);
      event.preventDefault();
      submit();
    }
  };

  return (
    <section className="flex h-full flex-1 flex-col">
      <SmallTitleText className="mb-4 border-b border-container-border px-5 pb-4 text-text-primary">
        {t('createMultisigAccount.multisigStep', { step: 2 })}{' '}
        {t('createMultisigAccount.signatoryThresholdDescription')}
      </SmallTitleText>
      <div className="flex flex-col gap-4 px-5 py-4">
        <SelectSignatories />
        <div className="flex items-end gap-4">
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
            active={hasClickedNext && hasEmptySignatories}
            title={t('createMultisigAccount.notEmptySignatoryTitle')}
            variant="error"
          >
            <Alert.Item withDot={false}>{t('createMultisigAccount.notEmptySignatory')}</Alert.Item>
          </Alert>
        </div>
        <div className="flex items-center gap-x-4">
          <Select
            placeholder={t('createMultisigAccount.thresholdPlaceholder')}
            label={t('createMultisigAccount.thresholdName')}
            className="w-[300px]"
            selectedId={threshold.value.toString()}
            options={thresholdOptions}
            invalid={threshold.hasError()}
            disabled={thresholdOptions.length === 0}
            position={thresholdOptions.length > 2 ? 'up' : 'down'}
            onChange={({ value }) => threshold.onChange(value)}
          />
          <InputHint className="flex-1 pt-5" active>
            {t('createMultisigAccount.thresholdHint')}
          </InputHint>
        </div>
        <div className="flex items-end gap-x-4">
          <Alert
            active={Boolean(hasDuplicateSignatories)}
            title={t('createMultisigAccount.duplicateSignatoryErrorTitle')}
            variant="error"
          >
            <Alert.Item withDot={false}>{t('createMultisigAccount.duplicateSignatoryErrorText')}</Alert.Item>
          </Alert>
        </div>
        <div className="flex items-end gap-x-4">
          <Alert active={multisigAlreadyExists} title={t('createMultisigAccount.multisigExistTitle')} variant="error">
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

          <Alert
            active={!multisigAlreadyExists && Boolean(hiddenMultisig)}
            title={t('createMultisigAccount.multisigExistTitle')}
            variant="info"
          >
            <Alert.Item withDot={false}>{t('createMultisigAccount.multisigHiddenExistText')}</Alert.Item>
            <Alert.Item withDot={false}>
              <Button
                variant="text"
                size="sm"
                className="p-0"
                onClick={() => walletModel.events.walletRestored(hiddenMultisig!)}
              >
                {t('createMultisigAccount.restoreButton')}
              </Button>
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
