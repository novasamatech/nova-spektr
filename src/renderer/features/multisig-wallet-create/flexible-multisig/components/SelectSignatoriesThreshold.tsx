import { useUnit } from 'effector-react';
import { type FormEvent } from 'react';
import { Trans } from 'react-i18next';

import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { Step, nonNullable, toAccountId, toAddress, withdrawableAmount } from '@/shared/lib/utils';
import { Alert, Button, Icon, InputHint, SmallTitleText } from '@/shared/ui';
import { Address, AssetBalance } from '@/shared/ui-entities';
import { Box, Field, Modal, Select } from '@/shared/ui-kit';
import { walletModel } from '@/entities/wallet';
import { flexibleMultisigModel } from '../model/flexible-multisig-create';
import { formModel } from '../model/form-model';
import { signatoryModel } from '../model/signatory-model';

import { MultisigFees } from './components/MultisigFees';
import { Signatory } from './components/Signatory';

export const SelectSignatoriesThreshold = () => {
  const { t } = useI18n();

  const {
    fields: { threshold },
    submit,
  } = useForm(formModel.form);

  const chain = useUnit(formModel.$chain);
  const multisigAlreadyExists = useUnit(formModel.$multisigAlreadyExists);
  const multisigWithProxyAlreadyExists = useUnit(formModel.$multisigWithProxyAlreadyExists);
  const existingProxy = useUnit(formModel.$existingProxy);
  const existingMultisig = useUnit(formModel.$existingMultisig);
  const hiddenMultisig = useUnit(formModel.$hiddenMultisig);
  const canSubmit = useUnit(formModel.$canSubmit);
  const invalidAddresses = useUnit(formModel.$invalidAddresses);

  const duplicateSignatories = useUnit(signatoryModel.$duplicateSignatories);
  const signatories = useUnit(signatoryModel.$signatories);

  const fee = useUnit(flexibleMultisigModel.$fee);
  const totalDeposit = useUnit(flexibleMultisigModel.$totalDeposit);

  const isEnoughBalance = useUnit(flexibleMultisigModel.$isEnoughBalance);
  const initiator = useUnit(flexibleMultisigModel.$initiator);
  const asset = useUnit(flexibleMultisigModel.$asset);
  const signerBalance = useUnit(flexibleMultisigModel.$signerBalance);
  const isLoading = useUnit(flexibleMultisigModel.$isLoading);

  const thresholdDisabled = signatories.length < 2 || signatories.some(s => s.address === '');
  const totalFee = totalDeposit ? fee.add(totalDeposit) : fee;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <>
      <Modal.Content>
        <div className="flex h-full flex-col gap-y-6 px-5 pt-4 pb-6">
          <SmallTitleText>
            {t('createMultisigAccount.multisigStep', { step: 2 })}{' '}
            {t('createMultisigAccount.flexibleMultisig.signatoryThresholdDescription')}
          </SmallTitleText>

          <hr className="-ml-5 w-[110%] border-divider" />

          {signatories.map((signatory, index) => (
            <Signatory
              key={index}
              isOwnAccount={index === 0}
              isDuplicate={duplicateSignatories[toAccountId(signatory.address)]?.includes(index)}
              isInvalidAddress={invalidAddresses.includes(signatory.address)}
              signatoryIndex={index}
              signatory={signatory}
              onDelete={signatoryModel.events.deleteSignatory}
            />
          ))}

          <Button
            size="md"
            variant="text"
            className="h-8.5 w-max justify-center gap-x-1 pl-0"
            suffixElement={<Icon className="text-icon-primary" name="add" size={16} />}
            onClick={() => signatoryModel.events.addSignatory({ name: '', address: '', walletId: '' })}
          >
            {t('createMultisigAccount.addNewSignatory')}
          </Button>

          <hr className="-ml-5 w-[110%] border-divider" />

          <div className="flex gap-x-6">
            <Box width="232px">
              <Field text={t('createMultisigAccount.thresholdName')}>
                <Select
                  placeholder={t('createMultisigAccount.thresholdPlaceholder')}
                  value={(threshold.value || '').toString()}
                  invalid={threshold.hasError}
                  disabled={thresholdDisabled}
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
            </Box>
            <InputHint active className="mt-8.5 flex-1">
              {t('createMultisigAccount.flexibleMultisig.threshold')}
            </InputHint>
          </div>

          <div className="mt-auto flex flex-col gap-y-2">
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
                  onClick={() => walletModel.restoreWallets([hiddenMultisig!])}
                >
                  {t('createMultisigAccount.restoreButton')}
                </Button>
              </Alert.Item>
            </Alert>

            {existingMultisig && existingProxy && (
              <Alert
                variant="info"
                active={multisigWithProxyAlreadyExists}
                title={t('createMultisigAccount.flexibleMultisig.multisigAndProxyExistTitle')}
              >
                <Alert.Item withDot={false}>
                  <Trans
                    t={t}
                    i18nKey="createMultisigAccount.flexibleMultisig.multisigAndProxyExistText"
                    components={{
                      account: (
                        <span className="mx-1 inline-flex w-auto align-sub">
                          <Address
                            address={toAddress(existingMultisig.accountId, { prefix: chain?.addressPrefix })}
                            title={existingMultisig.name}
                            hideAddress
                            showIcon
                            canCopy
                          />
                        </span>
                      ),
                      proxy: (
                        <span className="mx-1 inline-flex w-auto align-sub">
                          <Address
                            address={toAddress(existingProxy.accountId, { prefix: chain?.addressPrefix })}
                            title={existingProxy.name}
                            hideAddress
                            showIcon
                            canCopy
                          />
                        </span>
                      ),
                    }}
                  />
                </Alert.Item>
              </Alert>
            )}

            {existingMultisig && !existingProxy && (
              <Alert
                variant="info"
                active={multisigAlreadyExists}
                title={t('createMultisigAccount.multisigExistTitle')}
              >
                <Alert.Item withDot={false}>
                  <Trans
                    t={t}
                    i18nKey="createMultisigAccount.flexibleMultisig.multisigExistText"
                    components={{
                      account: (
                        <span className="mx-1 inline-flex w-auto align-sub">
                          <Address
                            address={toAddress(existingMultisig.accountId, { prefix: chain?.addressPrefix })}
                            title={existingMultisig.name}
                            hideAddress
                            showIcon
                            canCopy
                            variant="truncate"
                          />
                        </span>
                      ),
                    }}
                  />
                </Alert.Item>
              </Alert>
            )}

            {nonNullable(signerBalance) && nonNullable(initiator) && nonNullable(asset) && (
              <Alert
                variant="error"
                active={!isEnoughBalance}
                title={t('createMultisigAccount.disabledError.notEnoughBalanceTitle')}
              >
                <Alert.Item withDot={false}>
                  <Trans
                    t={t}
                    i18nKey="createMultisigAccount.disabledError.notEnoughBalanceText"
                    components={{
                      account: (
                        <span className="mx-1 inline-flex w-auto align-sub">
                          <Address
                            address={toAddress(initiator.accountId, { prefix: chain?.addressPrefix })}
                            title={initiator.name}
                            hideAddress
                            showIcon
                            canCopy
                          />
                        </span>
                      ),
                      fee: <AssetBalance value={totalFee.toString()} asset={asset} />,
                      balance: <AssetBalance value={withdrawableAmount(signerBalance)} asset={asset} />,
                    }}
                  />
                </Alert.Item>
              </Alert>
            )}
          </div>
        </div>
      </Modal.Content>

      <Modal.Footer>
        <Box fitContainer direction="row" horizontalAlign="space-between" verticalAlign="center">
          <Button
            variant="text"
            onClick={() => {
              flexibleMultisigModel.stepChanged(Step.NAME_NETWORK);
            }}
          >
            {t('createMultisigAccount.backButton')}
          </Button>

          <div className="flex items-center justify-end gap-x-6">
            <MultisigFees />

            <Button
              key="create"
              type="submit"
              disabled={!canSubmit || !isEnoughBalance || isLoading}
              onClick={onSubmit}
            >
              {t('createMultisigAccount.continueButton')}
            </Button>
          </div>
        </Box>
      </Modal.Footer>
    </>
  );
};
