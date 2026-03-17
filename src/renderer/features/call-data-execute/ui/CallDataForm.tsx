import { useUnit } from 'effector-react';
import { type FormEvent } from 'react';

import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { getNativeAsset, nonNullable, nullable } from '@/shared/lib/utils';
import { Button, FootnoteText, Icon, InputHint, Separator, SmallTitleText } from '@/shared/ui';
import { TransactionValidationError } from '@/shared/ui-entities';
import { Box, Field, Input, JsonArgs, Modal, ScrollArea } from '@/shared/ui-kit';
import { walletModel } from '@/entities/wallet';
import { Fee } from '@/widgets/transaction-fee';
import { formModel } from '../model/form';

import { InitiatorSelect } from './InitiatorSelect';
import { NetworkSelect } from './NetworkSelect';
import { SignatorySelect } from './SignatorySelect';

export const CallDataForm = () => {
  const { t } = useI18n();
  const { submit } = useForm(formModel.form);
  const showSignatories = useUnit(formModel.$showSignatories);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const wallets = useUnit(walletModel.$wallets);
  const errors = useUnit(formModel.$errors);
  const args = useUnit(formModel.$args);

  return (
    <>
      <form id="call-data-form" className="flex flex-col gap-y-4 px-5 pb-4" onSubmit={submitForm}>
        <TransactionValidationError errors={errors} wallets={wallets} />
        <NetworkSelect />
        <InitiatorSelect />
        {showSignatories && <SignatorySelect />}
        <CallDataInput />
      </form>

      <Separator />

      <ScrollArea>
        <Box padding={[4, 5]}>
          {nonNullable(args) && (
            <div className="flex flex-col gap-y-3">
              <SmallTitleText>{t('callData.isCorrect')}</SmallTitleText>
              <JsonArgs value={args} />
            </div>
          )}
          {nullable(args) && (
            <div className="flex flex-col items-center gap-y-2 px-10 py-20">
              <Icon size={64} name="empty" className="mb-4" />
              <SmallTitleText>{t('callData.noDecodedTxTitle')}</SmallTitleText>
              <FootnoteText className="text-text-tertiary">{t('callData.noDecodedTxDescription')}</FootnoteText>
            </div>
          )}
        </Box>
      </ScrollArea>

      <ActionsSection />
    </>
  );
};

const CallDataInput = () => {
  const { t } = useI18n();

  const {
    fields: { callData },
  } = useForm(formModel.form);

  return (
    <Field text={t('callData.callData')}>
      <Input height="md" value={callData.value} placeholder={t('callData.placeholder')} onChange={callData.onChange} />
      <InputHint variant="error" active={callData.hasError}>
        {t(callData.errorMessage)}
      </InputHint>
    </Field>
  );
};

const ActionsSection = () => {
  const { t } = useI18n();

  const canSubmit = useUnit(formModel.$canSubmit);
  const call = useUnit(formModel.$call);
  const fee = useUnit(formModel.$fee);
  const pendingFee = useUnit(formModel.$pendingFee);
  const chain = useUnit(formModel.form.fields.chain.$value);
  const asset = chain ? getNativeAsset(chain.assets) : null;

  return (
    <Modal.Footer>
      {nonNullable(asset) && nonNullable(call) && (
        <Box direction="row" gap={2} verticalAlign="center">
          <FootnoteText className="text-text-tertiary">{t('operation.networkFee')}</FootnoteText>
          <Fee className="text-footnote" fee={fee} isLoading={pendingFee} asset={asset} hideFiat />
        </Box>
      )}

      <Button form="call-data-form" type="submit" disabled={!canSubmit}>
        {t('transfer.continueButton')}
      </Button>
    </Modal.Footer>
  );
};
