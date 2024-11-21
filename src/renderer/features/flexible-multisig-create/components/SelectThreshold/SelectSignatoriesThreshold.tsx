import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type FormEvent, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { Step } from '@/shared/lib/utils';
import { Alert, Button, InputHint, SmallTitleText } from '@/shared/ui';
import { Box, Select } from '@/shared/ui-kit';
import { walletModel } from '@/entities/wallet';
import { flexibleMultisigModel } from '../../model/flexible-multisig-create';
import { formModel } from '../../model/form-model';
import { signatoryModel } from '../../model/signatory-model';
import { MultisigFees } from '../MultisigFees';

import { SelectSignatories } from './SelectSignatories';

const MIN_THRESHOLD = 2;

export const SelectSignatoriesThreshold = () => {
  const { t } = useI18n();

  const [hasClickedNext, setHasClickedNext] = useState(false);

  const {
    fields: { threshold },
    submit,
  } = useForm(formModel.$createMultisigForm);
  const chain = useUnit(formModel.$chain);
  const signatories = useUnit(signatoryModel.$signatories);
  const multisigAlreadyExists = useUnit(formModel.$multisigAlreadyExists);
  const hiddenMultisig = useUnit(formModel.$hiddenMultisig);
  const ownedSignatoriesWallets = useUnit(signatoryModel.$ownedSignatoriesWallets);
  const hasDuplicateSignatories = useUnit(signatoryModel.$hasDuplicateSignatories);
  const hasEmptySignatories = useUnit(signatoryModel.$hasEmptySignatories);
  const hasEmptySignatoryName = useUnit(signatoryModel.$hasEmptySignatoryName);

  const hasOwnedSignatory = !!ownedSignatoriesWallets && ownedSignatoriesWallets?.length > 0;
  const hasEnoughSignatories = signatories.length >= MIN_THRESHOLD;

  const isThresholdValid = threshold.value >= MIN_THRESHOLD && threshold.value <= signatories.length;
  const canSubmit =
    hasOwnedSignatory &&
    hasEnoughSignatories &&
    !multisigAlreadyExists &&
    !hasEmptySignatories &&
    isThresholdValid &&
    !hasEmptySignatoryName &&
    !hasDuplicateSignatories &&
    !hiddenMultisig;

  const onSubmit = (event: FormEvent) => {
    if (!hasClickedNext) {
      setHasClickedNext(true);
    }

    if (!canSubmit || !ownedSignatoriesWallets[0]?.accounts[0]) return;
    signatoryModel.events.getSignatoriesBalance(ownedSignatoriesWallets);

    if (ownedSignatoriesWallets.length > 1) {
      flexibleMultisigModel.events.stepChanged(Step.SIGNER_SELECTION);

      return;
    }

    flexibleMultisigModel.events.signerSelected(ownedSignatoriesWallets[0].accounts[0]);
    event.preventDefault();
    submit();
  };

  return (
    <section className="flex h-full max-h-[594px] w-modal-lg flex-1 flex-col">
      <SmallTitleText className="mb-4 border-b border-container-border px-5 pb-4 text-text-primary">
        {t('createMultisigAccount.multisigStep', { step: 2 })}{' '}
        {t('createMultisigAccount.flexibleMultisig.signatoryThresholdDescription')}
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
            active={hasClickedNext && hasEmptySignatories}
            title={t('createMultisigAccount.notEmptySignatoryTitle')}
            variant="error"
          >
            <Alert.Item withDot={false}>{t('createMultisigAccount.notEmptySignatory')}</Alert.Item>
          </Alert>

          <Alert
            active={hasClickedNext && hasEmptySignatoryName}
            title={t('createMultisigAccount.notEmptySignatoryNameTitle')}
            variant="error"
          >
            <Alert.Item withDot={false}>{t('createMultisigAccount.notEmptySignatoryName')}</Alert.Item>
          </Alert>
        </div>
        <div className="flex items-center gap-x-4">
          <Box width="300px">
            <Select
              placeholder={t('createMultisigAccount.thresholdPlaceholder')}
              value={(threshold.value || '').toString()}
              invalid={threshold.hasError()}
              disabled={signatories.length < 2}
              onChange={(value) => threshold.onChange(Number(value))}
            >
              {Array.from({ length: signatories.length - 1 }, (_, index) => (
                <Select.Item key={index} value={(index + 2).toString()}>
                  {index + 2}
                </Select.Item>
              ))}
            </Select>
          </Box>
          <InputHint className="flex-1 pt-5" active>
            {t('createMultisigAccount.thresholdHint')}
          </InputHint>
        </div>
        <div className="flex items-end gap-x-4">
          <Alert
            active={hasDuplicateSignatories}
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

          <Alert active={Boolean(hiddenMultisig)} title={t('createMultisigAccount.multisigExistTitle')} variant="error">
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
              flexibleMultisigModel.events.stepChanged(Step.NAME_NETWORK);
            }}
          >
            {t('createMultisigAccount.backButton')}
          </Button>
          <div className="mt-auto flex items-center justify-end">
            {chain?.assets?.[0] ? <MultisigFees asset={chain.assets[0]} /> : null}
            <Button key="create" type="submit" disabled={hasClickedNext && !canSubmit} onClick={onSubmit}>
              {t('createMultisigAccount.continueButton')}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
