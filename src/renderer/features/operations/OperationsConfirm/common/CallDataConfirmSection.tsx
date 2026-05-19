import { type ApiPromise } from '@polkadot/api';

import { type Chain, type HexString, type Transaction } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, truncate } from '@/shared/lib/utils';
import { Button, DetailRow, FootnoteText, Icon } from '@/shared/ui';
import { Box, Copy, Json, Modal, Tooltip } from '@/shared/ui-kit';
import { useNotification } from '@/shared/ui-kit/NotificationContext';
import { useTemplateMutations } from '@/domains/operation-templates';
import { transactionService } from '@/entities/transaction';

const capitalize = (value: string) => (value.length === 0 ? value : value[0]!.toUpperCase() + value.slice(1));

const humanize = (value: string) => {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[_\s]+/)
    .filter(Boolean)
    .map(capitalize)
    .join(' ');
};

const getTemplateName = (api: ApiPromise, callData: HexString): string => {
  try {
    const extrinsicCall = api.createType('Call', callData);
    const { method, section } = api.registry.findMetaCall(extrinsicCall.callIndex);

    return humanize(section) + ': ' + humanize(method);
  } catch {
    return 'Untitled template';
  }
};

type Props = {
  api: ApiPromise;
  chain: Chain;
  resultTx?: Transaction;
  resultCallData?: HexString | null;
  resultLabel?: string;
  coreTx?: Transaction | null;
  coreCallData?: HexString | null;
};

type RowProps = {
  label: string;
  callData: string;
  jsonArgs: object | null;
  onSave?: () => void;
  saveTooltip?: string;
};

const InteractionStyle =
  'rounded-sm hover:bg-action-background-hover hover:text-text-primary cursor-pointer py-[3px] px-2 -mr-2';

const getCallData = (transaction: Transaction | null | undefined, api: ApiPromise): string | null => {
  return transactionService.getCallDataHex(transaction, api);
};

const toHexString = (value: string | null): HexString | null => {
  if (!value?.startsWith('0x')) return null;

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- call data is validated by the 0x prefix and produced by transactionService.
  return value as HexString;
};

const getJsonArgs = (callData: string, api: ApiPromise, chain: Chain): object | null => {
  const hexCallData = toHexString(callData);
  if (!hexCallData) return null;

  try {
    const call = transactionService.createCallFromCallData(hexCallData, api);
    if (!call) return null;

    return transactionService.formatCall(call, chain);
  } catch {
    return null;
  }
};

const CallDataRow = ({ label, callData, jsonArgs, onSave, saveTooltip }: RowProps) => {
  const { t } = useI18n();

  return (
    <DetailRow label={label} className="text-text-secondary">
      <div className="flex items-center gap-1">
        {onSave && (
          <Tooltip>
            <Tooltip.Trigger>
              <div>
                <Button className="px-2" size="sm" variant="text" onClick={onSave}>
                  {t('operationTemplates.saveCoreTxButton')}
                </Button>
              </div>
            </Tooltip.Trigger>
            <Tooltip.Content>{saveTooltip}</Tooltip.Content>
          </Tooltip>
        )}

        <Copy value={callData} notification={t('operationTemplates.toastCallDataCopied')}>
          <button type="button" className={cnTw('group flex items-center gap-x-1', InteractionStyle)}>
            <FootnoteText className="text-inherit">{truncate(callData, 7, 8)}</FootnoteText>
            <Icon name="copy" size={16} className="group-hover:text-icon-hover" />
          </button>
        </Copy>

        {jsonArgs && (
          <Modal size="lg" height="fit">
            <Modal.Trigger>
              <button type="button" className={cnTw('group', InteractionStyle)}>
                <Icon name="details" size={16} className="group-hover:text-icon-hover" />
              </button>
            </Modal.Trigger>
            <Modal.Title close>{t('operation.viewJSON.label')}</Modal.Title>
            <Modal.Content>
              <Box padding={5}>
                <Json value={jsonArgs} name="callData" />
              </Box>
            </Modal.Content>
          </Modal>
        )}
      </div>
    </DetailRow>
  );
};

export const CallDataConfirmSection = ({
  api,
  chain,
  resultTx,
  resultCallData: resultCallDataProp,
  resultLabel,
  coreTx,
  coreCallData: coreCallDataProp,
}: Props) => {
  const { t } = useI18n();
  const { toast } = useNotification();
  const { save } = useTemplateMutations();

  const resultCallData = resultCallDataProp ?? getCallData(resultTx, api);
  const coreCallData = coreCallDataProp ?? getCallData(coreTx ?? resultTx, api);

  if (!resultCallData) return null;

  const coreDiffers = Boolean(coreCallData && coreCallData !== resultCallData);
  const resultJsonArgs = getJsonArgs(resultCallData, api, chain);
  const coreJsonArgs = coreCallData ? getJsonArgs(coreCallData, api, chain) : null;

  const handleSaveCoreTx = async () => {
    const coreHexCallData = toHexString(coreCallData);
    if (!coreHexCallData) return;

    await save({
      name: getTemplateName(api, coreHexCallData),
      chainId: chain.chainId,
      callData: coreHexCallData,
      specVersion: api.runtimeVersion.specVersion.toNumber(),
    });
    toast.success(t('operationTemplates.toastCreated'));
  };

  return (
    <>
      <CallDataRow
        label={resultLabel ?? t('operation.details.callData')}
        callData={resultCallData}
        jsonArgs={resultJsonArgs}
        saveTooltip={t('operationTemplates.saveCallDataTooltip')}
        onSave={!coreDiffers && coreCallData ? handleSaveCoreTx : undefined}
      />

      {coreDiffers && coreCallData && (
        <CallDataRow
          label={t('operation.details.coreTx')}
          callData={coreCallData}
          jsonArgs={coreJsonArgs}
          saveTooltip={t('operationTemplates.saveCoreTxTooltip')}
          onSave={handleSaveCoreTx}
        />
      )}
    </>
  );
};
