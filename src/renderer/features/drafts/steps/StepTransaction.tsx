import { type ApiPromise } from '@polkadot/api';

import { type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { InputHint, SmallTitleText } from '@/shared/ui';
import { ChainSelect } from '@/shared/ui-entities';
import { Field, Input, Tabs } from '@/shared/ui-kit';
import { Json } from '@/shared/ui-kit/Json/Json';
import { ExtrinsicBuilder } from '@/features/extrinsic-builder';
import { OperationTemplatesToolbar } from '@/features/operation-templates';

export type StepTransactionProps = {
  chains: Chain[];
  selectedChain: Chain | null;
  effectiveChain: Chain | null;
  inputMode: 'paste' | 'build';
  callData: string;
  callDataError: string | null;
  decodedCallData: unknown | null;
  api: ApiPromise | null;
  specVersion: number | null;
  onChainSelected: (chain: Chain | null) => void;
  onInputModeChanged: (mode: 'paste' | 'build') => void;
  onCallDataChanged: (hex: string) => void;
  onTemplateApply: (hex: string) => void;
};

export const StepTransaction = ({
  chains,
  selectedChain,
  effectiveChain,
  inputMode,
  callData,
  callDataError,
  decodedCallData,
  api,
  specVersion,
  onChainSelected,
  onInputModeChanged,
  onCallDataChanged,
  onTemplateApply,
}: StepTransactionProps) => {
  const { t } = useI18n();

  return (
    <div className="flex min-h-[500px] flex-col gap-4 p-4">
      <Field text={t('operations.drafts.selectNetwork')}>
        <ChainSelect
          placeholder={t('operations.drafts.selectNetwork')}
          value={selectedChain ?? effectiveChain}
          options={chains}
          onChange={onChainSelected}
        />
      </Field>

      {effectiveChain && (
        <>
          <Tabs value={inputMode} onChange={(value) => onInputModeChanged(value as 'paste' | 'build')}>
            <Tabs.List>
              <Tabs.Trigger value="paste">{t('callData.mode.paste')}</Tabs.Trigger>
              <Tabs.Trigger value="build">{t('callData.mode.build')}</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="paste">
              <Field text={t('operations.drafts.callDataLabel')}>
                <Input
                  height="md"
                  placeholder={t('operations.drafts.callDataPlaceholder')}
                  value={callData}
                  invalid={callDataError !== null}
                  onChange={onCallDataChanged}
                />
                <InputHint variant="error" active={callDataError !== null}>
                  {callDataError}
                </InputHint>
              </Field>
            </Tabs.Content>
            <Tabs.Content value="build">
              <ExtrinsicBuilder
                api={api}
                initialCallData={inputMode === 'build' ? callData : undefined}
                onCallDataChange={(hex) => {
                  if (inputMode === 'build') onCallDataChanged(hex ?? '');
                }}
              />
            </Tabs.Content>
          </Tabs>

          {callDataError && inputMode === 'build' && (
            <InputHint variant="error" active>
              {callDataError}
            </InputHint>
          )}

          <OperationTemplatesToolbar
            api={api}
            chainId={effectiveChain.chainId}
            callData={callData}
            specVersion={specVersion}
            onApply={onTemplateApply}
          />

          {decodedCallData && (
            <div className="flex flex-col gap-y-2">
              <SmallTitleText>{t('operation.callData.preview')}</SmallTitleText>
              <div className="max-h-[300px] overflow-auto rounded-md border border-filter-border bg-block-background p-4 break-all">
                <Json value={decodedCallData} name="call" />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
