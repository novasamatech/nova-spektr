import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type FormEvent } from 'react';

import { useI18n } from '@/shared/i18n';
import { Step, nonNullable } from '@/shared/lib/utils';
import { Alert, Button, Icon, InputHint, SmallTitleText } from '@/shared/ui';
import { Box, Field, Modal, Select } from '@/shared/ui-kit';
import { walletModel } from '@/entities/wallet';
import { flexibleMultisigModel } from '../../model/flexible-multisig-create';
import { formModel } from '../../model/form-model';
import { signatoryModel } from '../../model/signatory-model';
import { MultisigFees } from '../MultisigFees';

import { Signatory } from './Signatory';

export const SelectSignatoriesThreshold = () => {
  const { t } = useI18n();

  const {
    fields: { threshold },
    submit,
  } = useForm(formModel.$createMultisigForm);

  const chain = useUnit(formModel.$chain);
  const signatories = useUnit(signatoryModel.$signatories);
  const multisigAlreadyExists = useUnit(formModel.$multisigAlreadyExists);
  const hiddenMultisig = useUnit(formModel.$hiddenMultisig);
  const ownedSignatoriesWallets = useUnit(signatoryModel.$ownedSignatoriesWallets);

  const duplicateSignatories = useUnit(signatoryModel.$duplicateSignatories);
  const canSubmit = useUnit(formModel.$canSubmit);
  const wrongChainTypes = useUnit(formModel.$invalidAddresses);

  const onSubmit = (event: FormEvent) => {
    signatoryModel.events.getSignatoriesBalance(ownedSignatoriesWallets);

    if (ownedSignatoriesWallets.length > 1) {
      flexibleMultisigModel.events.stepChanged(Step.SIGNER_SELECTION);
    } else {
      const account = ownedSignatoriesWallets.at(0)?.accounts.at(0);

      if (!account) return;

      flexibleMultisigModel.events.signerSelected(account);
      event.preventDefault();
      submit();
    }
  };

  const asset = chain?.assets.at(0);

  return (
    <>
      <Modal.Content>
        <SmallTitleText className="mb-4 border-b border-container-border px-5 pb-4 text-text-primary">
          {t('createMultisigAccount.multisigStep', { step: 2 })}{' '}
          {t('createMultisigAccount.flexibleMultisig.signatoryThresholdDescription')}
        </SmallTitleText>

        <Box direction="column" gap={6} padding={[6, 5, 4, 5]} height="100%">
          {signatories.map((signer, index) => (
            <Signatory
              key={index}
              isOwnAccount={index === 0}
              isDuplicate={duplicateSignatories[signer.address]?.includes(index)}
              isInvalidAddress={wrongChainTypes.includes(signer.address)}
              signatoryIndex={index}
              signatoryName={signer.name}
              signatoryAddress={signer.address}
              selectedWalletId={signer.walletId}
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

          <Alert
            active={nonNullable(hiddenMultisig)}
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

          <Alert active={multisigAlreadyExists} title={t('createMultisigAccount.multisigExistTitle')} variant="error">
            <Alert.Item withDot={false}>{t('createMultisigAccount.multisigExistText')}</Alert.Item>
          </Alert>
        </Box>
      </Modal.Content>

      <Modal.Footer>
        <Box fitContainer direction="row" horizontalAlign="space-between" verticalAlign="center">
          <Button
            variant="text"
            onClick={() => {
              flexibleMultisigModel.events.stepChanged(Step.NAME_NETWORK);
            }}
          >
            {t('createMultisigAccount.backButton')}
          </Button>

          <div className="flex items-center justify-end gap-x-6">
            {nonNullable(asset) ? <MultisigFees asset={asset} /> : null}

            <Button key="create" type="submit" disabled={!canSubmit} onClick={onSubmit}>
              {t('createMultisigAccount.continueButton')}
            </Button>
          </div>
        </Box>
      </Modal.Footer>
    </>
  );
};
