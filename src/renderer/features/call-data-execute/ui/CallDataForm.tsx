import { useUnit } from 'effector-react';
import { type FormEvent, memo } from 'react';

import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { getNativeAsset, nonNullable, nullable, toAddress } from '@/shared/lib/utils';
import { Button, FootnoteText, Icon, InputHint, Separator, SmallTitleText } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { Box, Field, Input, Modal, ScrollArea, Select } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { Fee } from '@/entities/transaction';
import { formModel } from '../model/form';

import { JsonArgs } from './JsonArgs';

export const CallDataForm = () => {
  const { t } = useI18n();
  const { submit } = useForm(formModel.form);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const args = useUnit(formModel.$args);

  return (
    <>
      <form id="transfer-form" className="flex flex-col gap-y-4 px-5 pb-4" onSubmit={submitForm}>
        <ChainSelect />
        <SignatorySelect />
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
      <Input value={callData.value} placeholder={t('callData.placeholder')} onChange={callData.onChange} />
      <InputHint variant="error" active={callData.hasError}>
        {t(callData.errorMessage)}
      </InputHint>
    </Field>
  );
};

const ChainSelect = memo(() => {
  const { t } = useI18n();

  const availableChains = useUnit(formModel.$availableChains);
  const {
    fields: { chain },
  } = useForm(formModel.form);

  const onChange = (chainId: string) => {
    const v = availableChains.find((c) => c.chainId === chainId);
    if (nonNullable(v)) {
      chain.onChange(v);
    }
  };

  return (
    <Field text={t('callData.network')}>
      <Select
        placeholder={t('callData.fields.network.placeholder')}
        value={chain.value?.chainId ?? null}
        height="sm"
        onChange={onChange}
      >
        {availableChains.map((chain) => (
          <Select.Item key={chain.chainId} value={chain.chainId}>
            <ChainTitle className="overflow-hidden" fontClass="text-text-primary truncate" chain={chain} />
          </Select.Item>
        ))}
      </Select>
      <InputHint variant="error" active={chain.hasError}>
        {t(chain.errorMessage)}
      </InputHint>
    </Field>
  );
});

const SignatorySelect = memo(() => {
  const { t } = useI18n();

  const signatories = useUnit(formModel.$signatories);
  const {
    fields: { signatory, chain },
  } = useForm(formModel.form);

  const onChange = (id: string) => {
    const v = signatories.find((c) => c.id === id);
    if (nonNullable(v)) {
      signatory.onChange(v);
    }
  };

  return (
    <Field text={t('callData.fields.signatory.label')}>
      <Select
        placeholder={t('callData.fields.signatory.placeholder')}
        value={signatory.value?.id ?? null}
        height="sm"
        onChange={onChange}
      >
        {signatories.map((a) => (
          <Select.Item key={a.id} value={a.id}>
            <Address showIcon address={toAddress(a.accountId, { prefix: chain.value?.addressPrefix })} />
          </Select.Item>
        ))}
      </Select>
      <InputHint variant="error" active={signatory.hasError}>
        {t(signatory.errorMessage)}
      </InputHint>
    </Field>
  );
});

const ActionsSection = () => {
  const { t } = useI18n();

  const canSubmit = useUnit(formModel.$canSubmit);
  const extrinsic = useUnit(formModel.$extrinsic);
  const fee = useUnit(formModel.$fee);
  const pendingFee = useUnit(formModel.$pendingFee);
  const chain = useUnit(formModel.form.fields.chain.$value);
  const asset = chain ? getNativeAsset(chain.assets) : null;

  return (
    <Modal.Footer>
      {nonNullable(asset) && nonNullable(extrinsic) && (
        <Box direction="row" gap={2} verticalAlign="center">
          <FootnoteText className="text-text-tertiary">{t('operation.networkFee')}</FootnoteText>
          <Fee className="text-footnote" fee={fee} isLoading={pendingFee} asset={asset} hideFiat />
        </Box>
      )}

      <Button form="transfer-form" type="submit" disabled={!canSubmit}>
        {t('transfer.continueButton')}
      </Button>
    </Modal.Footer>
  );
};
