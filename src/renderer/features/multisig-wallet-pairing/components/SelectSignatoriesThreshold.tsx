import { useUnit } from 'effector-react';
import { type FormEvent } from 'react';
import { Trans } from 'react-i18next';

import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { getNativeAsset, nonNullable } from '@/shared/lib/utils';
import { Alert, Button, FootnoteText, Icon, IconButton, InputHint, SmallTitleText } from '@/shared/ui';
import { Box, Field, Input, Modal, Select } from '@/shared/ui-kit';
import { Fee } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { flowModel } from '../model/flow-model';
import { formModel } from '../model/form-model';
import { signatoryModel } from '../model/signatory-model';

import { Signatory } from './components';
import { MultisigFeeModal } from './components/MultisigFeeModal';

interface Props {
  onGoBack: () => void;
}

export const SelectSignatoriesThreshold = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  const {
    fields: { threshold, name },
    submit,
  } = useForm(formModel.form);

  const multisigAlreadyExists = useUnit(formModel.$multisigAlreadyExists);
  const hiddenMultisig = useUnit(formModel.$hiddenMultisig);
  const wrongChainTypes = useUnit(formModel.$invalidAddresses);
  const canSubmit = useUnit(formModel.$canSubmit);

  const signerWallet = useUnit(flowModel.$signerWallet);
  const fee = useUnit(flowModel.$fee);
  const multisigDeposit = useUnit(flowModel.$multisigDeposit);
  const isMultisigDepositLoading = useUnit(flowModel.$isMultisigDepositLoading);
  const isFeeLoading = useUnit(flowModel.$isFeeLoading);
  const isEnoughBalance = useUnit(flowModel.$isEnoughBalance);
  const chain = useUnit(formModel.$chain);

  const signatories = useUnit(signatoryModel.$signatories);
  const duplicateSignatories = useUnit(signatoryModel.$duplicateSignatories);

  const totalFee = multisigDeposit.add(fee).toString();
  const isLoading = isFeeLoading || isMultisigDepositLoading;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();

    // TODO: will be used for multisig as signer
    // signatoryModel.events.getSignatoriesBalance(ownedSignatoriesWallets);

    // if (ownedSignatoriesWallets.length > 1) {
    //   flowModel.stepChanged(Step.SIGNER_SELECTION);
    // } else {
    //   event.preventDefault();
    // submit();
    // }
  };

  return (
    <>
      <Modal.Content>
        <SmallTitleText className="border-b border-container-border px-5 pb-6 text-text-primary">
          {t('createMultisigAccount.signatoryThresholdDescription')}
        </SmallTitleText>

        <Box direction="column" gap={6} padding={[6, 5, 4, 5]} height="100%">
          {signatories.map((signatory, index) => (
            <Signatory
              key={index}
              isOwnAccount={index === 0}
              isDuplicate={duplicateSignatories[signatory.address]?.includes(index)}
              isInvalidAddress={wrongChainTypes.includes(signatory.address)}
              signatoryIndex={index}
              signatory={signatory}
              onDelete={signatoryModel.events.deleteSignatory}
            />
          ))}

          <Button
            size="md"
            variant="text"
            className="h-8.5 w-max justify-center gap-x-1"
            suffixElement={<Icon className="text-icon-primary" name="add" size={16} />}
            onClick={() => signatoryModel.events.addSignatory({ name: '', address: '', walletId: '' })}
          >
            {t('createMultisigAccount.addNewSignatory')}
          </Button>

          <hr className="-mx-5 w-full border-divider" />

          <div className="flex gap-x-6">
            <Box width="100%">
              <Field text={t('createMultisigAccount.walletNameLabel')}>
                <Input
                  autoFocus
                  height="md"
                  placeholder={t('createMultisigAccount.namePlaceholder')}
                  invalid={name.hasError}
                  value={name.value}
                  onChange={name.onChange}
                />

                <InputHint active>{t('createMultisigAccount.walletNameDescription')}</InputHint>
                <InputHint variant="error" active={name.hasError}>
                  {t(name.errorMessage)}
                </InputHint>
              </Field>
            </Box>

            <Box width="232px" shrink={0}>
              <Field text={t('createMultisigAccount.thresholdName')}>
                <Select
                  placeholder={t('createMultisigAccount.thresholdPlaceholder')}
                  value={(threshold.value || '').toString()}
                  invalid={threshold.hasError}
                  disabled={[0, 1].includes(signatories.length)}
                  height="md"
                  onChange={value => threshold.onChange(Number(value))}
                >
                  {Array.from({ length: signatories.length - 1 }, (_, index) => (
                    <Select.Item key={index} value={(index + 2).toString()}>
                      {index + 2}
                    </Select.Item>
                  ))}
                </Select>
              </Field>
              <InputHint active className="mt-2">
                {t('createMultisigAccount.thresholdHint')}
              </InputHint>
            </Box>
          </div>

          <Alert
            variant="info"
            active={nonNullable(hiddenMultisig)}
            title={t('createMultisigAccount.multisigExistTitle')}
          >
            <Alert.Item withDot={false}>
              <Trans t={t} i18nKey="createMultisigAccount.multisigHiddenExistText" />
            </Alert.Item>
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

          <Alert variant="error" active={multisigAlreadyExists} title={t('createMultisigAccount.multisigExistTitle')}>
            <Alert.Item withDot={false}>{t('createMultisigAccount.multisigExistText')}</Alert.Item>
          </Alert>
        </Box>
      </Modal.Content>

      <Modal.Footer>
        <Box fitContainer direction="row" horizontalAlign="space-between" verticalAlign="center">
          <Button variant="text" onClick={onGoBack}>
            {t('createMultisigAccount.backButton')}
          </Button>

          <div className="flex items-center justify-end gap-x-6">
            {signerWallet && (
              <div className="flex items-center gap-x-2">
                <FootnoteText className="text-text-tertiary">{t('createMultisigAccount.networkFee')}</FootnoteText>
                {chain && (
                  <Fee
                    fee={totalFee}
                    isLoading={isLoading}
                    asset={getNativeAsset(chain.assets)}
                    className={isEnoughBalance ? '' : 'text-text-negative'}
                  />
                )}

                <MultisigFeeModal>
                  <IconButton size={16} name="edit" className="text-icon-default" />
                </MultisigFeeModal>
              </div>
            )}
            <Button key="create" type="submit" disabled={!canSubmit || !isEnoughBalance} onClick={onSubmit}>
              {t('createMultisigAccount.continueButton')}
            </Button>
          </div>
        </Box>
      </Modal.Footer>
    </>
  );
};
