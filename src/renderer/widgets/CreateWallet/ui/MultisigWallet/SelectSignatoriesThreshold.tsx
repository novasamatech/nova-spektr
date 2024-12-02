import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type FormEvent, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { Button, Icon, InputHint, SmallTitleText } from '@/shared/ui';
import { Box, Field, Modal, Select } from '@/shared/ui-kit';
import { Step } from '../../lib/types';
import { flowModel } from '../../model/flow-model';
import { formModel } from '../../model/form-model';
import { signatoryModel } from '../../model/signatory-model';

import { MultisigCreationFees } from './components';
import { Signatory } from './components/Signatory';

const MIN_THRESHOLD = 2;

export const SelectSignatoriesThreshold = () => {
  const { t } = useI18n();

  const {
    fields: { threshold },
    submit,
  } = useForm(formModel.$createMultisigForm);

  const chain = useUnit(formModel.$chain);
  const multisigAlreadyExists = useUnit(formModel.$multisigAlreadyExists);
  const hiddenMultisig = useUnit(formModel.$hiddenMultisig);
  const fakeTx = useUnit(flowModel.$fakeTx);

  const api = useUnit(flowModel.$api);
  const signatories = useUnit(signatoryModel.$signatories);
  const ownedSignatoriesWallets = useUnit(signatoryModel.$ownedSignatoriesWallets);
  const hasDuplicateSignatories = useUnit(signatoryModel.$hasDuplicateSignatories);
  const hasEmptySignatories = useUnit(signatoryModel.$hasEmptySignatories);
  const hasEmptySignatoryName = useUnit(signatoryModel.$hasEmptySignatoryName);

  const [hasClickedNext, setHasClickedNext] = useState(false);

  const hasOwnedSignatory = !!ownedSignatoriesWallets && ownedSignatoriesWallets?.length > 0;
  const hasEnoughSignatories = signatories.length >= MIN_THRESHOLD;
  const isThresholdValid = threshold.value >= MIN_THRESHOLD && threshold.value <= signatories.length;

  const asset = chain?.assets.at(0);

  const canSubmit =
    hasOwnedSignatory &&
    hasEnoughSignatories &&
    !multisigAlreadyExists &&
    !hasEmptySignatories &&
    !hasEmptySignatoryName &&
    isThresholdValid &&
    !hasDuplicateSignatories &&
    !hiddenMultisig;

  const onSubmit = (event: FormEvent) => {
    if (!hasClickedNext) {
      setHasClickedNext(true);
    }

    if (!canSubmit) return;
    signatoryModel.events.getSignatoriesBalance(ownedSignatoriesWallets);

    if ((ownedSignatoriesWallets || []).length > 1) {
      flowModel.events.stepChanged(Step.SIGNER_SELECTION);

      return;
    }

    flowModel.events.signerSelected(ownedSignatoriesWallets[0].accounts[0]);
    event.preventDefault();
    submit();
  };

  return (
    <>
      <Modal.Content>
        <section className="flex h-full flex-col">
          <SmallTitleText className="border-b border-container-border px-5 pb-6 text-text-primary">
            {t('createMultisigAccount.multisigStep', { step: 2 })}{' '}
            {t('createMultisigAccount.signatoryThresholdDescription')}
          </SmallTitleText>

          <Box direction="column" gap={6} padding={[6, 5, 4, 5]} height="100%">
            {signatories.map((value, index) => (
              <Signatory
                key={`${value.address}_${index}`}
                isOwnAccount={index === 0}
                signatoryIndex={index}
                signatoryName={value.name}
                signatoryAddress={value.address}
                selectedWalletId={value.walletId}
                onDelete={signatoryModel.events.deleteSignatory}
              />
            ))}

            <Button
              size="sm"
              variant="text"
              className="h-8.5 w-max justify-center"
              suffixElement={<Icon className="text-icon-primary" name="add" size={16} />}
              onClick={() => signatoryModel.events.addSignatory({ name: '', address: '', walletId: '' })}
            >
              {t('createMultisigAccount.addNewSignatory')}
            </Button>

            <hr className="-mx-5 w-full border-divider" />

            <div className="flex gap-x-6">
              <Box width="232px">
                <Field text={t('createMultisigAccount.thresholdName')}>
                  <Select
                    placeholder={t('createMultisigAccount.thresholdPlaceholder')}
                    value={(threshold.value || '').toString()}
                    invalid={threshold.hasError()}
                    disabled={[0, 1].includes(signatories.length)}
                    onChange={(value) => threshold.onChange(Number(value))}
                  >
                    {Array.from({ length: signatories.length - 1 }, (_, index) => (
                      <Select.Item key={index} value={(index + 2).toString()}>
                        {index + 2}
                      </Select.Item>
                    ))}
                  </Select>
                </Field>
              </Box>
              <InputHint active className="mt-8.5 flex-1">
                {t('createMultisigAccount.thresholdHint')}
              </InputHint>
            </div>
          </Box>
        </section>
      </Modal.Content>

      <Modal.Footer>
        <Box fitContainer direction="row" horizontalAlign="space-between" verticalAlign="center">
          <Button variant="text" onClick={() => flowModel.events.stepChanged(Step.NAME_NETWORK)}>
            {t('createMultisigAccount.backButton')}
          </Button>

          <div className="flex items-center justify-end gap-x-6">
            {nonNullable(asset) ? (
              <MultisigCreationFees api={api} asset={asset} threshold={threshold.value} transaction={fakeTx} />
            ) : null}

            <Button key="create" type="submit" disabled={hasClickedNext && !canSubmit} onClick={onSubmit}>
              {t('createMultisigAccount.continueButton')}
            </Button>
          </div>
        </Box>
      </Modal.Footer>

      {/*<div className='flex items-end gap-4'>*/}
      {/*  <Alert*/}
      {/*    active={hasClickedNext && !hasOwnedSignatory && signatories.length > 0}*/}
      {/*    title={t('createMultisigAccount.noOwnSignatoryTitle')}*/}
      {/*    variant='error'*/}
      {/*  >*/}
      {/*    <Alert.Item withDot={false}>{t('createMultisigAccount.noOwnSignatory')}</Alert.Item>*/}
      {/*  </Alert>*/}

      {/*  <Alert*/}
      {/*    active={hasClickedNext && hasOwnedSignatory && !hasEnoughSignatories}*/}
      {/*    title={t('createMultisigAccount.notEnoughSignatoriesTitle')}*/}
      {/*    variant='error'*/}
      {/*  >*/}
      {/*    <Alert.Item withDot={false}>{t('createMultisigAccount.notEnoughSignatories')}</Alert.Item>*/}
      {/*  </Alert>*/}

      {/*  <Alert*/}
      {/*    active={hasClickedNext && hasEmptySignatories}*/}
      {/*    title={t('createMultisigAccount.notEmptySignatoryTitle')}*/}
      {/*    variant='error'*/}
      {/*  >*/}
      {/*    <Alert.Item withDot={false}>{t('createMultisigAccount.notEmptySignatory')}</Alert.Item>*/}
      {/*  </Alert>*/}

      {/*  <Alert*/}
      {/*    active={hasClickedNext && hasEmptySignatoryName}*/}
      {/*    title={t('createMultisigAccount.notEmptySignatoryNameTitle')}*/}
      {/*    variant='error'*/}
      {/*  >*/}
      {/*    <Alert.Item withDot={false}>{t('createMultisigAccount.notEmptySignatoryName')}</Alert.Item>*/}
      {/*  </Alert>*/}
      {/*</div>*/}

      {/*<div className='flex items-end gap-x-4'>*/}
      {/*  <Alert*/}
      {/*    active={Boolean(hasDuplicateSignatories)}*/}
      {/*    title={t('createMultisigAccount.duplicateSignatoryErrorTitle')}*/}
      {/*    variant='error'*/}
      {/*  >*/}
      {/*    <Alert.Item withDot={false}>{t('createMultisigAccount.duplicateSignatoryErrorText')}</Alert.Item>*/}
      {/*  </Alert>*/}
      {/*</div>*/}
      {/*<div className='flex items-end gap-x-4'>*/}
      {/*  <Alert active={multisigAlreadyExists} title={t('createMultisigAccount.multisigExistTitle')} variant='error'>*/}
      {/*    <Alert.Item withDot={false}>{t('createMultisigAccount.multisigExistText')}</Alert.Item>*/}
      {/*  </Alert>*/}

      {/*  <Alert*/}
      {/*    active={!isThresholdValid && hasClickedNext}*/}
      {/*    title={t('createMultisigAccount.thresholdErrorTitle')}*/}
      {/*    variant='error'*/}
      {/*  >*/}
      {/*    <Alert.Item withDot={false}>*/}
      {/*      {t('createMultisigAccount.thresholdErrorDescription', { minThreshold: MIN_THRESHOLD })}*/}
      {/*    </Alert.Item>*/}
      {/*  </Alert>*/}

      {/*  <Alert*/}
      {/*    active={nonNullable(hiddenMultisig)}*/}
      {/*    title={t('createMultisigAccount.multisigExistTitle')}*/}
      {/*    variant='info'*/}
      {/*  >*/}
      {/*    <Alert.Item withDot={false}>{t('createMultisigAccount.multisigHiddenExistText')}</Alert.Item>*/}
      {/*    <Alert.Item withDot={false}>*/}
      {/*      <Button*/}
      {/*        variant='text'*/}
      {/*        size='sm'*/}
      {/*        className='p-0'*/}
      {/*        onClick={() => walletModel.events.walletRestored(hiddenMultisig!)}*/}
      {/*      >*/}
      {/*        {t('createMultisigAccount.restoreButton')}*/}
      {/*      </Button>*/}
      {/*    </Alert.Item>*/}
      {/*  </Alert>*/}
      {/*</div>*/}
    </>
  );
};
