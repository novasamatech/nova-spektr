import { useUnit } from 'effector-react';
import { type FormEvent } from 'react';

import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { getNativeAsset, nonNullable, nullable } from '@/shared/lib/utils';
import { Button, FootnoteText, Icon, Separator, SmallTitleText } from '@/shared/ui';
import { TransactionValidationError } from '@/shared/ui-entities';
import { Box, Modal, ScrollArea, Tabs } from '@/shared/ui-kit';
import { JsonArgs } from '@/shared/ui-kit/JsonArgs/JsonArgs';
import { walletModel } from '@/entities/wallet';
import { InitiateDraftButton } from '@/features/drafts';
import { ExtrinsicBuilder } from '@/features/extrinsic-builder';
import { OperationTemplatesToolbar } from '@/features/operation-templates';
import { Fee } from '@/widgets/transaction-fee';
import { InputMode } from '../lib/types';
import { formModel } from '../model/form';

import { CallDataInput } from './CallDataInput';
import { InitiatorSelect } from './InitiatorSelect';
import { NetworkSelect } from './NetworkSelect';
import { SignatorySelect } from './SignatorySelect';

export const CallDataForm = () => {
  const { t } = useI18n();
  const { submit } = useForm(formModel.form);
  const showSignatories = useUnit(formModel.$showSignatories);
  const inputMode = useUnit(formModel.$inputMode);
  const inputModeChanged = useUnit(formModel.inputModeChanged);
  const builderCallDataChanged = useUnit(formModel.builderCallDataChanged);
  const templateApplied = useUnit(formModel.templateApplied);
  const api = useUnit(formModel.$api);
  const callDataValue = useUnit(formModel.form.fields.callData.$value);
  const chain = useUnit(formModel.form.fields.chain.$value);

  // Pass callData to builder when in Build mode (for tab switch + remount after Confirm)
  const builderInitialCallData = inputMode === InputMode.BUILD ? callDataValue : undefined;

  const specVersion = api?.runtimeVersion.specVersion.toNumber() ?? null;

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const wallets = useUnit(walletModel.$wallets);
  const errors = useUnit(formModel.$errors);
  const args = useUnit(formModel.$args);

  return (
    <>
      <ScrollArea>
        <form id="call-data-form" className="flex flex-col gap-y-4 px-5 pb-4" onSubmit={submitForm}>
          <TransactionValidationError errors={errors} wallets={wallets} />
          <NetworkSelect />
          <InitiatorSelect />
          {showSignatories && <SignatorySelect />}

          <div className="-mb-2">
            <Tabs value={inputMode} onChange={(value) => inputModeChanged(value as InputMode)}>
              <Tabs.List>
                <Tabs.Trigger value={InputMode.PASTE}>{t('callData.mode.paste')}</Tabs.Trigger>
                <Tabs.Trigger value={InputMode.BUILD}>{t('callData.mode.build')}</Tabs.Trigger>
              </Tabs.List>
              <Tabs.Content value={InputMode.PASTE}>
                <CallDataInput />
              </Tabs.Content>
              <Tabs.Content value={InputMode.BUILD}>
                <ExtrinsicBuilder
                  api={api}
                  initialCallData={builderInitialCallData}
                  onCallDataChange={builderCallDataChanged}
                />
              </Tabs.Content>
            </Tabs>
          </div>
        </form>

        {nonNullable(chain) && (
          <OperationTemplatesToolbar
            api={api}
            chainId={chain.chainId}
            callData={callDataValue}
            specVersion={specVersion}
            modalWidth="37rem"
            onApply={templateApplied}
          />
        )}

        <Separator />

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

const ActionsSection = () => {
  const { t } = useI18n();

  const canSubmit = useUnit(formModel.$canSubmit);
  const call = useUnit(formModel.$call);
  const fee = useUnit(formModel.$fee);
  const pendingFee = useUnit(formModel.$pendingFee);
  const chain = useUnit(formModel.form.fields.chain.$value);
  const callData = useUnit(formModel.form.fields.callData.$value);
  const asset = chain ? getNativeAsset(chain.assets) : null;

  return (
    <Modal.Footer>
      {nonNullable(asset) && nonNullable(call) && (
        <Box direction="row" gap={2} verticalAlign="center">
          <FootnoteText className="text-text-tertiary">{t('operation.networkFee')}</FootnoteText>
          <Fee className="text-footnote" fee={fee} isLoading={pendingFee} asset={asset} hideFiat />
        </Box>
      )}

      <InitiateDraftButton
        callData={callData}
        chainId={chain?.chainId}
        source="call-data-execute"
        onDraftCreated={formModel.flowFinished}
      />
      <Button form="call-data-form" type="submit" disabled={!canSubmit}>
        {t('transfer.continueButton')}
      </Button>
    </Modal.Footer>
  );
};
