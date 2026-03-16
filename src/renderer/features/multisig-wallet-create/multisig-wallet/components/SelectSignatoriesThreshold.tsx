import { useUnit } from 'effector-react';
import { type FormEvent } from 'react';
import { Trans } from 'react-i18next';

import { TEST_IDS } from '@/shared/constants/testIds';
import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { getNativeAsset, nonNullable, nullable, toAccountId, toAddress } from '@/shared/lib/utils';
import { Alert, Button, FootnoteText, Icon, IconButton, InputHint, SmallTitleText } from '@/shared/ui';
import { Address, TransactionValidationError } from '@/shared/ui-entities';
import { Box, Field, Input, Modal, Select } from '@/shared/ui-kit';
import { accountService, accounts } from '@/domains/network';
import { walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { Fee } from '@/widgets/transaction-fee';
import { flowModel } from '../model/flow-model';
import { formModel } from '../model/form-model';
import { signatoryModel } from '../model/signatory-model';

import { Signatory } from './components';
import { MultisigFeeModal } from './components/MultisigFeeModal';

interface Props {
  onGoBack: () => void;
  onToggle: (open: boolean) => void;
}

export const SelectSignatoriesThreshold = ({ onGoBack, onToggle }: Props) => {
  const { t } = useI18n();

  const {
    fields: { threshold, name },
    submit,
  } = useForm(formModel.form);

  const multisigAlreadyExists = useUnit(formModel.$multisigAlreadyExists);
  const hiddenMultisig = useUnit(formModel.$hiddenMultisig);
  const invalidAddresses = useUnit(formModel.$invalidAddresses);
  const canSubmit = useUnit(formModel.$canSubmit);
  const valid = useUnit(flowModel.$valid);
  const chain = useUnit(formModel.$chain);
  const wallets = useUnit(walletModel.$wallets);
  const allAccounts = useUnit(accounts.$list);
  const existingMultisig = useUnit(formModel.$existingMultisig);

  const initiator = useUnit(flowModel.$initiator);
  const fee = useUnit(flowModel.$fee);
  const isFeeLoading = useUnit(flowModel.$isFeeLoading);
  const errors = useUnit(flowModel.$errors);

  const signatories = useUnit(signatoryModel.$signatories);
  const duplicateSignatories = useUnit(signatoryModel.$duplicateSignatories);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const handleOpenMultisigWallet = () => {
    if (!existingMultisig) return;

    const wallet = wallets.find(w => {
      const walletAccounts = accountService.filterAccountsByWallet(allAccounts, w.id);
      return walletAccounts.some(account => account.accountId === existingMultisig.accountId);
    });

    if (wallet) {
      walletSelect.select(wallet.id);
      onToggle(false);
    }
  };

  const asset = getNativeAsset(chain?.assets || []);
  const thresholdDisabled = signatories.length < 2 || signatories.some(s => s.address === '');

  return (
    <>
      <Modal.Content>
        <div className="flex h-full flex-col gap-y-6 px-5 pt-4 pb-6">
          <SmallTitleText>{t('createMultisigAccount.signatoryThresholdDescription')}</SmallTitleText>

          <hr className="-ml-5 w-[110%] border-divider" />

          {signatories.map((signatory, index) => (
            <Signatory
              key={index}
              isOwnAccount={index === 0}
              isDuplicate={duplicateSignatories[toAccountId(signatory.address)]?.includes(index) ?? false}
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
            <Box width="100%">
              <Field text={t('createMultisigAccount.walletName')}>
                <Input
                  autoFocus
                  height="md"
                  placeholder={t('createMultisigAccount.namePlaceholder')}
                  invalid={name.hasError}
                  value={name.value}
                  testId={TEST_IDS.MULTISIG.MULTISIG_WALLET_NAME}
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
                  disabled={thresholdDisabled}
                  height="md"
                  testId={TEST_IDS.MULTISIG.THRESHOLD_SELECTOR}
                  onChange={value => threshold.onChange(Number(value))}
                >
                  {Array.from({ length: signatories.length - 1 }, (_, index) => (
                    <Select.Item
                      itemTestId={TEST_IDS.MULTISIG.THRESHOLD_OPTION}
                      key={index}
                      value={(index + 2).toString()}
                    >
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

            {nonNullable(initiator) && (
              <Alert
                variant="error"
                active={multisigAlreadyExists && nullable(hiddenMultisig)}
                title={t('createMultisigAccount.multisigExistTitle')}
              >
                <Alert.Item withDot={false}>
                  <Trans
                    t={t}
                    i18nKey="createMultisigAccount.multisigExistText"
                    components={{
                      account: (
                        <span className="mx-1 inline-flex w-auto max-w-[200px] align-top">
                          {existingMultisig && (
                            <Address
                              address={toAddress(existingMultisig.accountId, { prefix: chain?.addressPrefix })}
                              title={existingMultisig.name}
                              hideAddress
                              showIcon
                              canCopy
                            />
                          )}
                        </span>
                      ),
                    }}
                  />
                </Alert.Item>
                <Alert.Item withDot={false}>
                  <Button variant="text" size="sm" className="p-0" onClick={handleOpenMultisigWallet}>
                    {t('createMultisigAccount.openMultisigButton')}
                  </Button>
                </Alert.Item>
              </Alert>
            )}

            <TransactionValidationError errors={errors} wallets={wallets} />
          </div>
        </div>
      </Modal.Content>

      <Modal.Footer>
        <Box fitContainer direction="row" horizontalAlign="space-between" verticalAlign="center">
          <Button variant="text" onClick={onGoBack}>
            {t('createMultisigAccount.backButton')}
          </Button>

          <div className="flex items-center justify-end gap-x-6">
            {initiator && (
              <div className="flex items-center gap-x-2">
                <FootnoteText className="text-text-tertiary">{t('createMultisigAccount.networkFee')}</FootnoteText>
                {chain && (
                  <Fee
                    fee={fee}
                    isLoading={isFeeLoading}
                    asset={asset}
                    className={errors.length === 0 ? '' : 'text-text-negative'}
                  />
                )}

                <MultisigFeeModal>
                  <IconButton
                    size={16}
                    name="edit"
                    className="text-icon-default"
                    testId={TEST_IDS.MULTISIG.NETWORK_EDIT_BUTTON}
                  />
                </MultisigFeeModal>
              </div>
            )}
            <Button key="create" type="submit" disabled={!canSubmit || !valid || isFeeLoading} onClick={onSubmit}>
              {t('createMultisigAccount.continueButton')}
            </Button>
          </div>
        </Box>
      </Modal.Footer>
    </>
  );
};
